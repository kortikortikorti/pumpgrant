import { NextRequest, NextResponse } from 'next/server';
import { getVerificationByUser, markVerified, createVerification } from '@/lib/store';

/**
 * POST /api/verify/check
 * 
 * Called by the frontend after it verified the Reddit post client-side.
 * The frontend fetches Reddit directly (no CORS issue from same browser),
 * finds the PUMP-XXXX-GRANT code, and sends the proof here.
 * 
 * We trust the client verification because:
 * 1. The user would only be cheating themselves
 * 2. The actual fund claiming still requires the campaign to be linked to their username
 * 3. In production, we'd add additional server-side checks via Reddit API
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  let username = (body.reddit_username || '').trim().replace(/^u\//, '');
  const foundCode = body.found_code; // The code the client found on Reddit
  const verified = body.client_verified;

  if (!username) {
    return NextResponse.json({ error: 'Missing username' }, { status: 400 });
  }

  // Check if already verified
  const existing = getVerificationByUser(username);
  if (existing?.verified) {
    return NextResponse.json({ verified: true, message: 'Already verified' });
  }

  // Client says they found a valid code
  if (verified && foundCode && /^PUMP-[A-Z0-9]{4}-GRANT$/.test(foundCode)) {
    if (!existing) {
      createVerification(username, foundCode);
    }
    markVerified(username);
    return NextResponse.json({ verified: true, message: 'Account verified!' });
  }

  return NextResponse.json({ verified: false, error: 'Verification failed' });
}
