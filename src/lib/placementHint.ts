import { ELEMENTS } from "./elements";

const Z_MAX = ELEMENTS.length;

/**
 * Returns an inclusive [lo, hi] window of exactly `width` consecutive
 * atomic numbers that always contains `correctZ`.
 */
export function zPlacementWindow(
  correctZ: number,
  width: number,
  salt: number,
): { lo: number; hi: number } {
  const w = Math.max(1, Math.min(width, Z_MAX));
  const minStart = Math.max(1, correctZ - w + 1);
  const maxStart = Math.min(Z_MAX - w + 1, correctZ);
  if (minStart > maxStart) {
    const start = Math.min(
      Math.max(1, correctZ - Math.floor(w / 2)),
      Z_MAX - w + 1,
    );
    return { lo: start, hi: start + w - 1 };
  }
  const span = maxStart - minStart + 1;
  const t =
    (Number(salt) ^
      correctZ * 0x9e3779b1 ^
      width * 0x85ebca6b) >>>
    0;
  const start = minStart + (t % span);
  return { lo: start, hi: start + w - 1 };
}
