-- ============================================================
-- KnockAI — Add photo to signs
-- Run this in: Supabase Dashboard > SQL Editor
-- Run AFTER migration_3_signs.sql
-- ============================================================
--
-- WHY: signs are now created by photographing the physical sign where it
-- was planted (the photo's capture-time GPS position places the marker) —
-- the photo itself is stored alongside the sign so anyone can see it when
-- tapping the marker. Stored as a compressed base64 data URI, same pattern
-- already used for profile photos and team logos in this app.
--
-- ============================================================

ALTER TABLE public.signs ADD COLUMN IF NOT EXISTS photo_url TEXT;
