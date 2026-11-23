-- ═══════════════════════════════════════════════════════════════════════════
-- Ganga Aarti Booking — Migration 006: User ↔ Partner chat
-- Run in Supabase Dashboard → SQL Editor (once, on the existing project).
--
-- Adds:
--  • messages — one row per chat message between a customer (user) and a
--    partner, attached to a booking or a quotation. thread_key groups a
--    conversation: "booking:<id>" or "quotation:<id>". sender_id /
--    receiver_id are profile ids; sender_name is denormalised so the chat
--    UI does not need a join. read_at is reserved for read receipts
--    (the app may set it when a thread is opened; null = unread).
--  • Chat messages also trigger a push notification to the receiver via
--    /api/send-push (targeted mode) — the server function verifies that
--    sender and receiver actually share a booking or a quotation before
--    sending, so the table itself stays behind the same permissive
--    "app access" starter policy as the rest of the app.
--
-- Safe to re-run: every statement is idempotent.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Chat messages ───────────────────────────────────────────────────────────
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

-- ── Row Level Security (same permissive "app access" starter policy) ───────
alter table public.messages enable row level security;
drop policy if exists "app access" on public.messages;
create policy "app access" on public.messages for all to anon, authenticated using (true) with check (true);

-- ── Explicit grants (this project does not auto-grant API roles) ───────────
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.messages to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
