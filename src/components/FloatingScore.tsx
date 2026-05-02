"use client";

interface FloatingScoreProps {
  id: number; // bumps to retrigger the animation on each drop
  amount: number;
  exact: boolean;
  multiplier: number;
  bonus: boolean;
}

export function FloatingScore({
  id,
  amount,
  exact,
  multiplier,
  bonus,
}: FloatingScoreProps) {
  if (amount < 1 && !exact) {
    return (
      <div
        key={id}
        className="pointer-events-none animate-floatUp font-mono text-base font-bold text-rose-300"
      >
        miss
      </div>
    );
  }
  return (
    <div
      key={id}
      className={[
        "pointer-events-none flex items-baseline gap-1 animate-floatUp font-mono font-bold",
        exact ? "text-emerald-300" : "text-amber-300",
      ].join(" ")}
    >
      <span className="text-lg">+{amount.toLocaleString()}</span>
      {multiplier > 1 && (
        <span className="text-xs text-fuchsia-300">×{multiplier}</span>
      )}
      {bonus && (
        <span className="text-rainbow text-[10px] font-extrabold uppercase tracking-widest">
          ×2 bonus
        </span>
      )}
    </div>
  );
}
