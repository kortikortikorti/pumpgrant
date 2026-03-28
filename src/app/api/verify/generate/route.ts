import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getVerificationByUser, createVerification } from '@/lib/store';

export async function POST(request: NextRequest) {
  const body = await request.json();
  let username = (body.reddit_username || '').trim().replace(/^u\//, '');
  if (!username) return NextResponse.json({ error: 'Username required' }, { status: 400 });

  // Check existing verification
  const existing = await getVerificationByUser(username);
  if (existing && !existing.verified) {
    return NextResponse.json({ code: existing.verification_code });
  }
  if (existing && existing.verified) {
    return NextResponse.json({ code: existing.verification_code, already_verified: true });
  }

  // Generate new code
  const code = 'PUMP-' + crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 4) + '-GRANT';
  await createVerification(username, code);
  return NextResponse.json({ code });
}
