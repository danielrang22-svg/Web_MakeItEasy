export type AuditArea = "indexacion" | "tecnico" | "onpage" | "local" | "conversion";
export type AuditStatus = "pass" | "warn" | "fail" | "na";
export type AuditImpact = "alto" | "medio" | "bajo";

export interface AuditCheck {
  id: string;
  area: AuditArea;
  label: string;
  status: AuditStatus;
  impact: AuditImpact;
  weight: number;
  evidence: string;
  fix: string;
}

export interface AuditAreaScore {
  area: AuditArea;
  label: string;
  weight: number;
  score: number | null;
  pass: number;
  warn: number;
  fail: number;
  na: number;
}

export interface AuditReport {
  url: string;
  finalUrl: string;
  fetchedAt: string;
  durationMs: number;
  globalScore: number;
  potentialScore: number;
  areas: AuditAreaScore[];
  checks: AuditCheck[];
  quickWins: string[];
  critical: string[];
  meta: {
    status: number | null;
    responseMs: number | null;
    htmlBytes: number | null;
    compressed: boolean;
    title: string;
    description: string;
    error?: string;
  };
}

export const AREA_META: Record<AuditArea, { label: string; weight: number }> = {
  indexacion: { label: "Indexación y rastreo", weight: 15 },
  tecnico: { label: "Técnico", weight: 20 },
  onpage: { label: "On-page", weight: 25 },
  local: { label: "Local", weight: 15 },
  conversion: { label: "Conversión", weight: 25 },
};
