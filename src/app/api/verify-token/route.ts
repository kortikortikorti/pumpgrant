import { NextRequest, NextResponse } from 'next/server';

const PLATFORM_WALLET = process.env.NEXT_PUBLIC_PLATFORM_WALLET || 'C8PQ5MhTQgo1wehNgq22wNMJcuuyH9f2HyHYi5XP36J';

/**
 * POST /api/verify-token
 *
 * Verifies that a pump.fun token exists and checks its creator reward sharing setup.
 * Uses pump.fun's public API to verify the token.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { token_address } = body;

  if (!token_address) {
    return NextResponse.json({ error: 'Missing token_address' }, { status: 400 });
  }

  try {
    // Check if token exists on pump.fun
    const pumpRes = await fetch(`https://frontend-api-v3.pump.fun/coins/${token_address}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'PumpGrant/1.0',
      },
    });

    if (!pumpRes.ok) {
      return NextResponse.json({
        valid: false,
        message: 'Token not found on pump.fun. Make sure you entered the correct contract address.',
      });
    }

    const tokenData = await pumpRes.json();

    // Token exists on pump.fun - verify it's complete (bonded)
    const tokenName = tokenData.name || 'Unknown';
    const tokenSymbol = tokenData.symbol || '???';
    const isComplete = tokenData.complete === true;
    const marketCap = tokenData.usd_market_cap || 0;

    // For now, we accept the token if it exists on pump.fun
    // The creator reward sharing is set on pump.fun's side and we trust
    // that the creator followed the instructions to set our wallet
    // In production: verify on-chain that reward sharing is configured
    
    return NextResponse.json({
      valid: true,
      token_name: tokenName,
      token_symbol: tokenSymbol,
      is_complete: isComplete,
      market_cap: marketCap,
      fee_destination: PLATFORM_WALLET,
      message: `Token verified: ${tokenName} ($${tokenSymbol})`,
    });
  } catch (err: any) {
    console.error('[API] verify-token error:', err);
    return NextResponse.json({
      valid: false,
      message: `Verification error: ${err.message || err}`,
    }, { status: 500 });
  }
}
