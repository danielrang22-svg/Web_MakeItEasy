import { create } from 'zustand';

export interface Gasto {
    id: string;
    concepto: string;
    monto: number;
    moneda: string;
    fecha: string;
    categoria: string;
    recurrente: boolean;
    estado: string;
    notas?: string | null;
    proyectoId?: string | null;
    proveedorId?: string | null;
    proyecto?: { titulo: string, clienteNombre: string } | null;
    proveedor?: { nombre: string } | null;
}

interface GastosState {
    gastos: Gasto[];
    isLoading: boolean;
    error: string | null;
    fetchGastos: (proyectoId?: string) => Promise<void>;
    addGasto: (gasto: Partial<Gasto>) => Promise<void>;
    updateGasto: (id: string, gasto: Partial<Gasto>) => Promise<void>;
    deleteGasto: (id: string) => Promise<void>;
}

export const useGastosStore = create<GastosState>((set) => ({
    gastos: [],
    isLoading: false,
    error: null,

    fetchGastos: async (proyectoId?: string) => {
        set({ isLoading: true, error: null });
        try {
            const url = proyectoId ? `/api/gastos?proyectoId=${proyectoId}` : '/api/gastos';
            const res = await fetch(url);
            if (!res.ok) throw new Error('Error al cargar los gastos');
            const data = await res.json();
            set({ gastos: data, isLoading: false });
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
        }
    },

    addGasto: async (gasto: Partial<Gasto>) => {
        try {
            const res = await fetch('/api/gastos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(gasto),
            });
            if (!res.ok) throw new Error('Error al crear gasto');
            const newGasto = await res.json();
            
            // Re-fetch to get nested relations populated (or we could just append it, but fetch is safer)
            set((state) => ({ gastos: [newGasto, ...state.gastos] }));
        } catch (error: any) {
            throw error;
        }
    },

    updateGasto: async (id: string, gasto: Partial<Gasto>) => {
        try {
            const res = await fetch(`/api/gastos/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(gasto),
            });
            if (!res.ok) throw new Error('Error al actualizar gasto');
            const updated = await res.json();
            set((state) => ({
                gastos: state.gastos.map((g) => (g.id === id ? { ...g, ...updated } : g)),
            }));
        } catch (error: any) {
            throw error;
        }
    },

    deleteGasto: async (id: string) => {
        try {
            const res = await fetch(`/api/gastos/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Error al eliminar gasto');
            set((state) => ({
                gastos: state.gastos.filter((g) => g.id !== id),
            }));
        } catch (error: any) {
            throw error;
        }
    }
}));
