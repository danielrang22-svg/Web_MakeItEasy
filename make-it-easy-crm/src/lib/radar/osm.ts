import { classifyWebsite, normalizeUrl } from "./website";
import { scoreFromOsm } from "./score";
import type {
  RadarBusiness,
  RadarZone,
  ZoneSelection,
  ZoneSuggestion,
  ZoneSuggestionKind,
} from "./types";
import { findCategory, RADAR_CATEGORIES } from "./categories";
import { radiusLabel } from "./radius";

const UA = "MakeItEasy-Radar/1.0 (contacto: daniel.makeiteasy@gmail.com)";
const NOMINATIM = "https://nominatim.openstreetmap.org";
const PHOTON = "https://photon.komoot.io/api/";
const COUNTRY = (process.env.RADAR_COUNTRY || "co").trim().toLowerCase();
const ZONE_RADIUS_KM = Number(process.env.RADAR_ZONE_RADIUS_KM ?? 2.5);
const ZONE_MIN_AREA_KM2 = Number(process.env.RADAR_ZONE_MIN_AREA_KM2 ?? 0.3);
const FAST_FALLBACK_MIN = Number(process.env.RADAR_FAST_FALLBACK_MIN ?? 3);
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

const zoneCache = new Map<string, { at: number; zone: RadarZone }>();
const searchCache = new Map<string, { at: number; data: RadarBusiness[]; provider: RadarProvider; note?: string }>();
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
  note?: string;
}

export class RadarUpstreamError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.name = "RadarUpstreamError";
    this.status = status;
  }
}

export interface NominatimZoneResult {
  display_name?: string;
  lat?: string;
  lon?: string;
  boundingbox?: [string, string, string, string];
  geojson?: { type?: string; coordinates?: unknown };
  class?: string;
  type?: string;
  addresstype?: string;
  osm_type?: string;
  osm_id?: number;
  name?: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    suburb?: string;
    neighbourhood?: string;
    city_district?: string;
  };
}

const AREA_TYPES = new Set([
  "administrative",
  "boundary",
  "city",
  "town",
  "village",
  "municipality",
  "hamlet",
  "suburb",
  "neighbourhood",
  "neighborhood",
  "quarter",
  "city_district",
  "borough",
  "locality",
  "residential",
]);

const POI_TYPES = new Set([
  "bus_station",
  "bus_stop",
  "mall",
  "shop",
  "building",
  "house",
  "apartments",
  "commercial",
  "amenity",
]);

export function zonePriority(item: NominatimZoneResult): number {
  const type = (item.type || "").toLowerCase();
  const addresstype = (item.addresstype || "").toLowerCase();
  const cls = (item.class || "").toLowerCase();
  if (cls === "boundary" || AREA_TYPES.has(type) || AREA_TYPES.has(addresstype)) return 0;
  if (POI_TYPES.has(type) || POI_TYPES.has(addresstype)) return 5;
  return 3;
}

export function bboxAreaKm2(bbox: [number, number, number, number]): number {
  const [s, w, n, e] = bbox;
  const midLat = (((s + n) / 2) * Math.PI) / 180;
  const height = Math.abs(n - s) * 111.32;
  const width = Math.abs(e - w) * 111.32 * Math.cos(midLat);
  return height * width;
}

function nominatimArea(box: string[] | undefined): number {
  if (!box || box.length < 4) return 0;
  const [s, n, w, e] = box.map(Number) as [number, number, number, number];
  return bboxAreaKm2([s, w, n, e]);
}

export function pickZoneResult(list: NominatimZoneResult[]): NominatimZoneResult | undefined {
  const valid = list.filter((item) => item.lat && item.lon && item.boundingbox);
  return [...valid].sort((a, b) => {
    const priority = zonePriority(a) - zonePriority(b);
    if (priority !== 0) return priority;
    return nominatimArea(b.boundingbox) - nominatimArea(a.boundingbox);
  })[0];
}

export function zoneWithRadius(
  zone: RadarZone,
  label: string,
  radiusKm: number,
  note?: string
): RadarZone {
  const latDelta = radiusKm / 111.32;
  const lngDelta = radiusKm / (111.32 * Math.cos((zone.lat * Math.PI) / 180));
  return {
    ...zone,
    displayName: `${label.trim()} · radio ${radiusLabel(radiusKm)}`,
    bbox: [zone.lat - latDelta, zone.lng - lngDelta, zone.lat + latDelta, zone.lng + lngDelta],
    polygons: undefined,
    radiusKm,
    note: note ?? `Se buscó en un radio de ${radiusLabel(radiusKm)} desde el centro de la zona.`,
  };
}

