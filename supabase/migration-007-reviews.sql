-- ═══════════════════════════════════════════════════════════════════════════
-- Ganga Aarti Booking — Migration 007: Product / partner reviews (ratings)
-- Run in Supabase Dashboard → SQL Editor (once, on the existing project).
--
-- Adds:
--  • reviews — one row per customer review of a partner, written from the
--    User Panel against a confirmed/completed booking. Ratings aggregate
--    at the PARTNER level (marketplace cards, storefronts and the product
--    page all show the partner's average). product_id / booking_id are
--    nullable so a review can outlive the product or booking it came from;
--    user_name is denormalised so review lists need no join.
--  • Reviews are PUBLIC reading material (they render on product cards for
--    visitors who are not logged in), so the table sits behind the same
--    permissive "app access" starter policy as the rest of the app — the
--    app only offers the review form to the booking's own customer.
--
-- Safe to re-run: every statement is idempotent.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Reviews ─────────────────────────────────────────────────────────────────
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid,
  partner_id uuid not null,
  booking_id uuid,
  user_id uuid not null,
  user_name text,
  rating integer not null check (rating between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists reviews_partner_idx
  on public.reviews (partner_id);
create index if not exists reviews_booking_idx
  on public.reviews (booking_id);

-- ── Row Level Security (same permissive "app access" starter policy) ───────
alter table public.reviews enable row level security;
drop policy if exists "app access" on public.reviews;
create policy "app access" on public.reviews for all to anon, authenticated using (true) with check (true);

-- ── Explicit grants (this project does not auto-grant API roles) ───────────
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.reviews to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
