"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  PointerSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDescriptor,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  type Modifier,
} from "@dnd-kit/core";
import { getEventCoordinates } from "@dnd-kit/utilities";

import { ELEMENTS, ELEMENTS_BY_Z } from "@/lib/elements";
import {
  buildChallengeStepsForMilestone,
  isAtomicOrderCorrect,
  resolveMidGameChallengeReward,
  type MidGameChallengeStep,
} from "@/lib/challenges";
import { zPlacementWindow } from "@/lib/placementHint";
import { computeScore, nextStreak } from "@/lib/scoring";
import { ElementCard } from "./ElementCard";
import { Hand } from "./Hand";
import { HUD } from "./HUD";
import { ModePicker } from "./ModePicker";
import { PeriodicTable, PLACEMENT_OVERLAY_TOTAL_MS, SCORE_OVERLAY_COUNT_MS, SCORE_OVERLAY_FADE_MS, SCORE_OVERLAY_HOLD_MS, type PlacementInfo } from "./PeriodicTable";
import { ViewportFitScale } from "./ViewportFitScale";
import { ChallengeModal } from "./ChallengeModal";

type Mode = "daily20" | "fullDeck";

const CELEBRATION_PHRASES = [
  "Got it!",
  "Nailed it!",
  "Bingo!",
  "Boom!",
  "Fantastic!",
  "Correct!",
  "Perfect!",
  "Crushed it!",
  "Yes!",
  "Beautiful!",
  "Spot on!",
  "Legendary!",
  "On fire!",
  "Sensational!",
  "Exactly!",
  "Brilliant!",
  "You got this!",
] as const;

function pickCelebrationPhrase(): string {
  return CELEBRATION_PHRASES[
    Math.floor(Math.random() * CELEBRATION_PHRASES.length)
  ]!;
}

/** Bonus challenge batch: timer pauses once for the whole batch until final Continue. */
interface ChallengeBatchState {
  pauseAtMs: number;
  steps: MidGameChallengeStep[];
  stepIndex: number;
  phase: "pick" | "resolved";
  outcome?: "correct" | "wrong";
  rewardLine?: string;
  /** Left-to-right Z order while `atomicOrder` step is active. */
  atomicOrderZs: number[] | null;
}

const HAND_SIZE = 3;
const QUICK_DECK_SIZE = 20;
const BONUS_DAILY20 = 5;
const BONUS_FULL_DECK = 10;
const HINTS_PER_ROUND = 3;

/** Countdown lengths by mode */
const DAILY20_TIME_SEC = 3 * 60;
const FULL_DECK_TIME_SEC = 15 * 60;
const TIME_BONUS_PER_SECOND = 50;

/** Mini-challenge every N placements: Daily 20 gets 3 prompts per milestone, Full Deck gets 1. */
const CHALLENGE_EVERY_N_PLACEMENTS = 10;

/** Slot-sized drag preview when `slotPx` is not yet measured from the table. */
const FALLBACK_SLOT_PX = 67;

/** Require pointer in inner ~70% of slot before hover “sticks”; then full rect fallback. */
const SLOT_POINTER_INSET = 0.18;

type ClientRectLike = {
  top: number;
  left: number;
  bottom: number;
  right: number;
  width: number;
  height: number;
};

function insetClientRect(rect: ClientRectLike, insetFraction: number): ClientRectLike {
  const dx = rect.width * insetFraction;
  const dy = rect.height * insetFraction;
  return {
    top: rect.top + dy,
    left: rect.left + dx,
    bottom: rect.bottom - dy,
    right: rect.right - dx,
    width: rect.width - 2 * dx,
    height: rect.height - 2 * dy,
  };
}

function isPointerInRect(
  pointer: { x: number; y: number },
  rect: ClientRectLike,
): boolean {
  return (
    rect.top <= pointer.y &&
    pointer.y <= rect.bottom &&
    rect.left <= pointer.x &&
    pointer.x <= rect.right
  );
}

