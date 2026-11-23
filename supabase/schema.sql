-- ═══════════════════════════════════════════════════════════════════════════
-- Ganga Aarti Booking — Supabase schema
-- Run in Supabase Dashboard → SQL Editor. Then set in .env:
--   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
-- (Without them the app runs in local demo mode — no database needed.)
-- ═══════════════════════════════════════════════════════════════════════════

-- Profiles: one row per Supabase Auth user. role ∈ user | partner | admin.
-- The FIRST profile created (through the app sign-up) is given role 'admin'
-- by the app itself (it checks the row count before inserting).
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null unique,
  role text not null default 'user' check (role in ('user','partner','admin')),
  phone text default '',
  city text default '',
  business_name text default '',
  referral_code text,
  referred_by uuid references public.profiles (id) on delete set null,
  referral_since timestamptz,
  slug text,
  roles jsonb not null default '[]'::jsonb,
  whatsapp text default '',
  created_at timestamptz not null default now()
);
create unique index if not exists profiles_referral_code_key
  on public.profiles (referral_code)
  where referral_code is not null and referral_code <> '';
create unique index if not exists profiles_slug_key
  on public.profiles (slug)
  where slug is not null and slug <> '';

-- Service categories: static metadata (icon, description, FAQs) lives in the
-- app (src/data/catalog.js); name/hindi/starting_price/unit/active are
-- admin-editable and read from THIS table by the app in Supabase mode.
create table if not exists public.categories (
  slug text primary key,
  name text not null,
  hindi text default '',
  starting_price integer not null default 0,
  unit text default 'per event',
  active boolean not null default true
);
insert into public.categories (slug, name, hindi, starting_price, unit) values
  ('ganga-aarti','Ganga Aarti','गंगा आरती',11000,'per event'),
  ('pandit-ji','Pandit Ji','पंडित जी',5100,'per event'),
  ('gaadi','Gaadi (Wedding Cars)','गाड़ी',2500,'per day'),
  ('tent-decoration','Tent & Decoration','टेंट व सजावट',15000,'per event'),
  ('dj-sound','DJ & Sound','डीजे व साउंड',8000,'per event'),
  ('catering','Catering','कैटरिंग',350,'per plate'),
  ('photography','Photography & Video','फोटोग्राफी',15000,'per event'),
  ('band-baja','Band Baja','बैंड बाजा',5100,'per event')
on conflict (slug) do nothing;

-- Partner products / services.
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.profiles (id) on delete cascade,
  partner_name text not null,
  category text not null,
  title text not null,
  price integer not null default 0,
  unit text not null default 'per event',
  city text default '',
  description text default '',
  image text default '',
  image_url text default '',
  images jsonb not null default '[]'::jsonb,
  variants jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Quotation requests from users.
create table if not exists public.quotations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  user_name text not null,
  category text not null,
  product_id uuid references public.products (id) on delete set null,
  title text default '',
  date date,
  city text default '',
  venue text default '',
  guests integer default 0,
  notes text default '',
  partner_id uuid references public.profiles (id) on delete set null,
  source text not null default 'website',
  status text not null default 'open' check (status in ('open','accepted','closed')),
  created_at timestamptz not null default now()
);

-- Partner replies (price quotes) on a quotation.
create table if not exists public.quotation_replies (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations (id) on delete cascade,
  partner_id uuid not null references public.profiles (id) on delete cascade,
  partner_name text not null,
  price integer not null,
  message text default '',
  created_at timestamptz not null default now(),
  unique (quotation_id, partner_id)
);

-- Bookings (created when a user accepts a quotation reply, or directly).
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  user_name text not null,
  partner_id uuid not null references public.profiles (id) on delete cascade,
  partner_name text not null,
  quotation_id uuid references public.quotations (id) on delete set null,
  category text not null,
  title text not null,
  date date,
  city text default '',
  venue text default '',
  guests integer default 0,
  amount integer not null default 0,
  status text not null default 'pending' check (status in ('pending','pending_partner','pending_customer','confirmed','cancelled','completed','rejected')),
  payment_status text not null default 'unpaid',
  advance_amount integer not null default 0,
  payment_method text default '',
  transaction_id text default '',
  commission_amount integer,
  source text not null default 'website',
  reject_reason text default '',
  created_at timestamptz not null default now()
);

-- Commission settings: scope ∈ default | category | partner.
-- key = 'default' | category slug | partner profile id. Partner wins over
-- category, category wins over default (enforced in app code).
create table if not exists public.commission_settings (
  scope text not null,
  key text not null,
  pct numeric not null default 10,
  primary key (scope, key)
);
insert into public.commission_settings (scope, key, pct) values ('default','default',10), ('category','ganga-aarti',12)
on conflict do nothing;

