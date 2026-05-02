# High scores on Vercel

Leaderboards use a **Neon Postgres** database (the default when you add “Postgres” or “Neon” from the Vercel dashboard).

## 1. Create the database

1. In [Vercel Dashboard](https://vercel.com) → your project → **Storage** → **Create Database** → choose **Neon** (or Postgres).
2. Connect it to the project so **`POSTGRES_URL`** (and often `DATABASE_URL`) are injected into production and preview environments.

## 2. Create the table

1. Open the Neon console from the storage card, or use **SQL Editor**.
2. Paste and run the contents of [`sql/scores.sql`](../sql/scores.sql) in this repo.

## 3. Optional: salt for IP hashing

Set **`SCORE_IP_SALT`** in Vercel → Project → **Environment Variables** (any long random string). This salts hashed IPs in the database. If unset, a default dev salt is used (fine for local dev; **set in production** for privacy).

## 4. Headers (country + IP)

On Vercel, API routes can read:

- **`x-forwarded-for`** — client IP (first hop).
- **`x-vercel-ip-country`** — ISO 3166-1 alpha-2 country (when available).

Locally, country may be missing; the UI shows a neutral globe emoji.

## 5. Local development

```bash
# .env.local
POSTGRES_URL=postgresql://...
SCORE_IP_SALT=your-secret-salt
```

If `POSTGRES_URL` is missing, score APIs return empty leaderboards and **do not** persist submissions (useful for UI-only dev).

## Alternatives

- **Turso / libSQL**, **Supabase**, or **PlanetScale** — swap the queries in `src/app/api/scores/*` and keep the same JSON shape expected by the client.
