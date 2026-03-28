import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * POST /api/create-token
 *
 * Returns an unsigned transaction that:
 * 1. Creates a token via pump.fun's on-chain program
 * 2. Sets fee destination to PumpGrant's wallet
 * 3. Revokes fee authority (permanent)
 *
 * The user signs this single transaction in their wallet (Phantom/Solflare).
 *
 * TODO: In production, use buildCreateTokenTransaction() from lib/pumpfun.ts
 * to construct the actual Solana transaction.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { creator_wallet, token_name, token_ticker, token_description, token_image_url } = body;

  if (!creator_wallet || !token_name || !token_ticker) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // TODO: In production:
  // import { buildCreateTokenTransaction } from '@/lib/pumpfun';
  // const result = await buildCreateTokenTransaction({
  //   creatorPublicKey: creator_wallet,
  //   tokenName: token_name,
  //   tokenSymbol: token_ticker,
  //   tokenDescription: token_description || '',
  //   tokenImageUrl: token_image_url || '',
  // });
  // return NextResponse.json(result);

  // For MVP: return mock data
  const tokenAddress = crypto.randomBytes(32).toString('base64url').slice(0, 44);
  const feeVaultAddress = 'FEEVau1t' + crypto.randomBytes(24).toString('base64url').slice(0, 36);

  return NextResponse.json({
    transaction: null, // Would be base64-encoded unsigned transaction
    token_address: tokenAddress,
    fee_vault_address: feeVaultAddress,
    message: 'Mock transaction — in production, this would return a real unsigned Solana transaction for wallet signing.',
  });
}
