import { NextRequest, NextResponse } from 'next/server';
import { getVerificationByUser, markVerified } from '@/lib/store';

export async function POST(request: NextRequest) {
  const body = await request.json();
  let username = (body.reddit_username || '').trim().replace(/^u\//, '');
  const code = body.code;

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

  try {
    const headers: Record<string, string> = { 
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json',
    };

    let found = false;

    // Check overview (all activity - posts + comments)
    const overviewRes = await fetch(`https://www.reddit.com/user/${username}/overview.json?limit=50&raw_json=1`, { headers });
    
    if (overviewRes.ok) {
      const data = await overviewRes.json();
      const children = data?.data?.children || [];
      for (const child of children) {
        const d = child?.data || {};
        const title = d.title || '';
        const selftext = d.selftext || '';
        const commentBody = d.body || '';
        if (title.includes(code) || selftext.includes(code) || commentBody.includes(code)) {
          found = true;
          break;
        }
      }
    }

    // Also try submitted posts specifically
    if (!found) {
      const postsRes = await fetch(`https://www.reddit.com/user/${username}/submitted.json?limit=25&raw_json=1`, { headers });
      if (postsRes.ok) {
        const data = await postsRes.json();
        const children = data?.data?.children || [];
        for (const child of children) {
          const d = child?.data || {};
          const title = d.title || '';
          const selftext = d.selftext || '';
          if (title.includes(code) || selftext.includes(code)) {
            found = true;
            break;
          }
        }
      }
    }

    // Also try comments specifically  
    if (!found) {
      const commentsRes = await fetch(`https://www.reddit.com/user/${username}/comments.json?limit=25&raw_json=1`, { headers });
      if (commentsRes.ok) {
        const data = await commentsRes.json();
        const children = data?.data?.children || [];
        for (const child of children) {
          const commentBody = child?.data?.body || '';
          if (commentBody.includes(code)) {
            found = true;
            break;
          }
        }
      }
    }

    if (found) {
      markVerified(username);
      return NextResponse.json({ verified: true, message: 'Account verified!' });
    } else {
      return NextResponse.json({ 
        verified: false, 
        error: 'Code not found on your Reddit profile. Make sure you posted it publicly and wait a few seconds for Reddit to update.' 
      });
    }
  } catch (err: any) {
    return NextResponse.json({ verified: false, error: `Could not check Reddit: ${err.message}` });
  }
}
