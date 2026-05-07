"use client";

import { useEffect, useState } from "react";
import type { Bay } from "@/lib/bays";
import {
  DATA_MODE,
  DATA_MODE_LABEL,
  DATA_MODE_LABEL_JA,
  TYPE_COLORS,
  getShipsAt,
  type ShipType,
} from "@/lib/ships";

interface Props {
  bay: Bay;
  bayKey: string;
}

export default function Overlay({ bay, bayKey }: Props) {
  const [now, setNow] = useState<Date | null>(null);
  const [counts, setCounts] = useState<Record<ShipType, number>>({
    cargo: 0, passenger: 0, fishing: 0, tanker: 0, other: 0,
  });

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setNow(d);
      const ships = getShipsAt(d, bay, bayKey);
      const c: Record<ShipType, number> = {
        cargo: 0, passenger: 0, fishing: 0, tanker: 0, other: 0,
      };
      for (const s of ships) c[s.type]++;
      setCounts(c);
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => clearInterval(id);
  }, [bay, bayKey]);

  if (!now) return null;

  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: bay.timezone,
  }).format(now);
  const dateStr = new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: bay.timezone,
  }).format(now);
  const tzAbbr = getTzAbbr(now, bay.timezone);

  const totalVisible =
    counts.cargo + counts.passenger + counts.fishing + counts.tanker + counts.other;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-10 select-none text-white"
      style={{ textShadow: "0 1px 4px rgba(0,0,0,0.65)" }}
    >
      <div className="absolute left-6 top-6 font-serif text-sm tracking-wide md:left-10 md:top-10">
        <div className="text-xs uppercase tracking-[0.3em] opacity-60">
          Bay Ships
        </div>
        <div className="mt-2 text-base">{bay.label}</div>
        <div className="mt-1 text-xs opacity-60">
          {formatCoord(bay.lat, true)} {formatCoord(bay.lng, false)}
        </div>
        <div className="mt-3 whitespace-nowrap text-[11px] italic opacity-45">
          — also Tide Pixels · Sky Traffic · Subway Pulse
        </div>
      </div>

      <div className="absolute right-6 top-6 text-right font-serif md:right-10 md:top-10">
        <div className="font-mono text-3xl tracking-tight md:text-4xl">
          {time}
        </div>
        <div className="mt-1 text-xs opacity-70">
          {dateStr} {tzAbbr}
        </div>
      </div>

      <div className="absolute bottom-6 left-6 space-y-3 font-serif md:bottom-10 md:left-10">
        <div className="leading-tight">
          <div className="text-[10px] uppercase tracking-[0.25em] opacity-50">
            Visible
          </div>
          <div className="mt-0.5 text-base">
            {totalVisible} <span className="opacity-50 text-xs">ships</span>
          </div>
        </div>

        <div className="space-y-1">
          {(Object.keys(counts) as ShipType[])
            .filter((t) => counts[t] > 0)
            .map((t) => (
              <div key={t} className="flex items-center gap-2 text-xs">
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: TYPE_COLORS[t] }}
                />
                <span className="uppercase tracking-[0.2em] opacity-70">
                  {t}
                </span>
                <span className="opacity-50 font-mono">{counts[t]}</span>
              </div>
            ))}
        </div>

        <div className="text-[10px] uppercase tracking-[0.25em] opacity-40">
          {DATA_MODE_LABEL[DATA_MODE]}
        </div>
      </div>

      <div className="absolute bottom-10 right-10 hidden max-w-[280px] text-right font-serif text-xs italic opacity-50 md:block">
        {DATA_MODE_LABEL_JA[DATA_MODE]}
      </div>
    </div>
  );
}

function formatCoord(value: number, isLat: boolean): string {
  const dir = isLat ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "W";
  return `${Math.abs(value).toFixed(4)}°${dir}`;
}

function getTzAbbr(date: Date, timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "short",
    }).formatToParts(date);
    return parts.find((p) => p.type === "timeZoneName")?.value ?? "";
  } catch {
    return "";
  }
}
