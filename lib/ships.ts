import type { Bay } from "./bays";

export type ShipType = "cargo" | "passenger" | "fishing" | "tanker" | "other";

export interface Ship {
  mmsi: string;
  name: string;
  type: ShipType;
  lat: number;
  lng: number;
  /** Heading in degrees, 0=north, 90=east. */
  heading: number;
  /** Speed in knots. */
  speedKn: number;
}

export const TYPE_COLORS: Record<ShipType, string> = {
  cargo: "#ffffff",
  passenger: "#f5d76e",
  fishing: "#7fdca0",
  tanker: "#7fb8ff",
  other: "#9aa0a6",
};

const TYPE_DISTRIBUTION: ShipType[] = [
  // Weighted bag — pick uniformly to get rough real-world mix.
  "cargo", "cargo", "cargo", "cargo", "cargo",
  "tanker", "tanker", "tanker",
  "passenger", "passenger",
  "fishing", "fishing",
  "other",
];

const SHIP_NAME_PREFIXES = [
  "MV", "MS", "MT", "FV", "OOCL", "EVER", "MAERSK", "NYK", "ONE", "MOL",
  "K LINE", "WAN HAI", "CMA CGM", "HAPAG", "PCC",
];
const SHIP_NAME_SUFFIXES = [
  "PIONEER", "HARMONY", "VOYAGER", "SAKURA", "ATLAS", "AURORA", "PHOENIX",
  "MERIDIAN", "PACIFIC", "ORIENT", "SPIRIT", "DAWN", "TIDE", "STAR",
  "HORIZON", "MARINER", "ENDEAVOR", "LEGACY", "TOKYO", "KOBE",
];

interface LaneShip {
  mmsi: string;
  name: string;
  type: ShipType;
  laneIndex: number;
  /** 0..1 progress along the lane polyline (cumulative). */
  progress: number;
  /** Direction along the lane: +1 forward, -1 backward. */
  direction: 1 | -1;
  /** Speed in knots — converted to lane-fraction-per-second at runtime. */
  speedKn: number;
  /** Lateral offset in degrees (roughly), to spread ships off the centerline. */
  lateralOffset: number;
  /** Phase offset for subtle drift. */
  phase: number;
}

interface BayState {
  ships: LaneShip[];
  /** Cached cumulative-distance lookup per lane (in degrees). */
  laneLengths: number[][];
  laneTotalLengths: number[];
}

const STATE_CACHE = new Map<string, BayState>();

