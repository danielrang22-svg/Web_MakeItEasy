import { create } from "zustand";
import { Lead, LeadCreateData, LeadUpdateData, LeadFilters, Etapa } from "../types";

const MAX_UNDO_STACK = 30;
const JSON_HEADERS = { "Content-Type": "application/json" };

interface LeadsState {
    leads: Lead[];
    searchQuery: string;
    filters: LeadFilters;
    undoStack: Lead[][];
    lastUndoMessage: string | null;
    error: string | null;

    loadLeads: () => Promise<void>;
    createLead: (data: LeadCreateData) => Promise<Lead>;
    updateLead: (id: string, data: LeadUpdateData) => Promise<Lead | undefined>;
    deleteLead: (id: string) => Promise<boolean>;
    moveLeadToStage: (id: string, etapa: Etapa) => Promise<void>;
    setSearchQuery: (query: string) => void;
    setFilters: (filters: Partial<LeadFilters>) => void;
    resetFilters: () => void;
    undo: () => boolean;
    clearUndoMessage: () => void;
    clearError: () => void;
}

const defaultFilters: LeadFilters = {
    etapas: [],
    valorMin: null,
    valorMax: null,
    fechaDesde: null,
    fechaHasta: null,
};

function pushUndo(get: () => LeadsState, set: (partial: Partial<LeadsState>) => void) {
    const snapshot = JSON.parse(JSON.stringify(get().leads)) as Lead[];
    const stack = [...get().undoStack, snapshot];
    if (stack.length > MAX_UNDO_STACK) stack.shift();
    set({ undoStack: stack });
}

