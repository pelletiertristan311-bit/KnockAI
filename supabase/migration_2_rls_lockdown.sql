-- ============================================================
-- KnockAI — RLS Lockdown (run AFTER migration.sql)
-- Run this in: Supabase Dashboard > SQL Editor
-- ============================================================
--
-- WHY: migration.sql's original policies allow ANY holder of the public
-- anon key (visible in every browser bundle) to INSERT/UPDATE/DELETE any
-- row in pins, drawings and live_locations — for any team, not just their
-- own. All legitimate writes now go through KnockAI's own API routes using
-- the service_role key (which always bypasses RLS regardless of policy),
-- so the anon/authenticated roles no longer need write access at all.
--
-- WHAT THIS DOES NOT FIX: SELECT stays open (`USING (true)`). KnockAI has
-- no Supabase Auth session, so there is no per-request identity Postgres
-- can check — RLS can't tell "this browser belongs to team X" apart from
-- any other browser. That means a client with the anon key can still query
-- rows across teams directly against Supabase's REST API. Fully closing
-- that requires either migrating to Supabase Auth or minting signed JWTs
-- with a team_id claim from KnockAI's own backend — a bigger follow-up
-- task, not a config change. Locking down INSERT/UPDATE/DELETE here still
-- closes the more damaging vandalism/spoofing risk (deleting another
-- team's pins, faking a teammate's GPS location, etc).
--
-- ============================================================

-- pins
DROP POLICY IF EXISTS "Allow all inserts" ON public.pins;
DROP POLICY IF EXISTS "Allow all updates" ON public.pins;
DROP POLICY IF EXISTS "Allow all deletes" ON public.pins;

-- drawings
DROP POLICY IF EXISTS "Allow all inserts drawings" ON public.drawings;
DROP POLICY IF EXISTS "Allow all deletes drawings" ON public.drawings;

-- live_locations
DROP POLICY IF EXISTS "Allow all inserts live_locations" ON public.live_locations;
DROP POLICY IF EXISTS "Allow all updates live_locations" ON public.live_locations;
DROP POLICY IF EXISTS "Allow all deletes live_locations" ON public.live_locations;

-- No new policies are created for these actions on purpose: with RLS
-- enabled and no matching policy, anon/authenticated writes are denied by
-- default, while the service_role key used by KnockAI's API routes bypasses
-- RLS entirely and keeps working unaffected.

-- ============================================================
-- DONE. After running this:
--   - Reading pins/drawings/live_locations still works (SELECT unchanged).
--   - Writing directly with the anon key (bypassing KnockAI's API) now
--     fails for everyone — including KnockAI's own client-side code, which
--     never wrote directly to these tables in the first place.
-- ============================================================
