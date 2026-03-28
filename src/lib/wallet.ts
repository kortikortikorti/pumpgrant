/**
 * Platform Wallet Management
 * 
 * Loads or generates the PumpGrant platform wallet keypair.
 * This wallet receives all fee transfers and disburses claims.
 */

import { Keypair, PublicKey } from '@solana/web3.js';
import fs from 'fs';
import path from 'path';

const WALLET_FILE = path.join(process.cwd(), 'platform-wallet.json');

let _keypair: Keypair | null = null;

/**
 * Get or create the platform wallet keypair.
 * Priority:
 * 1. PLATFORM_WALLET_PRIVATE_KEY env var (base58 or JSON array)
 * 2. platform-wallet.json file
 * 3. Generate new keypair and save to platform-wallet.json
 */
export function getPlatformKeypair(): Keypair {
  if (_keypair) return _keypair;

  // Try env var first
  const envKey = process.env.PLATFORM_WALLET_PRIVATE_KEY;
  if (envKey) {
    try {
      // Try JSON array format first [1,2,3,...]
      if (envKey.startsWith('[')) {
        const secretKey = new Uint8Array(JSON.parse(envKey));
        _keypair = Keypair.fromSecretKey(secretKey);
        console.log(`[Wallet] Loaded platform wallet from env: ${_keypair.publicKey.toBase58()}`);
        return _keypair;
      }
      // Try base58 format
      const bs58 = require('bs58');
      const secretKey = bs58.decode(envKey);
      _keypair = Keypair.fromSecretKey(secretKey);
      console.log(`[Wallet] Loaded platform wallet from env (base58): ${_keypair.publicKey.toBase58()}`);
      return _keypair;
    } catch (err) {
      console.error('[Wallet] Failed to parse PLATFORM_WALLET_PRIVATE_KEY:', err);
    }
  }

  // Try JSON file
  if (fs.existsSync(WALLET_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(WALLET_FILE, 'utf-8'));
      const secretKey = new Uint8Array(data);
      _keypair = Keypair.fromSecretKey(secretKey);
      console.log(`[Wallet] Loaded platform wallet from ${WALLET_FILE}: ${_keypair.publicKey.toBase58()}`);
      return _keypair;
    } catch (err) {
      console.error(`[Wallet] Failed to read ${WALLET_FILE}:`, err);
    }
  }

  // Generate new keypair
  _keypair = Keypair.generate();
  const secretArray = Array.from(_keypair.secretKey);
  fs.writeFileSync(WALLET_FILE, JSON.stringify(secretArray));
  console.log(`[Wallet] Generated new platform wallet: ${_keypair.publicKey.toBase58()}`);
  console.log(`[Wallet] Saved to ${WALLET_FILE}`);
  console.log(`[Wallet] ⚠️  Fund this wallet with SOL before using it!`);
  return _keypair;
}

/**
 * Get the platform wallet public key as a string.
 */
export function getPlatformWalletAddress(): string {
  return getPlatformKeypair().publicKey.toBase58();
}

/**
 * Get the platform wallet public key.
 */
export function getPlatformPublicKey(): PublicKey {
  return getPlatformKeypair().publicKey;
}
