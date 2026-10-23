import { classifyWebsite, normalizeUrl } from "./website";
import { scoreFromOsm } from "./score";
import type { RadarBusiness, RadarZone } from "./types";
import { findCategory, RADAR_CATEGORIES } from "./categories";

const UA = "MakeItEasy-Radar/1.0 (contacto: daniel.makeiteasy@gmail.com)";
const NOMINATIM = "https://nominatim.openstreetmap.org";
const PHOTON = "https://photon.komoot.io/api/";
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

const zoneCache = new Map<string, { at: number; zone: RadarZone }>();
const searchCache = new Map<string, { at: number; data: RadarBusiness[]; provider: RadarProvider }>();
const inFlight = new Map<string, Promise<SearchOutcome>>();

let nominatimChain: Promise<unknown> = Promise.resolve();
let lastNominatimAt = 0;

/** Nominatim exige 1 petición por segundo: serializamos y espaciamos. */
function nominatimFetch(url: string): Promise<Response> {
  const run = async () => {
    const wait = Math.max(0, 1100 - (Date.now() - lastNominatimAt));
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastNominatimAt = Date.now();
    return fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
  };
  const next = nominatimChain.then(run, run);
  nominatimChain = next.catch(() => undefined);
  return next;
}

const ZONE_TTL = 1000 * 60 * 60 * 24 * 30;
const SEARCH_TTL = 1000 * 60 * 60 * 6;

export type RadarProvider = "photon" | "overpass";

export interface SearchOutcome {
  zone: RadarZone;
  businesses: RadarBusiness[];
  cached: boolean;
  provider: RadarProvider;
}

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

  const url = `${NOMINATIM}/search?format=jsonv2&limit=1&countrycodes=es&polygon_geojson=1&q=${encodeURIComponent(zona)}`;
  const res = await nominatimFetch(url);

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
    geojson?: { type?: string; coordinates?: unknown };
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
    polygons: extractPolygons(first.geojson),
  };

  zoneCache.set(key, { at: Date.now(), zone });
  return zone;
}

/* ────────────────────────── Photon (rápido) ────────────────────────── */

interface PhotonFeature {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    osm_type?: string;
    osm_id?: number;
    name?: string;
    street?: string;
    housenumber?: string;
    postcode?: string;
    city?: string;
    district?: string;
    osm_key?: string;
    osm_value?: string;
  };
}

async function photonRequest(
  q: string,
  zone: RadarZone,
  tag?: string
): Promise<PhotonFeature[]> {
  const params = new URLSearchParams({
    q,
    lat: String(zone.lat),
    lon: String(zone.lng),
    limit: "50",
  });
  if (tag) params.set("osm_tag", tag);

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(`${PHOTON}?${params.toString()}`, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      signal: AbortSignal.timeout(12000),
    });

    if (res.status === 429 || res.status === 503) {
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }
      throw new RadarUpstreamError("El buscador rápido está limitando peticiones.", 429);
    }

    if (!res.ok) {
      throw new RadarUpstreamError(`Photon ${res.status}: ${await safeText(res)}`, res.status);
    }

    const json = (await res.json()) as { features?: PhotonFeature[] };
    return json.features ?? [];
  }

  return [];
}

/* ─────────────────── Nominatim lookup (detalles) ─────────────────── */

interface LookupItem {
  osm_type?: string;
  osm_id?: number;
  name?: string;
  display_name?: string;
  lat?: string;
  lon?: string;
  category?: string;
  type?: string;
  address?: Record<string, string>;
  extratags?: Record<string, string>;
}

async function lookupDetails(ids: string[]): Promise<LookupItem[]> {
  if (ids.length === 0) return [];

  const out: LookupItem[] = [];
  for (let i = 0; i < ids.length; i += 40) {
    const batch = ids.slice(i, i + 40);
    const url = `${NOMINATIM}/lookup?osm_ids=${batch.join(",")}&format=jsonv2&extratags=1&addressdetails=1`;
    const res = await nominatimFetch(url);
    if (!res.ok) continue;
    const list = (await res.json()) as LookupItem[];
    out.push(...list);
  }
  return out;
}

/** Nominatim responde "node"/"way"/"relation"; Photon usa "N"/"W"/"R". */
function normalizeOsmType(type: string | undefined): string {
  switch ((type || "").toLowerCase()) {
    case "node":
    case "n":
      return "N";
    case "way":
    case "w":
      return "W";
    case "relation":
    case "r":
      return "R";
    default:
      return "";
  }
}

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function extractPolygons(geojson: { type?: string; coordinates?: unknown } | undefined): number[][][][] | undefined {
  if (!geojson?.coordinates) return undefined;
  if (geojson.type === "Polygon") return [geojson.coordinates as number[][][]];
  if (geojson.type === "MultiPolygon") return geojson.coordinates as number[][][][];
  return undefined;
}

