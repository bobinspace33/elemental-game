/**
 * Approximate phase at room temperature (~25 °C, 1 atm).
 * Gases/liquids/solids aligned with common textbook datasets (e.g. periodictable.com / ElementData).
 */

const GAS_AT_RT = new Set<number>([
  1, 2, 7, 8, 9, 10, 17, 18, 36, 54, 86,
]);

const LIQUID_AT_RT = new Set<number>([35, 80]);

/** Elements often listed N/A or unreliable for STP phase in references — skip in phase quizzes. */
const RT_PHASE_QUIZ_EXCLUDE = new Set<number>([
  100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118,
]);

export function elementEligibleForRtPhaseQuiz(z: number): boolean {
  return !RT_PHASE_QUIZ_EXCLUDE.has(z);
}

export function isGasAtRoomTemp(z: number): boolean {
  return GAS_AT_RT.has(z);
}

export function isLiquidAtRoomTemp(z: number): boolean {
  return LIQUID_AT_RT.has(z);
}

/** True for known STP solid (everything eligible that is not gas or liquid). */
export function isSolidAtRoomTemp(z: number): boolean {
  if (RT_PHASE_QUIZ_EXCLUDE.has(z)) return false;
  return !GAS_AT_RT.has(z) && !LIQUID_AT_RT.has(z);
}

export function isNotSolidAtRoomTemp(z: number): boolean {
  return isGasAtRoomTemp(z) || isLiquidAtRoomTemp(z);
}
