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
  created_at timestamptz not null default now()
);

-- Service categories are defined in the app (src/data/catalog.js) and stored
-- on products/quotations as slugs; this table exists for admin-managed
-- category metadata if you want to move them into the database later.
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
  status text not null default 'pending' check (status in ('pending','confirmed','cancelled','completed')),
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

do $$
declare t text;
begin
  foreach t in array array['profiles','products','quotations','quotation_replies','bookings','commission_settings','categories','enquiries'] loop
    execute format('drop policy if exists "app access" on public.%I', t);
    execute format('create policy "app access" on public.%I for all to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;
