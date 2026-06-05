import { create } from "zustand";
import { Cotizacion, CotizacionCreateData, CotizacionUpdateData } from "../types";
import { getNextCodigo } from "../cotizacionesCalc";

const JSON_HEADERS = { "Content-Type": "application/json" };

interface CotizacionesState {
    cotizaciones: Cotizacion[];
    searchQuery: string;
    error: string | null;
    loadCotizaciones: () => Promise<void>;
    createCotizacion: (data: CotizacionCreateData) => Promise<Cotizacion>;
    updateCotizacion: (id: string, data: CotizacionUpdateData) => Promise<Cotizacion | undefined>;
    deleteCotizacion: (id: string) => Promise<boolean>;
    setSearchQuery: (query: string) => void;
    getNextCodigo: () => string;
    clearError: () => void;
}

export const useCotizacionesStore = create<CotizacionesState>((set, get) => ({
    cotizaciones: [],
    searchQuery: "",
    error: null,

    loadCotizaciones: async () => {
        try {
            const res = await fetch('/api/cotizaciones');
            if (!res.ok) { set({ error: `Error cargando cotizaciones (${res.status})` }); return; }
            set({ cotizaciones: await res.json() });
        } catch { set({ error: "Error de conexión. Verifica tu red." }); }
    },

    createCotizacion: async (data) => {
        set({ error: null });
        try {
            const res = await fetch('/api/cotizaciones', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(data) });
            if (!res.ok) { const b = await res.json().catch(() => ({})); set({ error: b.error ?? `Error ${res.status}` }); return {} as Cotizacion; }
            const newCot = await res.json();
            get().loadCotizaciones();
            return newCot;
        } catch { set({ error: "Error de conexión. Verifica tu red." }); return {} as Cotizacion; }
    },

    updateCotizacion: async (id, data) => {
        set({ error: null });
        try {
            const res = await fetch(`/api/cotizaciones/${id}`, { method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify(data) });
            if (!res.ok) { const b = await res.json().catch(() => ({})); set({ error: b.error ?? `Error ${res.status}` }); return undefined; }
            const updated = await res.json();
            get().loadCotizaciones();
            return updated;
        } catch { set({ error: "Error de conexión. Verifica tu red." }); return undefined; }
    },

    deleteCotizacion: async (id) => {
        set({ error: null });
        try {
            const res = await fetch(`/api/cotizaciones/${id}`, { method: 'DELETE' });
            if (res.ok) { get().loadCotizaciones(); return true; }
            const b = await res.json().catch(() => ({}));
            set({ error: b.error ?? `Error ${res.status}` });
            return false;
        } catch { set({ error: "Error de conexión. Verifica tu red." }); return false; }
    },

    setSearchQuery: (query) => set({ searchQuery: query }),
    getNextCodigo: () => getNextCodigo(get().cotizaciones),
    clearError: () => set({ error: null }),
}));

export function getFilteredCotizaciones(state: CotizacionesState): Cotizacion[] {
    let result = [...state.cotizaciones];
    if (state.searchQuery.trim()) {
        const q = state.searchQuery.toLowerCase();
        result = result.filter(
            (c) =>
                c.codigo.toLowerCase().includes(q) ||
                c.empresaNombre.toLowerCase().includes(q) ||
                c.contactoNombre.toLowerCase().includes(q)
        );
    }
    return result.sort((a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime());
}
