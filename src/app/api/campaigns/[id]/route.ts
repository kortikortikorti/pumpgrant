import { NextRequest, NextResponse } from 'next/server';
import { getCampaignById, getClaims } from '@/lib/store';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campaign = getCampaignById(id);
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const claims = getClaims().filter(c => c.campaign_id === id);
  return NextResponse.json({ ...campaign, claims });
}
