# Diffed

**Rank it. Prove it. Diff 'em.** Tier lists with receipts: rank anything, pass a Larp Check to certify your picks, and see how far your taste is from everyone else's.

This is the Phase 1 starting point: a working tier editor and Larp Check, with no accounts or database yet.

## Run it

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:3000, pick a template, and start ranking.

## What works now

- **Tier editor**: drag items into True Peak, Peak, Valid, Mid, Cooked or Never Peak. On a phone, tap an item and then tap a tier name.
- **Larp Check**: select Attack on Titan or Steins;Gate to take a 5-question quiz (20 seconds per question, 4 of 5 to pass). Passing marks the placement **Certified**. Failing shows **Larp detected** and starts a 24-hour cooldown.
- **Your diff vs. the community**: shows how far your placements are from the community ranking, and your hottest take.
- **Saved in this browser**: your take is kept in localStorage until accounts exist.

The community rankings and the two templates are **sample data** in `src/data/templates.ts`.

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
  data/templates.ts      sample templates, quiz questions, community data
  lib/
    tiers.ts             tier names and colors, Larp Check rules
    types.ts             shared types
```

## Next steps (Phase 1)

1. **Accounts and database**: Supabase (Postgres + auth with Google/Discord sign-in). Move placements, certifications and cooldowns from localStorage to tables (see the data model in the product spec).
2. **Real templates**: an importer that builds official templates from TMDB, IGDB and AniList, with attribution.
3. **Community ranking**: compute real averages from everyone's placements, with certified placements weighted higher.
4. **Profiles, follows and feed.**
5. **Share images**: generate a clean PNG of a tier list for Stories, X and Discord.
6. **Deploy**: push to GitHub, then import the repo into Vercel.

Larp Check cooldowns are only enforced in the browser for now. Real enforcement moves to the server once accounts exist.
