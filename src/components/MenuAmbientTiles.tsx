"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import { ELEMENTS, elementCardFillBackgroundStyle } from "@/lib/elements";

type TileSpec = {
  id: number;
  elementIndex: number;
  leftVw: number;
  topVh: number;
  sizePx: number;
  rotateDeg: number;
  durationMs: number;
};

function randomTile(prevId: number): TileSpec {
  const id = prevId + 1;
  return {
    id,
    elementIndex: Math.floor(Math.random() * ELEMENTS.length),
    leftVw: -10 + Math.random() * 120,
    topVh: -10 + Math.random() * 120,
    sizePx: Math.round(52 + Math.random() * 52),
    rotateDeg: (Math.random() - 0.5) * 14,
    durationMs: Math.round(8000 + Math.random() * 7000),
  };
}

/**
 * Decorative element tiles behind the mode-picker panel (still above the dimmed backdrop).
 */
export function MenuAmbientTiles() {
  const [tiles, setTiles] = useState<TileSpec[]>([]);
  const idRef = useRef(0);

  const removeTile = useCallback((id: number) => {
    setTiles((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const spawnTile = useCallback(() => {
    const next = randomTile(idRef.current);
    idRef.current = next.id;
    setTiles((prev) => [...prev, next]);
    window.setTimeout(() => removeTile(next.id), next.durationMs + 80);
  }, [removeTile]);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | undefined;

    const scheduleNext = () => {
      const delay = 2000 + Math.random() * 3000;
      timeoutId = window.setTimeout(() => {
        if (cancelled) return;
        spawnTile();
        scheduleNext();
      }, delay);
    };

    spawnTile();
    scheduleNext();
    return () => {
      cancelled = true;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [spawnTile]);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[1] overflow-visible"
      aria-hidden
    >
      {tiles.map((t) => {
        const el = ELEMENTS[t.elementIndex];
        if (!el) return null;
        const fill = elementCardFillBackgroundStyle(el);
        return (
          <div
            key={t.id}
            className="menu-ambient-tile fixed"
            style={
              {
                left: `${t.leftVw}vw`,
                top: `${t.topVh}vh`,
                width: t.sizePx,
                height: t.sizePx,
                "--menu-ambient-dur": `${t.durationMs}ms`,
              } as CSSProperties
            }
          >
            <div
              className="relative flex h-full w-full flex-col overflow-hidden rounded-xl border border-white/15 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_10px_28px_rgba(0,0,0,0.35)]"
              style={{
                ...fill,
                transform: `rotate(${t.rotateDeg}deg)`,
              }}
            >
              <span className="absolute left-1 top-1 font-mono text-[9px] font-semibold tabular-nums text-white/95 [text-shadow:0_1px_2px_rgba(0,0,0,0.45)] sm:text-[10px]">
                {el.z}
              </span>
              <div className="flex flex-1 flex-col items-center justify-center pb-0.5 pt-2">
                <span
                  className="font-bold tracking-tight leading-none [text-shadow:0_1px_2px_rgba(0,0,0,0.42)]"
                  style={{ fontSize: `${Math.round(Math.max(15, t.sizePx * 0.38))}px` }}
                >
                  {el.symbol}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
