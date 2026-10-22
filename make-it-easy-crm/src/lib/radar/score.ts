import type { RadarBusiness, ScoreBreakdown } from "./types";

/**
 * Puntuación provisional con datos de OpenStreetMap (sin reseñas).
 * Todo es explicable: cada punto aparece en el desglose.
 */
export function scoreFromOsm(input: {
  name: string;
  websiteKind: RadarBusiness["websiteKind"];
  phone: string;
  street?: string;
  housenumber?: string;
  openingHours?: string;
  brand?: string;
}): { score: number; breakdown: ScoreBreakdown[] } {
  const breakdown: ScoreBreakdown[] = [];
  let score = 45;
  breakdown.push({ label: "Base", points: 45 });

  switch (input.websiteKind) {
    case "none":
      score += 30;
      breakdown.push({ label: "Sin web registrada (verificar)", points: 30 });
      break;
    case "social":
      score += 20;
      breakdown.push({ label: "Solo red social (sin web)", points: 20 });
      break;
    case "directory":
      score += 18;
      breakdown.push({ label: "Solo ficha de directorio", points: 18 });
      break;
    default:
      score -= 5;
      breakdown.push({ label: "Ya tiene web propia", points: -5 });
  }

  if (input.phone) {
    score += 8;
    breakdown.push({ label: "Teléfono publicado", points: 8 });
  } else {
    score -= 4;
    breakdown.push({ label: "Sin teléfono", points: -4 });
  }

  if (input.street && input.housenumber) {
    score += 7;
    breakdown.push({ label: "Dirección completa", points: 7 });
  } else if (input.street) {
    score += 3;
    breakdown.push({ label: "Calle sin número", points: 3 });
  }

  if (input.openingHours) {
    score += 5;
    breakdown.push({ label: "Horario publicado", points: 5 });
  }

  if (input.brand) {
    score -= 10;
    breakdown.push({ label: "Cadena o franquicia", points: -10 });
  }

  if (!input.name || input.name.trim().length < 3) {
    score -= 15;
    breakdown.push({ label: "Ficha sin nombre", points: -15 });
  }

  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  return { score: clamped, breakdown };
}

export function scoreTone(score: number): "high" | "mid" | "low" {
  if (score >= 75) return "high";
  if (score >= 50) return "mid";
  return "low";
}

export function scoreClasses(score: number): string {
  const tone = scoreTone(score);
  if (tone === "high") return "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30";
  if (tone === "mid") return "bg-amber-500/15 text-amber-300 ring-amber-500/30";
  return "bg-red-500/15 text-red-400 ring-red-500/30";
}
