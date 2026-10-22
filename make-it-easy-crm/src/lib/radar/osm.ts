import { classifyWebsite, normalizeUrl } from "./website";
import { scoreFromOsm } from "./score";
import type { RadarBusiness, RadarZone } from "./types";
import { findCategory, RADAR_CATEGORIES } from "./categories";

const UA = "MakeItEasy-Radar/1.0 (contacto: daniel.makeiteasy@gmail.com)";
const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

const zoneCache = new Map<string, { at: number; zone: RadarZone }>();
const searchCache = new Map<string, { at: number; data: RadarBusiness[] }>();
const inFlight = new Map<string, Promise<{ zone: RadarZone; businesses: RadarBusiness[]; cached: boolean }>>();

const ZONE_TTL = 1000 * 60 * 60 * 24 * 30;
const SEARCH_TTL = 1000 * 60 * 10;

export class RadarUpstreamError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.name = "RadarUpstreamError";
    this.status = status;
  }
}

export async function geocodeZone(zona: string): Promise<RadarZone> {
  const key = zona.trim().toLowerCase();
  const hit = zoneCache.get(key);
  if (hit && Date.now() - hit.at < ZONE_TTL) return hit.zone;

  const url = `${NOMINATIM}?format=jsonv2&limit=1&countrycodes=es&q=${encodeURIComponent(zona)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new RadarUpstreamError(
      `No se pudo localizar la zona (Nominatim ${res.status}). ${await safeText(res)}`,
      res.status
    );
  }

  const list = (await res.json()) as Array<{
    display_name?: string;
    lat?: string;
    lon?: string;
    boundingbox?: [string, string, string, string];
  }>;

  const first = list[0];
  if (!first?.lat || !first?.lon || !first?.boundingbox) {
    throw new RadarUpstreamError(
      `No encuentro "${zona}". Prueba con municipio, barrio o código postal.`,
      404
    );
  }

  const [s, n, w, e] = first.boundingbox.map(Number) as [number, number, number, number];
  const zone: RadarZone = {
    displayName: first.display_name ?? zona,
    lat: Number(first.lat),
    lng: Number(first.lon),
    bbox: [s, w, n, e],
  };

  zoneCache.set(key, { at: Date.now(), zone });
  return zone;
}

function buildOverpassQuery(bbox: RadarZone["bbox"], nicho: string, keyword: string): string {
  const [s, w, n, e] = bbox;
  const box = `(${s},${w},${n},${e})`;
  const parts: string[] = [];

  const category = findCategory(nicho);
  if (category) {
    for (const [k, v] of category.osm) parts.push(`nwr["${k}"="${v}"]${box};`);
  }

  const custom = keyword.trim();
  if (custom) {
    parts.push(`nwr["name"~"${escapeRegex(custom)}",i]${box};`);
  }

  if (parts.length === 0) {
    throw new RadarUpstreamError("Elige un nicho de la lista o escribe una palabra clave.", 400);
  }

  return `[out:json][timeout:25];\n(\n  ${parts.join("\n  ")}\n);\nout center tags 200;`;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

async function runOverpass(query: string): Promise<OverpassElement[]> {
  let lastError = "";

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "User-Agent": UA,
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: new URLSearchParams({ data: query }),
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        lastError = `Overpass ${res.status}: ${await safeText(res)}`;
        continue;
      }

      const json = (await res.json()) as { elements?: OverpassElement[] };
      return json.elements ?? [];
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Error de red con Overpass";
    }
  }

  throw new RadarUpstreamError(
    `OpenStreetMap está tardando más de lo normal. Reintenta en unos segundos. (${lastError.slice(0, 120)})`,
    504
  );
}

function buildAddress(tags: Record<string, string>): string {
  const street = tags["addr:street"] || "";
  const number = tags["addr:housenumber"] || "";
  const postcode = tags["addr:postcode"] || "";
  const city = tags["addr:city"] || tags["addr:town"] || tags["addr:village"] || "";
  const line1 = [street, number].filter(Boolean).join(", ");
  return [line1, [postcode, city].filter(Boolean).join(" ")].filter(Boolean).join(" · ");
}

export async function searchOsm(
  zona: string,
  nicho: string,
  keyword = ""
): Promise<{ zone: RadarZone; businesses: RadarBusiness[]; cached: boolean }> {
  const cacheKey = `${zona}|${nicho}|${keyword}`.toLowerCase();
  const hit = searchCache.get(cacheKey);
  if (hit && Date.now() - hit.at < SEARCH_TTL) {
    return { zone: await geocodeZone(zona), businesses: hit.data, cached: true };
  }

  const running = inFlight.get(cacheKey);
  if (running) return running;

  const promise = (async () => {
    const zone = await geocodeZone(zona);
    const query = buildOverpassQuery(zone.bbox, nicho, keyword);
    const elements = await runOverpass(query);

    const categoryLabel = findCategory(nicho)?.label ?? (keyword || "Búsqueda libre");
    const byId = new Map<string, RadarBusiness>();

    for (const el of elements) {
      const tags = el.tags ?? {};
      if (Object.keys(tags).length === 0) continue;

      const lat = el.lat ?? el.center?.lat ?? null;
      const lng = el.lon ?? el.center?.lon ?? null;
      const name = (tags.name || tags.brand || "").trim();
      const phone = (tags.phone || tags["contact:phone"] || "").split(";")[0].trim();
      const rawWebsite = tags.website || tags["contact:website"] || tags.url || "";
      const website = rawWebsite ? normalizeUrl(rawWebsite) : "";
      const websiteKind = classifyWebsite(website);

      const { score, breakdown } = scoreFromOsm({
        name,
        websiteKind,
        phone,
        street: tags["addr:street"],
        housenumber: tags["addr:housenumber"],
        openingHours: tags.opening_hours,
        brand: tags.brand,
      });

      const id = `osm:${el.type}/${el.id}`;
      byId.set(id, {
        id,
        source: "osm",
        name: name || "(sin nombre)",
        category: categoryLabel,
        address: buildAddress(tags),
        phone,
        website,
        websiteKind,
        lat,
        lng,
        mapsUrl:
          lat != null && lng != null
            ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=19/${lat}/${lng}`
            : `https://www.openstreetmap.org/${el.type}/${el.id}`,
        rating: null,
        reviews: null,
        tags,
        score,
        breakdown,
      });
    }

    const businesses = [...byId.values()].sort((a, b) => b.score - a.score);
    searchCache.set(cacheKey, { at: Date.now(), data: businesses });

    return { zone, businesses, cached: false };
  })();

  inFlight.set(cacheKey, promise);
  try {
    return await promise;
  } finally {
    inFlight.delete(cacheKey);
  }
}

async function safeText(res: Response): Promise<string> {
  try {
    const text = await res.text();
    return text.slice(0, 200).replace(/\s+/g, " ");
  } catch {
    return "";
  }
}

export function listCategories() {
  return RADAR_CATEGORIES;
}
