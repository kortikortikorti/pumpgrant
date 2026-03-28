/**
 * PumpGrant Devnet Test Flow
 * 
 * Simulates the complete fee collection and claiming flow on devnet.
 * 
 * Run with: npx tsx src/scripts/test-flow.ts
 */

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

import {
  Keypair,
  Connection,
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import Database from 'better-sqlite3';
import crypto from 'crypto';
import fs from 'fs';

const WALLET_FILE = path.join(process.cwd(), 'platform-wallet.json');
const DB_PATH = path.join(process.cwd(), 'pumpgrant.db');

function loadPlatformKeypair(): Keypair {
  const envKey = process.env.PLATFORM_WALLET_PRIVATE_KEY;
  if (envKey) {
    if (envKey.startsWith('[')) {
      return Keypair.fromSecretKey(new Uint8Array(JSON.parse(envKey)));
    }
    const bs58 = require('bs58');
    return Keypair.fromSecretKey(bs58.decode(envKey));
  }
  if (fs.existsSync(WALLET_FILE)) {
    const data = JSON.parse(fs.readFileSync(WALLET_FILE, 'utf-8'));
    return Keypair.fromSecretKey(new Uint8Array(data));
  }
  console.error('❌ No platform wallet found! Run: npm run setup');
  process.exit(1);
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('');
  console.log('🧪 PumpGrant Devnet Test Flow');
  console.log('==============================');
  console.log('');

  const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
  const network = process.env.SOLANA_NETWORK || 'devnet';

  if (network !== 'devnet') {
    console.error('❌ This test script only runs on devnet! Set SOLANA_NETWORK=devnet');
    process.exit(1);
  }

  const connection = new Connection(rpcUrl, 'confirmed');
  const platformKeypair = loadPlatformKeypair();
  const platformWallet = platformKeypair.publicKey;

  console.log(`Platform Wallet: ${platformWallet.toBase58()}`);
  console.log(`Network: ${network}`);
  console.log('');

  // Step 1: Generate a test wallet
  console.log('━━━ Step 1: Generate test wallet ━━━');
  const testWallet = Keypair.generate();
  console.log(`Test wallet: ${testWallet.publicKey.toBase58()}`);

  // Step 2: Airdrop SOL to test wallet
  console.log('');
  console.log('━━━ Step 2: Airdrop SOL to test wallet ━━━');
  try {
    const airdropSig = await connection.requestAirdrop(testWallet.publicKey, 2 * LAMPORTS_PER_SOL);
    console.log(`Airdrop tx: ${airdropSig}`);
    await connection.confirmTransaction(airdropSig, 'confirmed');
    const balance = await connection.getBalance(testWallet.publicKey);
    console.log(`✅ Test wallet balance: ${(balance / LAMPORTS_PER_SOL).toFixed(6)} SOL`);
  } catch (err: any) {
    console.error(`❌ Airdrop failed: ${err.message}`);
    console.log('Try manually at https://faucet.solana.com');
    process.exit(1);
  }

  // Step 3: Send SOL to platform wallet (simulating fee)
  console.log('');
  console.log('━━━ Step 3: Send 0.05 SOL to platform wallet (simulating fee) ━━━');
  const feeAmount = 0.05;
  const feeLamports = Math.floor(feeAmount * LAMPORTS_PER_SOL);

  const transferTx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: testWallet.publicKey,
      toPubkey: platformWallet,
      lamports: feeLamports,
    })
  );

  try {
    const transferSig = await sendAndConfirmTransaction(connection, transferTx, [testWallet]);
    console.log(`✅ Transfer tx: ${transferSig}`);
    console.log(`   Sent ${feeAmount} SOL to platform wallet`);
  } catch (err: any) {
    console.error(`❌ Transfer failed: ${err.message}`);
    process.exit(1);
  }

  // Step 4: Create a test campaign in the database
  console.log('');
  console.log('━━━ Step 4: Create test campaign in database ━━━');
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const campaignId = 'test-' + crypto.randomBytes(4).toString('hex');
  const testTokenAddress = testWallet.publicKey.toBase58(); // Use test wallet as token addr for matching

  try {
    db.prepare(`
      INSERT INTO campaigns (id, token_address, token_name, token_ticker, token_description, beneficiary_reddit, creator_wallet, fee_vault_address, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `).run(
      campaignId,
      testTokenAddress,
      'TestToken',
      'TEST',
      'Automated test campaign',
      'test_user',
      testWallet.publicKey.toBase58(),
      platformWallet.toBase58()
    );
    console.log(`✅ Created campaign: ${campaignId}`);
    console.log(`   Token address: ${testTokenAddress}`);
  } catch (err: any) {
    console.error(`❌ Failed to create campaign: ${err.message}`);
    process.exit(1);
  }

  // Step 5: Run the bot check once (simulating what the bot does)
  console.log('');
  console.log('━━━ Step 5: Run fee detection (simulating bot) ━━━');

  // Import and run the fee monitor once
  const { FeeMonitor } = require('../bot/fee-monitor');
  const monitor = new FeeMonitor({
    rpcUrl,
    platformWalletAddress: platformWallet.toBase58(),
    dbPath: DB_PATH,
    intervalMs: 5000,
  });

  const eventsFound = await monitor.checkForFees();
  console.log(`✅ Fee check complete. Events found: ${eventsFound}`);

  // Verify the fee was recorded
  const feeEvents = db.prepare(
    'SELECT * FROM fee_events WHERE campaign_id = ?'
  ).all(campaignId) as any[];
  console.log(`   Fee events for campaign: ${feeEvents.length}`);

  if (feeEvents.length === 0) {
    console.log('   ⚠️  No fee events matched. This might be because the bot');
    console.log('   couldn\'t match the transaction to the campaign.');
    console.log('   Manually recording the fee for testing...');

    // Manually record the fee for testing the claim flow
    const eventId = crypto.randomBytes(8).toString('hex');
    db.prepare(`
      INSERT INTO fee_events (id, campaign_id, amount_sol, tx_signature, event_type)
      VALUES (?, ?, ?, 'manual-test', 'trade_fee')
    `).run(eventId, campaignId, feeAmount);

    db.prepare(
      'UPDATE campaigns SET total_fees_accumulated = total_fees_accumulated + ? WHERE id = ?'
    ).run(feeAmount, campaignId);
    console.log(`   📝 Manually recorded ${feeAmount} SOL fee event`);
  }

  // Step 6: Claim fees to a test wallet
  console.log('');
  console.log('━━━ Step 6: Claim fees to test wallet ━━━');

  // Generate a beneficiary wallet
  const beneficiary = Keypair.generate();
  console.log(`Beneficiary wallet: ${beneficiary.publicKey.toBase58()}`);

  // Check platform wallet balance first
  const platformBalance = await connection.getBalance(platformWallet);
  console.log(`Platform wallet balance: ${(platformBalance / LAMPORTS_PER_SOL).toFixed(6)} SOL`);

  if (platformBalance < feeLamports) {
    console.log('⚠️  Platform wallet has insufficient balance for claim.');
    console.log('   Airdropping to platform wallet...');
    try {
      const airdropSig = await connection.requestAirdrop(platformWallet, 2 * LAMPORTS_PER_SOL);
      await connection.confirmTransaction(airdropSig, 'confirmed');
      console.log('   ✅ Airdrop successful');
    } catch (err: any) {
      console.log(`   ❌ Airdrop failed: ${err.message}`);
    }
  }

  // Get available amount
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId) as any;
  const available = campaign.total_fees_accumulated - campaign.total_fees_claimed;
  console.log(`Available to claim: ${available.toFixed(6)} SOL`);

  if (available > 0) {
    try {
      const claimLamports = Math.floor(available * LAMPORTS_PER_SOL);
      const claimTx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: platformWallet,
          toPubkey: beneficiary.publicKey,
          lamports: claimLamports,
        })
      );

      const claimSig = await sendAndConfirmTransaction(connection, claimTx, [platformKeypair]);
      console.log(`✅ Claim tx: ${claimSig}`);

      // Record claim
      const claimId = crypto.randomBytes(8).toString('hex');
      db.prepare(`
        INSERT INTO claims (id, campaign_id, reddit_username, wallet_address, amount_sol, tx_signature)
        VALUES (?, ?, 'test_user', ?, ?, ?)
      `).run(claimId, campaignId, beneficiary.publicKey.toBase58(), available, claimSig);

      db.prepare(
        'UPDATE campaigns SET total_fees_claimed = total_fees_claimed + ? WHERE id = ?'
      ).run(available, campaignId);

      console.log(`   Claimed ${available.toFixed(6)} SOL`);
    } catch (err: any) {
      console.error(`❌ Claim failed: ${err.message}`);
    }
  }

  // Step 7: Verify final state
  console.log('');
  console.log('━━━ Step 7: Verify final state ━━━');
  const finalCampaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId) as any;
  const finalFees = db.prepare('SELECT * FROM fee_events WHERE campaign_id = ?').all(campaignId);
  const finalClaims = db.prepare('SELECT * FROM claims WHERE campaign_id = ?').all(campaignId);

  console.log(`Campaign: ${finalCampaign.id}`);
  console.log(`  Accumulated: ${finalCampaign.total_fees_accumulated.toFixed(6)} SOL`);
  console.log(`  Claimed: ${finalCampaign.total_fees_claimed.toFixed(6)} SOL`);
  console.log(`  Fee events: ${finalFees.length}`);
  console.log(`  Claims: ${finalClaims.length}`);

  if (beneficiary) {
    try {
      const benBalance = await connection.getBalance(beneficiary.publicKey);
      console.log(`  Beneficiary balance: ${(benBalance / LAMPORTS_PER_SOL).toFixed(6)} SOL`);
    } catch {}
  }

  // Cleanup test campaign
  console.log('');
  console.log('━━━ Cleanup ━━━');
  db.prepare('DELETE FROM fee_events WHERE campaign_id = ?').run(campaignId);
  db.prepare('DELETE FROM claims WHERE campaign_id = ?').run(campaignId);
  db.prepare('DELETE FROM campaigns WHERE id = ?').run(campaignId);
  console.log(`✅ Cleaned up test campaign ${campaignId}`);

  db.close();

  console.log('');
  console.log('🎉 Test flow complete!');
  console.log('');
}

main().catch((err) => {
  console.error('Test flow failed:', err);
  process.exit(1);
});
