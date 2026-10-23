"use client";

import type { RadarBusiness, RadarLead, RadarLeadStatus } from "./types";

const KEY = "radar.leads.v1";

/**
 * Capa de datos del radar. Hoy usa localStorage; el día que pasemos a
 * IndexedDB o Firebase solo se sustituye este módulo.
 */
export interface RadarRepository {
  list(): RadarLead[];
  upsert(businesses: RadarBusiness[]): RadarLead[];
  update(businessId: string, patch: Partial<Pick<RadarLead, "status" | "notes" | "nextActionAt">>): RadarLead[];
  remove(businessId: string): RadarLead[];
  clear(): void;
}

function read(): RadarLead[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as RadarLead[]) : [];
  } catch {
    return [];
  }
}

function write(leads: RadarLead[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(leads));
}

export const radarRepository: RadarRepository = {
  list() {
    return read().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  upsert(businesses) {
    const current = read();
    const now = new Date().toISOString();
    const map = new Map(current.map((l) => [l.businessId, l]));

    for (const business of businesses) {
      const existing = map.get(business.id);
      map.set(business.id, {
        businessId: business.id,
        status: existing?.status ?? ("NUEVO" as RadarLeadStatus),
        notes: existing?.notes ?? "",
        nextActionAt: existing?.nextActionAt ?? null,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        business,
      });
    }

    const next = [...map.values()];
    write(next);
    return next;
  },

  update(businessId, patch) {
    const next = read().map((l) =>
      l.businessId === businessId
        ? { ...l, ...patch, updatedAt: new Date().toISOString() }
        : l
    );
    write(next);
    return next;
  },

  remove(businessId) {
    const next = read().filter((l) => l.businessId !== businessId);
    write(next);
    return next;
  },

  clear() {
    write([]);
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

function writeMap<T>(key: string, value: Record<string, T>): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function saveBusinessSnapshot(business: RadarBusiness): void {
  const map = readMap<RadarBusiness>(BIZ_KEY);
  map[business.id] = business;
  writeMap(BIZ_KEY, map);
}

export function getBusinessSnapshot(id: string): RadarBusiness | null {
  return readMap<RadarBusiness>(BIZ_KEY)[id] ?? null;
}

export function saveAnalysis(record: RadarAnalysisRecord): void {
  const map = readMap<RadarAnalysisRecord>(ANALYSIS_KEY);
  map[record.businessId] = record;
  writeMap(ANALYSIS_KEY, map);
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
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export const LEAD_STATUSES: Array<{ value: RadarLeadStatus; label: string }> = [
  { value: "NUEVO", label: "Nuevo" },
  { value: "ANALIZADO", label: "Analizado" },
  { value: "CONTACTADO", label: "Contactado" },
  { value: "RESPONDIO", label: "Respondió" },
  { value: "REUNION", label: "Reunión" },
  { value: "CLIENTE", label: "Cliente" },
  { value: "DESCARTADO", label: "Descartado" },
];
