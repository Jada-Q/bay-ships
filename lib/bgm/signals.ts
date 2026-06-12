import type { Bay } from "@/lib/bays";
import { getShipsAt } from "@/lib/ships";

// Normalized 0..1 signals consumed by the BGM engine's preset mappings.
// Pure procedural math (same generator the canvas draws from) — no network,
// safe to call every poll tick.

/** Nominal fleet size per bay — matches the ~40-ship target in lib/ships. */
const NOMINAL_FLEET = 40;

export function getSignals(bay: Bay, bayKey: string): Record<string, number> {
  const now = new Date();
  const ships = getShipsAt(now, bay, bayKey);

  // Density = share of the fleet currently inside the visible radius.
  // Lanes extend past the viewport edge, so this breathes as ships
  // sail in and out of frame.
  const kmPerDegLat = 111;
  const kmPerDegLng = 111 * Math.cos((bay.lat * Math.PI) / 180);
  let visible = 0;
  for (const s of ships) {
    const dKm = Math.hypot(
      (s.lat - bay.lat) * kmPerDegLat,
      (s.lng - bay.lng) * kmPerDegLng,
    );
    if (dKm <= bay.radiusKm) visible++;
  }
  const shipDensity = Math.min(1, visible / NOMINAL_FLEET);

  return {
    shipDensity,
    isNight: isNightAt(now, bay.timezone),
  };
}

/** 1 when local time at the bay is outside 06:00–17:59, else 0. */
function isNightAt(now: Date, timezone: string): number {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hourCycle: "h23",
    }).format(now),
  );
  return hour < 6 || hour >= 18 ? 1 : 0;
}
