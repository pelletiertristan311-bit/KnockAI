import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getRedis, AUTH_KEY, RESET_KEY } from '@/lib/knockai/redis';
import { validatePassword } from '@/lib/knockai/password';
import { checkRateLimit, getClientIp, tooManyRequests } from '@/lib/knockai/rateLimit';

export async function POST(req: NextRequest) {
  const redis = getRedis();
  if (!redis) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  try {
    const { code, newPassword } = await req.json();
    if (!code || !newPassword) return NextResponse.json({ error: 'Code et mot de passe requis' }, { status: 400 });
    const passwordError = validatePassword(newPassword);
    if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });

    // The 6-digit code is the only thing standing between an attacker and
    // the account at this point — throttle guesses hard, by IP.
    const ip = getClientIp(req);
    if (!(await checkRateLimit(`reset:ip:${ip}`, 10, 15 * 60))) return tooManyRequests();

    const email = await redis.get(RESET_KEY(code));
    if (!email) return NextResponse.json({ error: 'Code invalide ou expiré' }, { status: 401 });

    const normalizedEmail = typeof email === 'string' ? email : String(email);
    const authRaw = await redis.get(AUTH_KEY(normalizedEmail));
    if (!authRaw) return NextResponse.json({ error: 'Compte introuvable' }, { status: 404 });

    const auth = typeof authRaw === 'string' ? JSON.parse(authRaw) : authRaw as object;
    const newHash = await bcrypt.hash(newPassword, 10);

    await Promise.all([
      redis.set(AUTH_KEY(normalizedEmail), JSON.stringify({ ...auth, passwordHash: newHash })),
      redis.del(RESET_KEY(code)),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Reset password error:', err);
    return NextResponse.json({ error: 'Échec de la réinitialisation' }, { status: 500 });
  }
}
