import type { BgmPreset } from "./engine";

// Harbor: G dorian foghorn drone — triangle pad kept in the low register,
// soft sine melody an octave down, ocean wash underneath. No percussion;
// the bay keeps its own time.
export const preset: BgmPreset = {
  key: "bay-ships",
  rootNote: "G1",
  scale: "dorian",
  masterVolumeDb: -16,
  reverbDecaySec: 12,
  pad: {
    enabled: true,
    volumeDb: -14,
    synth: "triangle",
    chordSize: 3,
    changeEverySec: [30, 55],
    attackSec: 8,
    releaseSec: 12,
    filterCutoffHz: [200, 800],
  },
  melody: {
    enabled: true,
    volumeDb: -20,
    instrument: "softsine",
    octaves: [3, 4],
    baseIntervalSec: [9, 20],
    eventTriggered: false,
  },
  texture: {
    enabled: true,
    volumeDb: -18,
    kind: "ocean",
    lfoRateHz: [0.03, 0.1],
  },
  percussion: {
    enabled: false,
    volumeDb: -30,
    kind: "none",
    bpm: [0, 0],
  },
  mappings: [
    // busy fairway = more frequent melody calls between the ships
    { signal: "shipDensity", target: "melody.density", range: [0.2, 1] },
    // more hulls in the water = louder wake and surf
    { signal: "shipDensity", target: "texture.volume", range: [0.35, 1] },
    // night dims the whole mix toward foghorn darkness
    { signal: "isNight", target: "master.brightness", range: [1, 0.5] },
  ],
};
