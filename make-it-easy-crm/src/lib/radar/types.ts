export type WebsiteKind = "own" | "social" | "directory" | "none";
export type RadarSource = "osm" | "google";

export interface ScoreBreakdown {
  label: string;
  points: number;
}

export interface RadarBusiness {
  /** Identificador estable: "osm:node/123" o "google:<placeId>" */
  id: string;
  source: RadarSource;
  provider?: 'photon' | 'overpass';
  name: string;
  category: string;
  address: string;
  phone: string;
  website: string;
  websiteKind: WebsiteKind;
  lat: number | null;
  lng: number | null;
  mapsUrl: string;
  /** Solo Google */
  rating: number | null;
  reviews: number | null;
  /** Etiquetas relevantes de OSM */
  tags: Record<string, string>;
  score: number;
  breakdown: ScoreBreakdown[];
  /** Marcas que añade el servidor al buscar (no vienen de OSM) */
  isNew?: boolean;
  saved?: boolean;
  audited?: boolean;
}

export interface RadarZone {
  displayName: string;
  lat: number;
  lng: number;
  bbox: [number, number, number, number]; // south, west, north, east
  /** Contorno real del municipio/barrio: [polígono][anillo][punto][lng, lat] */
  polygons?: number[][][][];
}

export interface RadarFilters {
  onlyNoWebsite: boolean;
  onlyWithPhone: boolean;
  hideClosed: boolean;
  minRating: number | null;
  minReviews: number | null;
}

export interface RadarUsage {
  used: number;
  exhaustiveUsed: number;
  limits: { dailySearches: number; dailyExhaustive: number; maxResults: number };
  resetsAt: string;
  timezone: string;
}

export interface RadarSearchResult {
  zone: RadarZone;
  businesses: RadarBusiness[];
  source: RadarSource;
  provider?: 'photon' | 'overpass';
  total: number;
  newCount?: number;
  savedCount?: number;
  warnings: string[];
  cached: boolean;
  usage?: RadarUsage;
}

export type RadarLeadStatus =
  | "NUEVO"
  | "ANALIZADO"
  | "CONTACTADO"
  | "RESPONDIO"
  | "REUNION"
  | "CLIENTE"
  | "DESCARTADO";

export interface RadarLead {
  businessId: string;
  status: RadarLeadStatus;
  notes: string;
  nextActionAt: string | null;
  createdAt: string;
  updatedAt: string;
  business: RadarBusiness;
}
