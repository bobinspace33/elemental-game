import {
  ELEMENTS,
  type ElementCategory,
  type ElementDef,
} from "./elements";
import {
  elementEligibleForRtPhaseQuiz,
  isGasAtRoomTemp,
  isNotSolidAtRoomTemp,
  isSolidAtRoomTemp,
} from "./elementRoomPhase";

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

/** Categories treated as metals for quiz "NOT a metal" / distractors. */
function isMetalCategory(cat: ElementCategory): boolean {
  return (
    cat === "alkali-metal" ||
    cat === "alkaline-earth" ||
    cat === "transition-metal" ||
    cat === "post-transition" ||
    cat === "lanthanide" ||
    cat === "actinide"
  );
}

export type MidGameChallengeKind = "tripleChoice" | "atomicOrder";

export type TripleChoiceVariant =
  | "nobleGas"
  | "notNobleGas"
  | "notMetal"
  | "notSolidRt"
  | "isGasRt";

export interface MidGameTripleChoiceChallenge {
  kind: "tripleChoice";
  variant: TripleChoiceVariant;
  prompt: string;
  choices: ElementDef[];
  correctZ: number;
}

export interface MidGameAtomicOrderChallenge {
  kind: "atomicOrder";
  prompt: string;
  /** Ascending atomic numbers (low → high). */
  sortedZs: [number, number, number];
  /** Starting left-to-right order (shuffled). */
  initialOrderZs: number[];
}

export type MidGameChallengeStep =
  | MidGameTripleChoiceChallenge
  | MidGameAtomicOrderChallenge;

const ATOMIC_ORDER_PROMPT = "Arrange in order of atomic number.";

function pickTwoDistractors(
  pool: ElementDef[],
  correct: ElementDef,
): [ElementDef, ElementDef] {
  const filtered = pool.filter((e) => e.z !== correct.z);
  const shuffled = shuffle(filtered);
  if (shuffled.length >= 2) {
    return [shuffled[0]!, shuffled[1]!];
  }
  if (shuffled.length === 1) {
    const second = randomFrom(
      ELEMENTS.filter((e) => e.z !== correct.z && e.z !== shuffled[0]!.z),
    );
    return [shuffled[0]!, second];
  }
  const any = shuffle(ELEMENTS.filter((e) => e.z !== correct.z));
  return [any[0]!, any[1]!];
}

/** One noble gas + two non–noble-gas distractors, shuffled. */
export function buildTripleNobleGasIs(): MidGameTripleChoiceChallenge {
  const nobles = ELEMENTS.filter((e) => e.category === "noble-gas");
  const pool = ELEMENTS.filter((e) => e.category !== "noble-gas");
  const correct = randomFrom(nobles);
  const [a, b] = pickTwoDistractors(pool, correct);
  return {
    kind: "tripleChoice",
    variant: "nobleGas",
    prompt: "Which element is a noble gas?",
    choices: shuffle([correct, a, b]),
    correctZ: correct.z,
  };
}

/** One non–noble-gas + two distinct noble gases as distractors. */
export function buildTripleNotNobleGas(): MidGameTripleChoiceChallenge {
  const nobles = ELEMENTS.filter((e) => e.category === "noble-gas");
  const pool = ELEMENTS.filter((e) => e.category !== "noble-gas");
  const correct = randomFrom(pool);
  const noblePool = nobles.filter((e) => e.z !== correct.z);
  const shuffledNobles = shuffle(noblePool);
  const n1 = shuffledNobles[0]!;
  const n2 = shuffledNobles[1]!;
  return {
    kind: "tripleChoice",
    variant: "notNobleGas",
    prompt: "Which is NOT a noble gas?",
    choices: shuffle([correct, n1, n2]),
    correctZ: correct.z,
  };
}

/** One non-metal + two metal distractors. */
export function buildTripleNotMetal(): MidGameTripleChoiceChallenge {
  const nonMetals = ELEMENTS.filter((e) => !isMetalCategory(e.category));
  const metals = ELEMENTS.filter((e) => isMetalCategory(e.category));
  const correct = randomFrom(nonMetals);
  const [a, b] = pickTwoDistractors(metals, correct);
  return {
    kind: "tripleChoice",
    variant: "notMetal",
    prompt: "Which is NOT a metal?",
    choices: shuffle([correct, a, b]),
    correctZ: correct.z,
  };
}

/** One gas or liquid at RT + two solid distractors (eligible Z only). */
export function buildTripleNotSolidRt(): MidGameTripleChoiceChallenge {
  const eligible = ELEMENTS.filter((e) => elementEligibleForRtPhaseQuiz(e.z));
  const notSolid = eligible.filter((e) => isNotSolidAtRoomTemp(e.z));
  const solid = eligible.filter((e) => isSolidAtRoomTemp(e.z));
  const correct = randomFrom(notSolid);
  const [a, b] = pickTwoDistractors(solid, correct);
  return {
    kind: "tripleChoice",
    variant: "notSolidRt",
    prompt: "Which is NOT a solid at room temperature?",
    choices: shuffle([correct, a, b]),
    correctZ: correct.z,
  };
}

