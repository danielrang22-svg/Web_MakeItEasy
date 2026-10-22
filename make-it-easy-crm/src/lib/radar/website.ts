import type { WebsiteKind } from "./types";

const SOCIAL_HOSTS = [
  "facebook.com",
  "fb.com",
  "instagram.com",
  "tiktok.com",
  "twitter.com",
  "x.com",
  "linkedin.com",
  "youtube.com",
  "wa.me",
  "api.whatsapp.com",
  "t.me",
  "linktr.ee",
  "linkin.bio",
  "beacons.ai",
  "bio.link",
];

const DIRECTORY_HOSTS = [
  "paginasamarillas.es",
  "paginasamarillas.com",
  "yelp.",
  "tripadvisor.",
  "doctoralia.",
  "booksy.com",
  "treatwell.",
  "fresha.com",
  "habitissimo.",
  "milanuncios.com",
  "wallapop.com",
  "google.com/maps",
  "maps.google.",
  "goo.gl/maps",
  "waze.com",
  "idealista.com",
  "fotocasa.es",
  "infoisinfo.",
  "axesor.es",
  "empresite.eleconomista.es",
  "einforma.",
  "cylex.",
];

const FREE_SUBDOMAINS = [
  "wixsite.com",
  "blogspot.com",
  "wordpress.com",
  "myshopify.com",
  "webnode.",
  "jimdo.com",
  "weebly.com",
  "godaddysites.com",
  "square.site",
  "sites.google.com",
  "github.io",
  "netlify.app",
  "vercel.app",
];

export function hostOf(url: string): string {
  try {
    const raw = url.trim().startsWith("http") ? url.trim() : `https://${url.trim()}`;
    return new URL(raw).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  return `https://${trimmed}`;
}

export function classifyWebsite(url: string | null | undefined): WebsiteKind {
  const raw = (url || "").trim();
  if (!raw) return "none";

  const host = hostOf(raw);
  if (!host) return "none";

  if (SOCIAL_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return "social";
  if (DIRECTORY_HOSTS.some((h) => host.includes(h))) return "directory";
  if (FREE_SUBDOMAINS.some((h) => host === h || host.endsWith(`.${h}`) || host.includes(h))) {
    // Un WordPress/Blogspot propio sigue siendo web, pero limitada: lo tratamos como web propia.
    return "own";
  }
  return "own";
}

export function websiteLabel(kind: WebsiteKind): string {
  switch (kind) {
    case "own":
      return "Web propia";
    case "social":
      return "Solo red social";
    case "directory":
      return "Solo directorio";
    default:
      return "Sin web propia";
  }
}

export function isOwnWebsite(kind: WebsiteKind): boolean {
  return kind === "own";
}
