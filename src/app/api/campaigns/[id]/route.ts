import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();

  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id) as any;
  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  const feeEvents = db.prepare(
    'SELECT * FROM fee_events WHERE campaign_id = ? ORDER BY created_at DESC'
  ).all(id);

  const claims = db.prepare(
    'SELECT * FROM claims WHERE campaign_id = ? ORDER BY claimed_at DESC'
  ).all(id);

  // Calculate real totals from fee_events and claims tables
  const feeTotal = db.prepare(
    'SELECT COALESCE(SUM(amount_sol), 0) as total FROM fee_events WHERE campaign_id = ?'
  ).get(id) as { total: number };

  const claimTotal = db.prepare(
    'SELECT COALESCE(SUM(amount_sol), 0) as total FROM claims WHERE campaign_id = ?'
  ).get(id) as { total: number };

  const accumulated = feeTotal.total;
  const claimed = claimTotal.total;
  const available = Math.max(0, accumulated - claimed);

  return NextResponse.json({
    campaign: {
      ...campaign,
      // Override with real calculated values
      total_fees_accumulated: accumulated,
      total_fees_claimed: claimed,
      available_to_claim: available,
    },
    feeEvents,
    claims,
  });
}
