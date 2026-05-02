import { NextResponse } from "next/server";

import { getSql, getRequestMeta } from "@/lib/scoreDb";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const sql = getSql();
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  if (!sql) {
    return NextResponse.json({ played: false, db: false });
  }

  const { fingerprint } = getRequestMeta(request);
  const rows = await sql`
    SELECT id FROM score_entries
    WHERE mode = 'daily20' AND day_key = ${date} AND ip_fingerprint = ${fingerprint}
    LIMIT 1
  `;
  return NextResponse.json({ played: rows.length > 0, db: true });
}