const slotCollisionDetection: CollisionDetection = (args) => {
  const { droppableContainers, droppableRects, pointerCoordinates } = args;
  if (pointerCoordinates) {
    const innerHits: CollisionDescriptor[] = [];
    for (const d of droppableContainers) {
      if (!String(d.id).startsWith("slot-")) continue;
      const r = droppableRects.get(d.id);
      if (!r) continue;
      const inner = insetClientRect(r, SLOT_POINTER_INSET);
      if (!isPointerInRect(pointerCoordinates, inner)) continue;
      const cx = (inner.left + inner.right) / 2;
      const cy = (inner.top + inner.bottom) / 2;
      const dist = Math.hypot(pointerCoordinates.x - cx, pointerCoordinates.y - cy);
      innerHits.push({
        id: d.id,
        data: { droppableContainer: d, value: dist },
      });
    }
    innerHits.sort((a, b) => (a.data.value as number) - (b.data.value as number));
    if (innerHits.length > 0) return innerHits;
  }
  const pointerHits = pointerWithin(args);
  if (pointerHits.length > 0) return pointerHits;
  return rectIntersection(args);
};

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatTimeMmSs(totalSec: number): string {
  const s = Math.max(0, totalSec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

function buildDeck(mode: Mode): number[] {
  const allZs = ELEMENTS.map((el) => el.z);
  const shuffled = shuffle(allZs);
  return mode === "daily20" ? shuffled.slice(0, QUICK_DECK_SIZE) : shuffled;
}

interface GameState {
  mode: Mode;
  started: boolean; // true after user picks a mode and the round is active
  deck: number[];
  hand: (number | null)[];
  placedZs: Set<number>;
  bonusZs: Set<number>; // Daily 20: 5 random; Full Deck: 10 random — score 2x
  hintedZs: Set<number>; // Per-card: color revealed via hints
  /** Per-card atomic-number windows (only shown once that card is colored). */
  hintPlacementByZ: Map<number, { lo: number; hi: number }>;
  hintsRemaining: number;
  score: number;
  streak: number;
  bestStreak: number;
  totalDrops: number;
  exactDrops: number;
  finished: boolean;
  hydrated: boolean;
  /** Wall-clock time when the countdown hits zero (`Date.now()` ms). */
  timerEndMs: number | null;
  /** Clock ran out: show time-up modal, or user chose Continue (score frozen). */
  afterTimeUp: "none" | "modal" | "continued";
  /** Snapshot of score when the timer expired (for the time-up modal). */
  timeUpSealedScore: number | null;
  /** Points added at natural finish from remaining time (Daily/Full only if clock did not expire). */
  timeBonusPoints: number;
}

function emptyState(): GameState {
  return {
    mode: "daily20",
    started: false,
    deck: [],
    hand: [null, null, null],
    placedZs: new Set(),
    bonusZs: new Set(),
    hintedZs: new Set(),
    hintPlacementByZ: new Map(),
    hintsRemaining: HINTS_PER_ROUND,
    score: 0,
    streak: 0,
    bestStreak: 0,
    totalDrops: 0,
    exactDrops: 0,
    finished: false,
    hydrated: false,
    timerEndMs: null,
    afterTimeUp: "none",
    timeUpSealedScore: null,
    timeBonusPoints: 0,
  };
}

function pickBonusZs(deckPool: number[], mode: Mode): Set<number> {
  const cap = mode === "daily20" ? BONUS_DAILY20 : BONUS_FULL_DECK;
  const shuffled = shuffle(deckPool);
  return new Set(shuffled.slice(0, Math.min(cap, shuffled.length)));
}

function initialRound(mode: Mode): GameState {
  const deck = buildDeck(mode);
  const bonusZs = pickBonusZs(deck, mode);
  const hand: (number | null)[] = [];
  for (let i = 0; i < HAND_SIZE; i++) {
    hand.push(deck.shift() ?? null);
  }
  const durationSec = mode === "daily20" ? DAILY20_TIME_SEC : FULL_DECK_TIME_SEC;
  return {
    mode,
    started: true,
    deck,
    hand,
    placedZs: new Set(),
    bonusZs,
    hintedZs: new Set(),
    hintPlacementByZ: new Map(),
    hintsRemaining: HINTS_PER_ROUND,
    score: 0,
    streak: 0,
    bestStreak: 0,
    totalDrops: 0,
    exactDrops: 0,
    finished: false,
    hydrated: true,
    timerEndMs: Date.now() + durationSec * 1000,
    afterTimeUp: "none",
    timeUpSealedScore: null,
    timeBonusPoints: 0,
  };
}

export function Game() {
  // Server + first client render must match — start completely empty.
  const [state, setState] = useState<GameState>(() => emptyState());
  const [showPicker, setShowPicker] = useState(false);
  const [tableResetVersion, setTableResetVersion] = useState(0);
  const [activeDragZ, setActiveDragZ] = useState<number | null>(null);
  const [pointerOverTray, setPointerOverTray] = useState(true);
  const [slotPx, setSlotPx] = useState(0);
  const [viewportScale, setViewportScale] = useState(1);
  /** Distance from viewport right; positions hint flush with scaled periodic table right edge. */
  const [hintTrayPaddingRight, setHintTrayPaddingRight] = useState<number | null>(
    null,
  );
  const [placement, setPlacement] = useState<PlacementInfo>({});
  const [tableHitStop, setTableHitStop] = useState(0);
  /** Drives HUD countdown re-renders once per second while the round clock is running. */
  const [timerTick, setTimerTick] = useState(0);
  /** HUD “Score” stat — lags `state.score` until overlay count-up ends, then ramps during overlay fade. */
  const [hudScoreDisplay, setHudScoreDisplay] = useState(0);
  const [challenge, setChallenge] = useState<ChallengeBatchState | null>(null);
  /** Freezes round clock until challenge modal opens (matches upcoming `pauseAtMs`). */
  const [challengeFreezeAtMs, setChallengeFreezeAtMs] = useState<number | null>(null);
  const dropIdCounter = useRef(0);
  const trueScoreRef = useRef(0);
  const hudScoreDisplayRef = useRef(0);
  const hudScoreDelayTimerRef = useRef<number | null>(null);
  const hudScoreRafGenRef = useRef(0);
  /** While dragging: true if pointer is still over the bottom tray (large card); false = compact slot preview. */
  const pointerOverTrayRef = useRef(true);
  const slotPxRef = useRef(0);
  const trayRef = useRef<HTMLDivElement>(null);
  const challengeSnapshotRef = useRef<ChallengeBatchState | null>(null);
  const challengeOpenRef = useRef(false);
  const challengeMilestoneRef = useRef<number | null>(null);
  const challengeOpenTimerRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    challengeSnapshotRef.current = challenge;
    challengeOpenRef.current = challenge != null;
  }, [challenge]);

  useLayoutEffect(() => {
    trueScoreRef.current = state.score;
  }, [state.score]);

  useLayoutEffect(() => {
    hudScoreDisplayRef.current = hudScoreDisplay;
  }, [hudScoreDisplay]);

  const scheduleHudScoreRamp = useCallback((delayMs: number) => {
    if (hudScoreDelayTimerRef.current) {
      clearTimeout(hudScoreDelayTimerRef.current);
      hudScoreDelayTimerRef.current = null;
    }
    hudScoreRafGenRef.current += 1;

    hudScoreDelayTimerRef.current = window.setTimeout(() => {
      hudScoreDelayTimerRef.current = null;
      const from = hudScoreDisplayRef.current;
      const to = trueScoreRef.current;
      if (from === to) return;

      const rampGen = ++hudScoreRafGenRef.current;
      const start = performance.now();
      const fadeMs = SCORE_OVERLAY_FADE_MS;
      const tick = (now: number) => {
        if (rampGen !== hudScoreRafGenRef.current) return;
        const t = Math.min(1, (now - start) / fadeMs);
        const eased = 1 - (1 - t) ** 2;
        setHudScoreDisplay(Math.round(from + (to - from) * eased));
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, delayMs);
  }, []);

  const scheduleHudRampAfterOverlay = useCallback(() => {
    scheduleHudScoreRamp(SCORE_OVERLAY_COUNT_MS + SCORE_OVERLAY_HOLD_MS);
  }, [scheduleHudScoreRamp]);

  useLayoutEffect(() => {
    slotPxRef.current = slotPx;
  }, [slotPx]);

  const handleSlotScreenSize = useCallback((px: number) => {
    setSlotPx((prev) => (Math.abs(prev - px) < 0.25 ? prev : px));
  }, []);

  const snapCenterToCursor = useCallback<Modifier>(
    ({ activatorEvent, draggingNodeRect, transform }) => {
      if (!draggingNodeRect || !activatorEvent) return transform;
      const coords = getEventCoordinates(activatorEvent);
      if (!coords) return transform;
      const offsetX = coords.x - draggingNodeRect.left;
      const offsetY = coords.y - draggingNodeRect.top;
      const offTray = !pointerOverTrayRef.current;
      const slotSize =
        slotPxRef.current > 0.5 ? slotPxRef.current : FALLBACK_SLOT_PX;
      const useCompact = offTray;
      const w = useCompact ? slotSize : draggingNodeRect.width;
      const h = useCompact ? slotSize : draggingNodeRect.height;
      return {
        ...transform,
        x: transform.x + offsetX - w / 2,
        y: transform.y + offsetY - h / 2,
      };
    },
    [],
  );

  const handleScaledBounds = useCallback((rect: DOMRectReadOnly) => {
    if (typeof window === "undefined") return;
    setHintTrayPaddingRight(Math.max(0, window.innerWidth - rect.right));
  }, []);

  // After hydration, surface the mode picker so the user makes the first choice.
  useEffect(() => {
    setState((s) => ({ ...s, hydrated: true }));
    setShowPicker(true);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 80, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const totalForRound = useMemo(
    () => (state.mode === "daily20" ? QUICK_DECK_SIZE : ELEMENTS.length),
    [state.mode],
  );
  const remaining = totalForRound - state.totalDrops;

  const timerFreezeAtMs = challenge?.pauseAtMs ?? challengeFreezeAtMs;
  const timerSecondsLeft =
    !state.started || state.timerEndMs == null
      ? null
      : state.finished || state.afterTimeUp !== "none"
        ? 0
        : timerFreezeAtMs != null
          ? Math.max(0, Math.ceil((state.timerEndMs - timerFreezeAtMs) / 1000))
          : Math.max(0, Math.ceil((state.timerEndMs - Date.now()) / 1000));

  useEffect(() => {
    if (
      !state.started ||
      state.finished ||
      state.afterTimeUp !== "none" ||
      challenge != null ||
      challengeFreezeAtMs != null
    ) {
      return;
    }
    const id = window.setInterval(() => setTimerTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [state.started, state.finished, state.afterTimeUp, challenge, challengeFreezeAtMs]);

  useEffect(() => {
    if (challenge != null || challengeFreezeAtMs != null) return;
    if (!state.started || state.finished || state.afterTimeUp !== "none" || state.timerEndMs == null) {
      return;
    }
    const fire = () => {
      setState((s) => {
        if (!s.started || s.finished || s.afterTimeUp !== "none" || s.timerEndMs == null) {
          return s;
        }
        if (Date.now() >= s.timerEndMs) {
          return { ...s, afterTimeUp: "modal", timeUpSealedScore: s.score };
        }
        return s;
      });
    };
    const id = window.setInterval(fire, 250);
    fire();
    return () => clearInterval(id);
  }, [state.started, state.finished, state.afterTimeUp, state.timerEndMs, challenge, challengeFreezeAtMs]);

  const handleStart = useCallback((mode: Mode) => {
    if (hudScoreDelayTimerRef.current) {
      clearTimeout(hudScoreDelayTimerRef.current);
      hudScoreDelayTimerRef.current = null;
    }
    hudScoreRafGenRef.current += 1;
    setHudScoreDisplay(0);
    setTableResetVersion((v) => v + 1);
    setState(initialRound(mode));
    setTimerTick(0);
    setHintTrayPaddingRight(null);
    setPlacement({});
    setActiveDragZ(null);
    setPointerOverTray(true);
    pointerOverTrayRef.current = true;
    setShowPicker(false);
    setChallenge(null);
    challengeMilestoneRef.current = null;
    setChallengeFreezeAtMs(null);
    if (challengeOpenTimerRef.current != null) {
      window.clearTimeout(challengeOpenTimerRef.current);
      challengeOpenTimerRef.current = null;
    }
  }, []);

  const handleTimeUpContinue = useCallback(() => {
    setState((s) =>
      s.afterTimeUp === "modal" ? { ...s, afterTimeUp: "continued" } : s,
    );
  }, []);

  const handleOpenPicker = useCallback(() => setShowPicker(true), []);
  const handleClosePicker = useCallback(() => setShowPicker(false), []);

  const openChallengeBatch = useCallback((mode: Mode, pauseAtMs: number) => {
    setChallengeFreezeAtMs(null);
    const steps = buildChallengeStepsForMilestone(mode);
    const first = steps[0]!;
    setChallenge({
      pauseAtMs,
      steps,
      stepIndex: 0,
      phase: "pick",
      atomicOrderZs: first.kind === "atomicOrder" ? [...first.initialOrderZs] : null,
    });
  }, []);

  useEffect(() => {
    if (!state.started || state.finished) return;
    const n = state.totalDrops;
    if (n === 0 || n % CHALLENGE_EVERY_N_PLACEMENTS !== 0) return;
    if (challengeMilestoneRef.current === n) return;
    challengeMilestoneRef.current = n;

    const pauseAtMs = Date.now();
    setChallengeFreezeAtMs(pauseAtMs);
    if (challengeOpenTimerRef.current != null) {
      window.clearTimeout(challengeOpenTimerRef.current);
      challengeOpenTimerRef.current = null;
    }
    challengeOpenTimerRef.current = window.setTimeout(() => {
      challengeOpenTimerRef.current = null;
      openChallengeBatch(state.mode, pauseAtMs);
    }, PLACEMENT_OVERLAY_TOTAL_MS);
  }, [state.totalDrops, state.started, state.finished, state.mode, openChallengeBatch]);

  const applyChallengeCorrectReward = useCallback(
    (batch: ChallengeBatchState) => {
      let rewardLine = "";
      setState((prev) => {
        const r = resolveMidGameChallengeReward(prev);
        rewardLine = r.rewardLine;
        if (r.scoreAdd > 0) {
          queueMicrotask(() => scheduleHudScoreRamp(0));
        }
        return {
          ...prev,
          score: prev.score + r.scoreAdd,
          hintsRemaining: Math.min(HINTS_PER_ROUND, prev.hintsRemaining + r.hintDelta),
        };
      });
      setChallenge({
        ...batch,
        phase: "resolved",
        outcome: "correct",
        rewardLine,
      });
    },
    [scheduleHudScoreRamp],
  );

  const handleChallengeNoblePick = useCallback(
    (pickedZ: number) => {
      const b = challengeSnapshotRef.current;
      if (!b || b.phase !== "pick") return;
      const step = b.steps[b.stepIndex];
      if (step.kind !== "tripleChoice") return;
      if (Number(pickedZ) !== Number(step.correctZ)) {
        setChallenge({ ...b, phase: "resolved", outcome: "wrong" });
        return;
      }
      applyChallengeCorrectReward(b);
    },
    [applyChallengeCorrectReward],
  );

  const handleAtomicReorder = useCallback((orderedZs: number[]) => {
    setChallenge((b) =>
      b && b.phase === "pick" ? { ...b, atomicOrderZs: orderedZs } : b,
    );
  }, []);

  const handleAtomicSubmit = useCallback(() => {
    const b = challengeSnapshotRef.current;
    if (!b || b.phase !== "pick" || !b.atomicOrderZs) return;
    const step = b.steps[b.stepIndex];
    if (step.kind !== "atomicOrder") return;
    if (!isAtomicOrderCorrect(step.sortedZs, b.atomicOrderZs)) {
      setChallenge({ ...b, phase: "resolved", outcome: "wrong" });
      return;
    }
    applyChallengeCorrectReward(b);
  }, [applyChallengeCorrectReward]);

  const handleChallengeContinue = useCallback(() => {
    const b = challengeSnapshotRef.current;
    if (!b || b.phase !== "resolved") return;
    if (b.stepIndex < b.steps.length - 1) {
      const nextIdx = b.stepIndex + 1;
      const next = b.steps[nextIdx]!;
      setChallenge({
        ...b,
        stepIndex: nextIdx,
        phase: "pick",
        outcome: undefined,
        rewardLine: undefined,
        atomicOrderZs: next.kind === "atomicOrder" ? [...next.initialOrderZs] : null,
      });
      return;
    }
    const pauseMs = Date.now() - b.pauseAtMs;
    setState((s) =>
      s.timerEndMs != null ? { ...s, timerEndMs: s.timerEndMs + pauseMs } : s,
    );
    setChallenge(null);
  }, []);

  // Per-card hints: each Use Hint click advances every hand card one step:
  // blank → color → width-5 range → width-2 range (already-maxed cards unchanged).
  const handleUseHint = useCallback(() => {
    setState((prev) => {
      if (challengeOpenRef.current) return prev;
      if (!prev.started || prev.finished || prev.afterTimeUp === "modal") return prev;
      if (prev.hintsRemaining <= 0) return prev;

      const nextRemaining = prev.hintsRemaining - 1;
      const hintedZs = new Set(prev.hintedZs);
      const placementHints = new Map(prev.hintPlacementByZ);

      let saltTail = 0;
      for (const hz of prev.hand) {
        if (hz != null) saltTail += hz * 17;
      }
      const saltBase = prev.totalDrops * 1315423911 + saltTail;

      for (const z of prev.hand) {
        if (z == null) continue;
        if (!hintedZs.has(z)) {
          hintedZs.add(z);
        } else if (!placementHints.has(z)) {
          placementHints.set(
            z,
            zPlacementWindow(z, 5, saltBase ^ (z * 0x1b873593)),
          );
        } else {
          const w = placementHints.get(z)!;
          const span = w.hi - w.lo;
          // Width-5 window uses span 4; upgrade to width-2 (span 1).
          if (span >= 4) {
            placementHints.set(
              z,
              zPlacementWindow(z, 2, saltBase ^ (z * 0xcc9e2d51)),
            );
          }
        }
      }

      return {
        ...prev,
        hintedZs,
        hintPlacementByZ: placementHints,
        hintsRemaining: nextRemaining,
      };
    });
  }, []);

  useEffect(() => {
    if (activeDragZ == null) {
      setPointerOverTray(true);
      pointerOverTrayRef.current = true;
      return;
    }

    const sync = (clientX: number, clientY: number) => {
      const tray = trayRef.current;
      if (!tray) return;
      const r = tray.getBoundingClientRect();
      const over =
        clientX >= r.left &&
        clientX <= r.right &&
        clientY >= r.top &&
        clientY <= r.bottom;
      pointerOverTrayRef.current = over;
      setPointerOverTray((prev) => (prev === over ? prev : over));
    };

    const onMove = (e: PointerEvent) => sync(e.clientX, e.clientY);

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [activeDragZ]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    pointerOverTrayRef.current = true;
    setPointerOverTray(true);
    const z = (event.active.data.current as { z?: number } | undefined)?.z;
    if (typeof z === "number") setActiveDragZ(z);
  }, []);

  const handleDragCancel = useCallback(() => {
    setActiveDragZ(null);
    setPointerOverTray(true);
    pointerOverTrayRef.current = true;
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveDragZ(null);
    setPointerOverTray(true);
    pointerOverTrayRef.current = true;
    const { active, over } = event;
    if (!over) return;
    const data = over.data.current as { row?: number; col?: number } | undefined;
    if (!data || data.row == null || data.col == null) return;

    const z = (active.data.current as { z?: number } | undefined)?.z;
    if (typeof z !== "number") return;
    const element = ELEMENTS_BY_Z[z];
    if (!element) return;

    const placedAt = { row: data.row, col: data.col };
    const trueAt = { row: element.row, col: element.col };

    const slotElement = ELEMENTS.find(
      (e) => e.row === data.row && e.col === data.col,
    );
    if (!slotElement) return;
    const droppedSlotZ = slotElement.z;

    setState((prev) => {
      if (challengeOpenRef.current) return prev;
      if (!prev.started || prev.finished) return prev;
      if (prev.afterTimeUp === "modal") return prev;
      if (!prev.hand.includes(z)) return prev;

      const scoreFrozen = prev.afterTimeUp === "continued";
      const isBonus = prev.bonusZs.has(z);
      const result = computeScore(z, droppedSlotZ, prev.streak, isBonus);
      const points = scoreFrozen ? 0 : result.finalPoints;
      const newStreak = scoreFrozen ? prev.streak : nextStreak(prev.streak, result.exact);

      const handIdx = prev.hand.indexOf(z);
      const newHand = prev.hand.slice();
      const nextZ = prev.deck[0];
      newHand[handIdx] = nextZ ?? null;
      const newDeck = prev.deck.slice(1);

      const newPlaced = new Set(prev.placedZs);
      newPlaced.add(z);

      const newTotal = prev.totalDrops + 1;
      const newExact = prev.exactDrops + (result.exact ? 1 : 0);
      const finished =
        newTotal >= (prev.mode === "daily20" ? QUICK_DECK_SIZE : ELEMENTS.length);

      let timeBonus = 0;
      if (finished && prev.afterTimeUp === "none" && prev.timerEndMs != null) {
        timeBonus =
          Math.max(0, Math.floor((prev.timerEndMs - Date.now()) / 1000)) *
          TIME_BONUS_PER_SECOND;
      }

      dropIdCounter.current += 1;
      const dropId = dropIdCounter.current;
      const flash = result.exact
        ? { row: trueAt.row, col: trueAt.col, kind: "good" as const }
        : result.distance <= 8
          ? { row: trueAt.row, col: trueAt.col, kind: "mid" as const }
          : { row: trueAt.row, col: trueAt.col, kind: "bad" as const };

      setPlacement({
        attemptedAt: result.exact ? undefined : placedAt,
        flashAt: flash,
        dropId,
        scoreFloat: { target: points, dropId },
        celebrationPhrase: result.exact ? pickCelebrationPhrase() : undefined,
        streakLength:
          !scoreFrozen && result.exact && newStreak >= 2 ? newStreak : undefined,
      });
      if (result.exact) {
        queueMicrotask(() => setTableHitStop((n) => n + 1));
      }

      const LINE_MS = PLACEMENT_OVERLAY_TOTAL_MS;
      window.setTimeout(() => {
        setPlacement((p) => (p.dropId === dropId ? {} : p));
      }, LINE_MS);

      const newPlacementHints = new Map(prev.hintPlacementByZ);
      newPlacementHints.delete(z);

      if (!scoreFrozen) {
        window.setTimeout(() => scheduleHudRampAfterOverlay(), 0);
      }

      return {
        ...prev,
        hand: newHand,
        deck: newDeck,
        placedZs: newPlaced,
        hintPlacementByZ: newPlacementHints,
        score: prev.score + points + (finished ? timeBonus : 0),
        streak: newStreak,
        bestStreak: scoreFrozen
          ? prev.bestStreak
          : Math.max(prev.bestStreak, newStreak),
        totalDrops: newTotal,
        exactDrops: newExact,
        finished,
        timeBonusPoints: finished ? timeBonus : prev.timeBonusPoints,
      };
    });
  }, [scheduleHudRampAfterOverlay]);

  const accuracy =
    state.totalDrops > 0
      ? Math.round((state.exactDrops / state.totalDrops) * 100)
      : 0;

  return (
    <>
    <DndContext
      sensors={sensors}
      collisionDetection={slotCollisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden">
        <div className="mx-auto flex min-h-0 w-full max-w-[1400px] flex-1 flex-col gap-2 overflow-hidden px-3 py-2 md:gap-3 md:px-5 md:py-3">
          <div className="shrink-0">
            <HUD
              score={hudScoreDisplay}
              scoreWidthLock={Math.max(hudScoreDisplay, state.score)}
              streak={state.streak}
              bestStreak={state.bestStreak}
              remaining={Math.max(0, remaining)}
              total={totalForRound}
              started={state.started}
              timerLabel={
                timerSecondsLeft !== null ? formatTimeMmSs(timerSecondsLeft) : null
              }
              onOpenMenu={handleOpenPicker}
              onRestart={() => handleStart(state.mode)}
            />
          </div>

          <ViewportFitScale
            onScaleChange={setViewportScale}
            onScaledBounds={handleScaledBounds}
          >
            <PeriodicTable
              resetVersion={tableResetVersion}
              placedZs={state.placedZs}
              placement={placement}
              hitStopVersion={tableHitStop}
              onSlotScreenSize={handleSlotScreenSize}
              viewportScale={viewportScale}
            />
          </ViewportFitScale>
        </div>

        <div
          ref={trayRef}
          className="relative z-[1] w-full shrink-0 border-t border-white/[0.06] bg-gradient-to-b from-slate-950/95 via-ink-950 to-black pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-10px_36px_-4px_rgba(0,0,0,0.5),0_-3px_14px_rgba(15,23,42,0.28)]"
        >
          <div className="relative flex w-full flex-col items-center gap-1">
            {state.finished ? (
              <FinishedPanel
                score={state.score}
                timeBonusPoints={state.timeBonusPoints}
                bestStreak={state.bestStreak}
                accuracy={accuracy}
                total={state.totalDrops}
                onRestart={() => handleStart(state.mode)}
                onChangeMode={handleOpenPicker}
              />
            ) : state.started ? (
              <Hand
                hand={state.hand.map((z) => (z ? ELEMENTS_BY_Z[z] : null))}
                bonusZs={state.bonusZs}
                hintedZs={state.hintedZs}
                placementHints={state.hintPlacementByZ}
                hintsRemaining={state.hintsRemaining}
                hintTrayPaddingRight={hintTrayPaddingRight}
                onUseHint={handleUseHint}
              />
            ) : (
              <div className="h-14 shrink-0" aria-hidden />
            )}
          </div>
          <Footer />
        </div>
        </div>

      <DragOverlay
        dropAnimation={{ duration: 220, easing: "cubic-bezier(.2,.8,.2,1)" }}
        modifiers={[snapCenterToCursor]}
      >
        {activeDragZ != null ? (
          <TableDragPreview
            z={activeDragZ}
            slotPx={slotPx}
            pointerOverTray={pointerOverTray}
            bonusZs={state.bonusZs}
            hintedZs={state.hintedZs}
            hintPlacementByZ={state.hintPlacementByZ}
          />
        ) : null}
      </DragOverlay>

      {showPicker && (
        <ModePicker
          currentMode={state.started ? state.mode : null}
          onPick={handleStart}
          onClose={state.started ? handleClosePicker : undefined}
        />
      )}

      {state.afterTimeUp === "modal" && state.timeUpSealedScore != null ? (
        <TimeUpModal
          score={state.timeUpSealedScore}
          onNewGame={() => handleStart(state.mode)}
          onContinue={handleTimeUpContinue}
        />
      ) : null}
    </DndContext>

      {challenge != null ? (
        <ChallengeModal
          open
          modeLabel={state.mode === "daily20" ? "Daily 20" : "Full Deck"}
          stepProgress={`${challenge.stepIndex + 1} / ${challenge.steps.length}`}
          currentStep={challenge.steps[challenge.stepIndex]!}
          phase={challenge.phase}
          outcome={challenge.outcome}
          rewardLine={challenge.rewardLine}
          atomicOrderZs={challenge.atomicOrderZs}
          onTripleChoicePick={handleChallengeNoblePick}
          onAtomicOrderChange={handleAtomicReorder}
          onAtomicSubmit={handleAtomicSubmit}
          onContinue={handleChallengeContinue}
        />
      ) : null}
    </>
  );
}

function TableDragPreview({
  z,
  slotPx,
  pointerOverTray,
  bonusZs,
  hintedZs,
  hintPlacementByZ,
}: {
  z: number;
  slotPx: number;
  pointerOverTray: boolean;
  bonusZs: Set<number>;
  hintedZs: Set<number>;
  hintPlacementByZ: Map<number, { lo: number; hi: number }>;
}) {
  const edge = slotPx > 0.5 ? slotPx : FALLBACK_SLOT_PX;
  const square = !pointerOverTray;
  const el = ELEMENTS_BY_Z[z];
  const isBonus = bonusZs.has(z);
  const hinted = hintedZs.has(z);
  const hint = hinted ? hintPlacementByZ.get(z) ?? undefined : undefined;

  const shell = square ? (
    <div
      className="overflow-hidden rounded-lg shadow-[0_8px_20px_rgba(0,0,0,0.5)]"
      style={{ width: edge, height: edge }}
    >
      {isBonus ? (
        <div className="bonus-wrapper h-full w-full rounded-lg p-[2px]">
          <ElementCard
            element={el}
            size="sm"
            compact
            className="!h-full !w-full"
            hideName
            isBonus
            colored={hinted}
            placementHint={hint}
          />
        </div>
      ) : (
        <ElementCard
          element={el}
          size="sm"
          compact
          className="!h-full !w-full"
          hideName
          colored={hinted}
          placementHint={hint}
        />
      )}
    </div>
  ) : isBonus ? (
    <div className="bonus-wrapper rounded-[14px] p-[2px]">
      <ElementCard
        element={el}
        size="lg"
        isBonus
        colored={hinted}
        placementHint={hint}
      />
    </div>
  ) : (
    <ElementCard element={el} size="lg" colored={hinted} placementHint={hint} />
  );

  return (
    <div
      className={
        square
          ? "origin-center"
          : "origin-center transition-transform duration-200 ease-out drag-tilt"
      }
    >
      {shell}
    </div>
  );
}

function TimeUpModal({
  score,
  onNewGame,
  onContinue,
}: {
  score: number;
  onNewGame: () => void;
  onContinue: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Time is up"
      className="fixed inset-0 z-[55] flex items-center justify-center"
    >
      <div className="absolute inset-0 bg-ink-950/90 backdrop-blur-md" aria-hidden />
      <div className="relative mx-4 w-full max-w-md rounded-3xl border border-white/10 bg-ink-900/95 p-8 text-center shadow-2xl shadow-black/60">
        <h2 className="text-2xl font-black tracking-tight text-white md:text-3xl">
          Time&apos;s Up
        </h2>
        <p className="mt-5 text-sm font-medium text-white/90">Your Score:</p>
        <p className="mt-1 font-mono text-3xl font-bold text-white tabular-nums md:text-4xl">
          {score.toLocaleString()}
        </p>
        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center sm:gap-3">
          <button
            type="button"
            onClick={onNewGame}
            className="rounded-full bg-gradient-to-r from-cyan-500 to-fuchsia-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/25 hover:brightness-110"
          >
            New Game
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="rounded-full border border-white/20 bg-white/[0.06] px-6 py-2.5 text-sm font-medium text-white hover:bg-white/[0.12]"
          >
            Continue
          </button>
        </div>
        <p className="mt-5 text-xs leading-relaxed text-ink-400">
          Continue to keep placing elements. Your score stays locked where it is.
        </p>
      </div>
    </div>
  );
}

function FinishedPanel({
  score,
  timeBonusPoints,
  bestStreak,
  accuracy,
  total,
  onRestart,
  onChangeMode,
}: {
  score: number;
  timeBonusPoints: number;
  bestStreak: number;
  accuracy: number;
  total: number;
  onRestart: () => void;
  onChangeMode: () => void;
}) {
  const baseScore = score - timeBonusPoints;
  const [displayScore, setDisplayScore] = useState(score);
  const [bonusShow, setBonusShow] = useState(0);

  useEffect(() => {
    if (timeBonusPoints <= 0) {
      setDisplayScore(score);
      setBonusShow(0);
      return;
    }
    setDisplayScore(baseScore);
    setBonusShow(0);
    let cancelled = false;
    const start = performance.now();
    const dur = 1000;
    const step = () => {
      if (cancelled) return;
      const t = Math.min(1, (performance.now() - start) / dur);
      const eased = 1 - (1 - t) ** 2;
      const b = Math.round(timeBonusPoints * eased);
      setBonusShow(b);
      setDisplayScore(baseScore + b);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    return () => {
      cancelled = true;
    };
  }, [score, timeBonusPoints, baseScore]);

  return (
    <div className="max-h-[min(340px,38svh)] w-full overflow-y-auto overscroll-contain px-1 [-webkit-overflow-scrolling:touch]">
      <div className="mx-auto w-full max-w-lg rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center md:max-w-xl md:p-5">
        <h2 className="text-xl font-bold md:text-2xl">
          <span className="title-grad">Round complete</span>
        </h2>
        {timeBonusPoints > 0 ? (
          <div className="mt-3 space-y-1">
            <p className="text-xs uppercase tracking-widest text-ink-400">
              Time bonus
              <span className="normal-case text-ink-500"> · 50 pts/sec left</span>
            </p>
            <p
              className="font-mono text-xl font-bold text-emerald-300 tabular-nums md:text-2xl"
              aria-live="polite"
            >
              +{bonusShow.toLocaleString()}
            </p>
          </div>
        ) : null}
        <div
          className={`grid grid-cols-3 gap-2 text-sm md:gap-4 ${timeBonusPoints > 0 ? "mt-4" : "mt-3"} md:mt-4`}
        >
          <Big label="Score" value={displayScore.toLocaleString()} />
          <Big label="Best Streak" value={bestStreak.toString()} />
          <Big label="Accuracy" value={`${accuracy}%`} />
        </div>
        <div className="mt-2 text-xs text-ink-300">{total} elements placed</div>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={onRestart}
            className="rounded-full bg-gradient-to-r from-cyan-500 to-fuchsia-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/30 hover:brightness-110"
          >
            Play again
          </button>
          <button
            onClick={onChangeMode}
            className="rounded-full border border-white/15 bg-white/[0.05] px-5 py-2 text-sm font-medium text-ink-300 hover:bg-white/[0.1] hover:text-white"
          >
            Change mode
          </button>
        </div>
      </div>
    </div>
  );
}

function Big({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-white/10 bg-white/[0.03] px-2 py-2 md:px-4 md:py-3">
      <span className="text-[9px] uppercase tracking-widest text-ink-300 md:text-[10px]">
        {label}
      </span>
      <span className="font-mono text-lg font-bold text-white md:text-2xl">{value}</span>
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-1.5 flex items-center justify-end px-1 text-[10px] text-ink-300 md:mt-2 md:text-[11px]">
      <span className="font-mono opacity-60">v0.1 · MVP</span>
    </footer>
  );
}
