"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";

import {
  ELEMENTS_BY_Z,
  elementCardFillBackgroundStyle,
  elementCategoryRainbowHue,
  type ElementCategory,
} from "@/lib/elements";

const TILE_BASE_PX = 36;
const TILE_GAP_PX = 4;

function orderedExactZs(zs: readonly number[]): number[] {
  const uniq = [...new Set(zs)].filter((z) => ELEMENTS_BY_Z[z]);
  const byCat = new Map<ElementCategory, number[]>();
  for (const z of uniq) {
    const el = ELEMENTS_BY_Z[z]!;
    const arr = byCat.get(el.category) ?? [];
    arr.push(z);
    byCat.set(el.category, arr);
  }
  for (const arr of byCat.values()) arr.sort((a, b) => a - b);
  const cats = [...byCat.keys()].sort(
    (a, b) => elementCategoryRainbowHue(a) - elementCategoryRainbowHue(b),
  );
  return cats.flatMap((c) => byCat.get(c)!);
}

function rowNaturalWidth(count: number): number {
  if (count <= 0) return 0;
  return count * TILE_BASE_PX + Math.max(0, count - 1) * TILE_GAP_PX;
}

function ExactMiniTile({ z, box }: { z: number; box: number }) {
  const el = ELEMENTS_BY_Z[z];
  if (!el) return null;
  const fill = elementCardFillBackgroundStyle(el);
  const zPx = Math.max(8, Math.round(box * 0.22));
  const symPx = Math.max(10, Math.round(box * 0.36));
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-md border border-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]"
      style={{
        ...fill,
        width: box,
        height: box,
      }}
    >
      <span
        className="absolute left-0.5 top-0.5 font-mono font-semibold tabular-nums leading-none text-white/95"
        style={{ fontSize: zPx, textShadow: "0 1px 2px rgba(0,0,0,0.45)" }}
      >
        {el.z}
      </span>
      <div className="flex h-full items-center justify-center pr-0.5 pt-2">
        <span
          className="font-bold leading-none tracking-tight text-white"
          style={{ fontSize: symPx, textShadow: "0 1px 2px rgba(0,0,0,0.42)" }}
        >
          {el.symbol}
        </span>
      </div>
    </div>
  );
}

/** Exact-placement summary: grouped by element category in rainbow hue order; scaled to one row. */
export function ScorecardExactHits({ zs }: { zs: readonly number[] }) {
  const ordered = useMemo(() => orderedExactZs(zs), [zs]);
  const outerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const outer = outerRef.current;
    if (!outer || ordered.length === 0) return;

    const natural = rowNaturalWidth(ordered.length);

    const update = () => {
      const avail = outer.clientWidth;
      if (avail <= 0 || natural <= 0) return;
      const next = Math.min(1, avail / natural);
      setScale((prev) => (Math.abs(prev - next) < 0.008 ? prev : next));
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(outer);
    return () => ro.disconnect();
  }, [ordered]);

  if (ordered.length === 0) return null;

  const tilePx = TILE_BASE_PX * scale;
  const gapPx = TILE_GAP_PX * scale;

  return (
    <div ref={outerRef} className="w-full min-w-0 overflow-hidden">
      <div className="flex justify-center">
        <div
          className="inline-flex flex-nowrap items-start justify-center"
          style={{ gap: gapPx }}
        >
          {ordered.map((z) => (
            <ExactMiniTile key={z} z={z} box={tilePx} />
          ))}
        </div>
      </div>
    </div>
  );
}
