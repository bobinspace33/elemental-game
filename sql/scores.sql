-- Run in Neon / Vercel Postgres SQL editor (or psql) after creating a database.
-- Env: set POSTGRES_URL or DATABASE_URL in Vercel project settings.

CREATE TABLE IF NOT EXISTS score_entries (
  id BIGSERIAL PRIMARY KEY,
  mode TEXT NOT NULL CHECK (mode IN ('daily20', 'fullDeck')),
  day_key TEXT NOT NULL,
  initials TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0),
  ip_fingerprint TEXT NOT NULL,
  country_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- At most one Daily 20 row per UTC day per fingerprinted IP.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_daily20_day_ip
  ON score_entries (day_key, ip_fingerprint)
  WHERE mode = 'daily20';

CREATE INDEX IF NOT EXISTS idx_scores_leader_daily
  ON score_entries (mode, day_key, score DESC);

CREATE INDEX IF NOT EXISTS idx_scores_leader_full
  ON score_entries (mode, score DESC)
  WHERE mode = 'fullDeck';
