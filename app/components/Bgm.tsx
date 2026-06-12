"use client";

import { useCallback } from "react";
import { BgmToggle, useBgm } from "@/lib/bgm/engine";
import { preset } from "@/lib/bgm/preset";
import { getSignals } from "@/lib/bgm/signals";
import type { Bay } from "@/lib/bays";

export default function Bgm({
  bay,
  bayKey,
  variant,
}: {
  bay: Bay;
  bayKey: string;
  variant: string;
}) {
  const getSignalsForBay = useCallback(
    () => getSignals(bay, bayKey),
    [bay, bayKey],
  );
  const bgm = useBgm({ preset, variant, getSignals: getSignalsForBay });
  return (
    <BgmToggle status={bgm.status} embed={bgm.embed} debug={bgm.debug} onToggle={bgm.toggle} />
  );
}
