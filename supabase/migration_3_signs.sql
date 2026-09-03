-- ============================================================
-- KnockAI — Signs table (team-shared map markers)
-- Run this in: Supabase Dashboard > SQL Editor
-- Run AFTER migration.sql and migration_2_rls_lockdown.sql
-- ============================================================
--
-- Signs ("only managers and owners can place signs") were previously saved
-- to localStorage only — never actually shared with the team despite the UI
-- implying otherwise. This table plus /api/knockai/signs makes them real.
--
-- Like pins/drawings/live_locations: SELECT is open (no per-request
-- identity for Postgres to check without a bigger auth migration — see
-- migration_2's notes), but no insert/update/delete policy is created for
-- anon/authenticated. All writes go through KnockAI's own API route using
-- the service_role key, which bypasses RLS.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.signs (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS signs_team_id_idx ON public.signs (team_id);

ALTER TABLE public.signs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all reads signs" ON public.signs;
CREATE POLICY "Allow all reads signs" ON public.signs FOR SELECT USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.signs;
