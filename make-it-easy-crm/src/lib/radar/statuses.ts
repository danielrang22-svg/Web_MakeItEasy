import type { RadarLeadStatus } from "./types";

export const RADAR_LEAD_STATUSES: Array<{ value: RadarLeadStatus; label: string }> = [
  { value: "NUEVO", label: "Nuevo" },
  { value: "ANALIZADO", label: "Analizado" },
  { value: "CONTACTADO", label: "Contactado" },
  { value: "RESPONDIO", label: "Respondió" },
  { value: "REUNION", label: "Reunión" },
  { value: "CLIENTE", label: "Cliente" },
  { value: "DESCARTADO", label: "Descartado" },
];

export const RADAR_LEAD_STATUS_VALUES = RADAR_LEAD_STATUSES.map((s) => s.value);

export function isRadarLeadStatus(value: unknown): value is RadarLeadStatus {
  return typeof value === "string" && (RADAR_LEAD_STATUS_VALUES as string[]).includes(value);
}
