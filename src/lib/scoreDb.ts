import { createHash } from "crypto";

import { neon } from "@neondatabase/serverless";

export function getSql() {
  const url = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
  if (!url) return null;
  return neon(url);
}

export function fingerprintIp(ip: string): string {
  const salt = process.env.SCORE_IP_SALT ?? "eleMENTAL-dev-salt";
  return createHash("sha256")
    .update(`${salt}:${ip}`)
    .digest("hex");
}

export function getRequestMeta(request: Request): {
  ip: string;
  country: string | null;
  fingerprint: string;
} {
  const xf = request.headers.get("x-forwarded-for");
  const ip = (
    xf?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  ).slice(0, 128);
  const raw = request.headers.get("x-vercel-ip-country");
  const country =
    raw && /^[A-Za-z]{2}$/.test(raw) ? raw.toUpperCase() : null;
  return { ip, country, fingerprint: fingerprintIp(ip) };
}

export const FULL_DECK_LEADER_KEY = "global";
