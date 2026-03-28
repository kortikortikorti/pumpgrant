/**
 * PumpGrant Setup Script
 * 
 * Generates a platform wallet (if needed) and requests devnet airdrop.
 * 
 * Run with: npx tsx src/scripts/setup.ts
 */

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

import { Keypair, Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import fs from 'fs';
import bs58 from 'bs58';

const WALLET_FILE = path.join(process.cwd(), 'platform-wallet.json');

async function main() {
  console.log('');
  console.log('🔧 PumpGrant Setup');
  console.log('==================');
  console.log('');

  let keypair: Keypair;
  let isNew = false;

  // Check for existing wallet
  const envKey = process.env.PLATFORM_WALLET_PRIVATE_KEY;
  if (envKey) {
    try {
      if (envKey.startsWith('[')) {
        keypair = Keypair.fromSecretKey(new Uint8Array(JSON.parse(envKey)));
      } else {
        keypair = Keypair.fromSecretKey(bs58.decode(envKey));
      }
      console.log('✅ Platform wallet loaded from environment variable');
    } catch {
      console.error('❌ Invalid PLATFORM_WALLET_PRIVATE_KEY in environment');
      process.exit(1);
    }
  } else if (fs.existsSync(WALLET_FILE)) {
    const data = JSON.parse(fs.readFileSync(WALLET_FILE, 'utf-8'));
    keypair = Keypair.fromSecretKey(new Uint8Array(data));
    console.log(`✅ Platform wallet loaded from ${WALLET_FILE}`);
  } else {
    // Generate new wallet
    keypair = Keypair.generate();
    const secretArray = Array.from(keypair.secretKey);
    fs.writeFileSync(WALLET_FILE, JSON.stringify(secretArray));
    isNew = true;
    console.log(`🆕 Generated new platform wallet`);
    console.log(`   Saved to: ${WALLET_FILE}`);
  }

  console.log('');
  console.log(`📍 Platform Wallet Address: ${keypair.publicKey.toBase58()}`);
  console.log(`🔑 Private Key (base58): ${bs58.encode(keypair.secretKey)}`);
  console.log('');

  // Check network and balance
  const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
  const network = process.env.SOLANA_NETWORK || 'devnet';
  const connection = new Connection(rpcUrl, 'confirmed');

  console.log(`🌐 Network: ${network}`);
  console.log(`📡 RPC: ${rpcUrl}`);

  try {
    const balance = await connection.getBalance(keypair.publicKey);
    const balanceSol = balance / LAMPORTS_PER_SOL;
    console.log(`💰 Balance: ${balanceSol.toFixed(6)} SOL`);

    // Request airdrop on devnet if balance is low
    if (network === 'devnet' && balanceSol < 1) {
      console.log('');
      console.log('🪂 Requesting devnet airdrop (2 SOL)...');
      try {
        const sig = await connection.requestAirdrop(keypair.publicKey, 2 * LAMPORTS_PER_SOL);
        console.log(`   Transaction: ${sig}`);
        console.log('   Waiting for confirmation...');
        await connection.confirmTransaction(sig, 'confirmed');

        const newBalance = await connection.getBalance(keypair.publicKey);
        console.log(`   ✅ New balance: ${(newBalance / LAMPORTS_PER_SOL).toFixed(6)} SOL`);
      } catch (err: any) {
        console.log(`   ⚠️  Airdrop failed: ${err.message || err}`);
        console.log('   You can manually airdrop at https://faucet.solana.com');
      }
    }
  } catch (err: any) {
    console.log(`⚠️  Could not fetch balance: ${err.message || err}`);
  }

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('Next steps:');
  console.log('  1. Copy the wallet address above');
  console.log('  2. Set it as the fee destination for your pump.fun tokens');
  console.log('  3. Run the app: npm run dev');
  console.log('  4. Run the bot: npm run bot');
  console.log('');
  if (isNew) {
    console.log('⚠️  IMPORTANT: Back up platform-wallet.json — losing it means losing access to funds!');
    console.log('');
  }
}

main().catch((err) => {
  console.error('Setup failed:', err);
  process.exit(1);
});
