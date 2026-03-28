import { NextRequest, NextResponse } from 'next/server';
import { getVerificationByUser, markVerified } from '@/lib/store';

export async function POST(request: NextRequest) {
  const body = await request.json();
  let username = (body.reddit_username || '').trim().replace(/^u\//, '');
  const code = body.code;
  const postUrl = body.post_url;

  if (!username || !code) {
    return NextResponse.json({ error: 'Missing username or code' }, { status: 400 });
  }

  const verification = getVerificationByUser(username);
  if (!verification) {
    return NextResponse.json({ verified: false, error: 'No verification found. Generate a code first.' });
  }
  if (verification.verified) {
    return NextResponse.json({ verified: true, message: 'Already verified' });
  }
  if (verification.verification_code !== code) {
    return NextResponse.json({ verified: false, error: 'Code mismatch.' });
  }

  // If user provided a post URL, fetch that specific post
  if (postUrl) {
    try {
      const jsonUrl = postUrl.replace(/\/?$/, '.json') + '?raw_json=1';
      const res = await fetch(jsonUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PumpGrant/1.0)' },
      });
      
      if (res.ok) {
        const text = await res.text();
        if (text.includes(code)) {
          // Also verify the post belongs to the claimed username
          const lowerUsername = username.toLowerCase();
          if (text.toLowerCase().includes(lowerUsername)) {
            markVerified(username);
            return NextResponse.json({ verified: true, message: 'Account verified!' });
          } else {
            return NextResponse.json({ verified: false, error: 'Post does not belong to this Reddit user.' });
          }
        }
      }
    } catch {}
  }

  // Try fetching user profile directly
  try {
    const urls = [
      `https://www.reddit.com/user/${username}/submitted.json?limit=10&raw_json=1`,
      `https://www.reddit.com/user/${username}/overview.json?limit=25&raw_json=1`,
    ];
    
    for (const url of urls) {
      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PumpGrant/1.0)' },
        });
        if (res.ok) {
          const text = await res.text();
          if (text.includes(code)) {
            markVerified(username);
            return NextResponse.json({ verified: true, message: 'Account verified!' });
          }
        }
      } catch {}
    }
  } catch {}

  return NextResponse.json({ 
    verified: false, 
    needs_post_url: true,
    error: 'Could not find the code. Please paste the link to your Reddit post below.' 
  });
}
