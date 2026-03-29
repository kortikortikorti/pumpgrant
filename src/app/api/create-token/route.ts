import { NextRequest, NextResponse } from 'next/server';
import { buildCreateTokenTransaction } from '@/lib/pumpfun-create';

/**
 * POST /api/create-token
 *
 * Builds an unsigned transaction that creates a token via pump.fun's on-chain program.
 * The client must sign with their wallet and send to the network.
 *
 * Request body:
 * - creator_wallet: string (user's wallet address)
 * - token_name: string
 * - token_ticker: string
 * - token_uri: string (IPFS/Arweave metadata URI)
 * - initial_buy_sol?: number (optional initial buy amount in SOL)
 *
 * Response:
 * - serialized_transaction: string (base64 VersionedTransaction, partially signed by mint keypair)
 * - token_address: string (the mint public key / token CA)
 * - mint_secret_key: string (base64, needed to complete signing)
 * - instruction_count: number
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { creator_wallet, token_name, token_ticker, token_uri, initial_buy_sol } = body;

    if (!creator_wallet || !token_name || !token_ticker) {
      return NextResponse.json({ error: 'Missing required fields: creator_wallet, token_name, token_ticker' }, { status: 400 });
    }

    if (!token_uri) {
      return NextResponse.json({ error: 'Missing token_uri — upload metadata first via /api/upload-metadata' }, { status: 400 });
    }

    // Validate initial buy amount if provided
    if (initial_buy_sol !== undefined && initial_buy_sol !== null) {
      const buyAmount = Number(initial_buy_sol);
      if (isNaN(buyAmount) || buyAmount < 0) {
        return NextResponse.json({ error: 'Invalid initial_buy_sol — must be a positive number' }, { status: 400 });
      }
      if (buyAmount > 100) {
        return NextResponse.json({ error: 'Initial buy amount too large (max 100 SOL)' }, { status: 400 });
      }
    }

    const result = await buildCreateTokenTransaction({
      userPublicKey: creator_wallet,
      tokenName: token_name,
      tokenSymbol: token_ticker,
      tokenUri: token_uri,
      initialBuyAmountSol: initial_buy_sol ? Number(initial_buy_sol) : undefined,
    });

    return NextResponse.json({
      serialized_transaction: result.serializedTransaction,
      token_address: result.mintPublicKey,
      mint_secret_key: result.mintSecretKey,
      instruction_count: result.instructionCount,
    });
  } catch (err: any) {
    console.error('[create-token] Error:', err);
    return NextResponse.json(
      { error: `Failed to build transaction: ${err.message || err}` },
      { status: 500 },
    );
  }
}