export function expandTinyZone(zone: RadarZone, label: string, radiusKm?: number): RadarZone {
  if (radiusKm != null) return zoneWithRadius(zone, label, radiusKm);

  const [s, w, n, e] = zone.bbox;
  const area = bboxAreaKm2(zone.bbox);
  const spans = Math.max(Math.abs(n - s), Math.abs(e - w));
  if (area >= ZONE_MIN_AREA_KM2 && spans >= 0.01) return zone;

  return zoneWithRadius(
    zone,
    label,
    ZONE_RADIUS_KM,
    `"${label.trim()}" no tiene un polígono de barrio en OpenStreetMap; se buscó en un radio de ${radiusLabel(ZONE_RADIUS_KM)}.`
  );
}

export function needsOverpassFallback(count: number): boolean {
  return count < FAST_FALLBACK_MIN;
}

const zoneSuggestCache = new Map<string, { at: number; data: ZoneSuggestion[] }>();
const ZONE_SUGGEST_TTL = 10 * 60 * 1000;

function suggestionKind(item: NominatimZoneResult): ZoneSuggestionKind {
  const priority = zonePriority(item);
  if (priority <= 1) return "area";
  if (priority >= 5) return "poi";
  return "address";
}

function shortZoneLabel(item: NominatimZoneResult): string {
  const name = (item.name || item.display_name?.split(",")[0] || "").trim();
  if (!name) return item.display_name ?? "";
  const address = item.address ?? {};
  const locality = address.suburb || address.neighbourhood || address.city_district || "";
  const city = address.city || address.town || address.village || address.municipality || "";
  const parts = [locality, city].filter(Boolean).filter((value, index, values) => values.indexOf(value) === index);
  if (name.toLowerCase() === city.toLowerCase()) return name;
  return parts.length ? `${name} · ${parts.join(", ")}` : name;
}

export function mapZoneSuggestions(list: NominatimZoneResult[]): ZoneSuggestion[] {
  const unique = new Map<string, ZoneSuggestion>();
  for (const item of list) {
    if (!item.lat || !item.lon || !item.display_name) continue;
    const id = item.osm_type && item.osm_id ? `${item.osm_type}:${item.osm_id}` : item.display_name;
    if (unique.has(id)) continue;
    const [s, n, w, e] = (item.boundingbox ?? []).map(Number) as [number, number, number, number];
    const bbox: [number, number, number, number] = [s, w, n, e].every((value) => Number.isFinite(value))
      ? [s, w, n, e]
      : [Number(item.lat) - 0.02, Number(item.lon) - 0.02, Number(item.lat) + 0.02, Number(item.lon) + 0.02];
    unique.set(id, {
      id,
      label: shortZoneLabel(item),
      displayName: item.display_name,
      type: item.type || item.addresstype || "lugar",
      kind: suggestionKind(item),
      lat: Number(item.lat),
      lon: Number(item.lon),
      bbox,
    });
    if (unique.size >= 8) break;
  }
  const order: Record<ZoneSuggestionKind, number> = { area: 0, address: 1, poi: 2 };
  return [...unique.values()].sort((a, b) => order[a.kind] - order[b.kind]).slice(0, 6);
}

export async function suggestZones(query: string): Promise<ZoneSuggestion[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const key = q.toLowerCase();
  const hit = zoneSuggestCache.get(key);
  if (hit && Date.now() - hit.at < ZONE_SUGGEST_TTL) return hit.data;

  const url = `${NOMINATIM}/search?format=jsonv2&limit=8&countrycodes=${COUNTRY}&addressdetails=1&namedetails=1&q=${encodeURIComponent(q)}`;
  const res = await nominatimFetch(url);
  if (!res.ok) {
    throw new RadarUpstreamError(`No se pudo buscar la zona (Nominatim ${res.status}).`, res.status);
  }
  const list = (await res.json()) as NominatimZoneResult[];
  const data = mapZoneSuggestions(list);
  zoneSuggestCache.set(key, { at: Date.now(), data });
  return data;
}

export function zoneFromSelection(selection: ZoneSelection, radiusKm?: number): RadarZone {
  const base: RadarZone = {
    displayName: selection.displayName,
    lat: selection.lat,
    lng: selection.lng,
    bbox: selection.bbox,
    polygons: undefined,
  };
  const label = selection.label || selection.displayName;
  return radiusKm != null ? zoneWithRadius(base, label, radiusKm) : expandTinyZone(base, label);
}

