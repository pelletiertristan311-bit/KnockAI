import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const COOKIE_NAME = 'knockai_session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year

export interface SessionPayload {
  uid: string;
  email: string;
}

// Fails closed: in production, a missing SESSION_SECRET means no session can
// ever be signed or verified (every request is treated as unauthenticated)
// rather than falling back to a guessable default secret.
function getSecret(): string | null {
  const secret = process.env.SESSION_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') return null;
  return 'dev-only-insecure-secret-never-use-in-prod';
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

export function signSession(payload: SessionPayload): string {
  const secret = getSecret();
  if (!secret) throw new Error('SESSION_SECRET is not configured');
  const body = b64url(JSON.stringify({ ...payload, iat: Date.now() }));
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  const secret = getSecret();
  if (!secret || !token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;

  const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (!parsed.uid || !parsed.email || typeof parsed.iat !== 'number') return null;
    if (Date.now() - parsed.iat > MAX_AGE_SECONDS * 1000) return null; // expired
    return { uid: parsed.uid, email: parsed.email };
  } catch {
    return null;
  }
}

export function getSession(req: NextRequest): SessionPayload | null {
  return verifySessionToken(req.cookies.get(COOKIE_NAME)?.value);
}

export function setSessionCookie(res: NextResponse, payload: SessionPayload) {
  res.cookies.set(COOKIE_NAME, signSession(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(COOKIE_NAME, '', { httpOnly: true, path: '/', maxAge: 0 });
}

export function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