-- Contact form enquiries.
create table if not exists public.enquiries (
  id uuid primary key default gen_random_uuid(),
  name text, phone text, email text, message text,
  created_at timestamptz not null default now()
);

-- Ganga Aarti packages — admin-editable from the Admin Panel (name, price,
-- features, active). Seeded with the 3 packages from the app catalog.
-- (Existing projects: run supabase/migration-002-packages.sql instead.)
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
  ('pkg-grand-aarti', 'Grand Wedding Aarti', 'भव्य विवाह आरती', 51000, 'per event', 'ganga-aarti', '/images/grand-aarti.jpg',
   '["11 purohiton dwara mahaaarti", "Vishesh sajawat — 501 diya aur phool", "Dulha-dulhan ke liye Ganga snan-sankalp (ghat par)", "Live streaming ghar baithe parivaar ke liye", "Prasad aur Ganga jal ghar tak", "Poora event coordinator shamil"]'::jsonb, false, 2)
on conflict (id) do nothing;

-- Referral earnings ledger — one row per booking of a referred partner:
-- the referrer earns 5% of the booking amount for 12 months from the
-- referred partner's referral_since date. Written by the app (store code)
-- when a booking is created. (Existing projects: migration-003-referrals.sql.)
create table if not exists public.referral_earnings (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles (id) on delete cascade,
  referred_partner_id uuid not null references public.profiles (id) on delete cascade,
  booking_id uuid references public.bookings (id) on delete set null,
  amount integer not null default 0,
  created_at timestamptz not null default now()
);

-- Site settings (key/value) — admin-editable contact details, payment
-- config and the flat manual-booking commission (₹). (Existing projects:
-- run supabase/migration-004-platform.sql instead.)
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

-- Advance payments against a booking (UPI manual verification, or Razorpay).
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

-- FCM device tokens (migration 005) — one row per browser/device that
-- turned ON notifications (Firebase Cloud Messaging registration token).
-- user_id is null for anonymous subscribers.
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

-- User ↔ partner chat messages (migration 006) — one row per message,
-- grouped by thread_key: "booking:<id>" or "quotation:<id>".
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_key text not null,
  booking_id uuid,
  quotation_id uuid,
  sender_id uuid not null,
  sender_name text,
  receiver_id uuid not null,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists messages_thread_idx
  on public.messages (thread_key, created_at);

-- Customer reviews (migration 007) — one row per review of a partner,
-- written against a confirmed/completed booking. Ratings aggregate at the
-- PARTNER level; product_id / booking_id are nullable so a review can
-- outlive the product or booking it came from.
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

-- Product image storage bucket (public) — partners upload product photos.
insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true)
on conflict (id) do nothing;
drop policy if exists "product images public read" on storage.objects;
create policy "product images public read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'product-images');
drop policy if exists "product images insert" on storage.objects;
create policy "product images insert" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'product-images');
drop policy if exists "product images update" on storage.objects;
create policy "product images update" on storage.objects
  for update to anon, authenticated using (bucket_id = 'product-images') with check (bucket_id = 'product-images');
drop policy if exists "product images delete" on storage.objects;
create policy "product images delete" on storage.objects
  for delete to anon, authenticated using (bucket_id = 'product-images');

-- ── Row Level Security ──────────────────────────────────────────────────────
-- Enable RLS and add permissive policies for the anon/authenticated roles.
-- NOTE: these starter policies are intentionally simple (the app is a small
-- marketplace MVP and enforces roles in app code). Tighten them before
-- handling real payments: e.g. partners should only update their own
-- products (partner_id = auth.uid()), users only their own quotations, and
-- only admins should write commission_settings.
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.quotations enable row level security;
alter table public.quotation_replies enable row level security;
alter table public.bookings enable row level security;
alter table public.commission_settings enable row level security;
alter table public.categories enable row level security;
alter table public.enquiries enable row level security;
alter table public.packages enable row level security;
alter table public.referral_earnings enable row level security;
alter table public.site_settings enable row level security;
alter table public.payments enable row level security;
alter table public.device_tokens enable row level security;
alter table public.messages enable row level security;
alter table public.reviews enable row level security;

do $$
declare t text;
begin
  foreach t in array array['profiles','products','quotations','quotation_replies','bookings','commission_settings','categories','enquiries','packages','referral_earnings','site_settings','payments','device_tokens','messages','reviews'] loop
    execute format('drop policy if exists "app access" on public.%I', t);
    execute format('create policy "app access" on public.%I for all to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- Explicit grants for the API roles (this project does not auto-grant them).
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
