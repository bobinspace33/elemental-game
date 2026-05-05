"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  CATEGORY_INDICATOR,
  ELEMENTS,
  ELEMENT_CELLS,
  emptySlotTargetBorderColor,
  PLACEHOLDER_CELLS,
  type ElementDef,
} from "@/lib/elements";
import { ElementCard } from "./ElementCard";

const ROWS = 10;
const COLS = 18;

/** Delay between Chebyshev rings — slower outward propagation */
const RIPPLE_CELL_MS = 98;
/** Short per-slot pulse — wave pacing comes from ring delays */
const RIPPLE_DURATION_MS = 420;
const RIPPLE_EASE = "cubic-bezier(0.36, 0.94, 0.22, 1)";
/** Chebyshev max distance — only slots within ±this many rows/columns of epicenter ripple */
const RIPPLE_MAX_CHEBYSHEV = 5;

function chebyshevRing(
  row: number,
  col: number,
  originRow: number,
  originCol: number,
): number {
  return Math.max(Math.abs(row - originRow), Math.abs(col - originCol));
}

function rippleSmoothT(ring: number, maxRing: number): number {
  const x = Math.min(1, Math.max(0, ring / Math.max(maxRing, 1)));
  return x * x * (3 - 2 * x);
}

function ripplePeakScale(ring: number): number {
  const PEAK_EXTRA = 0.13;
  const t = rippleSmoothT(ring, RIPPLE_MAX_CHEBYSHEV);
  return 1 + PEAK_EXTRA * (1 - t);
}

type RippleCellStyle = {
  rippleAnim: string;
  cssVars?: CSSProperties;
};

function rippleCellParams(
  row: number,
  col: number,
  rippleWave: { dropId: number; originRow: number; originCol: number } | null,
  /** Wait until hit-stop shake has cleared (ripple starts same epicenter). */
  rippleLeadMs: number,
): RippleCellStyle {
  if (rippleWave == null) return { rippleAnim: "" };
  const ring = chebyshevRing(row, col, rippleWave.originRow, rippleWave.originCol);
  if (ring > RIPPLE_MAX_CHEBYSHEV) return { rippleAnim: "" };
  const delayMs = rippleLeadMs + ring * RIPPLE_CELL_MS;
  const rippleAnim = `rippleSlotWave ${RIPPLE_DURATION_MS}ms ${RIPPLE_EASE} ${delayMs}ms both`;
  const peak = ripplePeakScale(ring);
  const extra = peak - 1;
  const lit = Math.min(0.07, extra * 0.52);
  return {
    rippleAnim,
    cssVars: {
      ["--ripple-p1" as string]: peak.toFixed(4),
      ["--ripple-p2" as string]: (1 + extra * 0.44).toFixed(4),
      ["--ripple-p3" as string]: (1 + extra * 0.17).toFixed(4),
      ["--ripple-lit" as string]: lit.toFixed(4),
      ["--ripple-lit-mid" as string]: (lit * 0.4).toFixed(4),
      ["--ripple-lit-tail" as string]: (lit * 0.14).toFixed(4),
    } as CSSProperties,
  };
}

function hitStopAnimForStreak(streak: number): { cls: string; clearMs: number } {
  if (streak >= 7) return { cls: "animate-hitStopT4", clearMs: 210 };
  if (streak >= 4) return { cls: "animate-hitStopT3", clearMs: 178 };
  if (streak >= 2) return { cls: "animate-hitStopT2", clearMs: 142 };
  return { cls: "animate-hitStop", clearMs: 122 };
}

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
  /** Streak count after this exact drop — stronger hit-stop at higher tiers. */
  exactStreakAfter?: number;
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
  /** Increments on each exact drop — brief hit-stop on the card grid (epicenter = exact slot). */
  hitStopVersion?: number;
  /**
   * When true, slots show native hover tooltips with element name/symbol.
   * Keep false during an active round so empty cells do not spoil answers.
   */
  slotAnswerTooltips?: boolean;
}

