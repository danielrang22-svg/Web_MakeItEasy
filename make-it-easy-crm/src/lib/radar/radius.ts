export const RADAR_RADIUS_OPTIONS = [1, 2, 3, 5] as const;
export type RadarRadiusKm = (typeof RADAR_RADIUS_OPTIONS)[number];

export function normalizeRadius(value: unknown): RadarRadiusKm | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return RADAR_RADIUS_OPTIONS.includes(parsed as RadarRadiusKm) ? (parsed as RadarRadiusKm) : null;
}

export function radiusLabel(value: number | null | undefined): string {
  if (value == null) return "Zona completa";
  return Number.isInteger(value) ? `${value} km` : `${value.toFixed(1)} km`;
}
