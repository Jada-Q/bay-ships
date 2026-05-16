"use client";

import { useEffect, useRef } from "react";

// 10 wide × 12 tall. Chars:
// . transparent, C cap (navy), F face (weathered), E eye, U uniform jacket (navy), P pants, B boots
const FRAME_IDLE_A = [
  "..CCCCCC..",
  ".CCCCCCCC.",
  "..CFFFFC..",
  "..FEEEEF..",
  "..FFFFFF..",
  "..UUUUUU..",
  ".UUUUUUUU.",
  ".UUUUUUUU.",
  ".UUUUUUUU.",
  "..UUUUUU..",
  "..PP..PP..",
  "..BB..BB..",
];

const FRAME_IDLE_B = [
  "..CCCCCC..",
  ".CCCCCCCC.",
  "..CFFFFC..",
  "..FEEEEF..",
  "..FFFFFF..",
  ".UUUUUUUU.",
  ".UUUUUUUU.",
  ".UUUUUUUU.",
  ".UUUUUUUU.",
  "..UUUUUU..",
  "..PP..PP..",
  "..BB..BB..",
];

const COLORS: Record<string, string> = {
  C: "#1a2b4a", // navy cap
  F: "#c8a080", // weathered skin
  E: "#1a1612",
  U: "#1a2b4a", // matching navy uniform
  P: "#2a2a2a", // dark pants
  B: "#0a0a0a", // black boots
};

const PIXEL = 6;
const CANVAS_W = 10 * PIXEL;
const CANVAS_H = 13 * PIXEL;

const MOVE_SPEED = 180; // slower — old man walks
const X_PADDING = 30;

function drawFrame(
  ctx: CanvasRenderingContext2D,
  frame: string[],
  yOffset = 0,
) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  for (let y = 0; y < frame.length; y++) {
    const row = frame[y];
    for (let x = 0; x < row.length; x++) {
      const c = row[x];
      const color = COLORS[c];
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(x * PIXEL, (y + yOffset) * PIXEL, PIXEL, PIXEL);
      }
    }
  }
}

export default function MamoruSprite() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    const keys = new Set<string>();
    const pos = { x: 0, y: 0 };
    let frameToggle = 0;
    let lastFrameSwap = performance.now();
    let lastTick = performance.now();
    let raf = 0;

    // Bounds: Mamoru stands at top-right headland. Can climb up the lighthouse,
    // or wander down toward the rocks at water's edge.
    const computeBounds = () => {
      const vh = window.innerHeight;
      // default top = 12% of viewport
      // y_min relative: -80 (climb up into sky a bit, near lighthouse top)
      // y_max relative: vh*0.5 (down toward the water's edge but stays on land)
      return { yMin: -80, yMax: vh * 0.5 };
    };
    let bounds = computeBounds();
    const onResize = () => {
      bounds = computeBounds();
    };
    window.addEventListener("resize", onResize);

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key;
      if (
        k === "ArrowUp" ||
        k === "ArrowDown" ||
        k === "ArrowLeft" ||
        k === "ArrowRight" ||
        k === "w" ||
        k === "a" ||
        k === "s" ||
        k === "d"
      ) {
        keys.add(k);
        e.preventDefault();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys.delete(e.key);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    const tick = (now: number) => {
      const dt = (now - lastTick) / 1000;
      lastTick = now;

      let dx = 0,
        dy = 0;
      if (keys.has("ArrowLeft") || keys.has("a")) dx -= MOVE_SPEED * dt;
      if (keys.has("ArrowRight") || keys.has("d")) dx += MOVE_SPEED * dt;
      if (keys.has("ArrowUp") || keys.has("w")) dy -= MOVE_SPEED * dt;
      if (keys.has("ArrowDown") || keys.has("s")) dy += MOVE_SPEED * dt;

      pos.x += dx;
      pos.y += dy;

      const halfW = window.innerWidth / 2;
      pos.x = Math.max(-window.innerWidth * 0.85 + X_PADDING, Math.min(halfW - X_PADDING, pos.x));
      pos.y = Math.max(bounds.yMin, Math.min(bounds.yMax, pos.y));

      wrap.style.transform = `translate(calc(-50% + ${pos.x}px), ${pos.y}px)`;

      // slower breath — 800ms cycle
      if (now - lastFrameSwap > 800) {
        frameToggle = 1 - frameToggle;
        lastFrameSwap = now;
      }
      const frame = frameToggle ? FRAME_IDLE_A : FRAME_IDLE_B;
      drawFrame(ctx, frame, frameToggle ? 1 : 0);

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className="pointer-events-none fixed z-10 hidden select-none md:block"
      style={{
        top: "12%",
        left: "88%",
        width: `${CANVAS_W}px`,
        height: `${CANVAS_H}px`,
        transform: "translateX(-50%)",
        willChange: "transform",
      }}
      aria-label="守 Mamoru — 灯台守 (方向キー操作)"
    >
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        style={{
          width: `${CANVAS_W}px`,
          height: `${CANVAS_H}px`,
          imageRendering: "pixelated",
          filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))",
        }}
      />
    </div>
  );
}
