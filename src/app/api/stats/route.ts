import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET() {
  const db = getDb();

  const campaignCount = (db.prepare('SELECT COUNT(*) as c FROM campaigns').get() as any).c;
  const totalAccumulated = (db.prepare('SELECT COALESCE(SUM(total_fees_accumulated), 0) as s FROM campaigns').get() as any).s;
  const totalClaimed = (db.prepare('SELECT COALESCE(SUM(total_fees_claimed), 0) as s FROM campaigns').get() as any).s;
  const claimCount = (db.prepare('SELECT COUNT(*) as c FROM claims').get() as any).c;
  const uniqueBeneficiaries = (db.prepare('SELECT COUNT(DISTINCT beneficiary_reddit) as c FROM campaigns').get() as any).c;

  return NextResponse.json({
    total_campaigns: campaignCount,
    total_sol_accumulated: Math.round(totalAccumulated * 1000) / 1000,
    total_sol_claimed: Math.round(totalClaimed * 1000) / 1000,
    total_claims: claimCount,
    unique_beneficiaries: uniqueBeneficiaries,
  });
}
