"use client";

export function DailyAlreadyPlayedModal({
  allowUnrecorded,
  variant,
  showPractice,
  onPlayUnrecorded,
  onPractice,
  onBack,
}: {
  allowUnrecorded: boolean;
  variant: "server" | "browser";
  /** Browser-only: offer a non-scoring practice round. */
  showPractice?: boolean;
  onPlayUnrecorded: () => void;
  onPractice?: () => void;
  onBack: () => void;
}) {
  const isBrowser = variant === "browser";
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Daily challenge already completed"
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-ink-950/90 backdrop-blur-md" aria-hidden />
      <div className="relative mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-ink-900/95 p-7 text-center shadow-2xl shadow-black/60">
        <h2 className="text-xl font-bold text-white md:text-2xl">Today&apos;s Daily 20</h2>
        <p className="mt-4 text-sm leading-relaxed text-ink-300">
          {isBrowser ? (
            <>
              You&apos;ve already used your Daily 20 attempt on this browser today (Eastern time).
              Come back after the next reset at midnight ET. Or use Practice below for 20 random
              elements (not scored).
            </>
          ) : (
            <>
              It looks like you&apos;ve already done today&apos;s challenge. You can try it again but your
              score will not be recorded.
            </>
          )}
        </p>
        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-3">
          {allowUnrecorded ? (
            <button
              type="button"
              onClick={onPlayUnrecorded}
              className="rounded-full bg-gradient-to-r from-cyan-500 to-fuchsia-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/25 hover:brightness-110"
            >
              Play
            </button>
          ) : null}
          {showPractice && onPractice ? (
            <button
              type="button"
              onClick={onPractice}
              className="rounded-full border border-emerald-400/35 bg-emerald-500/10 px-6 py-2.5 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/20"
            >
              Practice
            </button>
          ) : null}
          <button
            type="button"
            onClick={onBack}
            className="rounded-full border border-white/20 bg-white/[0.06] px-6 py-2.5 text-sm font-medium text-white hover:bg-white/[0.12]"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
