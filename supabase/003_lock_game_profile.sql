-- Run once in Supabase SQL Editor (after 002). Safe to re-run.
-- Players may only edit username, game id and kart. In-game stats (sk_*) are
-- written only by the server, straight from the AI's reading of the screenshot.

revoke update on public.profiles from authenticated, anon;
grant update (username, game_id, kart_url) on public.profiles to authenticated;
