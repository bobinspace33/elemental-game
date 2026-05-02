"use client";

const STEPS = ["Ready?", "5", "4", "3", "2", "1", "Go!"] as const;

const STEP_MS = [700, 650, 650, 650, 650, 650, 550] as const;

interface PreRoundCountdownProps {
  stepIndex: number;
}

export function PreRoundCountdown({ stepIndex }: PreRoundCountdownProps) {
  const label = STEPS[stepIndex] ?? "";
  return (
    <div
      className="fixed inset-0 z-[56] flex items-center justify-center bg-ink-950/92 backdrop-blur-sm"
      aria-live="assertive"
    >
      <p className="animate-[pop_0.35s_ease-out] px-6 text-center font-black text-white drop-shadow-[0_4px_32px_rgba(0,0,0,0.9)] text-[clamp(2.75rem,12vw,5.5rem)] tabular-nums tracking-tight">
        {label}
      </p>
    </div>
  );
}

export function getPreRoundStepCount(): number {
  return STEPS.length;
}

export function preRoundDurationMsForStep(stepIndex: number): number {
  return STEP_MS[Math.min(stepIndex, STEP_MS.length - 1)] ?? 600;
}
