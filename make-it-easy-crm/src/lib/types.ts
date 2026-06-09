// ── Pipeline Stages ──
export enum Etapa {
  NUEVO = "NUEVO",
  CONTACTADO = "CONTACTADO",
  PROPUESTA = "PROPUESTA",
  NEGOCIACION = "NEGOCIACION",
  GANADO = "GANADO",
  PERDIDO = "PERDIDO",
}

// ── Lead Entity ──
export interface Lead {
  id: string;
  titulo: string;
  nombreContacto: string;
  empresa: string;
  valorEstimado: number;
  fechaCreacion: string; // ISO string
  fechaActualizacion: string; // ISO string
  telefono: string;
  email: string;
  notas: string;
  etapa: Etapa;
  origenLead: string;
  
  // Custom Make It Easy fields
  sector: string | null;
  numEmpleados: string | null;
  procesoAAutomatizar: string | null;
  planInteres: string | null;
}

// ── Lead Creation DTO ──
export type LeadCreateData = Omit<Lead, "id" | "fechaCreacion" | "fechaActualizacion">;

// ── Lead Update DTO ──
export type LeadUpdateData = Partial<Omit<Lead, "id" | "fechaCreacion">>;

// ── Filter Types ──
export interface LeadFilters {
  etapas: Etapa[];
  valorMin: number | null;
  valorMax: number | null;
  fechaDesde: string | null; // ISO string
  fechaHasta: string | null; // ISO string
}

// ── Empresa Entity ──
export interface Empresa {
  id: string;
  nombre: string;
  nit: string;
  direccion: string;
  ciudad: string;
  sector: string;
  tamano: string;
  telefono: string;
  email: string;
  notas: string;
  fechaCreacion: string;
  fechaActualizacion: string;
}

export type EmpresaCreateData = Omit<Empresa, "id" | "fechaCreacion" | "fechaActualizacion">;
export type EmpresaUpdateData = Partial<Omit<Empresa, "id" | "fechaCreacion">>;

// ── Proveedor Entity ──
export interface Proveedor {
  id: string;
  nombre: string;
  nit: string;
  especialidad: string;
  telefono: string;
  email: string;
  notas: string;
  fechaCreacion: string;
  fechaActualizacion: string;
}

export type ProveedorCreateData = Omit<Proveedor, "id" | "fechaCreacion" | "fechaActualizacion">;
export type ProveedorUpdateData = Partial<Omit<Proveedor, "id" | "fechaCreacion">>;

// ── Contacto Entity ──
export interface Contacto {
  id: string;
  nombre: string;
  cargo: string;
  empresaId: string; // linked to Empresa
  empresaNombre: string; // denormalized for display
  telefono: string;
  telefono2: string;
  email: string;
  email2: string;
  notas: string;
  tags: string[];
  fechaCreacion: string;
  fechaActualizacion: string;
}

export type ContactoCreateData = Omit<Contacto, "id" | "fechaCreacion" | "fechaActualizacion">;
export type ContactoUpdateData = Partial<Omit<Contacto, "id" | "fechaCreacion">>;

// ── Interaccion (historial por contacto) ──
export type TipoInteraccion = "llamada" | "email" | "reunion" | "nota" | "whatsapp";

export interface Interaccion {
  id: string;
  contactoId: string;
  tipo: TipoInteraccion;
  descripcion: string;
  fecha: string; // ISO string
}

// ── Cotización / Propuesta ──
export enum EstadoCotizacion {
  BORRADOR = "BORRADOR",
  REVISION_TECNICA = "REVISION_TECNICA",
  APROBADA_TECNICAMENTE = "APROBADA_TECNICAMENTE",
  ENVIADA_CLIENTE = "ENVIADA_CLIENTE",
  RECHAZADA = "RECHAZADA",
  CERRADA = "CERRADA",
}

export interface Cotizacion {
  id: string;
  codigo: string;         // COT-001-2024
  version: number;        // 1, 2, 3...
  vendedor: string;
  fecha: string;          // ISO string
  leadId: string | null;  // vinculado a un lead
  empresaNombre: string;
  contactoNombre: string;
  estado: EstadoCotizacion;
  
  // Rich Proposal fields
  tituloPropuesta: string;
  desafioNegocio: string | null;
  prerrequisitos: string | null;      // stringified JSON array
  arquitecturaJson: string | null;    // stringified JSON array
  fasesJson: string | null;           // stringified JSON array
  checklistInicio: string | null;     // stringified JSON array
  
  // Financial totals
  totalProyectoCore: number;
  moduloOpcionalFee: number;
  feeMensual: number;
  feeMensualIncluye: string | null;
  moneda: string; // "COP" | "USD"
  
  observaciones: string | null;
  validez: string;
  fechaCreacion: string;
  fechaActualizacion: string;
}

export type CotizacionCreateData = Omit<Cotizacion, "id" | "version" | "fechaCreacion" | "fechaActualizacion">;
export type CotizacionUpdateData = Partial<Omit<Cotizacion, "id" | "version" | "fechaCreacion">>;

// ── Proyectos & Automatizaciones ──

export enum EstadoProyecto {
  DIAGNOSTICO = "DIAGNOSTICO",
  DISENO = "DISENO",
  IMPLEMENTACION = "IMPLEMENTACION",
  SOPORTE = "SOPORTE",
}

export interface Proyecto {
  id: string;
  leadId: string | null;
  cotizacionId: string | null;
  titulo: string;
  clienteNombre: string;
  estado: EstadoProyecto;
  fechaInicio: string; // ISO string
  fechaEntregaEstimada: string | null; // ISO string
  notas: string;
  herramientasUsadas: string | null;
  fechaCreacion: string;
  fechaActualizacion: string;
}

export type ProyectoCreateData = Omit<Proyecto, "id" | "fechaCreacion" | "fechaActualizacion">;
export type ProyectoUpdateData = Partial<Omit<Proyecto, "id" | "fechaCreacion">>;

export interface AutomationFlow {
  id: string;
  proyectoId: string;
  nombre: string;
  estado: "ACTIVO" | "PAUSADO" | "ERROR";
  tipo: string;
  ejecuciones24h: number;
  tasaExito: number;
  tiempoPromedio: number;
  notas: string;
  fechaCreacion: string;
  fechaActualizacion: string;
}

export type AutomationFlowCreateData = Omit<AutomationFlow, "id" | "fechaCreacion" | "fechaActualizacion">;
export type AutomationFlowUpdateData = Partial<Omit<AutomationFlow, "id" | "fechaCreacion">>;

// ── Catálogo de Productos/Servicios ──
export interface Producto {
  id: string;
  referencia: string;
  nombre: string;
  proveedor: string;
  costoEstimado: number;
  precioSugerido: number;
  tipo: string; // "producto" | "servicio"
  descripcion: string;
  activo: boolean;
  fechaCreacion: string;
  fechaActualizacion: string;
}

export type ProductoCreateData = Omit<Producto, "id" | "fechaCreacion" | "fechaActualizacion">;
export type ProductoUpdateData = Partial<Omit<Producto, "id" | "fechaCreacion">>;

export interface User {
  id: string;
  email: string;
  nombre: string;
  rol: string;
  activo: boolean;
}
