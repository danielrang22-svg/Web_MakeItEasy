export type WebsiteKind = "own" | "social" | "directory" | "none";
export type RadarSource = "osm" | "google";

export type SiteQuality = "broken" | "bad" | "weak" | "good" | "unknown";
export type SiteSignalStatus = "pass" | "warn" | "fail" | "na";
export type EmailStatus = "verified" | "risky" | "invalid";
export type WhatsAppKind = "none" | "manual" | "widget" | "automation" | "unknown";
export type WhatsAppConfidence = "high" | "medium" | "low";
export type WhatsAppVerification = "bot" | "humano" | "desconocido" | "";

export interface WhatsAppDetection {
  kind: WhatsAppKind;
  provider: string | null;
  webChatProvider: string | null;
  confidence: WhatsAppConfidence;
  evidence: string[];
  number: string;
  hasLink: boolean;
  hasBusinessApi: boolean;
}

export interface SiteSignal {
  id: string;
  label: string;
  status: SiteSignalStatus;
  points: number;
  max: number;
  evidence: string;
}

export interface EmailCheck {
  email: string;
  status: EmailStatus;
  reason: string;
}

export interface SiteScan {
  url: string;
  finalUrl: string | null;
  status: number | null;
  ms: number;
  bytes: number;
  quality: SiteQuality;
  grade: number;
  signals: SiteSignal[];
  emails: string[];
  phones: string[];
  socials: string[];
  contactName: string | null;
  contactRole: string | null;
  emailChecks: EmailCheck[];
  whatsapp?: WhatsAppDetection;
  freeHosting: boolean;
  placeholder: boolean;
  error?: string;
  scannedAt: string;
}

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
  /** Salud de la web y contacto enriquecido (Fase Radar 2.0) */
  siteQuality?: SiteQuality;
  siteGrade?: number;
  siteCheckedAt?: string;
  siteSignals?: SiteSignal[];
  email?: string;
  emailStatus?: EmailStatus;
  contactName?: string;
  contactRole?: string;
  enrichedAt?: string;
  whatsappKind?: WhatsAppKind;
  whatsappProvider?: string;
  whatsappConfidence?: WhatsAppConfidence;
  whatsappEvidence?: string[];
  whatsappNumber?: string;
  whatsappCheckedAt?: string;
}

export interface RadarZone {
  displayName: string;
  lat: number;
  lng: number;
  bbox: [number, number, number, number]; // south, west, north, east
  /** Contorno real del municipio/barrio: [polígono][anillo][punto][lng, lat] */
  polygons?: number[][][][];
  /** Aviso cuando la zona se interpretó como punto y se amplió a un radio */
  note?: string;
  /** Si existe, la búsqueda se limita a este radio (km) desde lat/lng */
  radiusKm?: number;
}

export type ZoneSuggestionKind = "area" | "poi" | "address";

export interface ZoneSuggestion {
  id: string;
  label: string;
  displayName: string;
  type: string;
  kind: ZoneSuggestionKind;
  lat: number;
  lon: number;
  bbox: [number, number, number, number]; // south, west, north, east
}

export interface ZoneSelection {
  displayName: string;
  label?: string;
  lat: number;
  lng: number;
  bbox: [number, number, number, number]; // south, west, north, east
}

export interface RadarFilters {
  onlyNoWebsite: boolean;
  onlyWithPhone: boolean;
  hideClosed: boolean;
  minRating: number | null;
  minReviews: number | null;
  objective?: "sin_web" | "web_deficiente" | "ambos";
  maxSiteGrade?: number | null;
  requireEmail?: boolean;
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
  siteScannedCount?: number;
  siteDeficientCount?: number;
  whatsappScannedCount?: number;
  whatsappAutomationCount?: number;
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
  whatsappVerified?: WhatsAppVerification;
  whatsappNotes?: string;
  createdAt: string;
  updatedAt: string;
  business: RadarBusiness;
}
