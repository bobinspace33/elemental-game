import { ELEMENTS_BY_Z, elementCardGradientStops } from "@/lib/elements";

export function formatDailyDateSubtitle(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map((x) => parseInt(x, 10));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    return dateKey;
  }
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function buildDailySharePlainText(params: {
  score: number;
  dateKey: string;
  exactZs: readonly number[];
}): string {
  const sub = formatDailyDateSubtitle(params.dateKey);
  return [
    `eleMENTAL — ${sub}`,
    "",
    `I scored ${params.score.toLocaleString()} on today's eleMENTAL quiz!`,
    "",
    params.exactZs.length > 0
      ? `Exact placements: ${params.exactZs.length}`
      : "Exact placements: 0",
  ].join("\n");
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, rr);
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob != null ? resolve(blob) : reject(new Error("toBlob failed"))),
      "image/png",
      1,
    );
  });
}

/**
 * Raster scorecard for clipboard / future export. Logical CSS pixels; scaled for retina.
 */
export function renderDailyShareScorecardPng(
  params: {
    score: number;
    dateKey: string;
    exactZs: readonly number[];
    bonusZs: ReadonlySet<number> | readonly number[];
  },
  /** Min 2 recommended for sharp social paste. */
  scale?: number,
): Promise<Blob> {
  const s = Math.max(1, scale ?? 2);
  const bonus =
    params.bonusZs instanceof Set ? params.bonusZs : new Set(params.bonusZs);

  const W = 720;
  const outerPad = 24;
  const cardPad = 28;
  const cardW = W - outerPad * 2;
  const innerW = cardW - cardPad * 2;

  const tileW = 36;
  const tileH = 44;
  const tileGap = 8;
  const tileRadius = 10;
  const cols = Math.max(1, Math.floor((innerW + tileGap) / (tileW + tileGap)));
  const tileRows =
    params.exactZs.length === 0 ? 0 : Math.ceil(params.exactZs.length / cols);
  const emptyRowH = params.exactZs.length === 0 ? 28 : 0;

  const headerH = 52;
  const gapAfterHeader = 18;
  const scoreLineH = 26;
  const gapBeforeFrame = 18;
  const framePadY = 14;
  const tilesBlockH =
    tileRows > 0 ? tileRows * (tileH + tileGap) - tileGap + framePadY * 2 : 0;
  const emptyPad = params.exactZs.length === 0 ? framePadY * 2 + emptyRowH : 0;

  const cardH =
    cardPad +
    headerH +
    gapAfterHeader +
    scoreLineH +
    gapBeforeFrame +
    Math.max(tilesBlockH, emptyPad) +
    cardPad;

  const H = outerPad * 2 + cardH;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(W * s);
  canvas.height = Math.round(H * s);
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("Canvas 2D unavailable"));

  ctx.scale(s, s);

  // Outer background
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, W, H);

  const cardX = outerPad;
  const cardY = outerPad;

  // Card
  ctx.save();
  roundRectPath(ctx, cardX, cardY, cardW, cardH, 20);
  ctx.fillStyle = "#1e293bcc";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  const tx = cardX + cardPad;
  let ty = cardY + cardPad;

  // Title + date row
  const title = "eleMENTAL";
  const dateStr = formatDailyDateSubtitle(params.dateKey);
  ctx.font = "900 40px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.textBaseline = "top";
  const titleGrad = ctx.createLinearGradient(tx, ty, tx + 320, ty + 44);
  titleGrad.addColorStop(0, "#22d3ee");
  titleGrad.addColorStop(1, "#d946ef");
  ctx.fillStyle = titleGrad;
  ctx.fillText(title, tx, ty);

  ctx.font = "13px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillStyle = "#94a3b8";
  const dateW = ctx.measureText(dateStr).width;
  const dateX = Math.max(tx + 200, cardX + cardW - cardPad - dateW);
  ctx.fillText(dateStr, dateX, ty + 14);

  ty += headerH + gapAfterHeader;

  const prefix = "I scored ";
  const scoreStr = params.score.toLocaleString();
  const suffix = " on today's eleMENTAL quiz!";

  ctx.textBaseline = "top";
  ctx.font = "600 17px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillStyle = "#f8fafc";
  ctx.fillText(prefix, tx, ty);
  let cursorX = tx + ctx.measureText(prefix).width;

  ctx.font = "800 17px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  const scoreW = ctx.measureText(scoreStr).width;
  const scoreRainbow = ctx.createLinearGradient(cursorX, ty, cursorX + scoreW, ty);
  scoreRainbow.addColorStop(0, "#fecdd3");
  scoreRainbow.addColorStop(0.22, "#fde68a");
  scoreRainbow.addColorStop(0.45, "#bbf7d0");
  scoreRainbow.addColorStop(0.68, "#a5f3fc");
  scoreRainbow.addColorStop(1, "#e9d5ff");
  ctx.fillStyle = scoreRainbow;
  ctx.fillText(scoreStr, cursorX, ty);
  cursorX += scoreW;

  ctx.font = "600 17px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillStyle = "#f8fafc";
  ctx.fillText(suffix, cursorX, ty);

  ty += scoreLineH + gapBeforeFrame;

  // Tiles frame
  const frameX = tx;
  const frameY = ty;
  const frameW = innerW;
  const frameH =
    tileRows > 0
      ? tilesBlockH
      : emptyPad;

  // Tiles frame background + border
  ctx.save();
  roundRectPath(ctx, frameX, frameY, frameW, frameH, 16);
  ctx.fillStyle = "rgba(15, 23, 42, 0.65)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  const tilesOriginX = frameX + framePadY;
  const tilesOriginY = frameY + framePadY;

  if (params.exactZs.length === 0) {
    ctx.font = "13px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("No exact placements this round.", tilesOriginX, tilesOriginY + 4);
  } else {
    params.exactZs.forEach((z, i) => {
      const el = ELEMENTS_BY_Z[z];
      if (!el) return;
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = tilesOriginX + col * (tileW + tileGap);
      const y = tilesOriginY + row * (tileH + tileGap);

      const { top: c0, bottom: c1 } = elementCardGradientStops(el);
      const g = ctx.createLinearGradient(x, y, x + tileW, y + tileH);
      g.addColorStop(0, c0);
      g.addColorStop(1, c1);
      ctx.fillStyle = g;
      ctx.save();
      roundRectPath(ctx, x, y, tileW, tileH, tileRadius);
      ctx.fill();
      if (bonus.has(z)) {
        ctx.strokeStyle = "rgba(250, 204, 21, 0.95)";
        ctx.lineWidth = 3;
        roundRectPath(ctx, x + 1.25, y + 1.25, tileW - 2.5, tileH - 2.5, tileRadius - 1);
        ctx.stroke();
      }
      ctx.restore();
    });
  }

  return canvasToPngBlob(canvas);
}

export async function copyDailyShareToClipboard(params: {
  score: number;
  dateKey: string;
  exactZs: readonly number[];
  bonusZs: ReadonlySet<number> | readonly number[];
}): Promise<void> {
  const text = buildDailySharePlainText(params);

  try {
    const png = await renderDailyShareScorecardPng(params, 2);
    const plain = new Blob([text], { type: "text/plain" });
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "image/png": png,
          "text/plain": plain,
        }),
      ]);
      return;
    } catch {
      await navigator.clipboard.write([
        new ClipboardItem({
          "image/png": png,
        }),
      ]);
      return;
    }
  } catch {
    /* fall through */
  }

  await navigator.clipboard.writeText(text);
}