function pointInRing(lng: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersects = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointInPolygon(lng: number, lat: number, rings: number[][][]): boolean {
  if (!rings.length || !pointInRing(lng, lat, rings[0])) return false;
  // Los anillos interiores son huecos
  for (let i = 1; i < rings.length; i++) {
    if (pointInRing(lng, lat, rings[i])) return false;
  }
  return true;
}

function isInsideZone(zone: RadarZone, lat: number, lng: number): boolean {
  if (zone.polygons?.length) {
    return zone.polygons.some((rings) => pointInPolygon(lng, lat, rings));
  }
  const [s, w, n, e] = zone.bbox;
  return lat >= s && lat <= n && lng >= w && lng <= e;
}

const EXTRA_QUERIES: Record<string, string[]> = {
  gestorias: ["asesoría", "asesoria"],
  reformas: ["reforma"],
  academias: ["academia"],
  inmobiliarias: ["inmobiliaria", "agencia inmobiliaria"],
  estetica: ["centro de estética", "estética"],
  fisios: ["fisioterapeuta"],
};

async function searchPhoton(
  zone: RadarZone,
  nicho: string,
  keyword: string
): Promise<RadarBusiness[]> {
  const category = findCategory(nicho);
  const tags = category?.osm ?? [];
  const baseQuery = keyword || category?.photonQuery || category?.label || nicho;
  const queries = [baseQuery, ...(keyword ? [] : EXTRA_QUERIES[nicho] ?? [])].slice(0, 2);

  const combos: Array<{ q: string; tag?: string }> = [];
  for (const q of queries) {
    if (tags.length === 0) combos.push({ q });
    else for (const [k, v] of tags) combos.push({ q, tag: `${k}:${v}` });
  }

  const features: PhotonFeature[] = [];
  let anyOk = false;

  // En serie y espaciadas: Photon limita las ráfagas en paralelo.
  for (let i = 0; i < Math.min(combos.length, 4); i++) {
    try {
      const found = await photonRequest(combos[i].q, zone, combos[i].tag);
      anyOk = true;
      features.push(...found);
    } catch {
      // seguimos con la siguiente combinación
    }
    if (i < Math.min(combos.length, 4) - 1) await new Promise((r) => setTimeout(r, 350));
  }

  if (!anyOk) throw new RadarUpstreamError("No se pudo consultar el buscador de OpenStreetMap.");

  // Deduplicar por osm id y limitar al contorno real de la zona
  const unique = new Map<string, PhotonFeature>();
  for (const f of features) {
    const props = f.properties ?? {};
    if (!props.osm_type || !props.osm_id) continue;

    const coords = f.geometry?.coordinates;
    if (coords && !isInsideZone(zone, coords[1], coords[0])) continue;

    const key = `${normalizeOsmType(props.osm_type)}${props.osm_id}`;
    if (!unique.has(key)) unique.set(key, f);
  }

  const ids = [...unique.keys()];
  const details = await lookupDetails(ids);
  const detailByKey = new Map<string, LookupItem>();
  for (const d of details) {
    const key = `${normalizeOsmType(d.osm_type)}${d.osm_id}`;
    if (key.length > 1) detailByKey.set(key, d);
  }

  const categoryLabel = category?.label ?? (keyword || "Búsqueda libre");
  const businesses: RadarBusiness[] = [];

  for (const [key, feature] of unique) {
    const props = feature.properties ?? {};
    const detail = detailByKey.get(key);
    const extra = detail?.extratags ?? {};
    const addr = detail?.address ?? {};

    const name = (detail?.name || props.name || extra.name || "").trim();
    const phone = (extra.phone || extra["contact:phone"] || "").split(";")[0].trim();
    const rawWebsite = extra.website || extra["contact:website"] || extra.url || "";
    const website = rawWebsite ? normalizeUrl(rawWebsite) : "";
    const websiteKind = classifyWebsite(website);

    const street = addr.road || props.street || "";
    const number = addr.house_number || props.housenumber || "";
    const postcode = addr.postcode || props.postcode || "";
    const city = addr.city || addr.town || addr.village || props.city || "";
    const address = [
      [street, number].filter(Boolean).join(", "),
      [postcode, city].filter(Boolean).join(" "),
    ]
      .filter(Boolean)
      .join(" · ");

    const lat = detail?.lat ? Number(detail.lat) : feature.geometry?.coordinates?.[1] ?? null;
    const lng = detail?.lon ? Number(detail.lon) : feature.geometry?.coordinates?.[0] ?? null;

    const { score, breakdown } = scoreFromOsm({
      name,
      websiteKind,
      phone,
      street: street || undefined,
      housenumber: number || undefined,
      openingHours: extra.opening_hours,
      brand: extra.brand,
    });

    businesses.push({
      id: `osm:${props.osm_type}/${props.osm_id}`,
      source: "osm",
      name: name || "(sin nombre)",
      category: categoryLabel,
      address,
      phone,
      website,
      websiteKind,
      lat,
      lng,
      mapsUrl:
        lat != null && lng != null
          ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=19/${lat}/${lng}`
          : `https://www.openstreetmap.org/${props.osm_type}/${props.osm_id}`,
      rating: null,
      reviews: null,
      tags: { ...extra, ...(detail?.category ? { osm_category: detail.category } : {}) },
      score,
      breakdown,
    });
  }

  return businesses;
}

/* ─────────────────── Overpass (respaldo) ─────────────────── */

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
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
  if (custom) parts.push(`nwr["name"~"${escapeRegex(custom)}",i]${box};`);

  if (parts.length === 0) {
    throw new RadarUpstreamError("Elige un nicho de la lista o escribe una palabra clave.", 400);
  }

  return `[out:json][timeout:20];\n(\n  ${parts.join("\n  ")}\n);\nout center tags 200;`;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
        signal: AbortSignal.timeout(40000),
      });

      if (!res.ok) {
        lastError = `Overpass ${res.status}`;
        continue;
      }

      const json = (await res.json()) as { elements?: OverpassElement[] };
      return json.elements ?? [];
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Error de red";
    }
  }

  throw new RadarUpstreamError(`Respaldo Overpass no disponible (${lastError.slice(0, 80)}).`, 504);
}

