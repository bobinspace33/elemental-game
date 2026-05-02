"use client";

import { useEffect } from "react";

type Mode = "daily20" | "fullDeck";

interface ModePickerProps {
  currentMode: Mode | null;
  onPick: (mode: Mode) => void;
  // Only present once a round has started (allows dismissal without picking).
  onClose?: () => void;
}

export function ModePicker({ currentMode, onPick, onClose }: ModePickerProps) {
  useEffect(() => {
    if (!onClose) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Choose a game mode"
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink-950/85 backdrop-blur-md"
        onClick={onClose}
      />

      <div className="relative mx-4 w-full max-w-xl rounded-3xl border border-white/10 bg-ink-900/90 p-7 shadow-2xl shadow-black/60">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] uppercase tracking-widest text-ink-300">
            Pick a mode
          </span>
          <h2 className="text-3xl font-black tracking-tight">
            <span className="title-grad">eleMENTAL</span>
          </h2>
          <p className="max-w-sm text-sm text-ink-300">
            Drag element cards into their correct positions. Closer = more points. Streaks
            multiply your score.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ModeCard
            title="Daily 20"
            blurb="One shared 20-element set for everyone. 3-minute timer."
            accent="from-cyan-500/80 to-emerald-500/80"
            isCurrent={currentMode === "daily20"}
            onClick={() => onPick("daily20")}
          />
          <ModeCard
            title="Full Deck"
            blurb="All 118 elements. 15-minute timer."
            accent="from-fuchsia-500/80 to-violet-500/80"
            isCurrent={currentMode === "fullDeck"}
            onClick={() => onPick("fullDeck")}
          />
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-ink-300 hover:bg-white/[0.1] hover:text-white"
            aria-label="Close"
          >
            Esc
          </button>
        )}
      </div>
    </div>
  );
}

function ModeCard({
  title,
  blurb,
  accent,
  isCurrent,
  onClick,
}: {
  title: string;
  blurb: string;
  accent: string;
  isCurrent: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group relative flex flex-col items-start gap-2 overflow-hidden rounded-2xl border p-5 text-left transition",
        "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70",
      ].join(" ")}
    >
      <div
        className={[
          "pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-br opacity-0 transition group-hover:opacity-30",
          accent,
        ].join(" ")}
      />
      <div className="relative flex w-full items-center justify-between">
        <span className="text-lg font-bold text-white">{title}</span>
        {isCurrent && (
          <span className="rounded-full border border-white/15 bg-white/[0.06] px-2 py-0.5 text-[10px] uppercase tracking-widest text-ink-300">
            Current
          </span>
        )}
      </div>
      <span className="relative text-sm text-ink-300">{blurb}</span>
      <span className="relative mt-2 inline-flex items-center gap-1 text-xs font-semibold text-white/90">
        Start <span aria-hidden>→</span>
      </span>
    </button>
  );
}
