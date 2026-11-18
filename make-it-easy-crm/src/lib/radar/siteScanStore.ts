import prisma from "@/lib/prisma";
import type {
  EmailCheck,
  SiteQuality,
  SiteScan,
  SiteSignal,
  WhatsAppDetection,
  WhatsAppKind,
} from "./types";

export { applyScanSummary as applyScanToBusiness } from "./siteQuality";

export const SITE_SCAN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

interface StoredContacts {
  emails: string[];
  phones: string[];
  socials: string[];
  contactName: string | null;
  contactRole: string | null;
}

interface ScanRow {
  radarPlaceId: string;
  url: string;
  finalUrl: string | null;
  status: number | null;
  ms: number;
  bytes: number;
  quality: string;
  grade: number;
  signalsJson: string;
  contactsJson: string;
  emailChecksJson: string;
  whatsappJson: string;
  placeholder: boolean;
  freeHosting: boolean;
  error: string | null;
  createdAt: Date;
}

const UNKNOWN_WHATSAPP: WhatsAppDetection = {
  kind: "unknown",
  provider: null,
  webChatProvider: null,
  confidence: "low",
  evidence: [],
  number: "",
  hasLink: false,
  hasBusinessApi: false,
};

const WHATSAPP_KINDS = new Set<WhatsAppKind>(["none", "manual", "widget", "automation", "unknown"]);

function toWhatsApp(value: unknown): WhatsAppDetection {
  if (!value || typeof value !== "object") return UNKNOWN_WHATSAPP;
  const record = value as Partial<WhatsAppDetection>;
  const kind = WHATSAPP_KINDS.has(record.kind as WhatsAppKind) ? (record.kind as WhatsAppKind) : "unknown";
  return {
    ...UNKNOWN_WHATSAPP,
    ...record,
    kind,
    evidence: Array.isArray(record.evidence) ? record.evidence : [],
  };
}

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function toQuality(value: string): SiteQuality {
  if (value === "broken" || value === "bad" || value === "weak" || value === "good") return value;
  return "unknown";
}

function rowToScan(row: ScanRow): SiteScan {
  const contacts = parseJson<StoredContacts>(row.contactsJson, {
    emails: [],
    phones: [],
    socials: [],
    contactName: null,
    contactRole: null,
  });
  return {
    url: row.url,
    finalUrl: row.finalUrl,
    status: row.status,
    ms: row.ms,
    bytes: row.bytes,
    quality: toQuality(row.quality),
    grade: row.grade,
    signals: parseJson<SiteSignal[]>(row.signalsJson, []),
    emails: contacts.emails,
    phones: contacts.phones,
    socials: contacts.socials,
    contactName: contacts.contactName,
    contactRole: contacts.contactRole,
    emailChecks: parseJson<EmailCheck[]>(row.emailChecksJson, []),
    whatsapp: toWhatsApp(parseJson<unknown>(row.whatsappJson, {})),
    freeHosting: row.freeHosting,
    placeholder: row.placeholder,
    error: row.error ?? undefined,
    scannedAt: row.createdAt.toISOString(),
  };
}

export interface FreshScanOptions {
  requireWhatsApp?: boolean;
}

export async function getFreshScans(
  businessIds: string[],
  ttlMs: number = SITE_SCAN_TTL_MS,
  options: FreshScanOptions = {}
): Promise<Map<string, SiteScan>> {
  if (businessIds.length === 0) return new Map();
  const rows = await prisma.radarSiteScan.findMany({
    where: { radarPlaceId: { in: businessIds }, createdAt: { gte: new Date(Date.now() - ttlMs) } },
    orderBy: { createdAt: "desc" },
    select: {
      radarPlaceId: true,
      url: true,
      finalUrl: true,
      status: true,
      ms: true,
      bytes: true,
      quality: true,
      grade: true,
      signalsJson: true,
      contactsJson: true,
      emailChecksJson: true,
      whatsappJson: true,
      placeholder: true,
      freeHosting: true,
      error: true,
      createdAt: true,
    },
  });
  const scans = new Map<string, SiteScan>();
  for (const row of rows) {
    if (scans.has(row.radarPlaceId)) continue;
    if (row.quality === "unknown") continue;
    if (options.requireWhatsApp && (!row.whatsappJson || row.whatsappJson === "{}")) continue;
    scans.set(row.radarPlaceId, rowToScan(row));
  }
  return scans;
}

export async function saveScan(businessId: string, userEmail: string, scan: SiteScan): Promise<void> {
  const contacts: StoredContacts = {
    emails: scan.emails,
    phones: scan.phones,
    socials: scan.socials,
    contactName: scan.contactName,
    contactRole: scan.contactRole,
  };
  const preferred =
    scan.emailChecks.find((check) => check.status === "verified") ??
    scan.emailChecks.find((check) => check.status === "risky") ??
    scan.emailChecks[0];
  const whatsapp = scan.whatsapp ?? UNKNOWN_WHATSAPP;
  const checkedAt = new Date(scan.scannedAt);

  await prisma.$transaction([
    prisma.radarSiteScan.create({
      data: {
        radarPlaceId: businessId,
        userEmail,
        url: scan.url.slice(0, 500),
        finalUrl: scan.finalUrl ? scan.finalUrl.slice(0, 500) : null,
        status: scan.status,
        ms: scan.ms,
        bytes: scan.bytes,
        quality: scan.quality,
        grade: scan.grade,
        signalsJson: JSON.stringify(scan.signals),
        contactsJson: JSON.stringify(contacts),
        emailChecksJson: JSON.stringify(scan.emailChecks),
        whatsappJson: JSON.stringify(whatsapp),
        placeholder: scan.placeholder,
        freeHosting: scan.freeHosting,
        error: scan.error ? scan.error.slice(0, 300) : null,
      },
    }),
    prisma.radarBusiness.updateMany({
      where: { externalId: businessId },
      data: {
        siteQuality: scan.quality,
        siteGrade: scan.grade,
        siteCheckedAt: checkedAt,
        email: preferred?.email ?? scan.emails[0] ?? "",
        emailStatus: preferred?.status ?? "",
        contactName: scan.contactName ?? "",
        contactRole: scan.contactRole ?? "",
        enrichedAt: checkedAt,
        whatsappKind: whatsapp.kind,
        whatsappProvider: whatsapp.provider ?? "",
        whatsappConfidence: whatsapp.confidence,
        whatsappEvidence: JSON.stringify(whatsapp.evidence),
        whatsappNumber: whatsapp.number,
        whatsappCheckedAt: checkedAt,
      },
    }),
  ]);
}

