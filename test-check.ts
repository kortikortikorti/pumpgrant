import Database from 'better-sqlite3';
import { Keypair, Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import * as fs from 'fs';
import 'dotenv/config';

async function check() {
  console.log('🔍 PumpGrant System Check\n');

  // 1. Check database
  try {
    const db = new Database('pumpgrant.db');
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as any[];
    console.log('✅ Database:', tables.map((t: any) => t.name).join(', '));
    
    const campaigns = db.prepare('SELECT COUNT(*) as c FROM campaigns').get() as any;
    console.log('   Campaigns:', campaigns.c);
    
    db.close();
  } catch (e: any) {
    console.log('❌ Database error:', e.message);
  }

  // 2. Check platform wallet
  try {
    const walletData = JSON.parse(fs.readFileSync('platform-wallet.json', 'utf8'));
    const kp = Keypair.fromSecretKey(Uint8Array.from(walletData));
    console.log('✅ Platform wallet:', kp.publicKey.toBase58());
    
    // 3. Check balance
    const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
    console.log('   RPC:', rpcUrl);
    const conn = new Connection(rpcUrl, 'confirmed');
    const bal = await conn.getBalance(kp.publicKey);
    console.log('   Balance:', bal / LAMPORTS_PER_SOL, 'SOL');
    
    if (bal === 0) {
      console.log('\n⚠️  Platform wallet has 0 SOL!');
      console.log('   Go to: https://faucet.solana.com');
      console.log('   Paste:',  kp.publicKey.toBase58());
      console.log('   Get devnet SOL for testing\n');
    }
  } catch (e: any) {
    console.log('❌ Wallet error:', e.message);
  }

  // 4. Check env
  console.log('\n📋 Environment:');
  console.log('   SOLANA_RPC_URL:', process.env.SOLANA_RPC_URL || '(not set, using devnet)');
  console.log('   SOLANA_NETWORK:', process.env.SOLANA_NETWORK || '(not set)');
  console.log('   REDDIT_CLIENT_ID:', process.env.REDDIT_CLIENT_ID ? '✅ set' : '❌ not set');
  console.log('   NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? '✅ set' : '❌ not set');

  console.log('\n🏁 Check complete');
}

check().catch(console.error);
