"use client";

import { useEffect } from "react";

import { COPYRIGHT_FOOTER } from "@/lib/appMeta";
import { countryCodeToFlagEmoji } from "@/lib/countryFlag";
import { MenuAmbientTiles } from "@/components/MenuAmbientTiles";

/** Modes shown in the menu (includes practice). */
export type MenuMode = "daily20" | "fullDeck" | "practice";

/** Leaderboard tabs only — not used for practice. */
export type LeaderboardMode = "daily20" | "fullDeck";

export type LeaderboardEntry = {
  rank: number;
  initials: string;
  score: number;
  countryCode: string | null;
};

interface ModePickerProps {
  currentMode: MenuMode | null;
  onPick: (mode: MenuMode) => void;
  onClose?: () => void;
  leaderboardTab: LeaderboardMode;
  onLeaderboardTabChange: (mode: LeaderboardMode) => void;
  leaderboardEntries: LeaderboardEntry[];
  leaderboardLoading: boolean;
  leaderboardDbConnected: boolean;
}

export function ModePicker({
  currentMode,
  onPick,
  onClose,
  leaderboardTab,
  onLeaderboardTabChange,
  leaderboardEntries,
  leaderboardLoading,
  leaderboardDbConnected,
}: ModePickerProps) {
  useEffect(() => {
    if (!onClose) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const leaderTitle =
    leaderboardTab === "daily20" ? "Today's High Scores" : "Top Full Deck Scores";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Choose a game mode"
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto pb-10 pt-6 sm:pt-8"
    >
      <div
        className="absolute inset-0 z-0 min-h-full bg-ink-950/85 backdrop-blur-md"
        onClick={onClose}
      />

      <MenuAmbientTiles />

      <div
        className={[
          "relative z-10 mx-4 mt-1 w-full max-w-xl rounded-3xl border border-white/15 p-6 shadow-2xl shadow-black/60 sm:p-7",
          /* Opaque fallback when backdrop-filter is unavailable */
          "bg-ink-900/92",
          /* Frosted glass over ambient tiles — lighter frost so tiles stay visible */
          "supports-[backdrop-filter]:bg-ink-950/34 supports-[backdrop-filter]:backdrop-blur-lg supports-[backdrop-filter]:backdrop-saturate-110",
          /* Softer inner lift so content stays readable on blurred tiles */
          "supports-[backdrop-filter]:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
        ].join(" ")}
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="text-3xl font-black tracking-tight">
            <span className="title-grad">eleMENTAL</span>
          </h2>
          <p className="max-w-sm text-sm text-ink-300">
            Drag element cards into their correct positions. Closer = more points. Streaks multiply
            your score.
          </p>
        </div>

        <div className="mt-5 flex flex-col items-center gap-2">
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] uppercase tracking-widest text-ink-300">
            Pick a mode
          </span>
          <div className="flex w-full max-w-md flex-col gap-2.5">
            <ModeRow
              title="Daily 20"
              subtitle="Daily challenge! 3-minute timer."
              accent="from-cyan-500/80 to-emerald-500/80"
              isCurrent={currentMode === "daily20"}
              rainbowOutline
              onClick={() => onPick("daily20")}
            />
            <ModeRow
              title="Full Deck"
              subtitle="All 118 elements. 15-minute timer."
              accent="from-fuchsia-500/80 to-violet-500/80"
              isCurrent={currentMode === "fullDeck"}
              onClick={() => onPick("fullDeck")}
            />
            <ModeRow
              title="Practice"
              subtitle="All 118 elements. No timer."
              accent="from-amber-500/70 to-rose-500/70"
              isCurrent={currentMode === "practice"}
              onClick={() => onPick("practice")}
            />
          </div>
        </div>

        <div className="mt-6 border-t border-white/10 pt-5">
          <h3 className="text-center text-sm font-bold text-white">{leaderTitle}</h3>
          <div className="mt-3 flex justify-center gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1">
            <button
              type="button"
              onClick={() => onLeaderboardTabChange("daily20")}
              className={[
                "flex-1 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                leaderboardTab === "daily20"
                  ? "bg-white/15 text-white"
                  : "text-ink-400 hover:text-white/90",
              ].join(" ")}
            >
              Daily 20
            </button>
            <button
              type="button"
              onClick={() => onLeaderboardTabChange("fullDeck")}
              className={[
                "flex-1 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                leaderboardTab === "fullDeck"
                  ? "bg-white/15 text-white"
                  : "text-ink-400 hover:text-white/90",
              ].join(" ")}
            >
              Full Deck
            </button>
          </div>
          {!leaderboardDbConnected ? (
            <p className="mt-2 text-center text-xs text-ink-500">
              Leaderboard unavailable (configure database — see docs/VERCEL_SCORES.md).
            </p>
          ) : null}
          <ul className="mt-3 max-h-[min(26rem,52vh)] space-y-1 overflow-y-auto pr-1 text-left text-sm">
            {leaderboardLoading ? (
              <li className="py-4 text-center text-ink-500">Loading…</li>
            ) : leaderboardEntries.length === 0 ? (
              <li className="py-3 text-center text-ink-500">No scores yet.</li>
            ) : (
              leaderboardEntries.map((e) => {
                const rowInner = (
                  <div
                    className={[
                      "flex items-center gap-2 px-3 py-1.5 font-mono text-xs tabular-nums md:text-sm",
                      e.rank === 1
                        ? "leaderboard-rainbow-frame-inner bg-white/[0.02]"
                        : "rounded-lg border border-white/[0.06] bg-white/[0.02]",
                    ].join(" ")}
                  >
                    <span className="w-5 shrink-0 text-ink-500">{e.rank}.</span>
                    <span
                      className="shrink-0 text-base leading-none"
                      title={e.countryCode ?? undefined}
                    >
                      {countryCodeToFlagEmoji(e.countryCode)}
                    </span>
                    <span className="min-w-0 flex-1 font-bold tracking-wide text-white">
                      {e.initials}
                    </span>
                    <span className="ml-auto shrink-0 text-ink-200">
                      {e.score.toLocaleString()}
                    </span>
                  </div>
                );

                return e.rank === 1 ? (
                  <li key={`${e.rank}-${e.initials}-${e.score}`} className="list-none leaderboard-rainbow-frame">
                    {rowInner}
                  </li>
                ) : (
                  <li key={`${e.rank}-${e.initials}-${e.score}`} className="list-none">
                    {rowInner}
                  </li>
                );
              })
            )}
          </ul>
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

      <p
        className="pointer-events-none fixed bottom-[max(0.35rem,env(safe-area-inset-bottom))] right-[max(0.35rem,env(safe-area-inset-right))] z-[55] px-1 text-[10px] text-ink-300 md:text-[11px]"
        aria-hidden
      >
        <span className="font-mono opacity-60">{COPYRIGHT_FOOTER}</span>
      </p>
    </div>
  );
}

