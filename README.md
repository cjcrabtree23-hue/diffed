# Diffed

**Rank it. Prove it. Diff 'em.** Tier lists with receipts: rank anything, pass a Larp Check to certify your picks, and see how far your taste is from everyone else's.

This is the Phase 1 starting point: a working tier editor and Larp Check, with no accounts or database yet.

## Run it

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
cp .env.example .env.local   # Supabase URL + publishable key (safe to expose; row level security protects data)
npm run dev
```

Open http://localhost:3000, create an account, pick a template, and start ranking.

## What works now

- **Accounts**: email + password sign-up and sign-in (Supabase Auth). New users get a profile with a unique handle.
- **Tier editor**: drag items into True Peak, Peak, Valid, Mid, Cooked or Never Peak, or tap an item then a tier name. Signed in, every move saves to your account and is logged in your re-rank history. Signed out, the take stays in your browser and moves to your account when you sign in.
- **Larp Check (server-graded)**: questions come from the database at random; answers never reach the browser. 20 seconds per question, 4 of 5 to pass, enforced by the server. Pass = **Certified**. Fail = **Larp detected** and a 24-hour cooldown.
- **Community ranking**: a database view averages every public take, with certified placements counting double. The editor shows your diff and hottest take.

## Project layout

```
src/
  app/
    layout.tsx           site shell, fonts, header
    page.tsx             home: template list
    t/[slug]/page.tsx    a template's tier editor
    globals.css          the Diffed look (dark, acid-lime accent)
  components/
    TierEditor.tsx       drag-and-drop board, tap-to-place, diff stats
    LarpCheck.tsx        quiz flow, timer, pass/fail
    SiteHeader.tsx
  lib/
    data.ts              server-side data loading
    supabase/            browser/server clients, session refresh, DB types
    tiers.ts             tier names and colors, Larp Check rules
    types.ts             shared types
  proxy.ts               refreshes the sign-in session on each request
supabase/migrations/     database schema, Larp Check functions, sample seed
```

## Before launch

- In Supabase → Authentication → URL Configuration, set **Site URL** to the live domain and add it to **Redirect URLs** (it is `http://localhost:3000` by default).
- Supabase's built-in email sender only allows a few emails per hour. Add your own SMTP (e.g. Resend) under Authentication → SMTP before real users sign up.
- Optional: Google and Discord sign-in (Authentication → Providers).

## Next steps

1. **Profiles, follows and feed** (re-rank history is already recorded).
2. **Real templates**: importer for TMDB, IGDB and AniList, with attribution.
3. **Share images** for Stories, X and Discord.
4. **Deploy**: import this repo into Vercel and add the two env vars.
