"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { type ElementDef } from "@/lib/elements";
import { ElementCard } from "./ElementCard";

interface ZWindow {
  lo: number;
  hi: number;
}

interface DraggableCardProps {
  element: ElementDef;
  isBonus: boolean;
  isHinted: boolean;
  zWindow?: ZWindow;
}

function DraggableCard({
  element,
  isBonus,
  isHinted,
  zWindow,
}: DraggableCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `card-${element.z}`,
      data: { z: element.z, isBonus },
    });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.0 : 1, // Hide the original; DragOverlay shows the floater.
    touchAction: "none",
  };

  const rangeNote =
    zWindow != null
      ? ` — placement hint: atomic numbers ${zWindow.lo}–${zWindow.hi}`
      : "";

  return (
    <button
      ref={setNodeRef}
      style={style}
      data-dnd-draggable
      className={[
        "group relative cursor-grab active:cursor-grabbing",
        "rounded-2xl p-1 outline-none",
        "transition-transform duration-200 hover:-translate-y-1",
        "focus-visible:ring-2 focus-visible:ring-cyan-400/70",
      ].join(" ")}
      {...listeners}
      {...attributes}
      aria-label={`Drag ${element.name} (${element.symbol})${isBonus ? " — 2x bonus" : ""}${isHinted ? " — color revealed" : ""}${rangeNote}`}
    >
      {isBonus ? (
        <div className="bonus-wrapper rounded-[14px] p-[2px]">
          <ElementCard
            element={element}
            size="lg"
            isBonus
            colored={isHinted}
            placementHint={zWindow}
          />
        </div>
      ) : (
        <ElementCard
          element={element}
          size="lg"
          colored={isHinted}
          placementHint={zWindow}
        />
      )}
    </button>
  );
}

interface HintButtonProps {
  remaining: number;
  total: number;
  onUse: () => void;
}

// Shorter + wider than a card; rainbow fill shrinks from the right in thirds.
function HintButton({ remaining, total, onUse }: HintButtonProps) {
  const empty = remaining <= 0;
  const fillPct = Math.max(0, Math.min(1, remaining / total)) * 100;
  return (
    <button
      type="button"
      onClick={onUse}
      disabled={empty}
      aria-label={
        empty
          ? "No hints remaining"
          : `Use hint — ${remaining} of ${total} remaining`
      }
      className={[
        "relative flex h-[68px] min-w-[168px] max-w-[200px] flex-col items-center justify-center px-3",
        "md:h-[72px] md:min-w-[184px]",
        "overflow-hidden rounded-xl border border-white/10",
        "bg-ink-900/70 backdrop-blur-[1px]",
        "transition-transform duration-200",
        empty
          ? "cursor-not-allowed opacity-70"
          : "cursor-pointer hover:-translate-y-1 active:translate-y-0",
      ].join(" ")}
    >
      <span
        aria-hidden
        className="hint-fill absolute inset-y-0 left-0 z-0 transition-[width] duration-500 ease-out"
        style={{ width: `${fillPct}%` }}
      />
      <span
        aria-hidden
        className="absolute inset-0 z-[1] bg-gradient-to-t from-black/45 via-black/15 to-transparent"
      />
      <span className="relative z-10 text-center text-[11px] font-bold uppercase tracking-[0.12em] text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)] md:text-[12px]">
        {empty ? "No Hints" : "Use Hint"}
      </span>
      <span
        className={[
          "relative z-10 mt-0.5 font-mono text-[9px] tracking-widest md:text-[10px]",
          empty ? "text-ink-300/70" : "text-white/85",
        ].join(" ")}
      >
        {remaining}/{total}
      </span>
    </button>
  );
}

interface HandProps {
  hand: (ElementDef | null)[];
  bonusZs: Set<number>;
  hintedZs: Set<number>;
  placementHints: Map<number, ZWindow>;
  hintsRemaining: number;
  /** From viewport: `innerWidth - tableRect.right`, for hint right edge = table right edge. */
  hintTrayPaddingRight: number | null;
  onUseHint: () => void;
}

export function Hand({
  hand,
  bonusZs,
  hintedZs,
  placementHints,
  hintsRemaining,
  hintTrayPaddingRight,
  onUseHint,
}: HandProps) {
  return (
    <div className="relative w-full min-h-[148px] pb-1 md:min-h-[152px]">
      <div
        className={[
          "pointer-events-none absolute inset-0 z-[2] flex items-center justify-end",
          hintTrayPaddingRight == null ? "px-3 md:px-5" : "",
        ].join(" ")}
        style={
          hintTrayPaddingRight != null
            ? { paddingRight: hintTrayPaddingRight }
            : undefined
        }
      >
        <div
          className={[
            "flex h-full items-center justify-end",
            hintTrayPaddingRight == null ? "mx-auto w-full max-w-[1400px]" : "w-full",
          ].join(" ")}
        >
          <div className="pointer-events-auto shrink-0">
            <HintButton
              remaining={hintsRemaining}
              total={3}
              onUse={onUseHint}
            />
          </div>
        </div>
      </div>

      {/* Three cards: centered in viewport; vertically centered with hint strip */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-[1] flex -translate-x-1/2 -translate-y-1/2 items-center gap-3 md:gap-4">
        {hand.map((el, i) => {
          if (!el) {
            return (
              <div
                key={`empty-${i}`}
                className="pointer-events-auto h-[144px] w-[125px] shrink-0 rounded-xl border border-dashed border-white/10 bg-white/[0.02]"
              />
            );
          }
          const hinted = hintedZs.has(el.z);
          const win = hinted ? placementHints.get(el.z) : undefined;
          return (
            <div key={`hand-${el.z}`} className="pointer-events-auto shrink-0">
              <DraggableCard
                element={el}
                isBonus={bonusZs.has(el.z)}
                isHinted={hinted}
                zWindow={win}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
