import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getRedis, AUTH_KEY, RESET_KEY } from '@/lib/knockai/redis';
import { sendPasswordResetEmail } from '@/lib/knockai/email';
import { checkRateLimit, getClientIp, tooManyRequests } from '@/lib/knockai/rateLimit';

export async function POST(req: NextRequest) {
  const redis = getRedis();
  if (!redis) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: 'Email requis' }, { status: 400 });

    const normalizedEmail = email.toLowerCase().trim();

    // Throttle both by IP and by target email — prevents spam-bombing a
    // victim's inbox and slows any attempt to farm many reset codes.
    const ip = getClientIp(req);
    const [ipOk, emailOk] = await Promise.all([
      checkRateLimit(`forgot:ip:${ip}`, 10, 60 * 60),
      checkRateLimit(`forgot:email:${normalizedEmail}`, 3, 60 * 60),
    ]);
    if (!ipOk || !emailOk) return tooManyRequests();

    const exists = await redis.get(AUTH_KEY(normalizedEmail));

    // Always respond the same way whether or not the account exists, so this
    // endpoint can't be used to find out which emails are registered. The
    // reset code is only ever delivered by email — never returned here.
    if (exists) {
      const code = crypto.randomInt(100000, 1000000).toString();
      await redis.set(RESET_KEY(code), normalizedEmail, { ex: 60 * 15 });
      await sendPasswordResetEmail(normalizedEmail, code);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Forgot password error:', err);
    return NextResponse.json({ error: 'Échec de la demande de réinitialisation' }, { status: 500 });
  }
}
