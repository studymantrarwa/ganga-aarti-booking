-- ═══════════════════════════════════════════════════════════════════════════
-- Ganga Aarti Booking — Migration 008: Product gallery photos + variants
-- Run in Supabase Dashboard → SQL Editor (once, on the existing project).
--
-- Adds (Flipkart-seller style product richness):
--  • products.images   — jsonb array of photo URLs (max 5 in the app).
--    The FIRST photo is the cover; products.image / products.image_url stay
--    in use and are kept synced to images[0] by the app for backward
--    compatibility (cards, SEO and older code read the single fields).
--  • products.variants — jsonb array of { label, price } options, e.g.
--    [{ "label": "Premium Thali", "price": 550 }]. A customer who picks a
--    variant on the product page books at that variant's price; the base
--    products.price remains the default / "se shuru" price.
--
-- Bookings are NOT touched — a chosen variant rides in the booking title
-- (and amount), so no booking columns are needed.
--
-- Safe to re-run: every statement is idempotent.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.products add column if not exists images jsonb not null default '[]'::jsonb;
alter table public.products add column if not exists variants jsonb not null default '[]'::jsonb;

-- Backfill: jin products ke paas pehle se single photo (image_url / image)
-- hai, unki gallery usi photo se shuru ho jaye — taaki product page par
-- gallery turant dikhe. Sirf khaali gallery wali rows chhuti hain.
update public.products
set images = jsonb_build_array(coalesce(nullif(image_url, ''), nullif(image, '')))
where images = '[]'::jsonb
  and coalesce(nullif(image_url, ''), nullif(image, '')) is not null;
