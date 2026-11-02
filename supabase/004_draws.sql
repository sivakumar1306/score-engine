-- Run once in Supabase SQL Editor. Adds draws for team matches. Safe to re-run.
alter table public.matches add column if not exists is_draw boolean not null default false;
