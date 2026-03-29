/**
 * Fee Monitoring Bot for PumpGrant
 * 
 * Continuously monitors the platform wallet for incoming SOL transfers,
 * matches them to campaigns, and records fee events in the database.
 */

import {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  ParsedTransactionWithMeta,
  ConfirmedSignatureInfo,
} from '@solana/web3.js';
import Database from 'better-sqlite3';
import path from 'path';
import crypto from 'crypto';

// We can't use the Next.js path aliases in standalone scripts,
// so we import directly
const DB_PATH = path.join(process.cwd(), 'pumpgrant.db');

export class FeeMonitor {
  private connection: Connection;
  private platformWallet: PublicKey;
  private db: Database.Database;
  private intervalMs: number;
  private lastSignature: string | null = null;
  private running = false;

  constructor(config: {
    rpcUrl: string;
    platformWalletAddress: string;
    dbPath?: string;
    intervalMs?: number;
  }) {
    this.connection = new Connection(config.rpcUrl, 'confirmed');
    this.platformWallet = new PublicKey(config.platformWalletAddress);
    this.intervalMs = config.intervalMs || 30000;

    const dbPath = config.dbPath || DB_PATH;
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');

    // Ensure tables exist
    this.initDb();
  }

  private initDb() {
    // Create tables if they don't exist (same schema as the app)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id TEXT PRIMARY KEY,
        token_address TEXT UNIQUE NOT NULL,
        token_name TEXT NOT NULL,
        token_ticker TEXT NOT NULL,
        token_description TEXT,
        token_image_url TEXT,
        beneficiary_reddit TEXT NOT NULL,
        creator_wallet TEXT NOT NULL,
        fee_vault_address TEXT NOT NULL,
        total_fees_accumulated REAL DEFAULT 0,
        total_fees_claimed REAL DEFAULT 0,
        creation_method TEXT DEFAULT 'linked',
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS fee_events (
        id TEXT PRIMARY KEY,
        campaign_id TEXT NOT NULL,
        amount_sol REAL NOT NULL,
        tx_signature TEXT,
        event_type TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
      );

      CREATE TABLE IF NOT EXISTS bot_state (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  /**
   * Load the last processed signature from the database
   */
  private loadLastSignature(): string | null {
    const row = this.db.prepare(
      'SELECT value FROM bot_state WHERE key = ?'
    ).get('last_signature') as { value: string } | undefined;
    return row?.value || null;
  }

  /**
   * Save the last processed signature to the database
   */
  private saveLastSignature(signature: string) {
    this.db.prepare(`
      INSERT OR REPLACE INTO bot_state (key, value, updated_at)
      VALUES ('last_signature', ?, CURRENT_TIMESTAMP)
    `).run(signature);
  }

  /**
   * Get all active campaigns indexed by their various identifiers
   */
  private getCampaigns(): Map<string, any> {
    const campaigns = this.db.prepare(
      "SELECT * FROM campaigns WHERE status IN ('active', 'verified', 'pending')"
    ).all();

    const map = new Map<string, any>();
    for (const c of campaigns as any[]) {
      // Index by token address for lookup
      map.set(c.token_address, c);
      // Also index by fee vault address
      if (c.fee_vault_address) {
        map.set(c.fee_vault_address, c);
      }
    }
    return map;
  }

  /**
   * Check if a fee event already exists for this transaction
   */
  private feeEventExists(txSignature: string): boolean {
    const row = this.db.prepare(
      'SELECT 1 FROM fee_events WHERE tx_signature = ?'
    ).get(txSignature);
    return !!row;
  }

  /**
   * Record a fee event in the database
   */
  private recordFeeEvent(campaignId: string, amountSol: number, txSignature: string) {
    const eventId = crypto.randomBytes(8).toString('hex');

    this.db.prepare(`
      INSERT INTO fee_events (id, campaign_id, amount_sol, tx_signature, event_type)
      VALUES (?, ?, ?, ?, 'trade_fee')
    `).run(eventId, campaignId, amountSol, txSignature);

    this.db.prepare(
      'UPDATE campaigns SET total_fees_accumulated = total_fees_accumulated + ? WHERE id = ?'
    ).run(amountSol, campaignId);

    // Auto-verify pending campaigns on first fee receipt
    const campaign = this.db.prepare('SELECT status FROM campaigns WHERE id = ?').get(campaignId) as { status: string } | undefined;
    if (campaign && campaign.status === 'pending') {
      this.db.prepare("UPDATE campaigns SET status = 'verified' WHERE id = ?").run(campaignId);
      console.log(`  ✅ Campaign ${campaignId} verified — first fee received!`);
    }

    console.log(`  📝 Recorded fee event: ${amountSol.toFixed(6)} SOL for campaign ${campaignId}`);
  }

  /**
   * Process recent transactions to the platform wallet
   */
  async checkForFees(): Promise<number> {
    let eventsFound = 0;

    try {
      const lastSig = this.lastSignature || this.loadLastSignature();

      // Fetch recent signatures for the platform wallet
      const options: any = { limit: 100 };
      if (lastSig) {
        options.until = lastSig;
      }

      const signatures: ConfirmedSignatureInfo[] = await this.connection.getSignaturesForAddress(
        this.platformWallet,
        options
      );

      if (signatures.length === 0) {
        return 0;
      }

      console.log(`[Bot] Found ${signatures.length} new transaction(s)`);

      // Process oldest first
      const sortedSigs = [...signatures].reverse();
      const campaigns = this.getCampaigns();

      for (const sigInfo of sortedSigs) {
        if (sigInfo.err) continue; // Skip failed transactions
        if (this.feeEventExists(sigInfo.signature)) continue; // Skip already processed

        try {
          const tx = await this.connection.getParsedTransaction(sigInfo.signature, {
            maxSupportedTransactionVersion: 0,
          });

          if (!tx) continue;

          const feeEvent = this.extractFeeEvent(tx, sigInfo.signature, campaigns);
          if (feeEvent) {
            this.recordFeeEvent(feeEvent.campaignId, feeEvent.amountSol, sigInfo.signature);
            eventsFound++;
          }
        } catch (err) {
          console.error(`[Bot] Error processing tx ${sigInfo.signature}:`, err);
        }
      }

      // Save the most recent signature
      if (sortedSigs.length > 0) {
        const newestSig = sortedSigs[sortedSigs.length - 1].signature;
        this.lastSignature = newestSig;
        this.saveLastSignature(newestSig);
      }
    } catch (err) {
      console.error('[Bot] Error checking for fees:', err);
    }

    return eventsFound;
  }

  /**
   * Extract fee event information from a parsed transaction
   */
  private extractFeeEvent(
    tx: ParsedTransactionWithMeta,
    signature: string,
    campaigns: Map<string, any>
  ): { campaignId: string; amountSol: number } | null {
    if (!tx.meta) return null;

    const preBalances = tx.meta.preBalances;
    const postBalances = tx.meta.postBalances;
    const accountKeys = tx.transaction.message.accountKeys;

    // Find our platform wallet in the account keys
    const platformIndex = accountKeys.findIndex(
      (key) => key.pubkey.toBase58() === this.platformWallet.toBase58()
    );

    if (platformIndex === -1) return null;

    // Calculate how much SOL our wallet received
    const balanceDiff = (postBalances[platformIndex] - preBalances[platformIndex]) / LAMPORTS_PER_SOL;

    if (balanceDiff <= 0) return null; // We didn't receive anything

    console.log(`  💰 Received ${balanceDiff.toFixed(6)} SOL in tx ${signature.slice(0, 16)}...`);

    // Try to identify the source/token
    // Look through all account keys for a matching campaign token or sender
    for (const key of accountKeys) {
      const address = key.pubkey.toBase58();
      const campaign = campaigns.get(address);
      if (campaign && address !== this.platformWallet.toBase58()) {
        return { campaignId: campaign.id, amountSol: balanceDiff };
      }
    }

    // Check inner instructions for token program interactions
    if (tx.meta.innerInstructions) {
      for (const inner of tx.meta.innerInstructions) {
        for (const ix of inner.instructions) {
          if ('parsed' in ix && ix.parsed?.info?.mint) {
            const mint = ix.parsed.info.mint;
            const campaign = campaigns.get(mint);
            if (campaign) {
              return { campaignId: campaign.id, amountSol: balanceDiff };
            }
          }
        }
      }
    }

    // Check the sender address — maybe it's a known creator wallet
    const senderIndex = accountKeys.findIndex(
      (key, idx) => idx !== platformIndex && preBalances[idx] > postBalances[idx]
    );
    if (senderIndex !== -1) {
      const senderAddress = accountKeys[senderIndex].pubkey.toBase58();
      // Check if sender matches any campaign's creator wallet
      const allCampaigns = this.db.prepare(
        "SELECT * FROM campaigns WHERE creator_wallet = ? AND status IN ('active', 'verified', 'pending')"
      ).all(senderAddress) as any[];

      if (allCampaigns.length === 1) {
        return { campaignId: allCampaigns[0].id, amountSol: balanceDiff };
      }
    }

    // If we can't match to a specific campaign, log it as unmatched
    console.log(`  ⚠️  Could not match ${balanceDiff.toFixed(6)} SOL transfer to any campaign`);
    return null;
  }

  /**
   * Start the monitoring loop
   */
  async start() {
    this.running = true;
    console.log(`[Bot] 🤖 Fee Monitor started`);
    console.log(`[Bot] 📡 Monitoring wallet: ${this.platformWallet.toBase58()}`);
    console.log(`[Bot] ⏱️  Check interval: ${this.intervalMs / 1000}s`);
    console.log(`[Bot] 🌐 RPC: ${this.connection.rpcEndpoint}`);
    console.log('');

    // Initial check
    await this.checkForFees();

    // Polling loop
    while (this.running) {
      await this.sleep(this.intervalMs);
      if (!this.running) break;

      const timestamp = new Date().toISOString().slice(11, 19);
      process.stdout.write(`[${timestamp}] Checking... `);

      const events = await this.checkForFees();
      if (events > 0) {
        console.log(`Found ${events} new fee event(s)!`);
      } else {
        console.log('No new fees.');
      }
    }
  }

  /**
   * Stop the monitoring loop
   */
  stop() {
    this.running = false;
    console.log('[Bot] Stopping...');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
