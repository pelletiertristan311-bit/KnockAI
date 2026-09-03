import { NextRequest, NextResponse } from 'next/server';
import { getRedis } from './redis';

// Simple fixed-window rate limiter built on the Redis instance the app
// already has (no new dependency). Fails open when Redis isn't configured,
// matching the rest of the app's "no backend configured" behavior.
export async function checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return true;
  const rlKey = `knockai:ratelimit:${key}`;
  const count = await redis.incr(rlKey);
  if (count === 1) {
    await redis.expire(rlKey, windowSeconds);
  }
  return count <= limit;
}

export function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

export function tooManyRequests() {
  return NextResponse.json({ error: 'Trop de tentatives — réessaie dans quelques minutes.' }, { status: 429 });
}
