# eleMENTAL

A sleek, snappy periodic-table learning game. Drag element cards from your hand into the right slot on the table, build streaks, and master all 118.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- `@dnd-kit/core` for drag and drop
- Deploy target: Vercel (zero-config — push the repo to GitHub and import on Vercel)

## Game design

- **Hand:** 3 cards visible at a time. They appear greyscale until placed.
- **Card:** shows atomic number, symbol, name. After it lands in the table, it locks into the true cell, colored by category.
- **Scoring:** smooth Chebyshev-distance falloff:
  - `base = round(1000 * max(0, 1 - dist/4))`
  - `final = round(base * (1 + Z/118) * streakMult)`
- **Streaks** (consecutive *exact* drops):
  - 3 in a row → ×1.5
  - 5 in a row → ×2
  - 8 in a row → ×3
  - Any non-exact drop resets the streak.
- **Modes:**
  - **Daily 20** — same 20 elements for everyone once daily puzzles ship; today’s build still shuffles randomly.
  - **Full Deck** — all 118 in random order.
- After each drop, the card auto-corrects to its true cell so the user is always learning the correct position.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Deploy

```bash
git init && git add . && git commit -m "init"
# create a repo on GitHub, push, then import the repo on Vercel.
```

No environment variables required.
# elemental-game
