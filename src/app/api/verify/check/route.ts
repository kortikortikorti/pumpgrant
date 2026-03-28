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

  // Check Reddit public profile for the code
  try {
    const headers = { 'User-Agent': 'PumpGrant/1.0 verification bot' };

    // Check comments
    const commentsRes = await fetch(`https://www.reddit.com/user/${username}/comments.json?limit=25`, { headers });
    let found = false;

    if (commentsRes.ok) {
      const data = await commentsRes.json();
      const children = data?.data?.children || [];
      for (const child of children) {
        const body = child?.data?.body || '';
        if (body.includes(code)) { found = true; break; }
      }
    }

    // Check submitted posts too
    if (!found) {
      const postsRes = await fetch(`https://www.reddit.com/user/${username}/submitted.json?limit=25`, { headers });
      if (postsRes.ok) {
        const data = await postsRes.json();
        const children = data?.data?.children || [];
        for (const child of children) {
          const title = child?.data?.title || '';
          const selftext = child?.data?.selftext || '';
          if (title.includes(code) || selftext.includes(code)) { found = true; break; }
        }
      }
    }

    if (found) {
      markVerified(username);
      return NextResponse.json({ verified: true, message: 'Account verified!' });
    } else {
      return NextResponse.json({ verified: false, error: 'Code not found on your Reddit profile. Make sure you posted it publicly.' });
    }
  } catch (err: any) {
    return NextResponse.json({ verified: false, error: `Could not check Reddit: ${err.message}` });
  }
}
