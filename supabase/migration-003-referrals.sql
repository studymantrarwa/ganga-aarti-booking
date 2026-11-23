-- ═══════════════════════════════════════════════════════════════════════════
-- Ganga Aarti Booking — Migration 003: partner referral system
-- Run in Supabase Dashboard → SQL Editor (once, on the existing project).
--
-- Model:
--  • Every partner profile gets a unique referral_code (e.g. GAB-KASHI).
--  • A new partner who signs up with a code gets referred_by = referrer's
--    profile id and referral_since = sign-up time on their profile.
--  • For 12 months from referral_since, the referrer earns 5% of every
--    booking amount of the referred partner — one referral_earnings ledger
--    row per booking, written by the app when the booking is created.
-- Safe to re-run: column/table/index/policy statements are idempotent.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.profiles add column if not exists referral_code text;
alter table public.profiles add column if not exists referred_by uuid references public.profiles (id) on delete set null;
alter table public.profiles add column if not exists referral_since timestamptz;

create unique index if not exists profiles_referral_code_key
  on public.profiles (referral_code)
  where referral_code is not null and referral_code <> '';

create table if not exists public.referral_earnings (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles (id) on delete cascade,
  referred_partner_id uuid not null references public.profiles (id) on delete cascade,
  booking_id uuid references public.bookings (id) on delete set null,
  amount integer not null default 0,
  created_at timestamptz not null default now()
);

-- Row Level Security — same permissive starter policy as the other tables
-- (roles are enforced in app code; tighten before handling real payments).
alter table public.referral_earnings enable row level security;
drop policy if exists "app access" on public.referral_earnings;
create policy "app access" on public.referral_earnings for all to anon, authenticated using (true) with check (true);

-- Explicit grants (this project does not auto-grant API roles on new tables).
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.referral_earnings to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
