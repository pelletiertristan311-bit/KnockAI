import { Redis } from '@upstash/redis';

let _redis: Redis | null = null;

export function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  if (!_redis) {
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return _redis;
}

export const USER_KEY = (email: string) => `knockai:user:${email}`;
export const TEAM_KEY = (teamId: string) => `knockai:team:${teamId}`;
export const AUTH_KEY = (email: string) => `knockai:auth:${email.toLowerCase().trim()}`;
export const INVITE_KEY = (code: string) => `knockai:invite:${code.toUpperCase().trim()}`;
export const RESET_KEY = (token: string) => `knockai:reset:${token}`;
export const TTL = 60 * 60 * 24 * 365 * 10;
