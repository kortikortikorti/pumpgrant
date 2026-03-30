/**
 * PumpFun Token Creation via the official @pump-fun/pump-sdk
 * 
 * This module builds create_v2 instructions (and optionally buy instructions)
 * that can be serialized and sent to the client for wallet signing.
 */

import { Connection, Keypair, PublicKey, TransactionInstruction, TransactionMessage, VersionedTransaction, ComputeBudgetProgram } from '@solana/web3.js';
import { PumpSdk, OnlinePumpSdk, bondingCurvePda, PUMP_PROGRAM_ID } from '@pump-fun/pump-sdk';
import BN from 'bn.js';

function getRpcUrl(): string {
  return process.env.SOLANA_RPC_URL || process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.mainnet-beta.solana.com';
}

function getConnection(): Connection {
  return new Connection(getRpcUrl(), 'confirmed');
}

export interface CreateTokenParams {
  userPublicKey: string;       // The creator's wallet address
  tokenName: string;           // Token name
  tokenSymbol: string;         // Token ticker/symbol
  tokenUri: string;            // IPFS/Arweave metadata URI
  initialBuyAmountSol?: number; // Optional initial buy in SOL (e.g., 0.01)
  isMayhemMode?: boolean;      // Use mayhem mode (usually false)
}

export interface CreateTokenResult {
  /** Base64-encoded serialized VersionedTransaction for the client to sign */
  serializedTransaction: string;
  /** The mint keypair's public key (the token address) */
  mintPublicKey: string;
  /** The mint keypair's secret key, base64-encoded (needed for signing) */
  mintSecretKey: string;
  /** Number of instructions in the transaction */
  instructionCount: number;
}

/**
 * Build a create_v2 transaction (optionally with initial buy).
 * Returns a serialized unsigned transaction + the mint keypair info.
 * The client must:
 *  1. Deserialize the transaction
 *  2. Add the mint keypair as a signer (using mintSecretKey)
 *  3. Sign with the user's wallet
 *  4. Send to the network
 */
export async function buildCreateTokenTransaction(params: CreateTokenParams): Promise<CreateTokenResult> {
  const {
    userPublicKey,
    tokenName,
    tokenSymbol,
    tokenUri,
    initialBuyAmountSol,
    isMayhemMode = false,
  } = params;

  const connection = getConnection();
  const user = new PublicKey(userPublicKey);
  const mintKeypair = Keypair.generate();
  const mint = mintKeypair.publicKey;

  console.log(`[PumpCreate] Building create_v2 transaction`);
  console.log(`[PumpCreate] User: ${user.toBase58()}`);
  console.log(`[PumpCreate] Mint: ${mint.toBase58()}`);
  console.log(`[PumpCreate] Name: ${tokenName}, Symbol: ${tokenSymbol}`);
  console.log(`[PumpCreate] URI: ${tokenUri}`);
  console.log(`[PumpCreate] Initial buy: ${initialBuyAmountSol ?? 'none'} SOL`);

  let instructions: TransactionInstruction[];

  const pumpSdk = new PumpSdk();

  if (initialBuyAmountSol && initialBuyAmountSol > 0) {
    // Create + Buy: need to fetch global state for buy instruction
    const onlineSdk = new OnlinePumpSdk(connection);
    const global = await onlineSdk.fetchGlobal();
    
    // Convert SOL to lamports (BN)
    const solLamports = new BN(Math.floor(initialBuyAmountSol * 1e9));
    
    // Calculate token amount from SOL using the bonding curve formula
    // tokenAmount = (solLamports * virtualTokenReserves) / (virtualSolReserves + solLamports)
    const virtualTokenReserves = new BN(global.initialVirtualTokenReserves.toString());
    const virtualSolReserves = new BN(global.initialVirtualSolReserves.toString());
    
    const tokenAmount = solLamports.mul(virtualTokenReserves).div(virtualSolReserves.add(solLamports));
    
    // Apply 1% slippage (reduce token amount slightly)
    const tokenAmountWithSlippage = tokenAmount.mul(new BN(99)).div(new BN(100));
    
    console.log(`[PumpCreate] SOL amount: ${solLamports.toString()} lamports`);
    console.log(`[PumpCreate] Token amount: ${tokenAmountWithSlippage.toString()}`);
    
    instructions = await pumpSdk.createV2AndBuyInstructions({
      global,
      mint,
      name: tokenName,
      symbol: tokenSymbol,
      uri: tokenUri,
      creator: user,
      user,
      amount: tokenAmountWithSlippage,
      solAmount: solLamports,
      mayhemMode: isMayhemMode,
      cashback: false,
    });
  } else {
    // Create only (no buy)
    const createIx = await pumpSdk.createV2Instruction({
      mint,
      name: tokenName,
      symbol: tokenSymbol,
      uri: tokenUri,
      creator: user,
      user,
      mayhemMode: isMayhemMode,
      cashback: false,
    });
    
    // Also extend the bonding curve account
    const extendIx = await pumpSdk.extendAccountInstruction({
      account: bondingCurvePda(mint),
      user,
    });
    
    instructions = [createIx, extendIx];
  }

  // Add priority fee instructions for faster confirmation
  const priorityFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: 100000, // 0.0001 SOL priority fee
  });
  const computeUnitsIx = ComputeBudgetProgram.setComputeUnitLimit({
    units: 300000,
  });
  instructions = [priorityFeeIx, computeUnitsIx, ...instructions];

  console.log(`[PumpCreate] Built ${instructions.length} instructions (including priority fees)`);

  // Get recent blockhash for the transaction
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');

  // Build a VersionedTransaction (v0)
  const messageV0 = new TransactionMessage({
    payerKey: user,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message();

  const transaction = new VersionedTransaction(messageV0);

  // Partially sign with the mint keypair (required since mint is a signer in create_v2)
  transaction.sign([mintKeypair]);

  // Serialize the transaction (client will add their signature)
  const serialized = Buffer.from(transaction.serialize()).toString('base64');

  return {
    serializedTransaction: serialized,
    mintPublicKey: mint.toBase58(),
    mintSecretKey: Buffer.from(mintKeypair.secretKey).toString('base64'),
    instructionCount: instructions.length,
  };
}
