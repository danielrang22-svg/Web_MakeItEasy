import { create } from "zustand";

export interface Tarea {
  id: string;
  proyectoId: string;
  parentId: string | null;
  milestoneId: string | null;
  titulo: string;
  descripcion: string | null;
  tipo: "product" | "development" | "bug";
  estado: "BACKLOG" | "PENDIENTE" | "EN_PROGRESO" | "REVISION" | "QA" | "COMPLETADO";
  prioridad: number; // 0=none, 1=low, 2=medium, 3=high, 4=urgent
  asignadoEmail: string | null;
  estimado: number | null;
  githubBranch: string | null;
  fechaLimite: string | null;
  etiquetas: string | null;
  completadaEn?: string | null;
  githubPrNumber?: number | null;
  createdAt: string;
  updatedAt: string;
  subtareas?: Tarea[];
  milestone?: { id: string; nombre: string } | null;
  comentarios?: any[];
}

export interface Milestone {
  id: string;
  proyectoId: string;
  nombre: string;
  descripcion: string | null;
  fechaObjetivo: string | null;
  completado: boolean;
  createdAt: string;
}

interface TareasState {
  tareas: Tarea[];
  milestones: Milestone[];
  isLoading: boolean;
  
  loadTareas: (proyectoId: string) => Promise<void>;
  loadMilestones: (proyectoId: string) => Promise<void>;
  
  addTarea: (tarea: Omit<Tarea, "id"|"createdAt"|"updatedAt">) => Promise<Tarea>;
  updateTarea: (id: string, data: Partial<Tarea>) => Promise<void>;
  deleteTarea: (id: string) => Promise<void>;
  moveTarea: (id: string, nuevoEstado: string) => Promise<void>;
  
  addMilestone: (data: Partial<Milestone>) => Promise<Milestone>;
  updateMilestone: (id: string, data: Partial<Milestone>) => Promise<void>;
}

export const useTareasStore = create<TareasState>((set, get) => ({
  tareas: [],
  milestones: [],
  isLoading: false,

  loadTareas: async (proyectoId) => {
    set({ isLoading: true });
    try {
      const res = await fetch(`/api/tareas?proyectoId=${proyectoId}&parentId=null`);
      if (res.ok) {
        const data = await res.json();
        set({ tareas: data });
      }
    } catch (e) {
      console.error(e);
    } finally {
      set({ isLoading: false });
    }
  },

  loadMilestones: async (proyectoId) => {
    try {
      const res = await fetch(`/api/milestones?proyectoId=${proyectoId}`);
      if (res.ok) {
        const data = await res.json();
        set({ milestones: data });
      }
    } catch (e) {
      console.error(e);
    }
  },

  addTarea: async (tareaData) => {
    const res = await fetch("/api/tareas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tareaData)
    });
    if (!res.ok) throw new Error("Error creating task");
    const nueva = await res.json();
    set(state => ({ tareas: [nueva, ...state.tareas] }));
    return nueva;
  },

  updateTarea: async (id, data) => {
    const res = await fetch(`/api/tareas/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (res.ok) {
      const actualizada = await res.json();
      set(state => ({
        tareas: state.tareas.map(t => t.id === id ? actualizada : t)
      }));
    }
  },

  deleteTarea: async (id) => {
    const res = await fetch(`/api/tareas/${id}`, { method: "DELETE" });
    if (res.ok) {
      set(state => ({
        tareas: state.tareas.filter(t => t.id !== id)
      }));
    }
  },

  moveTarea: async (id, nuevoEstado) => {
    // Optimistic UI update
    set(state => ({
      tareas: state.tareas.map(t => t.id === id ? { ...t, estado: nuevoEstado as any } : t)
    }));
    await get().updateTarea(id, { estado: nuevoEstado as any });
  },

  addMilestone: async (data) => {
    const res = await fetch("/api/milestones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error("Error creating milestone");
    const nuevo = await res.json();
    set(state => ({ milestones: [...state.milestones, nuevo] }));
    return nuevo;
  },

  updateMilestone: async (id, data) => {
    const res = await fetch(`/api/milestones`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...data })
    });
    if (res.ok) {
      const actual = await res.json();
      set(state => ({
        milestones: state.milestones.map(m => m.id === id ? actual : m)
      }));
    }
  }
}));
