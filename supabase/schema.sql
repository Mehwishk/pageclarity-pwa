-- PageClarity: saved book analyses. Run once in Supabase -> SQL Editor.
-- Holds book details and AI analyses only; no child or parent data.

create table if not exists public.book_analyses (
  book_key   text primary key,          -- normalized "title|author", shared by all editions
  title      text not null,
  author     text,
  isbn       text,                      -- the edition first analyzed, for reference
  analysis   jsonb not null,
  model      text not null,
  source     text not null default 'live' check (source in ('live', 'batch')),
  created_at timestamptz not null default now()
);

-- Row level security on, with no policies: only the server (service role key)
-- can read or write. The browser never talks to this table directly.
alter table public.book_analyses enable row level security;
