/**
 * PumpFun SDK Integration for PumpGrant
 *
 * Uses the official @pump-fun/pump-sdk to:
 * - Read on-chain sharing configs (verify fee sharing)
 * - Build create_v2 transactions (token creation)
 * - Build updateFeeShares transactions (fee sharing setup)
 *
 * Key concepts:
 * - SharingConfig PDA: derived from ["sharing-config", mint] on the pump_fees program
 * - Once fee sharing is configured, it is LOCKED and cannot be changed
 * - isSharingConfigEditable: version 1 = locked, version 2 + adminRevoked = locked
 * - Shareholders have address + shareBps (basis points, 10000 = 100%)
 */

import { Connection, PublicKey } from '@solana/web3.js';
import {
  PUMP_SDK,
  feeSharingConfigPda,
  isSharingConfigEditable,
  getPumpFeeProgram,
  bondingCurvePda,
  creatorVaultPda,
  type SharingConfig,
  type Shareholder,
  PUMP_PROGRAM_ID,
  PUMP_FEE_PROGRAM_ID,
} from '@pump-fun/pump-sdk';

// ── Types ──

export interface VerifyFeeSharingResult {
  verified: boolean;
  shareholders: Array<{ address: string; shareBps: number; percentage: string }>;
  isLocked: boolean;
  isEditable: boolean;
  configExists: boolean;
  error?: string;
}

export interface SharingConfigResult {
  exists: boolean;
  shareholders: Array<{ address: string; shareBps: number; percentage: string }>;
  isLocked: boolean;
  isEditable: boolean;
  mint: string;
  admin: string;
  error?: string;
}

// ── Helpers ──

function getRpcUrl(): string {
  return process.env.SOLANA_RPC_URL || process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.mainnet-beta.solana.com';
}

function getConnection(): Connection {
  return new Connection(getRpcUrl(), 'confirmed');
}

function formatShareholders(shareholders: Shareholder[]): Array<{ address: string; shareBps: number; percentage: string }> {
  return shareholders.map(sh => ({
    address: sh.address.toBase58(),
    shareBps: sh.shareBps,
    percentage: `${(sh.shareBps / 100).toFixed(2)}%`,
  }));
}

// ── Read On-Chain Sharing Config ──

/**
 * Fetch the on-chain sharing config for a token mint.
 * This is a read-only operation that works without a wallet.
 */
export async function getSharingConfig(mintAddress: string): Promise<SharingConfigResult> {
  try {
    const connection = getConnection();
    const mint = new PublicKey(mintAddress);
    const sharingConfigAddress = feeSharingConfigPda(mint);

    console.log(`[PumpSDK] Fetching sharing config for mint: ${mintAddress}`);
    console.log(`[PumpSDK] Sharing config PDA: ${sharingConfigAddress.toBase58()}`);

    // Fetch the account data directly
    const accountInfo = await connection.getAccountInfo(sharingConfigAddress);

    if (!accountInfo || !accountInfo.data) {
      console.log(`[PumpSDK] No sharing config found for mint ${mintAddress}`);
      return {
        exists: false,
        shareholders: [],
        isLocked: false,
        isEditable: true,
        mint: mintAddress,
        admin: '',
        error: 'No sharing config found. Fee sharing has not been configured for this token.',
      };
    }

    // Decode using the pump fee program's account coder
    const feeProgram = getPumpFeeProgram(connection);
    const sharingConfig = feeProgram.coder.accounts.decode<SharingConfig>(
      'sharingConfig',
      accountInfo.data,
    );

    const editable = isSharingConfigEditable({ sharingConfig });

    console.log(`[PumpSDK] Sharing config found:`, {
      version: sharingConfig.version,
      admin: sharingConfig.admin.toBase58(),
      adminRevoked: sharingConfig.adminRevoked,
      shareholders: sharingConfig.shareholders.length,
      editable,
    });

    return {
      exists: true,
      shareholders: formatShareholders(sharingConfig.shareholders),
      isLocked: !editable,
      isEditable: editable,
      mint: sharingConfig.mint.toBase58(),
      admin: sharingConfig.admin.toBase58(),
    };
  } catch (err: any) {
    console.error(`[PumpSDK] Error fetching sharing config:`, err);
    return {
      exists: false,
      shareholders: [],
      isLocked: false,
      isEditable: true,
      mint: mintAddress,
      admin: '',
      error: `Failed to read sharing config: ${err.message || err}`,
    };
  }
}

// ── Verify Fee Sharing ──

