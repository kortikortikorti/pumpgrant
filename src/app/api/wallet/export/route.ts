import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import getDb from '@/lib/db';
import { decryptPrivateKey } from '@/lib/crypto';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  const body = await request.json();
  const redditUsername = body.username || (session?.user as any)?.redditUsername;

  if (!redditUsername) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const db = getDb();
  const wallet = db.prepare('SELECT * FROM beneficiary_wallets WHERE reddit_username = ?').get(redditUsername) as any;

  if (!wallet) {
    return NextResponse.json({ error: 'No wallet found' }, { status: 404 });
  }

  try {
    const privateKeyBytes = decryptPrivateKey(wallet.encrypted_private_key, redditUsername);
    // Return as JSON array (same format as Solana CLI keypair files)
    const keyArray = Array.from(privateKeyBytes);

    return NextResponse.json({
      private_key: keyArray,
      wallet_address: wallet.wallet_address,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to decrypt key' }, { status: 500 });
  }
}
