import type { AuditReport } from "./audit/types";

/** Precios «desde» publicados en makeiteasycol.com (locale Colombia, COP). */
export const PAGE_PRICES = {
  agenteIA: 300_000,
  web: 500_000,
  automatizacion: 800_000,
  crm: 600_000,
  integraciones: 500_000,
  dashboards: 700_000,
  capacitacion: 400_000,
  sistemas: 1_000_000,
  auditoria: 700_000,
} as const;

export interface RadarPackage {
  id: string;
  label: string;
  fromCop: number;
  services: Array<{ name: string; fromCop: number }>;
  pitch: string;
  recurring?: { fromCop: number; label: string };
}

export const RADAR_PACKAGES: RadarPackage[] = [
  {
    id: "web",
    label: "Web nueva",
    fromCop: PAGE_PRICES.web,
    services: [{ name: "Página web", fromCop: PAGE_PRICES.web }],
    pitch: "Una web rápida, adaptada a móvil y preparada para captar contactos desde el primer día.",
  },
  {
    id: "whatsapp",
    label: "Agente WhatsApp",
    fromCop: PAGE_PRICES.agenteIA,
    services: [{ name: "Agente de IA", fromCop: PAGE_PRICES.agenteIA }],
    pitch: "Atiende, cualifica y agenda por WhatsApp 24/7 sin que tu equipo repita respuestas.",
  },
  {
    id: "citas",
    label: "Sistema de citas",
    fromCop: PAGE_PRICES.sistemas,
    services: [{ name: "Sistema a medida", fromCop: PAGE_PRICES.sistemas }],
    pitch: "Reservas online conectadas a tu agenda, con recordatorios automáticos.",
  },
  {
    id: "rediseno_seo",
    label: "Rediseño + SEO",
    fromCop: PAGE_PRICES.web + PAGE_PRICES.auditoria,
    services: [
      { name: "Página web", fromCop: PAGE_PRICES.web },
      { name: "Auditoría y diseño de procesos", fromCop: PAGE_PRICES.auditoria },
    ],
    pitch: "Arregla lo que frena el posicionamiento y reconstruye la web sobre una base técnica sana.",
  },
  {
    id: "captacion",
    label: "Captación local",
    fromCop: PAGE_PRICES.web + PAGE_PRICES.agenteIA + PAGE_PRICES.sistemas,
    services: [
      { name: "Página web", fromCop: PAGE_PRICES.web },
      { name: "Agente de IA", fromCop: PAGE_PRICES.agenteIA },
      { name: "Sistema a medida", fromCop: PAGE_PRICES.sistemas },
    ],
    pitch: "Web + WhatsApp + citas: el circuito completo desde que te encuentran hasta que reservan.",
  },
  {
    id: "auditoria",
    label: "Auditoría SEO",
    fromCop: PAGE_PRICES.auditoria,
    services: [{ name: "Auditoría y diseño de procesos", fromCop: PAGE_PRICES.auditoria }],
    pitch: "Diagnóstico completo con plan de acción priorizado.",
  },
];

export function getPackage(id: string): RadarPackage {
  return RADAR_PACKAGES.find((p) => p.id === id) ?? RADAR_PACKAGES[0];
}

/** Elige el paquete más vendible según los fallos reales de la auditoría. */
export function recommendPackage(report: AuditReport): RadarPackage {
  const failed = new Set(report.checks.filter((c) => c.status === "fail").map((c) => c.id));
  const area = (name: string) => report.areas.find((a) => a.area === name)?.score ?? 100;

  if (failed.has("tech_https") || area("onpage") < 45 || report.globalScore < 45) {
    return getPackage("rediseno_seo");
  }
  if (failed.has("conv_whatsapp") && (failed.has("conv_form") || failed.has("conv_booking"))) {
    return getPackage("captacion");
  }
  if (failed.has("conv_whatsapp")) return getPackage("whatsapp");
  if (failed.has("conv_booking")) return getPackage("citas");
  if (area("onpage") < 75) return getPackage("rediseno_seo");
  return getPackage("web");
}

export function addOnsFor(report: AuditReport): RadarPackage[] {
  const failed = new Set(report.checks.filter((c) => c.status === "fail").map((c) => c.id));
  const addOns: RadarPackage[] = [];
  if (failed.has("conv_whatsapp")) addOns.push(getPackage("whatsapp"));
  if (failed.has("conv_booking")) addOns.push(getPackage("citas"));
  if (failed.has("on_schema") || failed.has("on_desc")) addOns.push(getPackage("auditoria"));
  return addOns.filter((p) => p.id !== recommendPackage(report).id).slice(0, 2);
}

export function formatCop(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}