/** One gas at RT + two distractors that are not gases (solids or liquids). */
export function buildTripleIsGasRt(): MidGameTripleChoiceChallenge {
  const eligible = ELEMENTS.filter((e) => elementEligibleForRtPhaseQuiz(e.z));
  const gases = eligible.filter((e) => isGasAtRoomTemp(e.z));
  const nonGases = eligible.filter((e) => !isGasAtRoomTemp(e.z));
  const correct = randomFrom(gases);
  const [a, b] = pickTwoDistractors(nonGases, correct);
  return {
    kind: "tripleChoice",
    variant: "isGasRt",
    prompt: "Which is a gas at room temperature?",
    choices: shuffle([correct, a, b]),
    correctZ: correct.z,
  };
}

/** Three distinct elements; user sorts ascending by Z. */
export function buildAtomicOrderChallenge(): MidGameAtomicOrderChallenge {
  const pool = ELEMENTS.slice();
  const picked: ElementDef[] = [];
  const usedZ = new Set<number>();
  let attempts = 0;
  while (picked.length < 3 && attempts++ < 400) {
    const el = pool[Math.floor(Math.random() * pool.length)]!;
    if (usedZ.has(el.z)) continue;
    usedZ.add(el.z);
    picked.push(el);
  }
  while (picked.length < 3) {
    for (const el of ELEMENTS) {
      if (picked.length >= 3) break;
      if (!usedZ.has(el.z)) {
        usedZ.add(el.z);
        picked.push(el);
      }
    }
  }
  const sorted = picked.slice().sort((a, b) => a.z - b.z);
  const sortedZs: [number, number, number] = [
    sorted[0]!.z,
    sorted[1]!.z,
    sorted[2]!.z,
  ];
  const initialOrderZs = shuffle(picked).map((e) => e.z);
  return {
    kind: "atomicOrder",
    prompt: ATOMIC_ORDER_PROMPT,
    sortedZs,
    initialOrderZs,
  };
}

const RANDOM_STEP_BUILDERS: (() => MidGameChallengeStep)[] = [
  buildAtomicOrderChallenge,
  buildTripleNobleGasIs,
  buildTripleNotNobleGas,
  buildTripleNotMetal,
  buildTripleNotSolidRt,
  buildTripleIsGasRt,
];

export function buildRandomMidGameStep(): MidGameChallengeStep {
  return randomFrom(RANDOM_STEP_BUILDERS)();
}

/** Daily 20: three challenges per milestone; Full deck: one. Each step picks a random prompt type. */
export function buildChallengeStepsForMilestone(
  mode: "daily20" | "fullDeck",
): MidGameChallengeStep[] {
  const n = mode === "daily20" ? 3 : 1;
  const steps: MidGameChallengeStep[] = [];
  for (let i = 0; i < n; i++) {
    steps.push(buildRandomMidGameStep());
  }
  return steps;
}

/** @returns true if `order` matches ascending `sortedZs`. */
export function isAtomicOrderCorrect(
  sortedZs: [number, number, number],
  order: number[],
): boolean {
  return (
    order.length === 3 &&
    sortedZs[0] === order[0] &&
    sortedZs[1] === order[1] &&
    sortedZs[2] === order[2]
  );
}

export interface MidGameRewardResult {
  rewardLine: string;
  scoreAdd: number;
  hintDelta: number;
}

const HINT_CAP = 3;

/**
 * Correct answer: if hints &lt; 3 → 25% +1 hint, 75% +1000 pts (when score not frozen).
 * If hints full → +1000 pts when score not frozen.
 */
export function resolveMidGameChallengeReward(prev: {
  afterTimeUp: "none" | "modal" | "continued";
  hintsRemaining: number;
}): MidGameRewardResult {
  const scoreFrozen = prev.afterTimeUp === "continued";
  const hintsNotFull = prev.hintsRemaining < HINT_CAP;

  if (hintsNotFull) {
    if (Math.random() < 0.25) {
      return { rewardLine: "Correct! +1 Hint!", scoreAdd: 0, hintDelta: 1 };
    }
    if (!scoreFrozen) {
      return { rewardLine: "Correct! +1,000 points!", scoreAdd: 1000, hintDelta: 0 };
    }
    return {
      rewardLine: "Correct! (Score is frozen — no bonus points.)",
      scoreAdd: 0,
      hintDelta: 0,
    };
  }

  if (!scoreFrozen) {
    return { rewardLine: "Correct! +1,000 points!", scoreAdd: 1000, hintDelta: 0 };
  }
  return { rewardLine: "Correct! (Score is frozen.)", scoreAdd: 0, hintDelta: 0 };
}
