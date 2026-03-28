import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import crypto from 'crypto';

function generateCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'PUMP-';
  for (let i = 0; i < 4; i++) {
    code += chars[crypto.randomInt(chars.length)];
  }
  code += '-GRANT';
  return code;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { reddit_username } = body;

  if (!reddit_username || typeof reddit_username !== 'string') {
    return NextResponse.json({ error: 'Missing reddit_username' }, { status: 400 });
  }

  // Strip u/ prefix if provided
  const username = reddit_username.replace(/^u\//, '').trim();
  if (!username || username.length < 1) {
    return NextResponse.json({ error: 'Invalid username' }, { status: 400 });
  }

  const db = getDb();

  // Check if there's already a verified entry for this username
  const existing = db.prepare(
    'SELECT * FROM verifications WHERE reddit_username = ? AND verified = TRUE'
  ).get(username) as any;

  if (existing) {
    return NextResponse.json({
      already_verified: true,
      message: 'This Reddit account is already verified.',
    });
  }

  // Check for existing pending verification
  const pending = db.prepare(
    'SELECT * FROM verifications WHERE reddit_username = ? AND verified = FALSE'
  ).get(username) as any;

  if (pending) {
    // Return existing code
    return NextResponse.json({ code: pending.verification_code });
  }

  // Generate a unique code
  let code: string;
  let attempts = 0;
  do {
    code = generateCode();
    const dup = db.prepare('SELECT id FROM verifications WHERE verification_code = ?').get(code);
    if (!dup) break;
    attempts++;
  } while (attempts < 10);

  if (attempts >= 10) {
    return NextResponse.json({ error: 'Failed to generate unique code' }, { status: 500 });
  }

  db.prepare(
    'INSERT INTO verifications (id, reddit_username, verification_code) VALUES (lower(hex(randomblob(8))), ?, ?)'
  ).run(username, code);

  return NextResponse.json({ code });
}
