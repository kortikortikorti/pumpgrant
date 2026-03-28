import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { decryptPrivateKey } from '@/lib/crypto';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const redditUsername = body.username;

  if (!redditUsername) {
    return NextResponse.json({ error: 'Username required' }, { status: 400 });
  }

  // Verify the user is verified
  const db = getDb();
  const verification = db.prepare('SELECT * FROM verifications WHERE reddit_username = ? AND verified = 1').get(redditUsername) as any;

  if (!verification) {
    return NextResponse.json({ error: 'Account not verified' }, { status: 401 });
  }

  const wallet = db.prepare('SELECT * FROM beneficiary_wallets WHERE reddit_username = ?').get(redditUsername) as any;

  if (!wallet) {
    return NextResponse.json({ error: 'No wallet found' }, { status: 404 });
  }

  try {
    const privateKeyBytes = decryptPrivateKey(wallet.encrypted_private_key, redditUsername);
    const keyArray = Array.from(privateKeyBytes);

    return NextResponse.json({
      private_key: keyArray,
      wallet_address: wallet.wallet_address,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to decrypt key' }, { status: 500 });
  }
}
