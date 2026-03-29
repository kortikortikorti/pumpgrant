import { NextRequest, NextResponse } from 'next/server';
import { verifyFeeSharing, getSharingConfig } from '@/lib/pumpfun-sdk';

const PLATFORM_WALLET = process.env.NEXT_PUBLIC_PLATFORM_WALLET || 'C8PQ5MhTQgo1wehNgq22wNMJcuuyH9f2HyHYi5XP36J';

/**
 * POST /api/verify-token
 *
 * Verifies a pump.fun token's fee sharing configuration on-chain.
 * Uses the official pump-sdk to read the SharingConfig PDA.
 *
 * Returns:
 * - valid: true if PumpGrant wallet is a shareholder
 * - shareholders: list of all shareholders with addresses and percentages
 * - isLocked: true if the config can never be changed
 * - configExists: true if any sharing config exists for this token
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { token_address } = body;

  if (!token_address) {
    return NextResponse.json({ error: 'Missing token_address' }, { status: 400 });
  }

  try {
    // First, try to get token info from pump.fun API (for name/symbol/market data)
    let tokenName = 'Unknown';
    let tokenSymbol = '???';
    let marketCap = 0;
    let isComplete = false;

    try {
      const pumpRes = await fetch(`https://frontend-api-v3.pump.fun/coins/${token_address}`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'PumpGrant/1.0',
        },
      });

      if (pumpRes.ok) {
        const tokenData = await pumpRes.json();
        tokenName = tokenData.name || 'Unknown';
        tokenSymbol = tokenData.symbol || '???';
        isComplete = tokenData.complete === true;
        marketCap = tokenData.usd_market_cap || 0;
      }
    } catch {
      // pump.fun API failure is non-fatal — we still verify on-chain
      console.log('[API] pump.fun API call failed, continuing with on-chain verification');
    }

    // Real on-chain verification via pump-sdk
    const result = await verifyFeeSharing(token_address, PLATFORM_WALLET);

    return NextResponse.json({
      valid: result.verified,
      token_name: tokenName,
      token_symbol: tokenSymbol,
      is_complete: isComplete,
      market_cap: marketCap,
      fee_destination: PLATFORM_WALLET,

      // On-chain sharing config data
      config_exists: result.configExists,
      shareholders: result.shareholders,
      is_locked: result.isLocked,
      is_editable: result.isEditable,

      message: result.verified
        ? `✅ Verified: ${tokenName} ($${tokenSymbol}) — PumpGrant wallet is a shareholder`
        : result.configExists
          ? `❌ Sharing config exists but PumpGrant wallet is not a shareholder`
          : `⏳ No sharing config found — fee sharing may not be set up yet`,
    });
  } catch (err: any) {
    console.error('[API] verify-token error:', err);

    // Fallback: if SDK verification fails, try the old pump.fun API approach
    try {
      const pumpRes = await fetch(`https://frontend-api-v3.pump.fun/coins/${token_address}`, {
        headers: { 'Accept': 'application/json', 'User-Agent': 'PumpGrant/1.0' },
      });

      if (pumpRes.ok) {
        const tokenData = await pumpRes.json();
        return NextResponse.json({
          valid: false,
          token_name: tokenData.name || 'Unknown',
          token_symbol: tokenData.symbol || '???',
          is_complete: tokenData.complete === true,
          market_cap: tokenData.usd_market_cap || 0,
          fee_destination: PLATFORM_WALLET,
          config_exists: false,
          shareholders: [],
          is_locked: false,
          is_editable: true,
          message: `⚠️ Token found on pump.fun but on-chain verification failed. Will be verified when first fee arrives.`,
          fallback: true,
        });
      }
    } catch { /* double fallback failed */ }

    return NextResponse.json({
      valid: false,
      message: `Verification error: ${err.message || err}`,
    }, { status: 500 });
  }
}