interface SlotProps {
  row: number;
  col: number;
  element: ElementDef;
  placed: boolean;
  flashKind: FlashKind;
  attempted: boolean;
  registerRef: (key: string, el: HTMLDivElement | null) => void;
  /** Propagating lift animation from exact-hit cell */
  rippleWave: { dropId: number; originRow: number; originCol: number } | null;
  rippleLeadMs: number;
  slotAnswerTooltips: boolean;
}

function Slot({
  row,
  col,
  element,
  placed,
  flashKind,
  attempted,
  registerRef,
  rippleWave,
  rippleLeadMs,
  slotAnswerTooltips,
}: SlotProps) {
  const id = `slot-${row}-${col}`;
  const { isOver, setNodeRef } = useDroppable({
    id,
    disabled: placed,
    data: { row, col },
  });
  const localRef = useRef<HTMLDivElement | null>(null);

  const combinedRef = (el: HTMLDivElement | null) => {
    setNodeRef(el);
    localRef.current = el;
    registerRef(`${row}:${col}`, el);
  };

  const { rippleAnim, cssVars: rippleCssVars } = rippleCellParams(
    row,
    col,
    rippleWave,
    rippleLeadMs,
  );

  useLayoutEffect(() => {
    const node = localRef.current;
    if (!node) return;
    if (!rippleAnim) {
      node.style.removeProperty("animation");
      return;
    }
    node.style.animation = "none";
    void node.offsetWidth;
    node.style.animation = rippleAnim;
  }, [rippleWave?.dropId, rippleAnim, rippleLeadMs]);

  const flashClass =
    flashKind === "good"
      ? "animate-flashGood"
      : flashKind === "mid"
        ? "animate-flashMid"
        : flashKind === "bad"
          ? "animate-flashBad"
          : "";

  const placedIndicator = placed ? CATEGORY_INDICATOR[element.category] : "";
  const emptyBorder = !placed ? emptySlotTargetBorderColor(element) : undefined;

  return (
    <div
      ref={combinedRef}
      className={[
        "relative z-[1] flex transform-gpu items-center justify-center rounded-lg overflow-visible",
        // When placed we drop the border entirely so the card color reaches
        // the slot's outer edge; the category outline is the new frame.
        placed ? "" : "border border-solid",
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
        ...(emptyBorder != null ? { borderColor: emptyBorder } : {}),
        ...rippleCssVars,
      }}
      title={
        slotAnswerTooltips
          ? `${element.name} (${element.symbol})`
          : undefined
      }
      data-row={row}
      data-col={col}
    >
      {placed ? (
        <>
          <span
            className="pointer-events-none absolute left-px top-px z-10 font-mono text-[9px] font-semibold leading-none tabular-nums text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.92)] md:left-0.5 md:top-0.5 md:text-[10px]"
            aria-hidden
          >
            {element.z}
          </span>
          {flashKind === "good" ? (
            <div className="h-full w-full origin-center overflow-hidden rounded-lg animate-correctSlotPop">
              <ElementCard
                element={element}
                colored
                size="sm"
                compact
                className="!h-full !w-full rounded-lg"
              />
            </div>
          ) : (
            <div className="h-full w-full overflow-hidden rounded-lg">
              <ElementCard
                element={element}
                colored
                size="sm"
                compact
                className="!h-full !w-full rounded-lg"
              />
            </div>
          )}
        </>
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
  rippleWave,
  rippleLeadMs,
}: {
  row: number;
  col: number;
  label: string;
  rippleWave: { dropId: number; originRow: number; originCol: number } | null;
  rippleLeadMs: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const { rippleAnim, cssVars: rippleCssVars } = rippleCellParams(
    row,
    col,
    rippleWave,
    rippleLeadMs,
  );

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (!rippleAnim) {
      node.style.removeProperty("animation");
      return;
    }
    node.style.animation = "none";
    void node.offsetWidth;
    node.style.animation = rippleAnim;
  }, [rippleWave?.dropId, rippleAnim, rippleLeadMs]);

  return (
    <div
      ref={ref}
      className="relative z-[1] flex transform-gpu items-center justify-center overflow-visible rounded-lg border border-dashed border-white/22 bg-white/[0.03]"
      style={{
        gridColumnStart: col,
        gridRowStart: row,
        aspectRatio: "1 / 1",
        ...rippleCssVars,
      }}
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

/**
 * After on-table +N reaches its final value and the pre-fade hold ends.
 * HUD total starts ramping here; bonus challenge opens here so tally can continue behind the modal.
 */
export const CHALLENGE_AFTER_SCORE_POP_READY_MS =
  SCORE_OVERLAY_COUNT_MS + SCORE_OVERLAY_HOLD_MS;

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
  const cy = 240;
  return (
    <svg
      className="w-full max-w-[min(96vw,56rem)] overflow-visible"
      viewBox="0 0 1000 480"
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
      <g transform={`translate(500, ${cy}) translate(-500, ${-cy})`}>
        <text
          x="500"
          y={cy}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={`url(#${gradId})`}
          stroke={`url(#${gradId})`}
          strokeWidth={22}
          strokeLinejoin="round"
          strokeLinecap="round"
          paintOrder="stroke fill"
          style={{
            fontSize: 320,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            fontFamily:
              'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          }}
        >
          {text}
        </text>
      </g>
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
  slotAnswerTooltips = false,
}: PeriodicTableProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const slotRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [line, setLine] = useState<LineState | null>(null);
  const [scorePop, setScorePop] = useState<ScorePopState | null>(null);
  const [hitStopAnim, setHitStopAnim] = useState("");
  const [celebration, setCelebration] = useState<{
    text: string;
    key: number;
  } | null>(null);

  const dismissScorePop = useCallback((id: number) => {
    setScorePop((cur) => (cur && cur.id === id ? null : cur));
  }, []);

  const streakForHitStopRef = useRef(1);

  useLayoutEffect(() => {
    if (placement?.exactStreakAfter != null) {
      streakForHitStopRef.current = placement.exactStreakAfter;
    }
  }, [placement?.exactStreakAfter, placement?.dropId]);

  useEffect(() => {
    setLine(null);
    setScorePop(null);
    setCelebration(null);
  }, [resetVersion]);

  useEffect(() => {
    if (!hitStopVersion) return;
    const { cls, clearMs } = hitStopAnimForStreak(streakForHitStopRef.current);
    setHitStopAnim(cls);
    const t = window.setTimeout(() => setHitStopAnim(""), clearMs);
    return () => window.clearTimeout(t);
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

  const faRipple = placement?.flashAt;
  const rippleWave =
    faRipple?.kind === "good" && placement?.dropId != null
      ? {
          dropId: placement.dropId,
          originRow: faRipple.row,
          originCol: faRipple.col,
        }
      : null;

  /** Match hit-stop tier so ripple starts after shake clears (~same epicenter). */
  const rippleLeadMs =
    rippleWave != null
      ? hitStopAnimForStreak(placement?.exactStreakAfter ?? 1).clearMs
      : 0;

  const gridShakeOriginPct =
    hitStopAnim &&
    placement?.flashAt?.kind === "good" &&
    rippleWave != null
      ? `${((placement.flashAt.col - 0.5) / COLS) * 100}% ${((placement.flashAt.row - 0.5) / ROWS) * 100}%`
      : undefined;

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
            rippleWave={rippleWave}
            rippleLeadMs={rippleLeadMs}
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
          rippleWave={rippleWave}
          rippleLeadMs={rippleLeadMs}
          slotAnswerTooltips={slotAnswerTooltips}
        />,
      );
    }
  }

  return (
    <div className="grain relative min-w-[984px] overflow-visible rounded-2xl border border-white/15 bg-ink-900/60 p-3.5 md:p-5">
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
        className={[
          "relative isolate grid w-full min-w-[984px] gap-1.5 overflow-visible pr-[6.5rem] md:gap-2 md:pr-40",
          hitStopAnim,
        ]
          .filter(Boolean)
          .join(" ")}
        style={{
          gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${ROWS}, minmax(0, 1fr))`,
          ...(gridShakeOriginPct ? { transformOrigin: gridShakeOriginPct } : {}),
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
