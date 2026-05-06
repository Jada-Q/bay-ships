export interface Bay {
  lat: number;
  lng: number;
  label: string;
  timezone: string;
  /** Visible radius in km — drives canvas projection scale. */
  radiusKm: number;
  /** Hand-authored shipping lanes (lat/lng polylines) for procedural mock. */
  lanes: Array<Array<[number, number]>>;
}

// Lanes are loose approximations of major fairways — enough for an animation,
// not nautical-grade. Tokyo Bay: Uraga Channel → Tokyo / Yokohama. Osaka Bay:
// Akashi Strait → Osaka / Kobe. NY Harbor: Verrazzano → Ambrose / Hudson.
// Singapore: east-west traffic separation scheme through the strait.
export const BAYS: Record<string, Bay> = {
  "tokyo-bay": {
    lat: 35.4,
    lng: 139.8,
    label: "TOKYO BAY 東京湾",
    timezone: "Asia/Tokyo",
    radiusKm: 25,
    lanes: [
      // Uraga Channel ↔ Tokyo Port
      [
        [35.05, 139.78],
        [35.18, 139.74],
        [35.32, 139.78],
        [35.46, 139.83],
        [35.58, 139.81],
        [35.62, 139.78],
      ],
      // Yokohama branch
      [
        [35.32, 139.78],
        [35.36, 139.72],
        [35.42, 139.66],
        [35.45, 139.65],
      ],
      // Kisarazu / Chiba (east shore)
      [
        [35.18, 139.84],
        [35.28, 139.92],
        [35.4, 139.96],
        [35.55, 139.95],
      ],
      // Open sea entry south
      [
        [34.92, 139.72],
        [35.02, 139.76],
        [35.08, 139.78],
      ],
    ],
  },
  "osaka-bay": {
    lat: 34.5,
    lng: 135.3,
    label: "OSAKA BAY 大阪湾",
    timezone: "Asia/Tokyo",
    radiusKm: 25,
    lanes: [
      // Akashi Strait → Kobe → Osaka
      [
        [34.55, 134.95],
        [34.62, 135.05],
        [34.67, 135.18],
        [34.66, 135.32],
        [34.62, 135.45],
      ],
      // Osaka Port branch
      [
        [34.62, 135.32],
        [34.6, 135.4],
        [34.65, 135.43],
      ],
      // Kansai Airport approach
      [
        [34.4, 135.1],
        [34.43, 135.2],
        [34.43, 135.3],
        [34.45, 135.38],
      ],
      // Kitan Strait (south entry)
      [
        [34.25, 134.98],
        [34.35, 135.05],
        [34.42, 135.1],
      ],
    ],
  },
  "ny-harbor": {
    lat: 40.65,
    lng: -74.05,
    label: "NEW YORK HARBOR",
    timezone: "America/New_York",
    radiusKm: 20,
    lanes: [
      // Ambrose → Verrazzano → Upper Bay
      [
        [40.45, -73.82],
        [40.52, -73.92],
        [40.6, -74.04],
        [40.66, -74.06],
        [40.7, -74.04],
      ],
      // Hudson up
      [
        [40.7, -74.04],
        [40.75, -74.02],
        [40.8, -73.98],
      ],
      // Kill Van Kull → Newark Bay
      [
        [40.65, -74.08],
        [40.65, -74.14],
        [40.68, -74.16],
        [40.72, -74.15],
      ],
      // East River
      [
        [40.7, -74.02],
        [40.72, -73.98],
        [40.74, -73.95],
        [40.78, -73.92],
      ],
    ],
  },
  singapore: {
    lat: 1.27,
    lng: 103.85,
    label: "SINGAPORE STRAIT",
    timezone: "Asia/Singapore",
    radiusKm: 30,
    lanes: [
      // Eastbound TSS (deeper south)
      [
        [1.18, 103.55],
        [1.16, 103.7],
        [1.17, 103.85],
        [1.2, 104.0],
        [1.24, 104.12],
      ],
      // Westbound TSS (slightly north of east lane)
      [
        [1.28, 104.12],
        [1.25, 104.0],
        [1.23, 103.85],
        [1.22, 103.7],
        [1.22, 103.55],
      ],
      // Anchorage off Singapore
      [
        [1.23, 103.78],
        [1.24, 103.84],
        [1.25, 103.9],
      ],
      // Approach to Tanjong Pagar / Pasir Panjang
      [
        [1.23, 103.78],
        [1.26, 103.78],
        [1.27, 103.82],
      ],
    ],
  },
};

export const BAY_KEYS = Object.keys(BAYS);

export interface UrlParams {
  b?: string;
}

export function resolveBay(params: UrlParams | undefined): { bay: Bay; key: string } {
  if (!params?.b) return { bay: BAYS["tokyo-bay"], key: "tokyo-bay" };
  const key = params.b.toLowerCase();
  if (BAYS[key]) return { bay: BAYS[key], key };
  return { bay: BAYS["tokyo-bay"], key: "tokyo-bay" };
}
