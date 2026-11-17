import { scoreFromOsm } from "./score";
import type { EmailStatus, RadarBusiness, SiteQuality, SiteScan } from "./types";

export function isDeficientQuality(quality: SiteQuality | undefined | null): boolean {
  return quality === "bad" || quality === "broken" || quality === "weak";
}

export function qualityLabel(quality: SiteQuality | undefined | null, grade?: number | null): string {
  switch (quality) {
    case "broken":
      return "Rota";
    case "bad":
      return grade == null ? "Mala" : `Mala ${grade}`;
    case "weak":
      return grade == null ? "Mejorable" : `Mejorable ${grade}`;
    case "good":
      return grade == null ? "Buena" : `Buena ${grade}`;
    default:
      return "Sin analizar";
  }
}

export function qualityTone(quality: SiteQuality | undefined | null): "high" | "mid" | "low" | "neutral" {
  if (quality === "good") return "high";
  if (quality === "weak") return "mid";
  if (quality === "bad" || quality === "broken") return "low";
  return "neutral";
}

export function qualityClasses(quality: SiteQuality | undefined | null): string {
  switch (qualityTone(quality)) {
    case "high":
      return "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30";
    case "mid":
      return "bg-amber-500/15 text-amber-300 ring-amber-500/30";
    case "low":
      return "bg-red-500/15 text-red-400 ring-red-500/30";
    default:
      return "bg-muted text-muted-foreground ring-border";
  }
}

function toEmailStatus(value: string): EmailStatus | undefined {
  if (value === "verified" || value === "risky" || value === "invalid") return value;
  return undefined;
}

export function applyScanSummary(business: RadarBusiness, scan: SiteScan | null | undefined): RadarBusiness {
  if (!scan) return business;
  const tags = business.tags ?? {};
  const preferred =
    scan.emailChecks.find((check) => check.status === "verified") ??
    scan.emailChecks.find((check) => check.status === "risky") ??
    scan.emailChecks[0];
  const { score, breakdown } = scoreFromOsm({
    name: business.name,
    websiteKind: business.websiteKind,
    phone: business.phone,
    street: tags["addr:street"] || tags.street,
    housenumber: tags["addr:housenumber"] || tags.housenumber,
    openingHours: tags.opening_hours,
    brand: tags.brand,
    siteQuality: scan.quality,
  });

  return {
    ...business,
    score,
    breakdown,
    siteQuality: scan.quality,
    siteGrade: scan.grade,
    siteCheckedAt: scan.scannedAt,
    siteSignals: scan.signals,
    email: preferred?.email ?? scan.emails[0] ?? business.email,
    emailStatus: preferred ? toEmailStatus(preferred.status) : business.emailStatus,
    contactName: scan.contactName ?? business.contactName,
    contactRole: scan.contactRole ?? business.contactRole,
    enrichedAt: scan.scannedAt,
  };
}
