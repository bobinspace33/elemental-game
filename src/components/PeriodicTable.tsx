"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  CATEGORY_INDICATOR,
  ELEMENTS,
  ELEMENT_CELLS,
  PLACEHOLDER_CELLS,
  type ElementDef,
} from "@/lib/elements";
import { ElementCard } from "./ElementCard";

const ROWS = 10;
const COLS = 18;

type FlashKind = "good" | "mid" | "bad" | undefined;

export interface PlacementInfo {
  // Where the user dropped the element (only set when the drop was off-target).
  attemptedAt?: { row: number; col: number };
  // The TRUE cell of the element they just placed, plus how close they got.
  flashAt?: { row: number; col: number; kind: FlashKind } | null;
  // Bumped on every drop so the same {attempted,flash} pair re-triggers anim.
  dropId?: number;
  /** Final points for this drop — count-up beside the correct cell. */
  scoreFloat?: { target: number; dropId: number };
  /** Exact placement: random phrase flashed center-table ~1s. */
  celebrationPhrase?: string;
  /** Consecutive exact count (≥2): rainbow label beside the score pop. */
  streakLength?: number;
}

interface PeriodicTableProps {
  placedZs: Set<number>;
  placement?: PlacementInfo;
  /** Increment when starting a new round / table session to clear overlays. */
  resetVersion?: number;
  /** Report on-screen slot edge length (px) for drag preview / modifiers. */
  onSlotScreenSize?: (px: number) => void;
  /** From `ViewportFitScale` — remeasure when table scale changes. */
  viewportScale?: number;
  /** Increments on each exact drop — brief hit-stop on the table shell. */
  hitStopVersion?: number;
}

interface SlotProps {
  row: number;
  col: number;
  element: ElementDef;
  placed: boolean;
  flashKind: FlashKind;
  attempted: boolean;
  registerRef: (key: string, el: HTMLDivElement | null) => void;
}

function Slot({
  row,
  col,
  element,
  placed,
  flashKind,
  attempted,
  registerRef,
}: SlotProps) {
  const id = `slot-${row}-${col}`;
  const { isOver, setNodeRef } = useDroppable({ id, data: { row, col } });
  const localRef = useRef<HTMLDivElement | null>(null);

  // Combined ref: dnd-kit's setNodeRef + our own ref for line measurement.
  const combinedRef = (el: HTMLDivElement | null) => {
    setNodeRef(el);
    localRef.current = el;
    registerRef(`${row}:${col}`, el);
  };

  const flashClass =
    flashKind === "good"
      ? "animate-flashGood"
      : flashKind === "mid"
        ? "animate-flashMid"
        : flashKind === "bad"
          ? "animate-flashBad"
          : "";

  const placedIndicator = placed ? CATEGORY_INDICATOR[element.category] : "";

  return (
    <div
      ref={combinedRef}
      className={[
        "relative flex items-center justify-center rounded-lg overflow-hidden",
        // When placed we drop the border entirely so the card color reaches
        // the slot's outer edge; the category outline is the new frame.
        placed ? "" : "border border-white/[0.14]",
        "bg-white/[0.025]",
        placedIndicator,
        "transition-colors",
        isOver ? "slot-hot bg-cyan-400/10" : "",
        flashClass,
      ].join(" ")}
      style={{
        gridColumnStart: col,
        gridRowStart: row,
        aspectRatio: "1 / 1",
      }}
      title={`${element.name} (${element.symbol})`}
      data-row={row}
      data-col={col}
    >
      {placed ? (
        flashKind === "good" ? (
          <div className="h-full w-full origin-center animate-correctSlotPop">
            <ElementCard
              element={element}
              colored
              size="sm"
              compact
              className="!h-full !w-full"
            />
          </div>
        ) : (
          <ElementCard
            element={element}
            colored
            size="sm"
            compact
            className="!h-full !w-full"
          />
        )
      ) : (
        <span className="font-mono text-[11px] text-white/[0.58] md:text-xs">{element.z}</span>
      )}
      {attempted && (
        <span
          className="pointer-events-none absolute inset-0 rounded-lg ring-2 ring-rose-400/70"
          aria-hidden
        />
      )}
    </div>
  );
}

function Placeholder({
  row,
  col,
  label,
}: {
  row: number;
  col: number;
  label: string;
}) {
  return (
    <div
      className="flex items-center justify-center rounded-lg border border-dashed border-white/22 bg-white/[0.03]"
      style={{ gridColumnStart: col, gridRowStart: row, aspectRatio: "1 / 1" }}
    >
      <span className="font-mono text-[11px] font-medium text-white/55 md:text-xs">{label}</span>
    </div>
  );
}

