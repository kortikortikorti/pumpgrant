/**
 * PumpGrant Fee Monitor Bot — Entry Point
 * 
 * Run with: npx tsx src/bot/index.ts
 */

import dotenv from 'dotenv';
import path from 'path';

// Load .env.local from project root
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

import { FeeMonitor } from './fee-monitor';

// Load platform wallet (imported after dotenv so env vars are available)
// We inline the wallet loading here to avoid Next.js module issues
import { Keypair } from '@solana/web3.js';
import fs from 'fs';

function loadPlatformWallet(): string {
  const WALLET_FILE = path.join(process.cwd(), 'platform-wallet.json');

  // Try env var
  const envKey = process.env.PLATFORM_WALLET_PRIVATE_KEY;
  if (envKey) {
    try {
      if (envKey.startsWith('[')) {
        const kp = Keypair.fromSecretKey(new Uint8Array(JSON.parse(envKey)));
        return kp.publicKey.toBase58();
      }
      const bs58 = require('bs58');
      const kp = Keypair.fromSecretKey(bs58.decode(envKey));
      return kp.publicKey.toBase58();
    } catch (err) {
      console.error('Failed to parse PLATFORM_WALLET_PRIVATE_KEY:', err);
    }
  }

  // Try JSON file
  if (fs.existsSync(WALLET_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(WALLET_FILE, 'utf-8'));
      const kp = Keypair.fromSecretKey(new Uint8Array(data));
      return kp.publicKey.toBase58();
    } catch (err) {
      console.error(`Failed to read ${WALLET_FILE}:`, err);
    }
  }

  console.error('❌ No platform wallet found!');
  console.error('Run: npm run setup');
  process.exit(1);
}

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════╗');
  console.log('║   🐸 PumpGrant Fee Monitor Bot 🐸   ║');
  console.log('╚══════════════════════════════════════╝');
  console.log('');

  const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
  const network = process.env.SOLANA_NETWORK || 'devnet';
  const intervalMs = parseInt(process.env.FEE_CHECK_INTERVAL_MS || '30000', 10);
  const platformWallet = loadPlatformWallet();

  console.log(`Network: ${network}`);
  console.log(`RPC: ${rpcUrl}`);
  console.log(`Platform Wallet: ${platformWallet}`);
  console.log('');

  const monitor = new FeeMonitor({
    rpcUrl,
    platformWalletAddress: platformWallet,
    intervalMs,
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nReceived SIGINT...');
    monitor.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\nReceived SIGTERM...');
    monitor.stop();
    process.exit(0);
  });

  await monitor.start();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
