"use client";

import { useMemo } from "react";
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { ELEMENTS_BY_Z, type ElementDef } from "@/lib/elements";
import type { MidGameChallengeStep } from "@/lib/challenges";
import { ElementCard } from "./ElementCard";

export interface ChallengeModalProps {
  open: boolean;
  /** e.g. "Daily 20" / "Full Deck" */
  modeLabel: string;
  /** e.g. "1 / 3" */
  stepProgress: string;
  currentStep: MidGameChallengeStep;
  phase: "pick" | "resolved";
  outcome?: "correct" | "wrong";
  rewardLine?: string;
  /** Left-to-right Z order for atomic challenge; null for triple-choice steps. */
  atomicOrderZs: number[] | null;
  onTripleChoicePick: (z: number) => void;
  onAtomicOrderChange: (orderedZs: number[]) => void;
  onAtomicSubmit: () => void;
  onContinue: () => void;
}

function SortableMiniCard({ z }: { z: number }) {
  const el = ELEMENTS_BY_Z[z];
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: z, data: { z } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
    zIndex: isDragging ? 2 : 0,
  };

  if (!el) return null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="touch-none rounded-2xl"
      {...attributes}
      {...listeners}
    >
      <div className="cursor-grab active:cursor-grabbing">
        <ElementCard element={el} size="md" colored={false} />
      </div>
    </div>
  );
}

function AtomicOrderPicker({
  orderedZs,
  onOrderChange,
  onSubmit,
  disabled,
}: {
  orderedZs: number[];
  onOrderChange: (zs: number[]) => void;
  onSubmit: () => void;
  disabled: boolean;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = orderedZs.indexOf(Number(active.id));
    const newIndex = orderedZs.indexOf(Number(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    onOrderChange(arrayMove(orderedZs, oldIndex, newIndex));
  };

  return (
    <div className="mt-6 flex flex-col items-center gap-4">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={orderedZs} strategy={horizontalListSortingStrategy}>
          <div className="flex flex-wrap items-end justify-center gap-3 md:gap-4">
            {orderedZs.map((z) => (
              <SortableMiniCard key={z} z={z} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <p className="text-xs text-ink-400">Drag cards so atomic number increases left → right</p>
      <button
        type="button"
        disabled={disabled}
        onClick={onSubmit}
        className="rounded-full bg-gradient-to-r from-emerald-500 to-cyan-600 px-8 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Submit
      </button>
    </div>
  );
}

export function ChallengeModal({
  open,
  modeLabel,
  stepProgress,
  currentStep,
  phase,
  outcome,
  rewardLine,
  atomicOrderZs,
  onTripleChoicePick,
  onAtomicOrderChange,
  onAtomicSubmit,
  onContinue,
}: ChallengeModalProps) {
  const resolved = phase === "resolved";

  const tripleChoices = useMemo((): ElementDef[] | null => {
    if (currentStep.kind !== "tripleChoice") return null;
    return currentStep.choices;
  }, [currentStep]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Bonus challenge"
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-ink-950/88 backdrop-blur-md" aria-hidden />

      <div className="relative mx-auto w-full max-w-lg rounded-3xl border border-white/10 bg-ink-900/95 p-6 text-center shadow-2xl shadow-black/60 md:max-w-xl md:p-8">
        <p className="text-xs uppercase tracking-widest text-cyan-200/80">
          Every 10 placements · {modeLabel} · {stepProgress}
        </p>
        <h2 className="mt-2 text-lg font-bold text-white md:text-xl">{currentStep.prompt}</h2>

        {!resolved && currentStep.kind === "tripleChoice" && tripleChoices ? (
          <div className="mt-6 flex flex-wrap items-end justify-center gap-3 md:gap-4">
            {tripleChoices.map((el, i) => (
              <button
                key={`${el.z}-${i}`}
                type="button"
                onClick={() => onTripleChoicePick(el.z)}
                className="rounded-2xl p-1 outline-none transition hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-cyan-400/80 active:translate-y-0"
              >
                <ElementCard element={el} size="md" colored={false} />
              </button>
            ))}
          </div>
        ) : null}

        {!resolved && currentStep.kind === "atomicOrder" && atomicOrderZs ? (
          <AtomicOrderPicker
            orderedZs={atomicOrderZs}
            onOrderChange={onAtomicOrderChange}
            onSubmit={onAtomicSubmit}
            disabled={false}
          />
        ) : null}

        {resolved ? (
          <>
            <p
              className={`mt-6 text-xl font-bold md:text-2xl ${
                outcome === "correct" ? "text-emerald-300" : "text-amber-200"
              }`}
            >
              {outcome === "correct" ? rewardLine || "Correct!" : "Not quite."}
            </p>
            <button
              type="button"
              onClick={onContinue}
              className="mt-8 rounded-full bg-gradient-to-r from-cyan-500 to-fuchsia-500 px-8 py-2.5 text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/25 hover:brightness-110"
            >
              Continue
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
