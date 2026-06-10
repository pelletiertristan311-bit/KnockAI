-- ============================================================
-- KnockAI — Supabase Migration
-- Run this in: Supabase Dashboard > SQL Editor
-- ============================================================
--
-- ⚠️  REQUIRED FOR LIVE APP TO WORK:
--   1. Run this entire file in Supabase > SQL Editor
--   2. Set these env vars in Vercel dashboard:
--        NEXT_PUBLIC_SUPABASE_URL      = https://xxxx.supabase.co
--        NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJ...
--        SUPABASE_SERVICE_ROLE_KEY     = eyJ... (Settings > API > service_role key)
--   3. In Supabase > Database > Replication: confirm supabase_realtime
--      publication includes: pins, drawings, live_locations tables
--
-- ============================================================

-- 1. Create pins table
CREATE TABLE IF NOT EXISTS public.pins (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  placed_by_name TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sale', 'not_interested', 'call_back', 'ai_knocked')),
  address TEXT,
  notes TEXT,
  placed_by_ai BOOLEAN DEFAULT false,
  placed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Index for fast team queries
CREATE INDEX IF NOT EXISTS pins_team_id_idx ON public.pins (team_id);
CREATE INDEX IF NOT EXISTS pins_placed_at_idx ON public.pins (placed_at DESC);

-- 3. Enable Row Level Security
ALTER TABLE public.pins ENABLE ROW LEVEL SECURITY;

-- 4. Permissive policies (all team members can read/write)
DROP POLICY IF EXISTS "Allow all reads" ON public.pins;
CREATE POLICY "Allow all reads" ON public.pins
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow all inserts" ON public.pins;
CREATE POLICY "Allow all inserts" ON public.pins
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all updates" ON public.pins;
CREATE POLICY "Allow all updates" ON public.pins
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow all deletes" ON public.pins;
CREATE POLICY "Allow all deletes" ON public.pins
  FOR DELETE USING (true);

-- 5. Enable Realtime on the pins table
-- Go to: Supabase Dashboard > Database > Replication > supabase_realtime publication
-- And add the "pins" table. Or run:
ALTER PUBLICATION supabase_realtime ADD TABLE public.pins;

-- ============================================================
-- drawings table (street drawing tool)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.drawings (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT,
  coordinates JSONB NOT NULL,
  color TEXT NOT NULL DEFAULT '#EF4444',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS drawings_team_id_idx ON public.drawings (team_id);

ALTER TABLE public.drawings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all reads drawings" ON public.drawings;
CREATE POLICY "Allow all reads drawings" ON public.drawings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow all inserts drawings" ON public.drawings;
CREATE POLICY "Allow all inserts drawings" ON public.drawings FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all deletes drawings" ON public.drawings;
CREATE POLICY "Allow all deletes drawings" ON public.drawings FOR DELETE USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.drawings;

-- ============================================================
-- live_locations table (real-time employee location tracking)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.live_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  team_id TEXT NOT NULL,
  lat FLOAT8 NOT NULL,
  lng FLOAT8 NOT NULL,
  heading FLOAT4,
  is_active BOOLEAN DEFAULT true,
  clocked_in_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- One active row per (user, team) — enforces upsert-by-user_id+team_id
CREATE UNIQUE INDEX IF NOT EXISTS live_locations_user_team_idx
  ON public.live_locations (user_id, team_id);

CREATE INDEX IF NOT EXISTS live_locations_team_active_idx
  ON public.live_locations (team_id, is_active);

ALTER TABLE public.live_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all reads live_locations" ON public.live_locations;
CREATE POLICY "Allow all reads live_locations" ON public.live_locations
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow all inserts live_locations" ON public.live_locations;
CREATE POLICY "Allow all inserts live_locations" ON public.live_locations
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all updates live_locations" ON public.live_locations;
CREATE POLICY "Allow all updates live_locations" ON public.live_locations
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow all deletes live_locations" ON public.live_locations;
CREATE POLICY "Allow all deletes live_locations" ON public.live_locations
  FOR DELETE USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.live_locations;

-- ============================================================
-- DONE. Add these env vars to Vercel:
--   NEXT_PUBLIC_SUPABASE_URL      = https://xxx.supabase.co
--   NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJ...
--   SUPABASE_SERVICE_ROLE_KEY     = eyJ... (for server-side writes)
-- ============================================================
