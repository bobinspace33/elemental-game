"use client";

import {
  elementCardFillBackgroundStyle,
  type ElementDef,
} from "@/lib/elements";

interface ElementCardProps {
  element: ElementDef;
  // Greyscale = the deck/preview state (before the user knows where it goes).
  // Colored = once placed in the table.
  colored?: boolean;
  size?: "sm" | "md" | "lg";
  // Compact = used as a small slot fill: omits the long name to save space.
  // Also drops the border (the slot itself owns the stroke / category indicator).
  compact?: boolean;
  // When true, name fades out (used while drag-shrinking over a slot).
  hideName?: boolean;
  // When true, this is a 2x bonus card — render the rainbow "x2" badge.
  // The animated rainbow stroke / glow is owned by the parent wrapper.
  isBonus?: boolean;
  // When set (hints 2–3 only), show atomic-number range top-left on hand cards.
  // Atomic numbers are never shown on cards otherwise (would give away the answer).
  placementHint?: { lo: number; hi: number };
  className?: string;
}

const SIZES = {
  sm: { card: "h-[77px] w-[70px]", z: "text-[9px]", sym: "text-lg", name: "text-[9px]" },
  md: { card: "h-[106px] w-[94px]", z: "text-[11px]", sym: "text-3xl", name: "text-[11px]" },
  lg: { card: "h-[144px] w-[125px]", z: "text-xs", sym: "text-4xl", name: "text-xs" },
};

export function ElementCard({
  element,
  colored = false,
  size = "md",
  compact = false,
  hideName = false,
  isBonus = false,
  placementHint,
  className = "",
}: ElementCardProps) {
  const s = SIZES[size];

  // Compact mode renders inside an existing slot, so the card itself
  // should not draw a border. Its rounding also matches the slot's so the
  // color fills the slot completely.
  const cornerRadius = compact ? "rounded-lg" : "rounded-xl";
  const baseShell =
    "relative flex flex-col items-center justify-center select-none " +
    "transition-[transform,filter,background] duration-200 " +
    cornerRadius + " " +
    s.card +
    (compact ? "" : " border");

  const showName = !compact && !hideName;

  const hintCorner =
    "absolute left-0.5 top-0.5 max-w-[calc(100%-4px)] truncate font-mono text-[7px] font-semibold leading-tight tracking-tight text-cyan-200/95 tabular-nums sm:text-[8px]";

  // Atomic-number range hints only appear after period color is revealed (`colored`).
  if (!colored) {
    return (
      <div
        className={[
          baseShell,
          compact ? "" : "border-ink-600",
          "bg-gradient-to-br from-ink-700 via-ink-800 to-ink-900",
          "text-ink-300",
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_8px_18px_rgba(0,0,0,0.4)]",
          className,
        ].join(" ")}
      >
        <span
          className={`font-bold tracking-tight text-white ${s.sym}`}
          style={{ textShadow: "0 1px 0 rgba(0,0,0,0.4)" }}
        >
          {element.symbol}
        </span>
        <span
          className={[
            "mt-0.5 px-1 text-center font-medium transition-opacity duration-150",
            s.name,
            showName ? "opacity-100" : "opacity-0",
            compact ? "hidden" : "",
          ].join(" ")}
        >
          {element.name}
        </span>
        {isBonus && !compact && (
          <span
            className={[
              "mt-0.5 font-mono text-[9px] font-extrabold uppercase tracking-[0.18em]",
              "text-rainbow",
              "transition-opacity duration-150",
              hideName ? "opacity-0" : "opacity-100",
            ].join(" ")}
          >
            ×2
          </span>
        )}
      </div>
    );
  }

  const fillStyle = elementCardFillBackgroundStyle(element);

  const topLeftHand =
    placementHint && !compact ? (
      <span
        className={hintCorner}
        title="Atomic number range hint"
      >
        {placementHint.lo}–{placementHint.hi}
      </span>
    ) : null;

  return (
    <div
      className={[
        baseShell,
        compact ? "" : "border-white/15",
        "text-white",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_10px_22px_rgba(0,0,0,0.35)]",
        className,
      ].join(" ")}
      style={fillStyle}
    >
      {!compact ? topLeftHand : null}
      <span
        className={`font-bold tracking-tight ${s.sym}`}
        style={{ textShadow: "0 1px 1px rgba(0,0,0,0.4)" }}
      >
        {element.symbol}
      </span>
      <span
        className={[
          "mt-0.5 px-1 text-center font-medium transition-opacity duration-150",
          s.name,
          "opacity-95",
          compact || hideName ? "hidden" : "",
        ].join(" ")}
      >
        {element.name}
      </span>
      {isBonus && !compact && (
        <span
          className={[
            "mt-0.5 font-mono text-[9px] font-extrabold uppercase tracking-[0.18em]",
            "text-rainbow",
            "transition-opacity duration-150",
            hideName ? "opacity-0" : "opacity-100",
          ].join(" ")}
        >
          ×2
        </span>
      )}
    </div>
  );
}
