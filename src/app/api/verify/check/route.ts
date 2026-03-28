import { NextRequest, NextResponse } from 'next/server';
import { getVerificationByUser, markVerified } from '@/lib/store';

export async function POST(request: NextRequest) {
  const body = await request.json();
  let username = (body.reddit_username || '').trim().replace(/^u\//, '');
  const code = body.code;
  const clientVerified = body.client_verified;

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

  // If client-side verification was done (browser fetched Reddit and found the code)
  if (clientVerified === true) {
    markVerified(username);
    return NextResponse.json({ verified: true, message: 'Account verified!' });
  }

  // Try server-side check as fallback
  try {
    const headers: Record<string, string> = { 
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
    };

    let found = false;
    const endpoints = [
      `https://www.reddit.com/user/${username}/overview.json?limit=50&raw_json=1`,
      `https://www.reddit.com/user/${username}/submitted.json?limit=25&raw_json=1`,
      `https://www.reddit.com/user/${username}/comments.json?limit=25&raw_json=1`,
    ];

    for (const url of endpoints) {
      if (found) break;
      try {
        const res = await fetch(url, { headers });
        if (res.ok) {
          const data = await res.json();
          for (const child of (data?.data?.children || [])) {
            const d = child?.data || {};
            if ((d.title || '').includes(code) || (d.selftext || '').includes(code) || (d.body || '').includes(code)) {
              found = true;
              break;
            }
          }
        }
      } catch {}
    }

    if (found) {
      markVerified(username);
      return NextResponse.json({ verified: true, message: 'Account verified!' });
    }

    // If server check fails, return needs_client_check so frontend can try
    return NextResponse.json({ 
      verified: false, 
      needs_client_check: true,
      error: 'Server could not reach Reddit. Please click "Verify via Browser" below.' 
    });
  } catch {
    return NextResponse.json({ 
      verified: false, 
      needs_client_check: true,
      error: 'Server could not reach Reddit. Please click "Verify via Browser" below.' 
    });
  }
}
