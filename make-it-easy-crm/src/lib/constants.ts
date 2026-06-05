import { Etapa } from "./types";

// ── Pipeline Stage Configuration ──
export interface StageConfig {
    key: Etapa;
    label: string;
    shortLabel: string;
    color: string;        // Tailwind bg color class
    textColor: string;    // Tailwind text color class
    dotColor: string;     // Hex for indicators
}

export const PIPELINE_STAGES: StageConfig[] = [
    {
        key: Etapa.NUEVO,
        label: "Nuevo",
        shortLabel: "Nuevo",
        color: "bg-blue-100 dark:bg-blue-900/30",
        textColor: "text-blue-600 dark:text-blue-400",
        dotColor: "#3b82f6",
    },
    {
        key: Etapa.CONTACTADO,
        label: "Contactado",
        shortLabel: "Contactado",
        color: "bg-amber-100 dark:bg-amber-900/30",
        textColor: "text-amber-600 dark:text-amber-400",
        dotColor: "#f59e0b",
    },
    {
        key: Etapa.PROPUESTA,
        label: "Propuesta Enviada",
        shortLabel: "Propuesta",
        color: "bg-purple-100 dark:bg-purple-900/30",
        textColor: "text-purple-600 dark:text-purple-400",
        dotColor: "#a855f7",
    },
    {
        key: Etapa.NEGOCIACION,
        label: "En Negociación",
        shortLabel: "Negociación",
        color: "bg-indigo-100 dark:bg-indigo-900/30",
        textColor: "text-indigo-600 dark:text-indigo-400",
        dotColor: "#6366f1",
    },
    {
        key: Etapa.GANADO,
        label: "Cerrado Ganado",
        shortLabel: "Ganado",
        color: "bg-green-100 dark:bg-green-900/30",
        textColor: "text-green-600 dark:text-green-400",
        dotColor: "#22c55e",
    },
    {
        key: Etapa.PERDIDO,
        label: "Cerrado Perdido",
        shortLabel: "Perdido",
        color: "bg-red-100 dark:bg-red-900/30",
        textColor: "text-red-600 dark:text-red-400",
        dotColor: "#ef4444",
    },
];

// ── Lead Origin Options ──
export const LEAD_ORIGINS = [
    "Sitio Web",
    "WhatsApp",
    "Referido B2B",
    "Outbound Cold Mail",
    "Llamada Directa",
    "Redes Sociales",
    "Otro",
];

// ── Helpers ──
export function getStageConfig(etapa: Etapa): StageConfig {
    return PIPELINE_STAGES.find((s) => s.key === etapa) ?? PIPELINE_STAGES[0];
}

export function formatCurrency(value: number, currency: string = "COP"): string {
    return new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
}

export function formatDate(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleDateString("es-CO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}
