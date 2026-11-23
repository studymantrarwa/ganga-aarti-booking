-- ═══════════════════════════════════════════════════════════════════════════
-- Ganga Aarti Booking — Migration 005: Push notifications (Firebase / FCM)
-- Run in Supabase Dashboard → SQL Editor (once, on the existing project).
--
-- Adds:
--  • device_tokens — one row per browser/device that turned ON
--    notifications. The client registers an FCM registration token
--    (Firebase Cloud Messaging) and stores it here; user_id is the logged-in
--    profile when known, anonymous subscribers keep user_id null and only
--    receive "sabko" (audience = all) broadcasts.
--  • The Vercel serverless function /api/send-push reads this table with the
--    admin's own JWT (RLS below is the same permissive "app access" starter
--    policy as the rest of the app), sends via the FCM HTTP v1 API, and
--    deletes tokens FCM reports as UNREGISTERED.
--
-- Safe to re-run: every statement is idempotent.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Device tokens (FCM) ─────────────────────────────────────────────────────
create table if not exists public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  token text unique not null,
  platform text not null default 'web',
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists device_tokens_user_idx
  on public.device_tokens (user_id);

-- ── Row Level Security (same permissive "app access" starter policy) ───────
alter table public.device_tokens enable row level security;
drop policy if exists "app access" on public.device_tokens;
create policy "app access" on public.device_tokens for all to anon, authenticated using (true) with check (true);

-- ── Explicit grants (this project does not auto-grant API roles) ───────────
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.device_tokens to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
