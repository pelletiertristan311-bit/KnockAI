-- ============================================================
-- KnockAI — Add "Soumission" and "Carte d'affaire" pin types
-- Run this in: Supabase Dashboard > SQL Editor
-- ============================================================
--
-- WHY: pins.status has a CHECK constraint limiting it to the original
-- 4 pin types. The app now supports two more: 'quote' (Soumission) and
-- 'business_card' (Carte d'affaire). Without this, inserting a pin with
-- either new type is rejected by Postgres.
--
-- ============================================================

ALTER TABLE public.pins DROP CONSTRAINT IF EXISTS pins_status_check;

ALTER TABLE public.pins ADD CONSTRAINT pins_status_check
  CHECK (status IN ('sale', 'not_interested', 'call_back', 'ai_knocked', 'quote', 'business_card'));
