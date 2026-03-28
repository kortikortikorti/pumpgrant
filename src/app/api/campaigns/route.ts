import { NextRequest, NextResponse } from 'next/server';
import { getCampaigns, createCampaign, getCampaignByToken, getCampaignsByReddit } from '@/lib/store';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const wallet = searchParams.get('wallet');
  const reddit = searchParams.get('reddit') || searchParams.get('reddit_username');

  if (reddit) {
    const campaigns = await getCampaignsByReddit(reddit);
    return NextResponse.json(campaigns);
  }

  let campaigns = await getCampaigns();
  if (id) {
    const c = campaigns.find(c => c.id === id);
    return c ? NextResponse.json(c) : NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (wallet) campaigns = campaigns.filter(c => c.creator_wallet === wallet);
  return NextResponse.json(campaigns);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  if (!body.token_address || !body.beneficiary_reddit) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  if (await getCampaignByToken(body.token_address)) {
    return NextResponse.json({ error: 'Campaign for this token already exists' }, { status: 409 });
  }
  const campaign = await createCampaign({
    token_address: body.token_address,
    token_name: body.token_name || 'Unnamed',
    token_ticker: body.token_ticker || '???',
    token_description: body.token_description || '',
    beneficiary_reddit: (body.beneficiary_reddit || '').replace(/^u\//, ''),
    creator_wallet: body.creator_wallet || 'anonymous',
    creation_method: body.creation_method || 'linked',
  });
  return NextResponse.json(campaign, { status: 201 });
}
