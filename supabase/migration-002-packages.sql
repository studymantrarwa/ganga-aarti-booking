-- ═══════════════════════════════════════════════════════════════════════════
-- Ganga Aarti Booking — Migration 002: admin-editable Ganga Aarti packages
-- Run in Supabase Dashboard → SQL Editor (once, on the existing project).
-- Creates the `packages` table, seeds the 3 Ganga Aarti packages that used
-- to be hard-coded in src/data/catalog.js, enables RLS with the same
-- "app access" policy as the other tables, and adds the explicit grants
-- this project needs for the anon/authenticated API roles.
-- Safe to re-run: table/seed/policy statements are idempotent.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.packages (
  id text primary key,
  name text not null,
  hindi text default '',
  tagline text default '',
  price integer not null default 0,
  unit text not null default 'per event',
  category text not null default 'ganga-aarti',
  image text default '',
  features jsonb not null default '[]'::jsonb,
  popular boolean not null default false,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

insert into public.packages (id, name, hindi, price, unit, category, image, features, popular, sort_order) values
  ('pkg-shubh-aarti', 'Shubh Aarti Ceremony', 'शुभ आरती', 11000, 'per event', 'ganga-aarti', '/images/couple-aarti.jpg',
   '["5 purohiton dwara Ganga Aarti", "Dulha-dulhan sankalp aur aashirwad", "Diya, phool, prasad samagri shamil", "Venue par vyavastha (Varanasi kshetra)", "Aarti avadhi ~30 minute"]'::jsonb, false, 0),
  ('pkg-family-aarti', 'Family Ganga Aarti', 'पारिवारिक गंगा आरती', 21000, 'per event', 'ganga-aarti', '/images/hero-aarti.jpg',
   '["7 purohiton dwara bhavya Ganga Aarti", "Poora parivaar shamil — sankalp sabke naam se", "Ganga jal kalash aur prasad vyavastha", "Venue ya Dashashwamedh/Assi ghat vikalp", "Shankhnaad aur ghanta-ghadiyal ke saath", "Aarti avadhi ~45 minute"]'::jsonb, true, 1),
  ('pkg-grand-aarti', 'Grand Wedding Aarti', 'भव्य विवाह आरती', 51000, 'per event', 'ganga-aarti', '/images/hero-aarti.jpg',
   '["11 purohiton dwara mahaaarti", "Vishesh sajawat — 501 diya aur phool", "Dulha-dulhan ke liye Ganga snan-sankalp (ghat par)", "Live streaming ghar baithe parivaar ke liye", "Prasad aur Ganga jal ghar tak", "Poora event coordinator shamil"]'::jsonb, false, 2)
on conflict (id) do nothing;

-- Row Level Security — same permissive starter policy as the other tables
-- (roles are enforced in app code; tighten before handling real payments).
alter table public.packages enable row level security;
drop policy if exists "app access" on public.packages;
create policy "app access" on public.packages for all to anon, authenticated using (true) with check (true);

-- Explicit grants (this project does not auto-grant API roles on new tables).
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.packages to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
