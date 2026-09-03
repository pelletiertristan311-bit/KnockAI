import { getRedis, USER_KEY } from '@/lib/knockai/redis';

// Shared membership check for routes backed by Supabase (pins, drawings,
// signs, live-location) that still need to verify the caller actually
// belongs to the team they're writing into — identity/team membership
// lives in Redis, not Supabase, since this app has no Supabase Auth.
export async function verifyTeamMembership(email: string, teamId: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return true; // Redis not configured — nothing to check against locally.
  const raw = await redis.get(USER_KEY(email));
  const data = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null;
  return data?.user?.teamId === teamId;
}
