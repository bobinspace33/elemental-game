import { ELEMENTS } from "./elements";

export const DAILY20_DECK_SIZE = 20;

/** UTC calendar date `YYYY-MM-DD` (for non-daily use). */
export function getUtcDateKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

const EASTERN_TZ = "America/New_York";

/**
 * Calendar date in US Eastern time `YYYY-MM-DD` — Daily 20 rolls over at midnight ET.
 */
export function getEasternDateKey(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: EASTERN_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Client: one Daily 20 attempt per browser per Eastern calendar day. */
export const DAILY20_BROWSER_ATTEMPT_LS = "elemental.daily20.easternAttemptDate";

export function readDaily20BrowserAttemptDate(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(DAILY20_BROWSER_ATTEMPT_LS);
  } catch {
    return null;
  }
}

export function markDaily20BrowserAttempt(dateKey: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DAILY20_BROWSER_ATTEMPT_LS, dateKey);
  } catch {
    /* private mode / quota */
  }
}

function hashStringToSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const arr = items.slice();
  const rand = mulberry32(seed);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

/** Deterministic order of 20 Z values for the given calendar day key (same for all players). */
export function buildDaily20DeckNumbers(dateKey: string): number[] {
  const seed = hashStringToSeed(`eleMENTAL-daily20-deck-v3-${dateKey}`);
  const allZs = ELEMENTS.map((e) => e.z);
  return seededShuffle(allZs, seed).slice(0, DAILY20_DECK_SIZE);
}

/** Deterministic bonus cards for the daily deck (same for all players that day). */
export function pickDailyBonusZs(
  deckPool: readonly number[],
  cap: number,
  dateKey: string,
): Set<number> {
  const seed = hashStringToSeed(`eleMENTAL-daily20-bonus-v3-${dateKey}`);
  const shuffled = seededShuffle(deckPool, seed);
  return new Set(shuffled.slice(0, Math.min(cap, shuffled.length)));
}
