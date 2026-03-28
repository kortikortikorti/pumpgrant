/**
 * Solana on-chain utilities for PumpGrant
 * 
 * Handles real SOL transfers for fee claiming.
 */

import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { getPlatformKeypair, getPlatformWalletAddress } from './wallet';
import getDb from './db';

/** Get configured Solana connection */
export function getConnection(): Connection {
  const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
  return new Connection(rpcUrl, 'confirmed');
}

/** Get the network name */
export function getNetwork(): string {
  return process.env.SOLANA_NETWORK || 'devnet';
}

/**
 * Claim accumulated fees for a campaign.
 * Transfers SOL from the platform wallet to the beneficiary wallet.
 * 
 * @param campaignId - The campaign to claim fees for
 * @param beneficiaryWallet - The wallet address to send SOL to
 * @returns Transaction signature and amount claimed
 */
export async function claimFees(
  campaignId: string,
  beneficiaryWallet: string
): Promise<{
  success: boolean;
  txSignature?: string;
  amountSol?: number;
  error?: string;
}> {
  const db = getDb();

  // Get campaign and calculate available fees
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId) as any;
  if (!campaign) {
    return { success: false, error: 'Campaign not found' };
  }

  // Calculate real available amount from fee_events and claims
  const feeResult = db.prepare(
    'SELECT COALESCE(SUM(amount_sol), 0) as total FROM fee_events WHERE campaign_id = ?'
  ).get(campaignId) as { total: number };

  const claimResult = db.prepare(
    'SELECT COALESCE(SUM(amount_sol), 0) as total FROM claims WHERE campaign_id = ?'
  ).get(campaignId) as { total: number };

  const available = feeResult.total - claimResult.total;

  if (available <= 0.000001) {
    return { success: false, error: 'No fees available to claim' };
  }

  // Verify platform wallet has enough balance
  const connection = getConnection();
  const platformKeypair = getPlatformKeypair();
  const platformBalance = await connection.getBalance(platformKeypair.publicKey);
  const platformBalanceSol = platformBalance / LAMPORTS_PER_SOL;

  // Need enough for the transfer + tx fee (~0.000005 SOL)
  const txFee = 0.00001;
  if (platformBalanceSol < available + txFee) {
    return {
      success: false,
      error: `Platform wallet has insufficient balance. Has ${platformBalanceSol.toFixed(6)} SOL, needs ${(available + txFee).toFixed(6)} SOL`,
    };
  }

  try {
    const beneficiaryPubkey = new PublicKey(beneficiaryWallet);
    const lamports = Math.floor(available * LAMPORTS_PER_SOL);

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: platformKeypair.publicKey,
        toPubkey: beneficiaryPubkey,
        lamports,
      })
    );

    console.log(`[Claim] Sending ${available.toFixed(6)} SOL to ${beneficiaryWallet}...`);
    const txSignature = await sendAndConfirmTransaction(connection, transaction, [platformKeypair]);
    console.log(`[Claim] ✅ Transaction confirmed: ${txSignature}`);

    // Record the claim in the database
    const claimId = require('crypto').randomBytes(8).toString('hex');
    db.prepare(`
      INSERT INTO claims (id, campaign_id, reddit_username, wallet_address, amount_sol, tx_signature)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(claimId, campaignId, campaign.beneficiary_reddit, beneficiaryWallet, available, txSignature);

    // Update campaign totals
    db.prepare('UPDATE campaigns SET total_fees_claimed = total_fees_claimed + ? WHERE id = ?')
      .run(available, campaignId);

    // Log claim event
    const eventId = require('crypto').randomBytes(8).toString('hex');
    db.prepare(`
      INSERT INTO fee_events (id, campaign_id, amount_sol, tx_signature, event_type)
      VALUES (?, ?, ?, ?, 'claim')
    `).run(eventId, campaignId, available, txSignature);

    return {
      success: true,
      txSignature,
      amountSol: available,
    };
  } catch (err: any) {
    console.error(`[Claim] ❌ Transaction failed:`, err);
    return {
      success: false,
      error: `Transaction failed: ${err.message || err}`,
    };
  }
}

/**
 * Get the platform wallet balance
 */
export async function getPlatformBalance(): Promise<number> {
  const connection = getConnection();
  const platformKeypair = getPlatformKeypair();
  const balance = await connection.getBalance(platformKeypair.publicKey);
  return balance / LAMPORTS_PER_SOL;
}
