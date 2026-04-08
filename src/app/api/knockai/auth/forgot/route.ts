import { NextRequest, NextResponse } from 'next/server';
import { getRedis, AUTH_KEY, RESET_KEY } from '@/lib/knockai/redis';

export async function POST(req: NextRequest) {
  const redis = getRedis();
  if (!redis) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: 'Email requis' }, { status: 400 });

    const normalizedEmail = email.toLowerCase().trim();
    const exists = await redis.get(AUTH_KEY(normalizedEmail));
    if (!exists) return NextResponse.json({ error: 'Aucun compte avec cet email' }, { status: 404 });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await redis.set(RESET_KEY(code), normalizedEmail, { ex: 60 * 15 });

    return NextResponse.json({ ok: true, code });
  } catch (err) {
    console.error('Forgot password error:', err);
    return NextResponse.json({ error: 'Échec de la génération du code' }, { status: 500 });
  }
}
