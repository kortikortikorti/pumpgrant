/**
 * PumpFun on-chain helpers for PumpGrant
 *
 * pump.fun Program ID: 6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P
 *
 * Handles Token-2022 transfer fee verification and pump.fun interactions.
 */

import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  Keypair,
} from '@solana/web3.js';
import {
  getMint,
  getTransferFeeConfig,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { getConnection } from './solana';
import { getPlatformWalletAddress } from './wallet';

// pump.fun program ID
export const PUMPFUN_PROGRAM_ID = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P');

// PumpGrant's fee collection wallet — loaded dynamically from platform wallet
export function getPumpGrantFeeWallet(): string {
  return getPlatformWalletAddress();
}

/**
 * Verify that a token has Token-2022 transfer fee extension configured
 * with PumpGrant's wallet as the fee destination.
 *
 * This performs real on-chain verification:
 * 1. Fetch the token mint account
 * 2. Check if it uses Token-2022 program
 * 3. Read the TransferFeeConfig extension
 * 4. Verify fee destination/authority matches PumpGrant's wallet
 */
export async function verifyTokenFeeSetup(tokenAddress: string): Promise<{
  valid: boolean;
  feeDestination: string | null;
  feeAuthority: string | null;
  feeBasisPoints: number;
  feeAuthorityRevoked: boolean;
  error?: string;
}> {
  try {
    const connection = getConnection();
    const mintPubkey = new PublicKey(tokenAddress);
    const platformWallet = getPumpGrantFeeWallet();

    console.log(`[Verify] Checking token: ${tokenAddress}`);
    console.log(`[Verify] Expected fee destination: ${platformWallet}`);

    // Try Token-2022 first, then regular SPL Token
    let mintInfo;
    let isToken2022 = false;

    try {
      mintInfo = await getMint(connection, mintPubkey, 'confirmed', TOKEN_2022_PROGRAM_ID);
      isToken2022 = true;
      console.log(`[Verify] Token uses Token-2022 program`);
    } catch {
      try {
        mintInfo = await getMint(connection, mintPubkey, 'confirmed', TOKEN_PROGRAM_ID);
        console.log(`[Verify] Token uses standard SPL Token program (no transfer fee support)`);
        return {
          valid: false,
          feeDestination: null,
          feeAuthority: null,
          feeBasisPoints: 0,
          feeAuthorityRevoked: false,
          error: 'Token uses standard SPL Token program. Transfer fees require Token-2022.',
        };
      } catch (innerErr) {
        return {
          valid: false,
          feeDestination: null,
          feeAuthority: null,
          feeBasisPoints: 0,
          feeAuthorityRevoked: false,
          error: `Could not find token mint account: ${tokenAddress}`,
        };
      }
    }

    // Get transfer fee config from Token-2022 mint
    const transferFeeConfig = getTransferFeeConfig(mintInfo);

    if (!transferFeeConfig) {
      return {
        valid: false,
        feeDestination: null,
        feeAuthority: null,
        feeBasisPoints: 0,
        feeAuthorityRevoked: false,
        error: 'Token-2022 mint does not have TransferFeeConfig extension enabled.',
      };
    }

    // Extract fee configuration
    const withdrawAuthority = transferFeeConfig.withdrawWithheldAuthority;
    const transferFeeAuthority = transferFeeConfig.transferFeeConfigAuthority;

    // The newer/older epoch fee
    const newerFee = transferFeeConfig.newerTransferFee;
    const olderFee = transferFeeConfig.olderTransferFee;
    const feeBasisPoints = Number(newerFee.transferFeeBasisPoints);

    const withdrawAuthorityStr = withdrawAuthority.toBase58();
    const feeAuthorityStr = transferFeeAuthority.toBase58();

    console.log(`[Verify] Withdraw authority: ${withdrawAuthorityStr}`);
    console.log(`[Verify] Fee config authority: ${feeAuthorityStr}`);
    console.log(`[Verify] Fee basis points: ${feeBasisPoints}`);

    // Check if the withdraw authority matches our platform wallet
    const withdrawMatches = withdrawAuthorityStr === platformWallet;

    // Fee authority is "revoked" if it's set to the default/zero public key
    const zeroKey = PublicKey.default.toBase58();
    const feeAuthorityRevoked = feeAuthorityStr === zeroKey;

    const valid = withdrawMatches;

    if (!valid) {
      console.log(`[Verify] ❌ Withdraw authority mismatch. Expected: ${platformWallet}, Got: ${withdrawAuthorityStr}`);
    } else {
      console.log(`[Verify] ✅ Token fee setup verified!`);
    }

    return {
      valid,
      feeDestination: withdrawAuthorityStr,
      feeAuthority: feeAuthorityStr,
      feeBasisPoints,
      feeAuthorityRevoked,
      error: valid
        ? undefined
        : `Withdraw authority (${withdrawAuthorityStr}) does not match PumpGrant wallet (${platformWallet}).`,
    };
  } catch (err: any) {
    console.error(`[Verify] Error:`, err);
    return {
      valid: false,
      feeDestination: null,
      feeAuthority: null,
      feeBasisPoints: 0,
      feeAuthorityRevoked: false,
      error: `Verification failed: ${err.message || err}`,
    };
  }
}

/**
 * Build a transaction that creates a token on pump.fun,
 * sets the fee destination to PumpGrant's wallet, and
 * revokes the fee authority — all in ONE transaction.
 *
 * Note: This still uses placeholder instructions as pump.fun's
 * instruction layout is not publicly documented. In production,
 * you'd use their SDK or reverse-engineered instruction formats.
 */
export async function buildCreateTokenTransaction(params: {
  creatorPublicKey: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDescription: string;
  tokenImageUrl: string;
}): Promise<{
  transaction: string;
  tokenAddress: string;
  feeVaultAddress: string;
}> {
  const { creatorPublicKey, tokenName, tokenSymbol } = params;

  const mockMint = Keypair.generate();
  const tokenAddress = mockMint.publicKey.toBase58();
  const feeVaultAddress = getPumpGrantFeeWallet();

  console.log(`[CreateToken] Building tx for:`, {
    creator: creatorPublicKey,
    name: tokenName,
    symbol: tokenSymbol,
    tokenAddress,
  });

  // Placeholder: In production, use pump.fun SDK
  const tx = new Transaction();
  tx.add(
    SystemProgram.transfer({
      fromPubkey: new PublicKey(creatorPublicKey),
      toPubkey: new PublicKey(creatorPublicKey),
      lamports: 0,
    })
  );

  return {
    transaction: Buffer.from(
      tx.serialize({ requireAllSignatures: false, verifySignatures: false })
    ).toString('base64'),
    tokenAddress,
    feeVaultAddress,
  };
}

/**
 * Build instruction to set fee destination on an existing token.
 * Placeholder — requires pump.fun instruction layout.
 */
export function buildSetFeeDestinationInstruction(
  mintPubkey: PublicKey,
  creatorPubkey: PublicKey,
): TransactionInstruction {
  return new TransactionInstruction({
    programId: PUMPFUN_PROGRAM_ID,
    keys: [
      { pubkey: mintPubkey, isSigner: false, isWritable: true },
      { pubkey: creatorPubkey, isSigner: true, isWritable: false },
      { pubkey: new PublicKey(getPumpGrantFeeWallet()), isSigner: false, isWritable: false },
    ],
    data: Buffer.from([0x01]),
  });
}

/**
 * Build instruction to revoke fee authority (permanent).
 * Placeholder — requires pump.fun instruction layout.
 */
export function buildRevokeFeeAuthorityInstruction(
  mintPubkey: PublicKey,
  creatorPubkey: PublicKey,
): TransactionInstruction {
  return new TransactionInstruction({
    programId: PUMPFUN_PROGRAM_ID,
    keys: [
      { pubkey: mintPubkey, isSigner: false, isWritable: true },
      { pubkey: creatorPubkey, isSigner: true, isWritable: false },
    ],
    data: Buffer.from([0x02]),
  });
}
