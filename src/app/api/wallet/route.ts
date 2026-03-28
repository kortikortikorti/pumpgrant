import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import getDb from '@/lib/db';
import { Keypair } from '@solana/web3.js';
import { encryptPrivateKey } from '@/lib/crypto';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  // For MVP demo: use query param or session
  const { searchParams } = new URL(request.url);
  const redditUsername = searchParams.get('username') || (session?.user as any)?.redditUsername;

  if (!redditUsername) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const db = getDb();
  let wallet = db.prepare('SELECT * FROM beneficiary_wallets WHERE reddit_username = ?').get(redditUsername) as any;

  if (!wallet) {
    // Auto-create wallet
    const keypair = Keypair.generate();
    const walletAddress = keypair.publicKey.toBase58();
    const userId = redditUsername; // In prod, use Reddit user ID
    const encryptedKey = encryptPrivateKey(keypair.secretKey, userId);
    const id = crypto.randomBytes(8).toString('hex');

    db.prepare(`
      INSERT INTO beneficiary_wallets (id, reddit_username, wallet_address, encrypted_private_key)
      VALUES (?, ?, ?, ?)
    `).run(id, redditUsername, walletAddress, encryptedKey);

    wallet = db.prepare('SELECT * FROM beneficiary_wallets WHERE reddit_username = ?').get(redditUsername);
  }

  return NextResponse.json({
    wallet_address: wallet.wallet_address,
    reddit_username: wallet.reddit_username,
    created_at: wallet.created_at,
  });
}