async function searchOverpass(
  zone: RadarZone,
  nicho: string,
  keyword: string
): Promise<RadarBusiness[]> {
  const elements = await runOverpass(buildOverpassQuery(zone.bbox, nicho, keyword));
  const categoryLabel = findCategory(nicho)?.label ?? (keyword || "Búsqueda libre");
  const businesses: RadarBusiness[] = [];

  for (const el of elements) {
    const tags = el.tags ?? {};
    if (Object.keys(tags).length === 0) continue;

    const lat = el.lat ?? el.center?.lat ?? null;
    const lng = el.lon ?? el.center?.lon ?? null;
    if (lat != null && lng != null && !isInsideZone(zone, lat, lng)) continue;
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

    businesses.push({
      id: `osm:${el.type}/${el.id}`,
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

  return businesses;
}

function buildAddress(tags: Record<string, string>): string {
  const line1 = [tags["addr:street"] || "", tags["addr:housenumber"] || ""].filter(Boolean).join(", ");
  const city = tags["addr:city"] || tags["addr:town"] || tags["addr:village"] || "";
  const line2 = [tags["addr:postcode"] || "", city].filter(Boolean).join(" ");
  return [line1, line2].filter(Boolean).join(" · ");
}

/* ───────────────────────── API pública ───────────────────────── */

export type RadarMode = "fast" | "exhaustive";

export async function searchOsm(
  zona: string,
  nicho: string,
  keyword = "",
  mode: RadarMode = "fast"
): Promise<SearchOutcome> {
  const cacheKey = `${zona}|${nicho}|${keyword}|${mode}`.toLowerCase();
  const hit = searchCache.get(cacheKey);
  if (hit && Date.now() - hit.at < SEARCH_TTL) {
    return { zone: await geocodeZone(zona), businesses: hit.data, cached: true, provider: hit.provider };
  }

  const running = inFlight.get(cacheKey);
  if (running) return running;

  const promise = (async (): Promise<SearchOutcome> => {
    const zone = await geocodeZone(zona);
    let provider: RadarProvider = "photon";
    let businesses: RadarBusiness[] = [];

    if (mode === "exhaustive") {
      provider = "overpass";
      businesses = await searchOverpass(zone, nicho, keyword);
    } else {
      try {
        businesses = await searchPhoton(zone, nicho, keyword);
      } catch {
        provider = "overpass";
        businesses = await searchOverpass(zone, nicho, keyword);
      }
    }

    businesses.sort((a, b) => b.score - a.score);
    searchCache.set(cacheKey, { at: Date.now(), data: businesses, provider });
    return { zone, businesses, cached: false, provider };
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
    return (await res.text()).slice(0, 200).replace(/\s+/g, " ");
  } catch {
    return "";
  }
}

export function listCategories() {
  return RADAR_CATEGORIES;
}