interface LineState {
  id: number;
  /** Wrong placement cell center */
  xPlaced: number;
  yPlaced: number;
  /** Correct cell center */
  xCorrect: number;
  yCorrect: number;
}

interface ScorePopState {
  id: number;
  target: number;
  x: number;
  y: number;
  streakLength?: number;
}

const CONNECT_MS = 1700;
const SCORE_HOLD_MS = 800;
const SCORE_FADE_MS = 3000;
/** Celebration phrase visible + fade — matches `animate-celebrationFlash` duration. */
const CELEBRATION_OVERLAY_MS = 2000;

/** Placement overlay count-up duration — HUD total waits through this + hold before ramping. */
export const SCORE_OVERLAY_COUNT_MS = CONNECT_MS;
/** Pause on final +score before fade. */
export const SCORE_OVERLAY_HOLD_MS = SCORE_HOLD_MS;
/** White score text fade duration — HUD total ramps over the same window. */
export const SCORE_OVERLAY_FADE_MS = SCORE_FADE_MS;

/** Clear `placement` in Game after score pop finishes (count + hold + fade). */
export const PLACEMENT_OVERLAY_TOTAL_MS =
  CONNECT_MS + SCORE_HOLD_MS + SCORE_FADE_MS;

function ShrinkingConnectorLine({
  lineId,
  xPlaced,
  yPlaced,
  xCorrect,
  yCorrect,
}: {
  lineId: number;
  xPlaced: number;
  yPlaced: number;
  xCorrect: number;
  yCorrect: number;
}) {
  const [linearT, setLinearT] = useState(0);

  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / CONNECT_MS);
      setLinearT(p);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [lineId]);

  const shrink = 1 - (1 - linearT) ** 2.4;
  const sx = xPlaced + (xCorrect - xPlaced) * shrink;
  const sy = yPlaced + (yCorrect - yPlaced) * shrink;

  const groupOpacity =
    linearT < 0.06
      ? linearT / 0.06
      : linearT > 0.82
        ? Math.max(0, (1 - linearT) / 0.18)
        : 1;

  const gid = `rainbow-line-${lineId}`;

  return (
    <g style={{ opacity: groupOpacity }}>
      <defs>
        <linearGradient
          id={gid}
          gradientUnits="userSpaceOnUse"
          x1={sx}
          y1={sy}
          x2={xCorrect}
          y2={yCorrect}
        >
          <stop offset="0%" stopColor="rgb(248, 113, 113)" />
          <stop offset="18%" stopColor="rgb(251, 191, 36)" />
          <stop offset="36%" stopColor="rgb(52, 211, 153)" />
          <stop offset="54%" stopColor="rgb(34, 211, 238)" />
          <stop offset="72%" stopColor="rgb(129, 140, 248)" />
          <stop offset="88%" stopColor="rgb(232, 121, 249)" />
          <stop offset="100%" stopColor="rgb(248, 113, 113)" />
        </linearGradient>
      </defs>
      <line
        x1={sx}
        y1={sy}
        x2={xCorrect}
        y2={yCorrect}
        stroke={`url(#${gid})`}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle
        cx={sx}
        cy={sy}
        r={Math.max(2, 4 * (1 - shrink) + 1)}
        fill="white"
        opacity={0.2 + 0.8 * (1 - shrink)}
      />
      <circle cx={xCorrect} cy={yCorrect} r={5} fill="white" />
    </g>
  );
}

function ScorePopLabel({
  target,
  popId,
  streakLength,
  onFinished,
}: {
  target: number;
  popId: number;
  streakLength?: number;
  onFinished: (id: number) => void;
}) {
  const [shown, setShown] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    setShown(0);
    setFadeOut(false);
    let cancelled = false;
    let raf = 0;
    let holdTimer = 0;
    let fadeTimer = 0;
    const start = performance.now();

    const tick = (now: number) => {
      if (cancelled) return;
      const t = Math.min(1, (now - start) / CONNECT_MS);
      const eased = 1 - (1 - t) ** 2.4;
      setShown(Math.round(target * eased));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
        return;
      }
      setShown(target);
      holdTimer = window.setTimeout(() => {
        if (cancelled) return;
        setFadeOut(true);
        fadeTimer = window.setTimeout(() => {
          if (!cancelled) onFinished(popId);
        }, SCORE_FADE_MS);
      }, SCORE_HOLD_MS);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(holdTimer);
      window.clearTimeout(fadeTimer);
    };
  }, [target, popId, onFinished]);

  const fadeWrap = [
    "flex flex-col items-start gap-1 transition-opacity ease-out",
    fadeOut ? "opacity-0 duration-[3000ms]" : "opacity-100 duration-150",
  ].join(" ");

  return (
    <div className={fadeWrap}>
      {streakLength != null && streakLength >= 2 ? (
        <span className="title-grad whitespace-nowrap text-sm font-black leading-tight tracking-tight drop-shadow-[0_1px_10px_rgba(0,0,0,0.95)] md:text-base">
          Streak ×{streakLength}!
        </span>
      ) : null}
      <span className="whitespace-nowrap font-mono text-2xl font-bold tabular-nums text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.95),0_0_20px_rgba(255,255,255,0.12)] md:text-3xl">
        +{shown.toLocaleString()}
      </span>
    </div>
  );
}

