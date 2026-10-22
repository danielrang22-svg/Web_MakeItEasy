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

export const LEAD_STATUSES: Array<{ value: RadarLeadStatus; label: string }> = [
  { value: "NUEVO", label: "Nuevo" },
  { value: "ANALIZADO", label: "Analizado" },
  { value: "CONTACTADO", label: "Contactado" },
  { value: "RESPONDIO", label: "Respondió" },
  { value: "REUNION", label: "Reunión" },
  { value: "CLIENTE", label: "Cliente" },
  { value: "DESCARTADO", label: "Descartado" },
];