/**
 * Verify that a token's fee sharing is configured with the expected wallet.
 *
 * Checks:
 * 1. Sharing config exists on-chain
 * 2. Expected wallet is in the shareholders list
 * 3. What percentage (bps) the wallet receives
 * 4. Whether the config is locked (cannot be changed)
 */
export async function verifyFeeSharing(
  mintAddress: string,
  expectedWallet: string,
): Promise<VerifyFeeSharingResult> {
  try {
    const config = await getSharingConfig(mintAddress);

    if (!config.exists) {
      return {
        verified: false,
        shareholders: [],
        isLocked: false,
        isEditable: true,
        configExists: false,
        error: config.error || 'No sharing config found for this token.',
      };
    }

    // Check if the expected wallet is in the shareholders
    const expectedWalletNormalized = expectedWallet.trim();
    const matchingShareholder = config.shareholders.find(
      sh => sh.address === expectedWalletNormalized,
    );

    const verified = !!matchingShareholder;

    if (!verified) {
      console.log(`[PumpSDK] ❌ Wallet ${expectedWallet} not found in shareholders`);
      console.log(`[PumpSDK] Current shareholders:`, config.shareholders);
    } else {
      console.log(`[PumpSDK] ✅ Wallet ${expectedWallet} found with ${matchingShareholder!.shareBps} bps (${matchingShareholder!.percentage})`);
    }

    return {
      verified,
      shareholders: config.shareholders,
      isLocked: config.isLocked,
      isEditable: config.isEditable,
      configExists: true,
      error: verified
        ? undefined
        : `PumpGrant wallet (${expectedWallet}) is not a shareholder. Current shareholders: ${config.shareholders.map(s => s.address).join(', ')}`,
    };
  } catch (err: any) {
    console.error(`[PumpSDK] Verify error:`, err);
    return {
      verified: false,
      shareholders: [],
      isLocked: false,
      isEditable: true,
      configExists: false,
      error: `Verification failed: ${err.message || err}`,
    };
  }
}

// ── Build Fee Sharing Transaction Instructions ──
// These return instructions that need to be signed client-side

/**
 * Build instructions to set up fee sharing for a token.
 * The authority (token creator) must sign the resulting transaction.
 *
 * @param mintAddress - Token mint address
 * @param authorityAddress - The creator/authority wallet that can configure sharing
 * @param shareholders - Array of { address, shareBps } — must total 10000 (100%)
 * @returns Serialized instruction data for client-side signing
 */
export async function buildUpdateFeeSharesInstruction(params: {
  mintAddress: string;
  authorityAddress: string;
  shareholders: Array<{ address: string; shareBps: number }>;
}) {
  const { mintAddress, authorityAddress, shareholders } = params;

  const mint = new PublicKey(mintAddress);
  const authority = new PublicKey(authorityAddress);

  // Get current shareholders (for the remainingAccounts)
  // If config doesn't exist yet, current shareholders is just the authority
  const config = await getSharingConfig(mintAddress);
  const currentShareholders = config.exists
    ? config.shareholders.map(s => new PublicKey(s.address))
    : [authority];

  const newShareholders = shareholders.map(sh => ({
    address: new PublicKey(sh.address),
    shareBps: sh.shareBps,
  }));

  const instruction = await PUMP_SDK.updateFeeShares({
    authority,
    mint,
    currentShareholders,
    newShareholders,
  });

  return instruction;
}

/**
 * Build instructions to create a sharing config and set fee shares in one flow.
 * Use this for first-time setup.
 */
export async function buildCreateSharingConfigInstruction(params: {
  mintAddress: string;
  creatorAddress: string;
  shareholders: Array<{ address: string; shareBps: number }>;
  poolAddress?: string; // For graduated coins, pass the pool address
}) {
  const { mintAddress, creatorAddress, shareholders, poolAddress } = params;

  const mint = new PublicKey(mintAddress);
  const creator = new PublicKey(creatorAddress);
  const pool = poolAddress ? new PublicKey(poolAddress) : null;

  const newShareholders = shareholders.map(sh => ({
    address: new PublicKey(sh.address),
    shareBps: sh.shareBps,
  }));

  const instructions = await PUMP_SDK.createSharingConfigWithSocialRecipients({
    creator,
    mint,
    pool,
    newShareholders,
  });

  return instructions;
}

// ── Utility exports ──

export { feeSharingConfigPda, bondingCurvePda, creatorVaultPda, PUMP_PROGRAM_ID, PUMP_FEE_PROGRAM_ID };
