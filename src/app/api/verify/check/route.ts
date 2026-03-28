import { NextRequest, NextResponse } from 'next/server';
import { getVerificationByUser, markVerified } from '@/lib/store';

/**
 * POST /api/verify/check
 * 
 * Called by the frontend after it checks the Reddit profile client-side.
 * The frontend fetches Reddit directly (browser avoids CORS issues),
 * finds the PUMP-XXXX-GRANT code, and sends it here for server-side validation.
 * 
 * The server checks that found_code EXACTLY matches the code stored in Redis.
 * This ensures security: only the exact code shown to the user works.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  let username = (body.reddit_username || '').trim().replace(/^u\//, '');
  const foundCode = body.found_code; // The code the client found on Reddit
  const clientVerified = body.client_verified;
  const walletAddress = (body.wallet_address || '').trim();

  if (!username) {
    return NextResponse.json({ error: 'Missing username' }, { status: 400 });
  }

  if (!foundCode || !clientVerified) {
    return NextResponse.json({ verified: false, error: 'Missing verification data' }, { status: 400 });
  }

  if (!walletAddress) {
    return NextResponse.json({ verified: false, error: 'Wallet address required. Connect your wallet before verifying.' }, { status: 400 });
  }

  // Check if already verified
  const existing = await getVerificationByUser(username);
  if (existing?.verified) {
    return NextResponse.json({ verified: true, message: 'Already verified' });
  }

  // Must have an existing verification record (from /api/verify/generate)
  if (!existing) {
    return NextResponse.json({ verified: false, error: 'No verification code found. Generate one first.' }, { status: 400 });
  }

  // EXACT match check: the found code must match the stored code
  if (foundCode === existing.verification_code) {
    await markVerified(username, walletAddress);
    return NextResponse.json({ verified: true, message: 'Account verified!' });
  }

  return NextResponse.json({ verified: false, error: 'Code does not match. Make sure you posted the exact code shown.' });
}
