import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

async function fetchRedditContent(username: string, type: 'comments' | 'submitted'): Promise<string[]> {
  const url = `https://www.reddit.com/user/${username}/${type}.json?limit=25`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'PumpGrant/1.0 (Reddit Verification Bot)',
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const children = data?.data?.children || [];
    return children.map((child: any) => {
      const d = child.data;
      // Comments have "body", posts have "selftext" and "title"
      return [d.body || '', d.selftext || '', d.title || ''].join(' ');
    });
  } catch {
    return [];
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { reddit_username, code } = body;

  if (!reddit_username || !code) {
    return NextResponse.json({ error: 'Missing reddit_username or code' }, { status: 400 });
  }

  const username = reddit_username.replace(/^u\//, '').trim();

  const db = getDb();
  const verification = db.prepare(
    'SELECT * FROM verifications WHERE reddit_username = ? AND verification_code = ? AND verified = FALSE'
  ).get(username, code) as any;

  if (!verification) {
    return NextResponse.json({
      verified: false,
      error: 'No pending verification found for this username and code.',
    });
  }

  // Fetch recent comments and posts from Reddit
  const [comments, posts] = await Promise.all([
    fetchRedditContent(username, 'comments'),
    fetchRedditContent(username, 'submitted'),
  ]);

  const allContent = [...comments, ...posts];
  const found = allContent.some((text) => text.includes(code));

  if (found) {
    db.prepare(
      'UPDATE verifications SET verified = TRUE, verified_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(verification.id);

    return NextResponse.json({ verified: true });
  }

  return NextResponse.json({
    verified: false,
    error: 'Code not found. Make sure you posted it publicly on your profile.',
  });
}
