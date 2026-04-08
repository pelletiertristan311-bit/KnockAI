import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getRedis, AUTH_KEY, RESET_KEY } from '@/lib/knockai/redis';

export async function POST(req: NextRequest) {
  const redis = getRedis();
  if (!redis) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  try {
    const { code, newPassword } = await req.json();
    if (!code || !newPassword) return NextResponse.json({ error: 'Code et mot de passe requis' }, { status: 400 });
    if (newPassword.length < 6) return NextResponse.json({ error: 'Mot de passe trop court (min. 6 caractères)' }, { status: 400 });

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
