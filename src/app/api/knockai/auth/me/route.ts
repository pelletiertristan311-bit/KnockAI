import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/knockai/session';

// Lets the client check whether its stored "logged in" state still matches a
// valid server session — used once on app startup to force a clean re-login
// for accounts that were authenticated before session cookies existed.
export async function GET(req: NextRequest) {
  const session = getSession(req);
  return NextResponse.json({ authenticated: !!session });
}