function ModeRow({
  title,
  subtitle,
  accent,
  isCurrent,
  rainbowOutline,
  onClick,
}: {
  title: string;
  subtitle: string;
  accent: string;
  isCurrent: boolean;
  /** Animated rainbow border — Daily 20 featured row. */
  rainbowOutline?: boolean;
  onClick: () => void;
}) {
  const button = (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group relative w-full overflow-hidden p-4 text-left transition",
        rainbowOutline
          ? "rounded-[calc(1rem-2px)] border border-white/10 bg-ink-900 hover:border-white/20 hover:bg-ink-800"
          : "rounded-2xl border border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70",
      ].join(" ")}
    >
      {!rainbowOutline ? (
        <div
          className={[
            "pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-br opacity-0 transition group-hover:opacity-30",
            accent,
          ].join(" ")}
        />
      ) : null}
      <div className="relative flex w-full items-baseline justify-between gap-3">
        <div className="flex min-w-0 flex-shrink items-baseline gap-2">
          <span className="text-lg font-bold text-white">{title}</span>
          {isCurrent ? (
            <span className="shrink-0 rounded-full border border-white/15 bg-white/[0.06] px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-ink-300">
              Current
            </span>
          ) : null}
        </div>
        <span className="max-w-[min(16rem,52%)] shrink-0 text-right text-[11px] leading-snug text-ink-400 sm:text-xs md:max-w-[55%] md:text-sm">
          {subtitle}
        </span>
      </div>
    </button>
  );

  if (rainbowOutline) {
    return <div className="mode-picker-rainbow-outline">{button}</div>;
  }
  return button;
}
