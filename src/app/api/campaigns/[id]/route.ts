import { NextRequest, NextResponse } from 'next/server';
import { getCampaignById, getClaimsByCampaign } from '@/lib/store';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campaign = await getCampaignById(id);
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const claims = await getClaimsByCampaign(id);
  return NextResponse.json({ ...campaign, claims });
}
