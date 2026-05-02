// Scoring + streak rules.
//
// Distance: |Z_card − Z_slot| where Z_slot is the atomic number of the element
// in the cell the player dropped on (not grid distance on the chart).
// Base points from |ΔZ|: 1000 when distance is 0, then
// round(1000 * exp(-k * distance)); minimum 1 so every drop scores.
// Atomic number: add the card's Z flat (e.g. exact O → 1000 + 8) before other mults.
// Tiered streak (counts of consecutive EXACT placements):
//   3 in a row -> 1.5x
//   5 in a row -> 2x
//   8 in a row -> 3x
// Streak resets on any non-exact drop.

export interface ScoreResult {
  /** Rounded distance-based score (exp decay), before +Z. */
  basePoints: number;
  /** Card atomic number added to base before streak / bonus. */
  zFlatBonus: number;
  streakMultiplier: number;
  bonusMultiplier: number; // 1x or 2x (rainbow bonus cards)
  finalPoints: number;
  distance: number;
  exact: boolean;
}

export function streakMultiplier(streak: number): number {
  if (streak >= 8) return 3;
  if (streak >= 5) return 2;
  if (streak >= 3) return 1.5;
  return 1;
}

export function nextStreak(currentStreak: number, exact: boolean): number {
  return exact ? currentStreak + 1 : 0;
}

/** Larger = steeper penalty per unit of |ΔZ|. */
const BASE_SCORE_DECAY_Z = 0.028;

export function computeScore(
  cardZ: number,
  droppedSlotZ: number,
  currentStreak: number,
  isBonus: boolean = false,
): ScoreResult {
  const distance = Math.abs(cardZ - droppedSlotZ);
  const exact = distance === 0;
  const rawBase = 1000 * Math.exp(-BASE_SCORE_DECAY_Z * distance);
  const base = Math.max(1, Math.round(rawBase));
  const preMult = base + cardZ;

  // Streak multiplier applies based on the streak that WILL exist after this drop.
  // (i.e. an exact drop that brings you to 3 already pays 1.5x.)
  const projectedStreak = nextStreak(currentStreak, exact);
  const streakMult = streakMultiplier(projectedStreak);

  // 2x rainbow bonus stacks on top of streak.
  const bonusMult = isBonus ? 2 : 1;

  const finalPoints = Math.round(preMult * streakMult * bonusMult);
  return {
    basePoints: base,
    zFlatBonus: cardZ,
    streakMultiplier: streakMult,
    bonusMultiplier: bonusMult,
    finalPoints,
    distance,
    exact,
  };
}
