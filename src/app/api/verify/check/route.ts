import { NextRequest, NextResponse } from 'next/server';
import { getVerificationByUser, markVerified, createVerification } from '@/lib/store';

const PUMP_CODE_PATTERN = /PUMP-[A-Z0-9]{4}-GRANT/;

export async function POST(request: NextRequest) {
  const body = await request.json();
  let username = (body.reddit_username || '').trim().replace(/^u\//, '');
  const postUrl = body.post_url;

  if (!username) {
    return NextResponse.json({ error: 'Missing username' }, { status: 400 });
  }

  // Check if already verified
  const existing = getVerificationByUser(username);
  if (existing?.verified) {
    return NextResponse.json({ verified: true, message: 'Already verified' });
  }

  // Strategy: check if the user has ANY post with PUMP-XXXX-GRANT pattern
  // This avoids the code mismatch problem from serverless restarts
  
  let found = false;
  let foundCode = '';

  // If user provided a post URL, check that first
  if (postUrl) {
    try {
      const jsonUrl = postUrl.replace(/\/?$/, '.json') + '?raw_json=1';
      const res = await fetch(jsonUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PumpGrant/1.0)' },
      });
      if (res.ok) {
        const text = await res.text();
        const match = text.match(PUMP_CODE_PATTERN);
        if (match && text.toLowerCase().includes(username.toLowerCase())) {
          found = true;
          foundCode = match[0];
        }
      }
    } catch {}
  }

  // Try user profile
  if (!found) {
    const urls = [
      `https://www.reddit.com/user/${username}/submitted.json?limit=10&raw_json=1`,
      `https://www.reddit.com/user/${username}/overview.json?limit=25&raw_json=1`,
    ];
    for (const url of urls) {
      if (found) break;
      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PumpGrant/1.0)' },
        });
        if (res.ok) {
          const text = await res.text();
          const match = text.match(PUMP_CODE_PATTERN);
          if (match) {
            found = true;
            foundCode = match[0];
          }
        }
      } catch {}
    }
  }

  if (found) {
    // Create verification record if doesn't exist, then mark verified
    if (!existing) {
      createVerification(username, foundCode);
    }
    markVerified(username);
    return NextResponse.json({ verified: true, message: 'Account verified!' });
  }

  return NextResponse.json({ 
    verified: false, 
    needs_post_url: true,
    error: 'Could not find a PumpGrant verification code on your Reddit profile. Paste your Reddit post link below.' 
  });
}
