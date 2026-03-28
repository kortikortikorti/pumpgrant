import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(request.url);
  const creatorWallet = searchParams.get('creator_wallet');
  const redditUsername = searchParams.get('reddit_username');

  let campaigns;
  if (creatorWallet) {
    campaigns = db.prepare('SELECT * FROM campaigns WHERE creator_wallet = ? ORDER BY created_at DESC').all(creatorWallet);
  } else if (redditUsername) {
    campaigns = db.prepare('SELECT * FROM campaigns WHERE beneficiary_reddit = ? ORDER BY created_at DESC').all(redditUsername);
  } else {
    campaigns = db.prepare('SELECT * FROM campaigns ORDER BY created_at DESC').all();
  }

  return NextResponse.json(campaigns);
}

export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();

  const {
    token_address,
    token_name,
    token_ticker,
    token_description,
    token_image_url,
    beneficiary_reddit,
    creator_wallet,
    creation_method = 'linked',
  } = body;

  if (!token_name || !beneficiary_reddit) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // For "linked" flow, token_address comes from user input
  // For "created" flow, token_address comes from the create-token API
  const finalTokenAddress = token_address || crypto.randomBytes(32).toString('base64url').slice(0, 44);
  const feeVaultAddress = 'FEEVau1t' + crypto.randomBytes(24).toString('base64url').slice(0, 36);
  const id = crypto.randomBytes(8).toString('hex').slice(0, 16);

  const stmt = db.prepare(`
    INSERT INTO campaigns (id, token_address, token_name, token_ticker, token_description, token_image_url, beneficiary_reddit, creator_wallet, fee_vault_address, creation_method)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    finalTokenAddress,
    token_name,
    token_ticker || finalTokenAddress.slice(0, 6).toUpperCase(),
    token_description || null,
    token_image_url || null,
    beneficiary_reddit,
    creator_wallet || 'unknown',
    feeVaultAddress,
    creation_method,
  );

  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id);

  return NextResponse.json(campaign, { status: 201 });
}
