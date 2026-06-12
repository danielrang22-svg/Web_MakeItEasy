import { create } from "zustand";

export interface BitacoraEntry {
  id: string;
  proyectoId: string;
  autorNombre: string;
  autorEmail: string;
  entrada: string;
  tipo: string;
  createdAt: string;
}

interface BitacoraState {
  entradas: BitacoraEntry[];
  loading: boolean;
  error: string | null;
  fetchEntradas: (proyectoId: string) => Promise<void>;
  addEntrada: (proyectoId: string, autorNombre: string, autorEmail: string, entrada: string, tipo: string) => Promise<void>;
}

export const useBitacoraStore = create<BitacoraState>((set, get) => ({
  entradas: [],
  loading: false,
  error: null,
  fetchEntradas: async (proyectoId) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`/api/bitacora?proyectoId=${proyectoId}`);
      if (!res.ok) throw new Error("Error fetching bitacora");
      const data = await res.json();
      set({ entradas: data, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },
  addEntrada: async (proyectoId, autorNombre, autorEmail, entrada, tipo) => {
    try {
      const res = await fetch("/api/bitacora", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proyectoId, autorNombre, autorEmail, entrada, tipo })
      });
      if (res.ok) {
        const nuevaEntrada = await res.json();
        set({ entradas: [nuevaEntrada, ...get().entradas] });
      }
    } catch (e) {
      console.error(e);
    }
  }
}));
