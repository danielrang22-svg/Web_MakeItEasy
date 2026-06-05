import { create } from "zustand";
import { Contacto, ContactoCreateData, ContactoUpdateData, Interaccion, TipoInteraccion } from "../types";

const JSON_HEADERS = { "Content-Type": "application/json" };

interface ContactosState {
    contactos: Contacto[];
    searchQuery: string;
    error: string | null;
    loadContactos: () => Promise<void>;
    createContacto: (data: ContactoCreateData) => Promise<Contacto>;
    updateContacto: (id: string, data: ContactoUpdateData) => Promise<Contacto | undefined>;
    deleteContacto: (id: string) => Promise<boolean>;
    setSearchQuery: (query: string) => void;
    getInteractions: (contactoId: string) => Promise<Interaccion[]>;
    addInteraction: (contactoId: string, tipo: TipoInteraccion, descripcion: string) => Promise<Interaccion>;
    clearError: () => void;
}

export const useContactosStore = create<ContactosState>((set, get) => ({
    contactos: [],
    searchQuery: "",
    error: null,

    loadContactos: async () => {
        try {
            const res = await fetch('/api/contactos');
            if (!res.ok) { set({ error: `Error cargando contactos (${res.status})` }); return; }
            set({ contactos: await res.json() });
        } catch { set({ error: "Error de conexión. Verifica tu red." }); }
    },

    createContacto: async (data) => {
        set({ error: null });
        try {
            const res = await fetch('/api/contactos', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(data) });
            if (!res.ok) { const b = await res.json().catch(() => ({})); set({ error: b.error ?? `Error ${res.status}` }); return {} as Contacto; }
            const newContacto = await res.json();
            get().loadContactos();
            return newContacto;
        } catch { set({ error: "Error de conexión. Verifica tu red." }); return {} as Contacto; }
    },

    updateContacto: async (id, data) => {
        set({ error: null });
        try {
            const res = await fetch(`/api/contactos/${id}`, { method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify(data) });
            if (!res.ok) { const b = await res.json().catch(() => ({})); set({ error: b.error ?? `Error ${res.status}` }); return undefined; }
            const updated = await res.json();
            get().loadContactos();
            return updated;
        } catch { set({ error: "Error de conexión. Verifica tu red." }); return undefined; }
    },

    deleteContacto: async (id) => {
        set({ error: null });
        try {
            const res = await fetch(`/api/contactos/${id}`, { method: 'DELETE' });
            if (res.ok) { get().loadContactos(); return true; }
            const b = await res.json().catch(() => ({}));
            set({ error: b.error ?? `Error ${res.status}` });
            return false;
        } catch { set({ error: "Error de conexión. Verifica tu red." }); return false; }
    },

    setSearchQuery: (query) => set({ searchQuery: query }),
    clearError: () => set({ error: null }),

    getInteractions: async (_contactoId) => [],
    addInteraction: async (_contactoId, _tipo, _descripcion) => ({} as Interaccion),
}));

export function getFilteredContactos(state: ContactosState): Contacto[] {
    let result = [...state.contactos];
    if (state.searchQuery.trim()) {
        const q = state.searchQuery.toLowerCase();
        result = result.filter(
            (c) =>
                c.nombre.toLowerCase().includes(q) ||
                c.empresaNombre.toLowerCase().includes(q) ||
                c.cargo.toLowerCase().includes(q) ||
                c.email.toLowerCase().includes(q) ||
                c.tags.some((t) => t.toLowerCase().includes(q))
        );
    }
    return result.sort((a, b) => a.nombre.localeCompare(b.nombre));
}
