# Score Engine — Smash Karts tournaments

Next.js + Supabase + Gemini (free tier). Solo tournaments are ranked by kills and team tournaments by wins. All kills count toward the all-time leaderboard. AI reads match screenshots and crops karts.

## Setup
1. **Database:** Supabase → SQL Editor → paste `supabase/schema.sql` → Run.
2. **Auth:** Supabase → Authentication → Providers → Email. Turn off "Confirm email" if you want players to add their kart right after signing up. Under URL Configuration, set the Site URL to your Vercel URL.
3. **Deploy:** vercel.com → Add New Project → import this repo → add the env vars from `.env.example` → Deploy.

## Local dev
    cp .env.example .env.local   # fill in keys
    npm install && npm run dev
