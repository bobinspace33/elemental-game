"use client";

import {
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface ViewportFitScaleProps {
  children: ReactNode;
  /** Fires whenever the uniform scale applied to `children` changes (layout / resize). */
  onScaleChange?: (scale: number) => void;
  /** Scaled table wrapper in viewport coordinates (e.g. align UI with the visual right edge). */
  onScaledBounds?: (rect: DOMRectReadOnly) => void;
}

/**
 * Measures `children` at their natural size and scales them down uniformly
 * so both dimensions fit inside the flex parent. Eliminates page scroll when
 * combined with a fixed-height column layout.
 */
export function ViewportFitScale({
  children,
  onScaleChange,
  onScaledBounds,
}: ViewportFitScaleProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const scaledBoxRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ iw: 1010, ih: 520, scale: 1 });

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    const update = () => {
      const iw = inner.scrollWidth;
      const ih = inner.scrollHeight;
      const ow = outer.clientWidth;
      const oh = outer.clientHeight;
      if (iw < 1 || ih < 1 || ow < 1 || oh < 1) return;
      const scale = Math.min(1, ow / iw, oh / ih);
      setDims({ iw, ih, scale });
      onScaleChange?.(scale);
    };

    update();
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(update);
    });
    ro.observe(outer);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [onScaleChange]);

  const { iw, ih, scale } = dims;

  useLayoutEffect(() => {
    if (!onScaledBounds) return;
    const box = scaledBoxRef.current;
    if (!box) return;
    onScaledBounds(box.getBoundingClientRect());
  }, [dims, onScaledBounds]);

  return (
    <div
      ref={outerRef}
      className="flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden"
    >
      <div
        ref={scaledBoxRef}
        className="relative shrink-0"
        style={{
          width: Math.max(1, iw * scale),
          height: Math.max(1, ih * scale),
        }}
      >
        <div
          ref={innerRef}
          className="absolute left-0 top-0 origin-top-left"
          style={{
            width: "max-content",
            height: "max-content",
            transform: `scale(${scale})`,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
