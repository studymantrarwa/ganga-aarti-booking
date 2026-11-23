-- ═══════════════════════════════════════════════════════════════════════════
-- Ganga Aarti Booking — Migration 004: platform upgrade
-- Run in Supabase Dashboard → SQL Editor (once, on the existing project).
--
-- Adds:
--  • site_settings (key/value) — admin-editable contact details, UPI ID,
--    Razorpay public key id and the flat manual-booking commission (₹).
--  • payments table — advance payments against bookings (UPI / Razorpay).
--  • products.image_url — partner-uploaded product photo (Storage URL).
--  • profiles.slug — partner storefront address (/p/<slug> on the site).
--  • bookings: payment_status / advance_amount / payment_method /
--    transaction_id / commission_amount / source.
--  • quotations: partner_id (storefront preset) / source.
--  • Storage bucket 'product-images' (public) + object policies.
--
-- Safe to re-run: every statement is idempotent. No existing column types
-- are changed.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Site settings ───────────────────────────────────────────────────────────
create table if not exists public.site_settings (
  key text primary key,
  value text not null default ''
);
insert into public.site_settings (key, value) values
  ('contact_phone', '+91 90000 00000'),
  ('contact_email', 'namaste@gangaaartibooking.in'),
  ('whatsapp', '919000000000'),
  ('upi_id', ''),
  ('razorpay_key_id', ''),
  ('manual_booking_commission', '50')
on conflict (key) do nothing;

-- ── Payments (advance payments against a booking) ───────────────────────────
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  amount integer not null default 0,
  method text not null default 'upi' check (method in ('upi','razorpay')),
  txn_id text default '',
  status text not null default 'pending' check (status in ('pending','verified')),
  created_at timestamptz not null default now()
);

-- ── Products: uploaded photo URL ────────────────────────────────────────────
alter table public.products add column if not exists image_url text default '';

-- ── Profiles: partner storefront slug (/p/<slug>) + multi-role categories ──
alter table public.profiles add column if not exists slug text;
-- A partner can offer MULTIPLE services (e.g. Pandit Ji + DJ + Tent):
-- roles is a jsonb array of category slugs chosen at sign-up / in the panel.
alter table public.profiles add column if not exists roles jsonb not null default '[]'::jsonb;
-- Partner WhatsApp number for the storefront contact buttons (falls back to
-- the profile phone when empty).
alter table public.profiles add column if not exists whatsapp text default '';
create unique index if not exists profiles_slug_key
  on public.profiles (slug)
  where slug is not null and slug <> '';

-- ── Bookings: payment + manual-commission + source columns ─────────────────
alter table public.bookings add column if not exists payment_status text not null default 'unpaid';
alter table public.bookings add column if not exists advance_amount integer not null default 0;
alter table public.bookings add column if not exists payment_method text default '';
alter table public.bookings add column if not exists transaction_id text default '';
alter table public.bookings add column if not exists commission_amount integer;
alter table public.bookings add column if not exists source text not null default 'website';
alter table public.bookings add column if not exists reject_reason text default '';
-- Booking confirmation flow adds stages pending_partner / pending_customer /
-- rejected — widen the old status CHECK so the new values are allowed.
alter table public.bookings drop constraint if exists bookings_status_check;
alter table public.bookings add constraint bookings_status_check
  check (status in ('pending','pending_partner','pending_customer','confirmed','cancelled','completed','rejected'));

-- ── Quotations: storefront preset partner + source ─────────────────────────
alter table public.quotations add column if not exists partner_id uuid references public.profiles (id) on delete set null;
alter table public.quotations add column if not exists source text not null default 'website';

-- ── Row Level Security (same permissive "app access" starter policy) ───────
alter table public.site_settings enable row level security;
alter table public.payments enable row level security;
drop policy if exists "app access" on public.site_settings;
create policy "app access" on public.site_settings for all to anon, authenticated using (true) with check (true);
drop policy if exists "app access" on public.payments;
create policy "app access" on public.payments for all to anon, authenticated using (true) with check (true);

-- ── Product image storage bucket (public) ───────────────────────────────────
insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "product images public read" on storage.objects;
create policy "product images public read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'product-images');
drop policy if exists "product images insert" on storage.objects;
create policy "product images insert" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'product-images');
drop policy if exists "product images update" on storage.objects;
create policy "product images update" on storage.objects
  for update to anon, authenticated
  using (bucket_id = 'product-images') with check (bucket_id = 'product-images');
drop policy if exists "product images delete" on storage.objects;
create policy "product images delete" on storage.objects
  for delete to anon, authenticated
  using (bucket_id = 'product-images');

-- ── Explicit grants (this project does not auto-grant API roles) ───────────
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.site_settings to anon, authenticated;
grant select, insert, update, delete on public.payments to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
