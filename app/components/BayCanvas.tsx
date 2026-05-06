"use client";

import { useEffect, useRef } from "react";
import type { Bay } from "@/lib/bays";
import { getShipsAt, TYPE_COLORS, type Ship } from "@/lib/ships";

interface Props {
  bay: Bay;
  bayKey: string;
}

interface TrailPoint {
  x: number;
  y: number;
  ts: number;
}

const TRAIL_MS = 60_000; // 60s fading trail
const TRAIL_SAMPLE_MS = 1000; // sample once per sec

export default function BayCanvas({ bay, bayKey }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const trails = new Map<string, TrailPoint[]>();
    const stars = generateStars(28);
    const start = performance.now();
    let lastSampleAt = 0;

    const draw = (now: number) => {
      const t = (now - start) / 1000;
      const wallclock = Date.now();

      // Background
      const horizonY = h * 0.3;
      drawSky(ctx, w, horizonY);
      drawStars(ctx, w, horizonY, stars, t);
      drawSea(ctx, w, h, horizonY, t);

      // Project ships
      const ships = getShipsAt(new Date(wallclock), bay, bayKey);
      const projected = ships.map((s) => ({
        ship: s,
        ...project(s.lat, s.lng, bay, w, h),
      }));

      // Sample trails
      if (wallclock - lastSampleAt > TRAIL_SAMPLE_MS) {
        lastSampleAt = wallclock;
        for (const p of projected) {
          let arr = trails.get(p.ship.mmsi);
          if (!arr) {
            arr = [];
            trails.set(p.ship.mmsi, arr);
          }
          arr.push({ x: p.x, y: p.y, ts: wallclock });
          // Trim
          while (arr.length > 0 && wallclock - arr[0].ts > TRAIL_MS) arr.shift();
        }
      }

      // Render trails
      ctx.lineCap = "round";
      ctx.lineWidth = 1.2;
      for (const p of projected) {
        const arr = trails.get(p.ship.mmsi);
        if (!arr || arr.length < 2) continue;
        const color = TYPE_COLORS[p.ship.type];
        for (let i = 1; i < arr.length; i++) {
          const a = arr[i - 1];
          const b = arr[i];
          const age = (wallclock - b.ts) / TRAIL_MS; // 0=fresh
          const alpha = Math.max(0, 0.55 * (1 - age));
          if (alpha < 0.02) continue;
          ctx.strokeStyle = withAlpha(color, alpha);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      // Render dots
      for (const p of projected) {
        const color = TYPE_COLORS[p.ship.type];
        // Soft glow
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 6);
        glow.addColorStop(0, withAlpha(color, 0.4));
        glow.addColorStop(1, withAlpha(color, 0));
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
        ctx.fill();
        // Crisp dot
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }

      drawNoise(ctx, w, h);

      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [bay, bayKey]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 h-full w-full"
      aria-label={`Bay Ships — ${bay.label}`}
    />
  );
}

interface Projected {
  x: number;
  y: number;
}

/**
 * Project lat/lng onto canvas using a small-area equirectangular approximation
 * centered on the bay. radiusKm sets the visible half-extent (fits within the
 * shorter screen dimension).
 */
function project(
  lat: number,
  lng: number,
  bay: Bay,
  w: number,
  h: number,
): Projected {
  const kmPerDegLat = 111.32;
  const kmPerDegLng = 111.32 * Math.cos((bay.lat * Math.PI) / 180);
  const dLatKm = (lat - bay.lat) * kmPerDegLat;
  const dLngKm = (lng - bay.lng) * kmPerDegLng;

  // Fit radius into 90% of the smaller dimension; ships span the whole canvas.
  const fit = Math.min(w, h) * 0.45;
  const scale = fit / bay.radiusKm;
  const x = w * 0.5 + dLngKm * scale;
  // Sea occupies bottom 70% — center the bay vertically within that band.
  const seaTop = h * 0.3;
  const cy = seaTop + (h - seaTop) * 0.5;
  const y = cy - dLatKm * scale;
  return { x, y };
}

function drawSky(ctx: CanvasRenderingContext2D, w: number, horizonY: number) {
  const grad = ctx.createLinearGradient(0, 0, 0, horizonY);
  grad.addColorStop(0, "#03060d");
  grad.addColorStop(1, "#0a1422");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, horizonY);
}

function drawSea(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  horizonY: number,
  t: number,
) {
  const grad = ctx.createLinearGradient(0, horizonY, 0, h);
  grad.addColorStop(0, "#0b1a2c");
  grad.addColorStop(0.5, "#06101e");
  grad.addColorStop(1, "#02060c");
  ctx.fillStyle = grad;
  ctx.fillRect(0, horizonY, w, h - horizonY);

  // Subtle wave bands — flatter than Tide Pixels, ships are the focus
  ctx.strokeStyle = "rgba(180,200,220,0.05)";
  ctx.lineWidth = 1;
  const layers = [
    { freq: 0.012, speed: 0.4, yOffset: 8, amp: 1 },
    { freq: 0.007, speed: 0.25, yOffset: 30, amp: 1.6 },
    { freq: 0.004, speed: 0.12, yOffset: 80, amp: 2.2 },
  ];
  layers.forEach((layer, i) => {
    ctx.beginPath();
    for (let x = 0; x <= w; x += 6) {
      const y =
        horizonY +
        layer.yOffset +
        Math.sin(x * layer.freq + t * layer.speed + i) * layer.amp;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  });

  // Horizon line
  ctx.strokeStyle = "rgba(180,200,220,0.18)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, horizonY);
  ctx.lineTo(w, horizonY);
  ctx.stroke();
}

interface Star {
  x: number;
  y: number;
  size: number;
  brightness: number;
  twinkle: number;
}

function generateStars(count: number): Star[] {
  let seed = 4242;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  return Array.from({ length: count }, () => ({
    x: rand(),
    y: rand() * 0.8,
    size: rand() * 1.1 + 0.3,
    brightness: rand() * 0.5 + 0.3,
    twinkle: rand() * Math.PI * 2,
  }));
}

function drawStars(
  ctx: CanvasRenderingContext2D,
  w: number,
  horizonY: number,
  stars: Star[],
  t: number,
) {
  for (const s of stars) {
    const sx = s.x * w;
    const sy = s.y * horizonY;
    const tw = 0.8 + 0.2 * Math.sin(t * 1.1 + s.twinkle);
    const a = s.brightness * tw;
    ctx.fillStyle = `rgba(235,238,245,${a})`;
    ctx.beginPath();
    ctx.arc(sx, sy, s.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawNoise(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = "rgba(255,255,255,0.01)";
  for (let i = 0; i < 160; i++) {
    ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
  }
  ctx.fillStyle = "rgba(0,0,0,0.012)";
  for (let i = 0; i < 160; i++) {
    ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
  }
}

function withAlpha(hex: string, a: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

// Suppress unused-import warning by re-exporting the type for callers if needed.
export type { Ship };
