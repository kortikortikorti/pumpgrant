import { NextResponse } from 'next/server';
import { getCampaigns, getClaims } from '@/lib/store';

export async function GET() {
  const campaigns = await getCampaigns();
  const claims = await getClaims();
  const totalDonated = claims.reduce((sum, c) => sum + c.amount_sol, 0);

  return NextResponse.json({
    total_campaigns: campaigns.length,
    active_campaigns: campaigns.filter(c => c.status === 'active').length,
    total_claims: claims.length,
    total_sol_donated: totalDonated,
  });
}
