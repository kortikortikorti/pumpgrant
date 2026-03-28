import { NextRequest, NextResponse } from 'next/server';
import { verifyTokenFeeSetup } from '@/lib/pumpfun';

/**
 * POST /api/verify-token
 *
 * Verifies that a token has its fee destination set to
 * PumpGrant's wallet using real on-chain Token-2022 inspection.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { token_address } = body;

  if (!token_address) {
    return NextResponse.json({ error: 'Missing token_address' }, { status: 400 });
  }

  try {
    const result = await verifyTokenFeeSetup(token_address);

    return NextResponse.json({
      valid: result.valid,
      fee_destination: result.feeDestination,
      fee_authority: result.feeAuthority,
      fee_basis_points: result.feeBasisPoints,
      fee_authority_revoked: result.feeAuthorityRevoked,
      message: result.error || (result.valid
        ? 'Token fee setup verified successfully!'
        : 'Fee setup verification failed. Please follow the setup guide.'),
    });
  } catch (err: any) {
    console.error('[API] verify-token error:', err);
    return NextResponse.json({
      valid: false,
      fee_destination: null,
      fee_authority: null,
      fee_basis_points: 0,
      fee_authority_revoked: false,
      message: `Verification error: ${err.message || err}`,
    }, { status: 500 });
  }
}
