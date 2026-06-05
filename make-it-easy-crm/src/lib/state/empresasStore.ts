import { create } from "zustand";
import { Empresa, EmpresaCreateData, EmpresaUpdateData } from "../types";

const JSON_HEADERS = { "Content-Type": "application/json" };

interface EmpresasState {
    empresas: Empresa[];
    searchQuery: string;
    error: string | null;
    loadEmpresas: () => Promise<void>;
    createEmpresa: (data: EmpresaCreateData) => Promise<Empresa>;
    updateEmpresa: (id: string, data: EmpresaUpdateData) => Promise<Empresa | undefined>;
    deleteEmpresa: (id: string) => Promise<boolean>;
    setSearchQuery: (query: string) => void;
    clearError: () => void;
}

export const useEmpresasStore = create<EmpresasState>((set, get) => ({
    empresas: [],
    searchQuery: "",
    error: null,

    loadEmpresas: async () => {
        try {
            const res = await fetch('/api/empresas');
            if (!res.ok) { set({ error: `Error cargando empresas (${res.status})` }); return; }
            set({ empresas: await res.json() });
        } catch { set({ error: "Error de conexión. Verifica tu red." }); }
    },

    createEmpresa: async (data) => {
        set({ error: null });
        try {
            const res = await fetch('/api/empresas', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(data) });
            if (!res.ok) { const b = await res.json().catch(() => ({})); set({ error: b.error ?? `Error ${res.status}` }); return {} as Empresa; }
            const newEmpresa = await res.json();
            get().loadEmpresas();
            return newEmpresa;
        } catch { set({ error: "Error de conexión. Verifica tu red." }); return {} as Empresa; }
    },

    updateEmpresa: async (id, data) => {
        set({ error: null });
        try {
            const res = await fetch(`/api/empresas/${id}`, { method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify(data) });
            if (!res.ok) { const b = await res.json().catch(() => ({})); set({ error: b.error ?? `Error ${res.status}` }); return undefined; }
            const updated = await res.json();
            get().loadEmpresas();
            return updated;
        } catch { set({ error: "Error de conexión. Verifica tu red." }); return undefined; }
    },

    deleteEmpresa: async (id) => {
        set({ error: null });
        try {
            const res = await fetch(`/api/empresas/${id}`, { method: 'DELETE' });
            if (res.ok) { get().loadEmpresas(); return true; }
            const b = await res.json().catch(() => ({}));
            set({ error: b.error ?? `Error ${res.status}` });
            return false;
        } catch { set({ error: "Error de conexión. Verifica tu red." }); return false; }
    },

    setSearchQuery: (query) => set({ searchQuery: query }),
    clearError: () => set({ error: null }),
}));

export function getFilteredEmpresas(state: EmpresasState): Empresa[] {
    let result = [...state.empresas];
    if (state.searchQuery.trim()) {
        const q = state.searchQuery.toLowerCase();
        result = result.filter(
            (e) =>
                e.nombre.toLowerCase().includes(q) ||
                e.nit.toLowerCase().includes(q) ||
                e.ciudad.toLowerCase().includes(q) ||
                e.sector.toLowerCase().includes(q)
        );
    }
    return result.sort((a, b) => a.nombre.localeCompare(b.nombre));
}
