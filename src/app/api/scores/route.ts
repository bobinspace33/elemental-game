import { NextResponse } from "next/server";

import { getEasternDateKey } from "@/lib/dailyDeck";
import {
  FULL_DECK_LEADER_KEY,
  getRequestMeta,
  getSql,
} from "@/lib/scoreDb";

export const dynamic = "force-dynamic";

const MODES = ["daily20", "fullDeck"] as const;

function normalizeInitials(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3);
  if (cleaned.length < 1 || cleaned.length > 3) return null;
  return cleaned;
}

export async function GET(request: Request) {
  const sql = getSql();
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") as "daily20" | "fullDeck" | null;
  if (!mode || !MODES.includes(mode)) {
    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  }

  const dateParam = searchParams.get("date");
  const dayKey =
    mode === "daily20"
      ? dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
        ? dateParam
        : getEasternDateKey()
      : FULL_DECK_LEADER_KEY;

  if (!sql) {
    return NextResponse.json({ entries: [], db: false });
  }

  const rows =
    mode === "daily20"
      ? await sql`
          SELECT initials, score, country_code
          FROM score_entries
          WHERE mode = 'daily20' AND day_key = ${dayKey}
          ORDER BY score DESC, created_at ASC
          LIMIT 10
        `
      : await sql`
          SELECT initials, score, country_code
          FROM score_entries
          WHERE mode = 'fullDeck' AND day_key = ${FULL_DECK_LEADER_KEY}
          ORDER BY score DESC, created_at ASC
          LIMIT 10
        `;

  const entries = rows.map((r, i) => ({
    rank: i + 1,
    initials: r.initials as string,
    score: Number(r.score),
    countryCode: (r.country_code as string | null) ?? null,
  }));

  return NextResponse.json({ entries, db: true, dayKey });
}

export async function POST(request: Request) {
  const sql = getSql();
  if (!sql) {
    return NextResponse.json(
      { ok: false, error: "Database not configured" },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const o = body as Record<string, unknown>;
  const mode = o.mode as string | undefined;
  if (!mode || !MODES.includes(mode as (typeof MODES)[number])) {
    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  }

  const initials = normalizeInitials(o.initials);
  if (!initials) {
    return NextResponse.json({ error: "Invalid initials" }, { status: 400 });
  }

  const score = typeof o.score === "number" ? Math.floor(o.score) : NaN;
  if (!Number.isFinite(score) || score < 0 || score > 1_000_000_000) {
    return NextResponse.json({ error: "Invalid score" }, { status: 400 });
  }

  const record = o.record !== false;
  const { fingerprint, country } = getRequestMeta(request);

  if (mode === "daily20") {
    const dayKey =
      typeof o.dailyDateKey === "string" && /^\d{4}-\d{2}-\d{2}$/.test(o.dailyDateKey)
        ? o.dailyDateKey
        : getEasternDateKey();

    if (record) {
      const existing = await sql`
        SELECT id FROM score_entries
        WHERE mode = 'daily20' AND day_key = ${dayKey} AND ip_fingerprint = ${fingerprint}
        LIMIT 1
      `;
      if (existing.length > 0) {
        return NextResponse.json(
          { ok: false, error: "already_played", dayKey },
          { status: 409 },
        );
      }
      await sql`
        INSERT INTO score_entries (mode, day_key, initials, score, ip_fingerprint, country_code)
        VALUES ('daily20', ${dayKey}, ${initials}, ${score}, ${fingerprint}, ${country})
      `;
    }
    return NextResponse.json({ ok: true, recorded: record, dayKey });
  }

  // fullDeck
  await sql`
    INSERT INTO score_entries (mode, day_key, initials, score, ip_fingerprint, country_code)
      VALUES ('fullDeck', ${FULL_DECK_LEADER_KEY}, ${initials}, ${score}, ${fingerprint}, ${country})
  `;
  return NextResponse.json({ ok: true, recorded: true });
}
