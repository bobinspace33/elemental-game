// Scoring + streak rules.
//
// Distance: |Z_card − Z_slot| where Z_slot is the atomic number of the element
// in the cell the player dropped on (not grid distance on the chart).
// Exact placement: base = 1000 + (100 × table row of the card's correct cell) + atomic number,
// before streak / bonus multipliers (row is 1-indexed like the periodic chart layout).
// Non-exact: base points from |ΔZ| via round(1000 * exp(-k * distance)); minimum 1.
// Atomic number: card Z added flat after base, before multipliers.
// Column proximity (only when not an exact cell): same column +100, 1 column off +50,
// 2 columns off +25 — added before streak / bonus multipliers.
// Tiered streak (counts of consecutive EXACT placements):
//   3 in a row -> 1.5x
//   5 in a row -> 2x
//   8 in a row -> 3x
// Streak resets on any non-exact drop.

export interface ScoreResult {
  /** Distance-based score before +Z (exact: 1000 + row tier; non-exact: exp decay). */
  basePoints: number;
  /** Card atomic number added to base before streak / bonus. */
  zFlatBonus: number;
  streakMultiplier: number;
  bonusMultiplier: number; // 1x or 2x (rainbow bonus cards)
  finalPoints: number;
  distance: number;
  exact: boolean;
  /** Flat bonus from column proximity (non-exact only). */
  columnProximityBonus: number;
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

function columnProximityBonus(
  exact: boolean,
  trueCol: number,
  droppedCol: number,
): number {
  if (exact) return 0;
  const d = Math.abs(trueCol - droppedCol);
  if (d === 0) return 100;
  if (d === 1) return 50;
  if (d === 2) return 25;
  return 0;
}

export function computeScore(
  cardZ: number,
  droppedSlotZ: number,
  currentStreak: number,
  isBonus: boolean = false,
  trueCol: number,
  droppedCol: number,
  /** Periodic chart row (1-based) of the card's correct cell — tiers exact base per row. */
  trueRow: number,
): ScoreResult {
  const distance = Math.abs(cardZ - droppedSlotZ);
  const exact = distance === 0;
  const colBonus = columnProximityBonus(exact, trueCol, droppedCol);
  const base = exact
    ? 1000 + 100 * trueRow
    : Math.max(1, Math.round(1000 * Math.exp(-BASE_SCORE_DECAY_Z * distance)));
  const preMult = base + cardZ + colBonus;

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
    columnProximityBonus: colBonus,
  };
}