function lcg(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function mmsi(rand: () => number): string {
  let out = "";
  for (let i = 0; i < 9; i++) out += Math.floor(rand() * 10);
  return out;
}

function buildLaneLengths(lane: Array<[number, number]>): number[] {
  const cum = [0];
  for (let i = 1; i < lane.length; i++) {
    const [a0, a1] = lane[i - 1];
    const [b0, b1] = lane[i];
    const d = Math.hypot(b0 - a0, b1 - a1);
    cum.push(cum[i - 1] + d);
  }
  return cum;
}

function pickAlongLane(
  lane: Array<[number, number]>,
  cum: number[],
  total: number,
  progress: number,
): { lat: number; lng: number; bearing: number } {
  if (lane.length < 2) {
    const [lat, lng] = lane[0] ?? [0, 0];
    return { lat, lng, bearing: 0 };
  }
  const target = Math.max(0, Math.min(1, progress)) * total;
  let i = 1;
  while (i < cum.length && cum[i] < target) i++;
  if (i >= cum.length) i = cum.length - 1;
  const segStart = cum[i - 1];
  const segLen = cum[i] - segStart || 1e-9;
  const t = (target - segStart) / segLen;
  const [a0, a1] = lane[i - 1];
  const [b0, b1] = lane[i];
  const lat = a0 + (b0 - a0) * t;
  const lng = a1 + (b1 - a1) * t;
  const dLat = b0 - a0;
  const dLng = b1 - a1;
  // Bearing in degrees, 0=north, 90=east. lat=N, lng=E.
  const bearing = (Math.atan2(dLng, dLat) * 180) / Math.PI;
  return { lat, lng, bearing: (bearing + 360) % 360 };
}

function ensureState(bayKey: string, bay: Bay): BayState {
  const cached = STATE_CACHE.get(bayKey);
  if (cached) return cached;

  const seed =
    bayKey.split("").reduce((acc, c) => acc * 31 + c.charCodeAt(0), 7) >>> 0;
  const rand = lcg(seed);

  const laneLengths = bay.lanes.map(buildLaneLengths);
  const laneTotalLengths = laneLengths.map((l) => l[l.length - 1] || 1);

  // Distribute ~40 ships across lanes weighted by lane length.
  const target = 40;
  const totalLen = laneTotalLengths.reduce((a, b) => a + b, 0);
  const ships: LaneShip[] = [];
  for (let li = 0; li < bay.lanes.length; li++) {
    const share = Math.max(2, Math.round((laneTotalLengths[li] / totalLen) * target));
    for (let k = 0; k < share; k++) {
      const type = TYPE_DISTRIBUTION[Math.floor(rand() * TYPE_DISTRIBUTION.length)];
      const speedRoll = rand();
      // Cargo/tanker tend faster, fishing slower, passenger mid-high.
      const baseSpeed =
        type === "fishing" ? 4 + speedRoll * 6
        : type === "passenger" ? 12 + speedRoll * 8
        : type === "tanker" ? 9 + speedRoll * 6
        : type === "cargo" ? 11 + speedRoll * 7
        : 6 + speedRoll * 6;
      const direction: 1 | -1 = rand() > 0.5 ? 1 : -1;
      const prefix = SHIP_NAME_PREFIXES[Math.floor(rand() * SHIP_NAME_PREFIXES.length)];
      const suffix = SHIP_NAME_SUFFIXES[Math.floor(rand() * SHIP_NAME_SUFFIXES.length)];
      ships.push({
        mmsi: mmsi(rand),
        name: `${prefix} ${suffix}`,
        type,
        laneIndex: li,
        progress: rand(),
        direction,
        speedKn: baseSpeed,
        lateralOffset: (rand() - 0.5) * 0.012, // ~1km
        phase: rand() * Math.PI * 2,
      });
    }
  }

  const state: BayState = { ships, laneLengths, laneTotalLengths };
  STATE_CACHE.set(bayKey, state);
  return state;
}

/**
 * Compute live ship positions at a given moment for a bay.
 * Uses the static cache as initial state plus elapsed-seconds drift.
 */
export function getShipsAt(now: Date, bay: Bay, bayKey: string): Ship[] {
  const state = ensureState(bayKey, bay);

  // Use absolute epoch seconds so positions feel time-of-day-driven and
  // continuously progress even across page reloads.
  const t = now.getTime() / 1000;

  const out: Ship[] = [];
  for (const s of state.ships) {
    const lane = bay.lanes[s.laneIndex];
    const cum = state.laneLengths[s.laneIndex];
    const total = state.laneTotalLengths[s.laneIndex];

    // Knots → degrees-along-lane per second. 1 knot ≈ 0.000515 deg/s lat-equiv,
    // but lanes are short and we want visible motion, so use a screen-friendly
    // scale: a 12-knot ship traverses a 0.5° lane in ~5 minutes.
    const degPerSec = (s.speedKn / 12) * (total / 300);
    const distMoved = degPerSec * t;
    const cycleLen = total * 2; // forward + backward
    const cycleProgress = ((distMoved + s.progress * total) % cycleLen + cycleLen) % cycleLen;

    let normProgress: number;
    let dirSign: 1 | -1;
    if (s.direction === 1) {
      if (cycleProgress <= total) {
        normProgress = cycleProgress / total;
        dirSign = 1;
      } else {
        normProgress = (cycleLen - cycleProgress) / total;
        dirSign = -1;
      }
    } else {
      if (cycleProgress <= total) {
        normProgress = 1 - cycleProgress / total;
        dirSign = -1;
      } else {
        normProgress = (cycleProgress - total) / total;
        dirSign = 1;
      }
    }

    const point = pickAlongLane(lane, cum, total, normProgress);
    let bearing = point.bearing;
    if (dirSign === -1) bearing = (bearing + 180) % 360;

    // Slight perpendicular offset to spread ships off centerline.
    const perpRad = ((bearing + 90) * Math.PI) / 180;
    const wobble = Math.sin(t * 0.05 + s.phase) * 0.0015;
    const lat = point.lat + (s.lateralOffset + wobble) * Math.cos(perpRad);
    const lng = point.lng + (s.lateralOffset + wobble) * Math.sin(perpRad);

    out.push({
      mmsi: s.mmsi,
      name: s.name,
      type: s.type,
      lat,
      lng,
      heading: bearing,
      speedKn: s.speedKn,
    });
  }
  return out;
}

/**
 * Data source mode — flipped to "live" when env wires up an aisstream.io
 * subscriber proxy. v1 ships in `demo-procedural` mode and is honest about it.
 */
export type DataMode = "demo-procedural" | "demo-snapshot" | "live-ais";
export const DATA_MODE: DataMode = "demo-procedural";
export const DATA_MODE_LABEL: Record<DataMode, string> = {
  "demo-procedural": "demo · procedural shipping lanes",
  "demo-snapshot": "demo · static AIS snapshot",
  "live-ais": "live · aisstream.io",
};
export const DATA_MODE_LABEL_JA: Record<DataMode, string> = {
  "demo-procedural": "船舶位置は仮想航路に沿った疑似データ。リアルタイムではありません。",
  "demo-snapshot": "船舶位置は過去のサンプルAISデータ。リアルタイムではありません。",
  "live-ais": "船舶位置は aisstream.io 経由のリアルタイムAIS信号。",
};
