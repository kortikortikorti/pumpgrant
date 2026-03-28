import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { claimFees } from '@/lib/solana';
import { PublicKey } from '@solana/web3.js';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { campaign_id, reddit_username, wallet_address } = body;

  if (!campaign_id) {
    return NextResponse.json({ error: 'Missing campaign_id' }, { status: 400 });
  }

  if (!reddit_username) {
    return NextResponse.json({ error: 'Missing reddit_username' }, { status: 400 });
  }

  if (!wallet_address) {
    return NextResponse.json({ error: 'Missing wallet_address' }, { status: 400 });
  }

  // Validate wallet address
  try {
    new PublicKey(wallet_address);
  } catch {
    return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 });
  }

  const username = reddit_username.replace(/^u\//, '').trim();
  const db = getDb();

  // Check that the user is verified
  const verification = db.prepare(
    'SELECT * FROM verifications WHERE reddit_username = ? AND verified = TRUE'
  ).get(username) as any;

  if (!verification) {
    return NextResponse.json({
      error: 'Reddit account not verified. Please complete verification first.',
    }, { status: 403 });
  }

  // Update wallet address in verification record
  if (!verification.wallet_address) {
    db.prepare('UPDATE verifications SET wallet_address = ? WHERE id = ?').run(wallet_address, verification.id);
  }

  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaign_id) as any;

  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  // Verify the user is the campaign beneficiary
  if (username.toLowerCase() !== campaign.beneficiary_reddit.toLowerCase()) {
    return NextResponse.json({
      error: 'You can only claim fees for campaigns assigned to your Reddit account',
    }, { status: 403 });
  }

  // Perform the real on-chain claim
  const result = await claimFees(campaign_id, wallet_address);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    claim: {
      amount_sol: result.amountSol,
      tx_signature: result.txSignature,
    },
  });
}