export async function geocodeZone(zona: string, radiusKm?: number): Promise<RadarZone> {
  const key = zona.trim().toLowerCase();
  const hit = zoneCache.get(key);
  let base: RadarZone | null = hit && Date.now() - hit.at < ZONE_TTL ? hit.zone : null;

  if (!base) {
    const url = `${NOMINATIM}/search?format=jsonv2&limit=10&countrycodes=${COUNTRY}&polygon_geojson=1&q=${encodeURIComponent(zona)}`;
    const res = await nominatimFetch(url);

    if (!res.ok) {
      throw new RadarUpstreamError(
        `No se pudo localizar la zona (Nominatim ${res.status}). ${await safeText(res)}`,
        res.status
      );
    }

    const list = (await res.json()) as NominatimZoneResult[];

    const first = pickZoneResult(list);
    if (!first?.lat || !first?.lon || !first?.boundingbox) {
      throw new RadarUpstreamError(
        `No encuentro "${zona}". Prueba con municipio, barrio o código postal.`,
        404
      );
    }

    const [s, n, w, e] = first.boundingbox.map(Number) as [number, number, number, number];
    base = {
      displayName: first.display_name ?? zona,
      lat: Number(first.lat),
      lng: Number(first.lon),
      bbox: [s, w, n, e],
      polygons: extractPolygons(first.geojson),
    };
    zoneCache.set(key, { at: Date.now(), zone: base });
  }

  return radiusKm != null ? zoneWithRadius(base, zona, radiusKm) : expandTinyZone(base, zona);
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

export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const earthKm = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * earthKm * Math.asin(Math.sqrt(a));
}

function isInsideZone(zone: RadarZone, lat: number, lng: number): boolean {
  if (zone.radiusKm != null) {
    return distanceKm(zone.lat, zone.lng, lat, lng) <= zone.radiusKm;
  }
  if (zone.polygons?.length) {
    return zone.polygons.some((rings) => pointInPolygon(lng, lat, rings));
  }
  const [s, w, n, e] = zone.bbox;
  return lat >= s && lat <= n && lng >= w && lng <= e;
}

const EXTRA_QUERIES: Record<string, string[]> = {
  gimnasios: ["gym", "fitness", "bodytech", "crossfit"],
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
  const queries = [baseQuery, ...(keyword ? [] : EXTRA_QUERIES[nicho] ?? [])].slice(0, 4);

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

export function buildOverpassQuery(zone: RadarZone, nicho: string, keyword: string): string {
  const [s, w, n, e] = zone.bbox;
  const box =
    zone.radiusKm != null
      ? `(around:${Math.round(zone.radiusKm * 1000)},${zone.lat},${zone.lng})`
      : `(${s},${w},${n},${e})`;
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
  const elements = await runOverpass(buildOverpassQuery(zone, nicho, keyword));
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
  mode: RadarMode = "fast",
  zoneOverride?: RadarZone,
  radiusKm?: number
): Promise<SearchOutcome> {
  const cacheKey = `${zona}|${zoneOverride ? zoneOverride.bbox.join(",") : ""}|${radiusKm ?? ""}|${nicho}|${keyword}|${mode}`.toLowerCase();
  const hit = searchCache.get(cacheKey);
  if (hit && Date.now() - hit.at < SEARCH_TTL) {
    return {
      zone: zoneOverride ?? (await geocodeZone(zona, radiusKm)),
      businesses: hit.data,
      cached: true,
      provider: hit.provider,
      note: hit.note,
    };
  }

  const running = inFlight.get(cacheKey);
  if (running) return running;

  const promise = (async (): Promise<SearchOutcome> => {
    const zone = zoneOverride ?? (await geocodeZone(zona, radiusKm));
    let provider: RadarProvider = "photon";
    let businesses: RadarBusiness[] = [];
    let note: string | undefined;

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

      if (provider === "photon" && businesses.length > 0 && businesses.length < 10) {
        note = `Photon encontró ${businesses.length}; prueba «Búsqueda exhaustiva» para ver todos los de OpenStreetMap.`;
      }

      if (provider === "photon" && needsOverpassFallback(businesses.length)) {
        try {
          const fallback = await searchOverpass(zone, nicho, keyword);
          if (fallback.length > businesses.length) {
            businesses = fallback;
            provider = "overpass";
            note = "Photon devolvió pocos resultados; se completó con Overpass.";
          }
        } catch {
          note = note
            ? `${note} Overpass no está disponible ahora.`
            : "Overpass no está disponible ahora; se muestran los resultados de Photon.";
        }
      }
    }

    if (zone.note) note = note ? `${zone.note} ${note}` : zone.note;

    businesses.sort((a, b) => b.score - a.score);
    searchCache.set(cacheKey, { at: Date.now(), data: businesses, provider, note });
    return { zone, businesses, cached: false, provider, note };
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
