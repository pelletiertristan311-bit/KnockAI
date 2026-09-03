import { NextRequest, NextResponse } from 'next/server';
import { getRedis, AUTH_KEY, RESET_KEY } from '@/lib/knockai/redis';
import { sendPasswordResetEmail } from '@/lib/knockai/email';

export async function POST(req: NextRequest) {
  const redis = getRedis();
  if (!redis) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: 'Email requis' }, { status: 400 });

    const normalizedEmail = email.toLowerCase().trim();
    const exists = await redis.get(AUTH_KEY(normalizedEmail));

    // Always respond the same way whether or not the account exists, so this
    // endpoint can't be used to find out which emails are registered. The
    // reset code is only ever delivered by email — never returned here.
    if (exists) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      await redis.set(RESET_KEY(code), normalizedEmail, { ex: 60 * 15 });
      await sendPasswordResetEmail(normalizedEmail, code);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Forgot password error:', err);
    return NextResponse.json({ error: 'Échec de la demande de réinitialisation' }, { status: 500 });
  }
}