export const useLeadsStore = create<LeadsState>((set, get) => ({
    leads: [],
    searchQuery: "",
    filters: { ...defaultFilters },
    undoStack: [],
    lastUndoMessage: null,
    error: null,

    loadLeads: async () => {
        try {
            const res = await fetch('/api/leads');
            if (!res.ok) { set({ error: `Error cargando leads (${res.status})` }); return; }
            const data = await res.json();
            set({ leads: data });
        } catch {
            set({ error: "Error de conexión. Verifica tu red." });
        }
    },

    createLead: async (data) => {
        set({ error: null });
        pushUndo(get, set);
        try {
            const res = await fetch('/api/leads', {
                method: 'POST',
                headers: JSON_HEADERS,
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                set({ error: body.error ?? `Error ${res.status}` });
                return {} as Lead;
            }
            const newLead = await res.json();
            get().loadLeads();
            return newLead;
        } catch {
            set({ error: "Error de conexión. Verifica tu red." });
            return {} as Lead;
        }
    },

    updateLead: async (id, data) => {
        set({ error: null });
        pushUndo(get, set);
        try {
            const res = await fetch(`/api/leads/${id}`, {
                method: 'PUT',
                headers: JSON_HEADERS,
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                set({ error: body.error ?? `Error ${res.status}` });
                return undefined;
            }
            const updated = await res.json();
            get().loadLeads();
            return updated;
        } catch {
            set({ error: "Error de conexión. Verifica tu red." });
            return undefined;
        }
    },

    deleteLead: async (id) => {
        set({ error: null });
        pushUndo(get, set);
        try {
            const res = await fetch(`/api/leads/${id}`, { method: 'DELETE' });
            if (res.ok) { get().loadLeads(); return true; }
            const body = await res.json().catch(() => ({}));
            set({ error: body.error ?? `Error ${res.status}` });
            return false;
        } catch {
            set({ error: "Error de conexión. Verifica tu red." });
            return false;
        }
    },

    moveLeadToStage: async (id, etapa) => {
        set({ error: null });
        pushUndo(get, set);
        // Optimistic update
        set((state) => ({ leads: state.leads.map((l) => l.id === id ? { ...l, etapa } : l) }));
        try {
            const res = await fetch(`/api/leads/${id}`, {
                method: 'PUT',
                headers: JSON_HEADERS,
                body: JSON.stringify({ etapa }),
            });
            if (!res.ok) {
                // Revert optimistic update
                const prev = get().undoStack[get().undoStack.length - 1];
                if (prev) set({ leads: prev });
                const body = await res.json().catch(() => ({}));
                set({ error: body.error ?? `Error ${res.status}` });
                return;
            }
            get().loadLeads();
        } catch {
            set({ error: "Error de conexión. Verifica tu red." });
        }
    },

    setSearchQuery: (query) => set({ searchQuery: query }),
    setFilters: (partial) => set((state) => ({ filters: { ...state.filters, ...partial } })),
    resetFilters: () => set({ filters: { ...defaultFilters } }),

    undo: () => {
        const stack = get().undoStack;
        if (stack.length === 0) return false;

        const previousLeads = stack[stack.length - 1];
        const currentLeads = get().leads;

        // Detect which lead changed stage and persist it
        const changed = currentLeads.find((curr) => {
            const prev = previousLeads.find(p => p.id === curr.id);
            return prev && prev.etapa !== curr.etapa;
        });

        set({ leads: previousLeads, undoStack: stack.slice(0, -1), lastUndoMessage: "Acción deshecha" });

        if (changed) {
            const prevState = previousLeads.find(p => p.id === changed.id);
            if (prevState) {
                fetch(`/api/leads/${changed.id}`, {
                    method: 'PUT',
                    headers: JSON_HEADERS,
                    body: JSON.stringify({ etapa: prevState.etapa }),
                }).catch(() => {});
            }
        }
        return true;
    },

    clearUndoMessage: () => set({ lastUndoMessage: null }),
    clearError: () => set({ error: null }),
}));

// ── Selectors ──
export function getFilteredLeads(state: LeadsState): Lead[] {
    let result = [...state.leads];
    if (state.searchQuery.trim()) {
        const q = state.searchQuery.toLowerCase();
        result = result.filter(
            (l) =>
                l.nombreContacto.toLowerCase().includes(q) ||
                l.empresa.toLowerCase().includes(q) ||
                l.email.toLowerCase().includes(q)
        );
    }
    if (state.filters.etapas.length > 0) {
        result = result.filter((l) => state.filters.etapas.includes(l.etapa));
    }
    if (state.filters.valorMin !== null) {
        result = result.filter((l) => l.valorEstimado >= state.filters.valorMin!);
    }
    if (state.filters.valorMax !== null) {
        result = result.filter((l) => l.valorEstimado <= state.filters.valorMax!);
    }
    if (state.filters.fechaDesde) {
        result = result.filter((l) => l.fechaCreacion >= state.filters.fechaDesde!);
    }
    if (state.filters.fechaHasta) {
        result = result.filter((l) => l.fechaCreacion <= state.filters.fechaHasta!);
    }
    return result;
}

export function getLeadsByStage(leads: Lead[], etapa: Etapa): Lead[] {
    return leads.filter((l) => l.etapa === etapa).sort((a, b) => b.valorEstimado - a.valorEstimado);
}

export function getTotalPipelineValue(leads: Lead[]): number {
    return leads.filter((l) => l.etapa !== Etapa.PERDIDO).reduce((sum, l) => sum + l.valorEstimado, 0);
}

export function getStageValue(leads: Lead[], etapa: Etapa): number {
    return leads.filter((l) => l.etapa === etapa).reduce((sum, l) => sum + l.valorEstimado, 0);
}

export interface LeadsSummary {
    activo: number;
    ganados: number;
    perdidos: number;
    totalHistorico: number;
    leadsActivos: Lead[];
    leadsGanados: Lead[];
    leadsPerdidos: Lead[];
}

export function getLeadsSummaryByContact(leads: Lead[], contactName: string): LeadsSummary {
    const matched = leads.filter((l) => l.nombreContacto.toLowerCase() === contactName.toLowerCase());
    const activos = matched.filter((l) => l.etapa !== Etapa.GANADO && l.etapa !== Etapa.PERDIDO);
    const ganados = matched.filter((l) => l.etapa === Etapa.GANADO);
    const perdidos = matched.filter((l) => l.etapa === Etapa.PERDIDO);
    return {
        activo: activos.reduce((s, l) => s + l.valorEstimado, 0),
        ganados: ganados.reduce((s, l) => s + l.valorEstimado, 0),
        perdidos: perdidos.reduce((s, l) => s + l.valorEstimado, 0),
        totalHistorico: matched.reduce((s, l) => s + l.valorEstimado, 0),
        leadsActivos: activos,
        leadsGanados: ganados,
        leadsPerdidos: perdidos,
    };
}

export function getLeadsSummaryByEmpresa(leads: Lead[], empresaName: string): LeadsSummary {
    const matched = leads.filter((l) => l.empresa.toLowerCase() === empresaName.toLowerCase());
    const activos = matched.filter((l) => l.etapa !== Etapa.GANADO && l.etapa !== Etapa.PERDIDO);
    const ganados = matched.filter((l) => l.etapa === Etapa.GANADO);
    const perdidos = matched.filter((l) => l.etapa === Etapa.PERDIDO);
    return {
        activo: activos.reduce((s, l) => s + l.valorEstimado, 0),
        ganados: ganados.reduce((s, l) => s + l.valorEstimado, 0),
        perdidos: perdidos.reduce((s, l) => s + l.valorEstimado, 0),
        totalHistorico: matched.reduce((s, l) => s + l.valorEstimado, 0),
        leadsActivos: activos,
        leadsGanados: ganados,
        leadsPerdidos: perdidos,
    };
}
