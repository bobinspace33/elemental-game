"use client";

import { useCallback, useState } from "react";

export function SubmitInitialsModal({
  score,
  onSubmit,
  onDismiss,
}: {
  score: number;
  onSubmit: (initials: string) => Promise<void>;
  onDismiss: () => void;
}) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canSubmit = /^[A-Za-z]{1,3}$/.test(value);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || busy) return;
    setBusy(true);
    setErr(null);
    try {
      await onSubmit(value.toUpperCase());
      onDismiss();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save score");
    } finally {
      setBusy(false);
    }
  }, [value, canSubmit, busy, onSubmit, onDismiss]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Submit score"
      className="fixed inset-0 z-[57] flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-ink-950/88 backdrop-blur-md" aria-hidden />
      <div className="relative mx-auto w-full max-w-sm rounded-3xl border border-white/10 bg-ink-900/95 p-6 text-center shadow-2xl shadow-black/60 md:p-8">
        <p className="text-xs uppercase tracking-widest text-ink-400">Round complete</p>
        <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-white md:text-4xl">
          {score.toLocaleString()}
        </p>
        <p className="mt-4 text-sm text-ink-300">
          Enter your initials <span className="text-white/90">(up to 3 letters)</span> for the leaderboard.
        </p>
        <input
          type="text"
          inputMode="text"
          autoComplete="off"
          maxLength={3}
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/[^a-zA-Z]/g, "").slice(0, 3))}
          className="mt-4 w-full rounded-xl border border-white/15 bg-ink-950/80 px-4 py-3 text-center font-mono text-2xl font-bold uppercase tracking-[0.3em] text-white outline-none ring-0 placeholder:text-ink-500 focus:border-cyan-400/50"
          placeholder="AAA"
          aria-label="Initials, one to three letters"
        />
        {err ? <p className="mt-2 text-sm text-rose-300">{err}</p> : null}
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            disabled={!canSubmit || busy}
            onClick={() => void handleSubmit()}
            className="rounded-full bg-gradient-to-r from-cyan-500 to-fuchsia-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/25 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Saving…" : "Submit"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onDismiss}
            className="text-xs font-medium text-ink-400 hover:text-ink-300"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
