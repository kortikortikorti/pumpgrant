import { NextRequest, NextResponse } from 'next/server';
import { getVerificationByUser, getCampaignById, createClaim } from '@/lib/store';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { reddit_username, wallet_address, campaign_id } = body;

  if (!reddit_username || !wallet_address || !campaign_id) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Verify the user is verified
  const username = reddit_username.replace(/^u\//, '');
  const verification = await getVerificationByUser(username);
  if (!verification || !verification.verified) {
    return NextResponse.json({ error: 'Reddit account not verified' }, { status: 401 });
  }

  // Find campaign
  const campaign = await getCampaignById(campaign_id);
  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  // Verify campaign belongs to this Reddit user
  if (campaign.beneficiary_reddit.toLowerCase() !== username.toLowerCase()) {
    return NextResponse.json({ error: 'This campaign is not linked to your Reddit account' }, { status: 403 });
  }

  const available = campaign.total_fees_accumulated - campaign.total_fees_claimed;
  if (available <= 0) {
    return NextResponse.json({ error: 'No fees available to claim' }, { status: 400 });
  }

  // Create claim record (actual SOL transfer would happen here in production)
  const claim = await createClaim({
    campaign_id,
    reddit_username: username,
    wallet_address,
    amount_sol: available,
    tx_signature: null, // Would be real tx sig in production
  });

  return NextResponse.json({ 
    success: true, 
    claim,
    message: `Claimed ${available} SOL to ${wallet_address}` 
  });
}
