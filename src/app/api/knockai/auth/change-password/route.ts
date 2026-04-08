import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getRedis, AUTH_KEY } from '@/lib/knockai/redis';

export async function POST(req: NextRequest) {
  const redis = getRedis();
  if (!redis) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  try {
    const { email, currentPassword, newPassword } = await req.json();
    if (!email || !currentPassword || !newPassword) return NextResponse.json({ error: 'Champs manquants' }, { status: 400 });
    if (newPassword.length < 6) return NextResponse.json({ error: 'Nouveau mot de passe trop court (min. 6 caractères)' }, { status: 400 });

    const normalizedEmail = email.toLowerCase().trim();
    const authRaw = await redis.get(AUTH_KEY(normalizedEmail));
    if (!authRaw) return NextResponse.json({ error: 'Compte introuvable' }, { status: 404 });

    const auth = typeof authRaw === 'string' ? JSON.parse(authRaw) : authRaw as { passwordHash: string; userId: string; createdAt: string };
    const valid = await bcrypt.compare(currentPassword, auth.passwordHash);
    if (!valid) return NextResponse.json({ error: 'Mot de passe actuel incorrect' }, { status: 401 });

    const newHash = await bcrypt.hash(newPassword, 10);
    await redis.set(AUTH_KEY(normalizedEmail), JSON.stringify({ ...auth, passwordHash: newHash }));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Change password error:', err);
    return NextResponse.json({ error: 'Échec de la mise à jour' }, { status: 500 });
  }
}
