import { NextRequest, NextResponse } from 'next/server';
import { getVerificationByWallet } from '@/lib/store';

/**
 * GET /api/verify/wallet?wallet_address=...
 * 
 * Checks if a wallet address is linked to a verified Reddit user.
 * Returns { verified: true, reddit_username: "xxx" } or { verified: false }
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const walletAddress = searchParams.get('wallet_address');

  if (!walletAddress) {
    return NextResponse.json({ error: 'Missing wallet_address parameter' }, { status: 400 });
  }

  const result = await getVerificationByWallet(walletAddress);
  return NextResponse.json(result);
}