function CelebrationPhraseSvg({
  text,
  gradId,
}: {
  text: string;
  gradId: string;
}) {
  return (
    <svg
      className="w-full max-w-[min(96vw,56rem)] overflow-visible"
      viewBox="0 0 1000 170"
      role="img"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgb(248, 113, 113)" />
          <stop offset="18%" stopColor="rgb(251, 191, 36)" />
          <stop offset="36%" stopColor="rgb(52, 211, 153)" />
          <stop offset="54%" stopColor="rgb(34, 211, 238)" />
          <stop offset="72%" stopColor="rgb(129, 140, 248)" />
          <stop offset="88%" stopColor="rgb(232, 121, 249)" />
          <stop offset="100%" stopColor="rgb(248, 113, 113)" />
        </linearGradient>
      </defs>
      <text
        x="500"
        y="86"
        textAnchor="middle"
        dominantBaseline="middle"
        fill={`url(#${gradId})`}
        stroke={`url(#${gradId})`}
        strokeWidth={6}
        strokeLinejoin="round"
        strokeLinecap="round"
        paintOrder="stroke fill"
        style={{
          fontSize: 80,
          fontWeight: 900,
          letterSpacing: "-0.02em",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        }}
      >
        {text}
      </text>
    </svg>
  );
}

export function PeriodicTable({
  placedZs,
  placement,
  resetVersion = 0,
  onSlotScreenSize,
  viewportScale = 1,
  hitStopVersion = 0,
}: PeriodicTableProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const slotRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [line, setLine] = useState<LineState | null>(null);
  const [scorePop, setScorePop] = useState<ScorePopState | null>(null);
  const [hitStopPulse, setHitStopPulse] = useState(false);
  const [celebration, setCelebration] = useState<{
    text: string;
    key: number;
  } | null>(null);

  const dismissScorePop = useCallback((id: number) => {
    setScorePop((cur) => (cur && cur.id === id ? null : cur));
  }, []);

  useEffect(() => {
    setLine(null);
    setScorePop(null);
    setCelebration(null);
  }, [resetVersion]);

  useEffect(() => {
    if (!hitStopVersion) return;
    setHitStopPulse(true);
    const t = window.setTimeout(() => setHitStopPulse(false), 120);
    return () => clearTimeout(t);
  }, [hitStopVersion]);

  useEffect(() => {
    const phrase = placement?.celebrationPhrase;
    const id = placement?.dropId;
    if (!phrase || id == null) return;
    setCelebration({ text: phrase, key: id });
    const t = window.setTimeout(() => {
      setCelebration((c) => (c?.key === id ? null : c));
    }, CELEBRATION_OVERLAY_MS);
    return () => clearTimeout(t);
  }, [placement?.dropId, placement?.celebrationPhrase]);

  const registerRef = (key: string, el: HTMLDivElement | null) => {
    if (el) slotRefs.current.set(key, el);
    else slotRefs.current.delete(key);
  };

  // Connector line (wrong cell → true cell), score count-up beside true cell.
  useEffect(() => {
    if (
      !placement?.flashAt ||
      placement.scoreFloat == null ||
      placement.dropId == null
    ) {
      setLine(null);
      return;
    }
    const t = placement.flashAt;
    const tEl = slotRefs.current.get(`${t.row}:${t.col}`);
    const cont = containerRef.current;
    if (!tEl || !cont) return;

    const c = cont.getBoundingClientRect();
    const tR = tEl.getBoundingClientRect();
    const id = placement.dropId;
    const target = placement.scoreFloat.target;

    if (placement.attemptedAt) {
      const a = placement.attemptedAt;
      if (a.row !== t.row || a.col !== t.col) {
        const aEl = slotRefs.current.get(`${a.row}:${a.col}`);
        if (aEl) {
          const aR = aEl.getBoundingClientRect();
          setLine({
            id,
            xPlaced: aR.left + aR.width / 2 - c.left,
            yPlaced: aR.top + aR.height / 2 - c.top,
            xCorrect: tR.left + tR.width / 2 - c.left,
            yCorrect: tR.top + tR.height / 2 - c.top,
          });
        } else {
          setLine(null);
        }
      } else {
        setLine(null);
      }
    } else {
      setLine(null);
    }

    setScorePop({
      id,
      target,
      x: tR.right - c.left + 14,
      y: tR.top + tR.height / 2 - c.top,
      streakLength: placement.streakLength,
    });

    const timer = window.setTimeout(() => {
      setLine((cur) => (cur && cur.id === id ? null : cur));
    }, CONNECT_MS);
    return () => window.clearTimeout(timer);
  }, [placement]);

  useLayoutEffect(() => {
    if (!onSlotScreenSize) return;
    const probe = ELEMENTS[0];
    const probeKey = `${probe.row}:${probe.col}`;

    const measure = () => {
      const el = slotRefs.current.get(probeKey);
      if (!el) return;
      const w = el.getBoundingClientRect().width;
      if (w > 0.5) onSlotScreenSize(w);
    };

    measure();
    const id = requestAnimationFrame(measure);
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(measure);
    });
    const node = containerRef.current;
    if (node) ro.observe(node);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(id);
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [onSlotScreenSize, viewportScale]);

  const cells: React.ReactNode[] = [];

  for (let row = 1; row <= ROWS; row++) {
    for (let col = 1; col <= COLS; col++) {
      const key = `${row}:${col}`;
      const placeholder = PLACEHOLDER_CELLS.find(
        (p) => p.row === row && p.col === col,
      );
      if (placeholder) {
        cells.push(
          <Placeholder
            key={`ph-${key}`}
            row={row}
            col={col}
            label={placeholder.label}
          />,
        );
        continue;
      }
      if (!ELEMENT_CELLS.has(key)) continue;

      const element = ELEMENTS.find((el) => el.row === row && el.col === col)!;
      const placed = placedZs.has(element.z);
      const flashKind =
        placement?.flashAt &&
        placement.flashAt.row === row &&
        placement.flashAt.col === col
          ? placement.flashAt.kind
          : undefined;
      const attempted =
        !!placement?.attemptedAt &&
        placement.attemptedAt.row === row &&
        placement.attemptedAt.col === col &&
        flashKind !== "good";

      cells.push(
        <Slot
          key={key}
          row={row}
          col={col}
          element={element}
          placed={placed}
          flashKind={flashKind}
          attempted={attempted}
          registerRef={registerRef}
        />,
      );
    }
  }

  return (
    <div
      className={[
        "grain relative min-w-[984px] overflow-visible rounded-2xl border border-white/15 bg-ink-900/60 p-3.5 md:p-5",
        hitStopPulse ? "animate-hitStop" : "",
      ].join(" ")}
    >
      {celebration ? (
        <div
          className="pointer-events-none absolute inset-0 z-[34] flex items-center justify-center px-6 md:px-12"
          aria-live="polite"
          aria-label={celebration.text}
        >
          <div
            key={celebration.key}
            className="animate-celebrationFlash drop-shadow-[0_4px_32px_rgba(0,0,0,0.55)]"
          >
            <CelebrationPhraseSvg
              text={celebration.text}
              gradId={`cele-grad-${celebration.key}`}
            />
          </div>
        </div>
      ) : null}
      <div
        ref={containerRef}
        className="relative grid w-full min-w-[984px] gap-1.5 overflow-visible pr-[6.5rem] md:gap-2 md:pr-40"
        style={{
          gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${ROWS}, minmax(0, 1fr))`,
        }}
      >
        {cells}

        {/* Connecting line overlay — drawn from drop point to true point. */}
        {line && (
          <svg
            key={line.id}
            className="pointer-events-none absolute inset-0 z-30 h-full w-full overflow-visible"
            aria-hidden
          >
            <ShrinkingConnectorLine
              lineId={line.id}
              xPlaced={line.xPlaced}
              yPlaced={line.yPlaced}
              xCorrect={line.xCorrect}
              yCorrect={line.yCorrect}
            />
          </svg>
        )}
        {scorePop && (
          <div
            className="pointer-events-none absolute z-[36]"
            style={{
              left: scorePop.x,
              top: scorePop.y,
              transform: "translateY(-50%)",
            }}
            aria-live="polite"
          >
            <ScorePopLabel
              target={scorePop.target}
              popId={scorePop.id}
              streakLength={scorePop.streakLength}
              onFinished={dismissScorePop}
            />
          </div>
        )}
      </div>
    </div>
  );
}
