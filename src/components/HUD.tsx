"use client";

import { streakMultiplier } from "@/lib/scoring";

interface HUDProps {
  score: number;
  /** Width lock for score animation: use max(display, true total) so the box steps wider only when a new digit/comma is needed. */
  scoreWidthLock: number;
  streak: number;
  remaining: number;
  total: number;
  started: boolean;
  /** `mm:ss` countdown when a round is active; `null` before first start. */
  timerLabel: string | null;
  onOpenMenu: () => void;
  onRestart: () => void;
  /** When true, Restart is disabled (Daily 20). */
  restartDisabled?: boolean;
}

export function HUD({
  score,
  scoreWidthLock,
  streak,
  remaining,
  total,
  started,
  timerLabel,
  onOpenMenu,
  onRestart,
  restartDisabled = false,
}: HUDProps) {
  const mult = streakMultiplier(streak);
  const multLabel = mult === 1.5 ? "×1.5" : `×${mult}`;
  return (
    <div className="flex w-full flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-black tracking-tight md:text-3xl">
          <span className="title-grad">eleMENTAL</span>
        </h1>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] uppercase tracking-widest text-ink-300">
          Let&apos;s develop some chemistry!
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {timerLabel != null ? (
          <div className="flex w-[7.25rem] shrink-0 flex-col items-stretch rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5">
            <span className="text-[10px] uppercase tracking-widest text-white/80">
              Time
            </span>
            <span className="mx-auto inline-block w-[6ch] text-center font-mono text-base font-bold tabular-nums text-white">
              {timerLabel}
            </span>
          </div>
        ) : null}
        <Stat
          label="Score"
          value={score.toLocaleString()}
          valueWidthLockNumber={scoreWidthLock}
          accent="text-emerald-300"
        />
        <Stat label="Streak" value={streak.toString()} accent="text-ink-300" />
        <Stat
          label="MULT"
          value={multLabel}
          accent={mult > 1 ? "text-fuchsia-300" : "text-ink-300"}
        />
        <Stat
          label="Left"
          value={started ? `${remaining}/${total}` : "—"}
          accent="text-cyan-300"
        />

        <button
          type="button"
          onClick={onOpenMenu}
          className="rounded-full border border-white/10 bg-gradient-to-r from-cyan-500/15 to-fuchsia-500/15 px-3 py-1.5 text-xs font-semibold text-white hover:from-cyan-500/30 hover:to-fuchsia-500/30"
          title="Open game menu — choose Daily 20 or Full Deck"
        >
          Menu
        </button>

        <button
          onClick={onRestart}
          disabled={!started || restartDisabled}
          className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-ink-300 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
          title={restartDisabled ? "Restart is disabled in Daily 20 — use Menu to change mode" : undefined}
        >
          Restart
        </button>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
  valueWidthLockNumber,
}: {
  label: string;
  value: string;
  accent: string;
  /** When set, reserve width for `toLocaleString()` of this number vs current `value` (longer wins). */
  valueWidthLockNumber?: number;
}) {
  const lockChars =
    valueWidthLockNumber != null
      ? Math.max(
          value.length,
          valueWidthLockNumber.toLocaleString().length,
        )
      : null;

  return (
    <div className="flex flex-col items-start rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5">
      <span className="text-[10px] uppercase tracking-widest text-ink-300">
        {label}
      </span>
      <span
        className={`font-mono text-base font-bold tabular-nums ${accent}`}
        style={
          lockChars != null
            ? {
                display: "inline-block",
                minWidth: `${lockChars}ch`,
                textAlign: "end",
              }
            : undefined
        }
      >
        {value}
      </span>
    </div>
  );
}
