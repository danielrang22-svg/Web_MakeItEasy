"use client";

import { isRadarLeadStatus, RADAR_LEAD_STATUSES } from "./statuses";
import type { RadarBusiness, RadarLead } from "./types";

export { RADAR_LEAD_STATUSES as LEAD_STATUSES };

interface LeadsResponse {
  leads?: RadarLead[];
  error?: string;
}

interface LegacyLead {
  business?: RadarBusiness;
  status?: string;
  notes?: string;
  nextActionAt?: string | null;
}

const LEGACY_KEY = "radar.leads.v1";

let leadsCache: RadarLead[] = [];

async function leadsRequest(init?: RequestInit): Promise<RadarLead[]> {
  const res = await fetch("/api/radar/leads", {
    method: init?.method ?? "GET",
    headers: { "Content-Type": "application/json" },
    body: init?.body,
  });
  const data = (await res.json().catch(() => null)) as LeadsResponse | null;
  if (!res.ok) throw new Error(data?.error || "No se pudieron cargar los leads");
  leadsCache = Array.isArray(data?.leads) ? data.leads : [];
  return leadsCache;
}

function readLegacyLeads(): LegacyLead[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LEGACY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LegacyLead[]) : [];
  } catch {
    return [];
  }
}

async function migrateLegacyLeads(): Promise<RadarLead[]> {
  if (typeof window === "undefined") return leadsCache;
  const legacy = readLegacyLeads();
  if (legacy.length === 0) return leadsCache;

  const businesses = legacy
    .map((lead) => lead.business)
    .filter(
      (business): business is RadarBusiness =>
        !!business && typeof business.id === "string" && typeof business.name === "string"
    );
  if (businesses.length === 0) {
    window.localStorage.removeItem(LEGACY_KEY);
    return leadsCache;
  }

  try {
    await leadsRequest({ method: "POST", body: JSON.stringify({ businesses }) });
    let failed = false;
    for (const lead of legacy) {
      if (!lead.business?.id) continue;
      const patch: Record<string, unknown> = { businessId: lead.business.id };
      if (isRadarLeadStatus(lead.status)) patch.status = lead.status;
      if (lead.notes) patch.notes = lead.notes;
      if (lead.nextActionAt !== undefined) patch.nextActionAt = lead.nextActionAt;
      if (Object.keys(patch).length > 1) {
        await leadsRequest({ method: "PATCH", body: JSON.stringify(patch) }).catch(() => {
          failed = true;
          return leadsCache;
        });
      }
    }
    if (!failed) window.localStorage.removeItem(LEGACY_KEY);
  } catch {
    return leadsCache;
  }

  return leadsCache;
}

export interface RadarRepository {
  list(): RadarLead[];
  load(): Promise<RadarLead[]>;
  upsert(businesses: RadarBusiness[]): Promise<RadarLead[]>;
  update(
    businessId: string,
    patch: Partial<Pick<RadarLead, "status" | "notes" | "nextActionAt">>
  ): Promise<RadarLead[]>;
  remove(businessId: string): Promise<RadarLead[]>;
  clear(): Promise<void>;
}

export const radarRepository: RadarRepository = {
  list() {
    return leadsCache;
  },

  load() {
    return leadsRequest().then(() => migrateLegacyLeads());
  },

  upsert(businesses) {
    return leadsRequest({ method: "POST", body: JSON.stringify({ businesses }) });
  },

  update(businessId, patch) {
    return leadsRequest({
      method: "PATCH",
      body: JSON.stringify({ businessId, ...patch }),
    });
  },

  remove(businessId) {
    return leadsRequest({
      method: "DELETE",
      body: JSON.stringify({ businessId }),
    });
  },

  async clear() {
    await leadsRequest({ method: "DELETE", body: JSON.stringify({ all: true }) });
  },
};

export interface RadarPagespeedScores {
  performance: number | null;
  seo: number | null;
  accessibility: number | null;
  bestPractices: number | null;
}

export interface RadarAnalysisRecord {
  businessId: string;
  analyzedAt: string;
  pagespeed: (RadarPagespeedScores & { screenshot?: string | null; metrics?: Record<string, string | null> }) | null;
  analysis: {
    summary: string;
    checklist: Record<string, boolean>;
    contacts: { emails: string[]; socials: string[] };
    problems: Array<{ title: string; detail: string }>;
    recommendedService: { type: string; reason: string };
  };
  meta?: Record<string, unknown>;
}

export interface RadarSettings {
  sellerName: string;
  whatISell: string;
  proposal: string;
  tone: "cercano" | "directo" | "formal";
  agentId: string;
}

const BIZ_KEY = "radar.businesses.v1";
const ANALYSIS_KEY = "radar.analyses.v1";
const SETTINGS_KEY = "radar.settings.v1";

function readMap<T>(key: string): Record<string, T> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Record<string, T>) : {};
  } catch {
    return {};
  }
}

function writeMap<T>(key: string, value: Record<string, T>): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function saveBusinessSnapshot(business: RadarBusiness): void {
  const map = readMap<RadarBusiness>(BIZ_KEY);
  map[business.id] = business;
  writeMap(BIZ_KEY, map);
}

export function getBusinessSnapshot(id: string): RadarBusiness | null {
  return readMap<RadarBusiness>(BIZ_KEY)[id] ?? null;
}

const MAX_ANALYSES = 50;

function trimAnalyses(
  map: Record<string, RadarAnalysisRecord>
): Record<string, RadarAnalysisRecord> {
  return Object.fromEntries(
    Object.entries(map)
      .sort((a, b) => b[1].analyzedAt.localeCompare(a[1].analyzedAt))
      .slice(0, MAX_ANALYSES)
  );
}

export function saveAnalysis(record: RadarAnalysisRecord): void {
  const map = readMap<RadarAnalysisRecord>(ANALYSIS_KEY);
  map[record.businessId] = {
    ...record,
    pagespeed: record.pagespeed
      ? { ...record.pagespeed, screenshot: null }
      : null,
  };
  const trimmed = trimAnalyses(map);
  if (!writeMap(ANALYSIS_KEY, trimmed)) {
    const keys = Object.keys(trimmed);
    const reduced = Object.fromEntries(
      keys.slice(0, Math.max(1, Math.ceil(keys.length / 2))).map((key) => [key, trimmed[key]])
    );
    writeMap(ANALYSIS_KEY, reduced);
  }
}

export function getAnalysis(businessId: string): RadarAnalysisRecord | null {
  return readMap<RadarAnalysisRecord>(ANALYSIS_KEY)[businessId] ?? null;
}

const DEFAULT_SETTINGS: RadarSettings = {
  sellerName: "",
  whatISell: "páginas web, agentes de IA por WhatsApp y sistemas de citas",
  proposal: "soluciones sencillas que ahorran tiempo y captan más clientes",
  tone: "cercano",
  agentId: "",
};

export function getSettings(): RadarSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: RadarSettings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    return;
  }
}

const AUDIT_KEY = "radar.audits.v1";

export function saveAudit(businessId: string, report: unknown): void {
  const map = readMap<unknown>(AUDIT_KEY);
  map[businessId] = report;
  writeMap(AUDIT_KEY, map);
}

export function getAudit<T = unknown>(businessId: string): T | null {
  return (readMap<T>(AUDIT_KEY)[businessId] as T) ?? null;
}

export function removeAudit(businessId: string): void {
  const map = readMap<unknown>(AUDIT_KEY);
  delete map[businessId];
  writeMap(AUDIT_KEY, map);
}