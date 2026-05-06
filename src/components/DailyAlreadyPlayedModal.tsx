"use client";

export function DailyAlreadyPlayedModal({
  allowUnrecorded,
  variant,
  showPractice,
  onPlayUnrecorded,
  onPractice20,
  onPracticeFull,
  onBack,
}: {
  allowUnrecorded: boolean;
  variant: "server" | "browser";
  /** Browser-only: offer non-scoring practice rounds. */
  showPractice?: boolean;
  onPlayUnrecorded: () => void;
  onPractice20?: () => void;
  onPracticeFull?: () => void;
  onBack: () => void;
}) {
  const showPracticeRow = showPractice && onPractice20 && onPracticeFull;

  /** One dialog shell; copy differs only where the two gates disagree (device vs saved score). */
  const primary =
    variant === "browser"
      ? "This device already started today's Daily 20."
      : "Your score for today's Daily 20 is already saved.";
  const secondary =
    variant === "browser"
      ? "A new scored attempt unlocks at midnight Eastern Time. Practice modes are not submitted to the leaderboard."
      : "You can run today's puzzle again for practice; this attempt will not be submitted to the leaderboard.";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Daily 20 already completed today"
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-ink-950/90 backdrop-blur-md" aria-hidden />
      <div className="relative mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-ink-900/95 p-7 text-center shadow-2xl shadow-black/60">
        <h2 className="text-xl font-bold text-white md:text-2xl">Today&apos;s Daily 20</h2>
        <div className="mt-3 flex justify-center">
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] uppercase tracking-widest text-ink-300">
            Already played today
          </span>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-ink-300">
          <span className="block text-white/90">{primary}</span>
          <span className="mt-2 block text-ink-400">{secondary}</span>
        </p>
        <p className="mt-3 text-[11px] text-ink-500">Daily reset: midnight Eastern Time (US).</p>
        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-3">
          {allowUnrecorded ? (
            <button
              type="button"
              onClick={onPlayUnrecorded}
              className="rounded-full bg-gradient-to-r from-cyan-500 to-fuchsia-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/25 hover:brightness-110"
            >
              Play again
            </button>
          ) : null}
          {showPracticeRow ? (
            <>
              <button
                type="button"
                onClick={onPractice20}
                className="rounded-full border border-emerald-400/35 bg-emerald-500/10 px-6 py-2.5 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/20"
              >
                Practice 20
              </button>
              <button
                type="button"
                onClick={onPracticeFull}
                className="rounded-full border border-emerald-400/35 bg-emerald-500/10 px-6 py-2.5 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/20"
              >
                Practice Full
              </button>
            </>
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
