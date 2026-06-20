import { create } from "zustand";
import type {
  Proyecto,
  ProyectoCreateData,
  ProyectoUpdateData,
  AutomationFlow,
  AutomationFlowUpdateData,
  Cotizacion
} from "../types";
import { EstadoProyecto } from "../types";

const JSON_HEADERS = { "Content-Type": "application/json" };

interface ProyectosState {
  proyectos: Proyecto[];
  ordenes: AutomationFlow[]; // Keeps property name 'ordenes' to minimize page refactoring but types it as AutomationFlow
  cotizaciones: Cotizacion[];
  error: string | null;

  loadProyectos: () => Promise<void>;
  loadOrdenes: () => Promise<void>; // Loads flows from /api/flows
  loadCotizaciones: () => Promise<void>;
  generarDesdeCotizacion: (cotizacion: Cotizacion) => Promise<Proyecto | undefined>;
  updateProyecto: (id: string, data: ProyectoUpdateData) => Promise<void>;
  deleteProyecto: (id: string) => Promise<void>;
  updateOrdenProduccion: (id: string, data: AutomationFlowUpdateData) => Promise<void>; // Keeps name to minimize imports refactor
  clearError: () => void;
  getProyectoFinancials: (proyectoId: string) => { costo: number, ingreso: number, ganancia: number };
  getProjectProgress: (proyectoId: string) => number;
}

export const useProyectosStore = create<ProyectosState>((set, get) => ({
  proyectos: [],
  ordenes: [],
  cotizaciones: [],
  error: null,

  loadProyectos: async () => {
    try {
      const res = await fetch("/api/proyectos");
      if (!res.ok) { set({ error: `Error cargando proyectos (${res.status})` }); return; }
      set({ proyectos: await res.json() });
    } catch { set({ error: "Error de conexión. Verifica tu red." }); }
  },

  loadOrdenes: async () => {
    try {
      const res = await fetch("/api/flows");
      if (!res.ok) { set({ error: `Error cargando flujos de automatización (${res.status})` }); return; }
      set({ ordenes: await res.json() });
    } catch { set({ error: "Error de conexión. Verifica tu red." }); }
  },

  loadCotizaciones: async () => {
    try {
      const res = await fetch("/api/cotizaciones");
      if (!res.ok) { set({ error: `Error cargando cotizaciones (${res.status})` }); return; }
      set({ cotizaciones: await res.json() });
    } catch { set({ error: "Error de conexión al cargar cotizaciones." }); }
  },

  generarDesdeCotizacion: async (cotizacion: Cotizacion) => {
    set({ error: null });
    const { proyectos } = get();
    const existing = proyectos.find(p => p.cotizacionId === cotizacion.id);
    if (existing) return existing;

    const ahora = new Date().toISOString();

    try {
      const proyectoCreate: ProyectoCreateData = {
        leadId: cotizacion.leadId ?? "",
        cotizacionId: cotizacion.id,
        titulo: `Proyecto ${cotizacion.codigo} - ${cotizacion.empresaNombre}`,
        clienteNombre: cotizacion.empresaNombre,
        estado: EstadoProyecto.DIAGNOSTICO,
        fechaInicio: ahora,
        fechaEntregaEstimada: ahora,
        notas: "Generado a partir de " + cotizacion.codigo,
        herramientasUsadas: "n8n, Make, OpenAI, Stripe"
      };

      const resP = await fetch("/api/proyectos", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify(proyectoCreate) });
      if (!resP.ok) {
        const b = await resP.json().catch(() => ({}));
        set({ error: b.error ?? "Error creando proyecto" });
        return undefined;
      }
      const nuevoProyecto = await resP.json();

      // Create default automation flows for the new project
      const defaultFlows = [
        {
          proyectoId: nuevoProyecto.id,
          nombre: "Agente de IA WhatsApp Business",
          estado: "PAUSADO",
          tipo: "WhatsApp AI Agent",
          ejecuciones24h: 0,
          tasaExito: 100.0,
          tiempoPromedio: 0.0,
          notas: "Responde consultas 24/7 y califica leads."
        },
        {
          proyectoId: nuevoProyecto.id,
          nombre: "Sincronización de CRM",
          estado: "PAUSADO",
          tipo: "CRM Sync",
          ejecuciones24h: 0,
          tasaExito: 100.0,
          tiempoPromedio: 0.0,
          notas: "Sincroniza contactos y estados del embudo."
        }
      ];

      for (const flow of defaultFlows) {
        await fetch("/api/flows", {
          method: "POST",
          headers: JSON_HEADERS,
          body: JSON.stringify(flow)
        });
      }

      await get().loadProyectos();
      await get().loadOrdenes();
      return nuevoProyecto;
    } catch (e) {
      console.error("generarDesdeCotizacion error:", e);
      set({ error: "Error de conexión. Verifica tu red." });
      return undefined;
    }
  },

  updateProyecto: async (id: string, data: ProyectoUpdateData) => {
    set({ error: null });
    try {
      const res = await fetch(`/api/proyectos/${id}`, { method: "PUT", headers: JSON_HEADERS, body: JSON.stringify(data) });
      if (!res.ok) { const b = await res.json().catch(() => ({})); set({ error: b.error ?? `Error ${res.status}` }); return; }
      await get().loadProyectos();
    } catch { set({ error: "Error de conexión. Verifica tu red." }); }
  },

  deleteProyecto: async (id: string) => {
    set({ error: null });
    try {
      await fetch(`/api/proyectos/${id}`, { method: "DELETE" });
      await get().loadProyectos();
      await get().loadOrdenes();
    } catch { set({ error: "Error de conexión. Verifica tu red." }); }
  },

  updateOrdenProduccion: async (id: string, data: AutomationFlowUpdateData) => {
    set({ error: null });
    try {
      const res = await fetch(`/api/flows/${id}`, { method: "PUT", headers: JSON_HEADERS, body: JSON.stringify(data) });
      if (!res.ok) { const b = await res.json().catch(() => ({})); set({ error: b.error ?? `Error ${res.status}` }); return; }
      await get().loadOrdenes();
    } catch { set({ error: "Error de conexión. Verifica tu red." }); }
  },

  clearError: () => set({ error: null }),

  getProyectoFinancials: (proyectoId: string) => {
    const { proyectos, cotizaciones } = get();
    const proyecto = proyectos.find(p => p.id === proyectoId);
    if (!proyecto) return { costo: 0, ingreso: 0, ganancia: 0 };
    
    const cotizacion = cotizaciones.find(c => c.id === proyecto.cotizacionId);
    if (!cotizacion) return { costo: 0, ingreso: 0, ganancia: 0 };

    const ingreso = cotizacion.totalProyectoCore + cotizacion.moduloOpcionalFee;
    const costo = Math.round(ingreso * 0.2); // Estimated 20% cost for external services/APIs/hosting
    
    return { costo, ingreso, ganancia: ingreso - costo };
  },

  getProjectProgress: (proyectoId: string) => {
    const { proyectos } = get();
    const proyecto = proyectos.find(p => p.id === proyectoId);
    if (!proyecto) return 0;
    
    switch (proyecto.estado) {
      case EstadoProyecto.DIAGNOSTICO: return 20;
      case EstadoProyecto.DISENO: return 50;
      case EstadoProyecto.IMPLEMENTACION: return 80;
      case EstadoProyecto.SOPORTE: return 100;
      case EstadoProyecto.EN_REVISION: return 90;
      case EstadoProyecto.ACEPTADO_CLIENTE: return 95;
      case EstadoProyecto.COMPLETADO: return 100;
      default: return 0;
    }
  }
}));
