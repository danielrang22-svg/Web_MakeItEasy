import { load } from "cheerio";
import { assertPublicUrl, fetchText } from "./audit/fetch";
import { extractContacts, mergeContacts, verifyEmails, type ContactInfo } from "./contacts";
import type { EmailCheck, SiteQuality, SiteScan, SiteSignal } from "./types";
import { isFreeHosting, normalizeUrl } from "./website";

export interface SiteFacts {
  ok: boolean;
  status: number | null;
  finalUrl: string;
  ms: number;
  bytes: number;
  isHtml: boolean;
  title: string;
  description: string;
  h1Count: number;
  hasViewport: boolean;
  hasForm: boolean;
  hasWhatsapp: boolean;
  hasBooking: boolean;
  copyrightYear: number | null;
  placeholder: boolean;
  freeHosting: boolean;
}

export interface ClassifiedSite {
  quality: SiteQuality;
  grade: number;
  signals: SiteSignal[];
}

export interface ScanOptions {
  timeoutMs?: number;
  includeContactPage?: boolean;
}

const PLACEHOLDER_RE =
  /(en construcci[oó]n|under construction|coming soon|pr[oó]ximamente|domain (?:is )?for sale|this domain (?:is|may be) for sale|buy this domain|parked domain|index of \/|default web page|p[aá]gina en blanco|web en mantenimiento|sitio en mantenimiento|temporary page)/i;
const BOOKING_RE =
  /(reservar|cita previa|pedir cita|agendar|booking|appointment|calendly|booksy|treatwell|reserva online)/i;

function emptyContacts(): ContactInfo {
  return { emails: [], phones: [], socials: [], contactName: null, contactRole: null };
}

function signal(
  id: string,
  label: string,
  status: SiteSignal["status"],
  points: number,
  max: number,
  evidence: string
): SiteSignal {
  return { id, label, status, points, max, evidence };
}

export function factsFromHtml(
  html: string,
  finalUrl: string,
  meta: { ok: boolean; status: number | null; ms: number; bytes: number; isHtml?: boolean }
): SiteFacts {
  const isHtml = meta.isHtml ?? true;
  if (!isHtml) {
    return {
      ok: meta.ok,
      status: meta.status,
      finalUrl,
      ms: meta.ms,
      bytes: meta.bytes,
      isHtml: false,
      title: "",
      description: "",
      h1Count: 0,
      hasViewport: false,
      hasForm: false,
      hasWhatsapp: false,
      hasBooking: false,
      copyrightYear: null,
      placeholder: false,
      freeHosting: isFreeHosting(finalUrl),
    };
  }

  const $ = load(html);
  const title = $("title").first().text().replace(/\s+/g, " ").trim();
  const description = ($('meta[name="description"]').attr("content") || "").trim();
  const viewport = ($('meta[name="viewport"]').attr("content") || "").toLowerCase();
  const text = $("body").text().replace(/\s+/g, " ").trim();
  const yearMatch = html.match(/(?:©|&copy;|copyright)[^0-9]{0,40}(20\d{2})/i);
  const copyrightYear = yearMatch ? Number(yearMatch[1]) : null;
  const placeholder = PLACEHOLDER_RE.test(`${title} ${text.slice(0, 6000)} ${html.slice(0, 2000)}`);

  return {
    ok: meta.ok,
    status: meta.status,
    finalUrl,
    ms: meta.ms,
    bytes: meta.bytes,
    isHtml: true,
    title,
    description,
    h1Count: $("h1").length,
    hasViewport: viewport.includes("width=device-width"),
    hasForm: $("form").length > 0,
    hasWhatsapp:
      $('a[href*="wa.me"], a[href*="api.whatsapp.com"], a[href*="whatsapp"]').length > 0 ||
      /whatsapp/i.test(text),
    hasBooking: BOOKING_RE.test(html),
    copyrightYear,
    placeholder,
    freeHosting: isFreeHosting(finalUrl),
  };
}

function brokenSite(evidence: string): ClassifiedSite {
  return {
    quality: "broken",
    grade: 0,
    signals: [signal("reach", "La web responde", "fail", 0, 30, evidence)],
  };
}

function unknownSite(evidence: string): ClassifiedSite {
  return {
    quality: "unknown",
    grade: 0,
    signals: [signal("reach", "La web responde", "na", 0, 30, evidence)],
  };
}

export function classifySite(facts: SiteFacts, now: Date = new Date()): ClassifiedSite {
  if (!facts.ok) {
    if (facts.status != null && [401, 403, 429].includes(facts.status)) {
      return unknownSite(`HTTP ${facts.status}: la web bloquea la comprobación`);
    }
    if (facts.status != null && facts.status >= 400) {
      return brokenSite(`La web respondió HTTP ${facts.status}`);
    }
    return unknownSite("No se pudo conectar con la web");
  }

  if (!facts.isHtml) {
    return {
      quality: "bad",
      grade: 10,
      signals: [signal("reach", "Devuelve una página web", "fail", 10, 30, "La URL no devuelve HTML")],
    };
  }

  const signals: SiteSignal[] = [signal("reach", "La web responde", "pass", 30, 30, `HTTP ${facts.status ?? 200} · ${facts.ms} ms`)];
  const https = facts.finalUrl.startsWith("https://");
  signals.push(signal("https", "HTTPS", https ? "pass" : "fail", https ? 15 : 0, 15, facts.finalUrl));
  signals.push(
    signal(
      "mobile",
      "Adaptada a móvil",
      facts.hasViewport ? "pass" : "fail",
      facts.hasViewport ? 15 : 0,
      15,
      facts.hasViewport ? "viewport móvil presente" : "sin meta viewport"
    )
  );

  const titleLen = facts.title.length;
  const titleStatus = titleLen >= 25 && titleLen <= 60 ? "pass" : titleLen >= 10 && titleLen <= 70 ? "warn" : "fail";
  signals.push(signal("title", "Título", titleStatus, titleStatus === "pass" ? 5 : titleStatus === "warn" ? 3 : 0, 5, titleLen ? `${titleLen} caracteres` : "sin título"));

  const descLen = facts.description.length;
  const descStatus = descLen >= 70 && descLen <= 160 ? "pass" : descLen >= 40 && descLen <= 200 ? "warn" : "fail";
  signals.push(signal("description", "Meta descripción", descStatus, descStatus === "pass" ? 5 : descStatus === "warn" ? 3 : 0, 5, descLen ? `${descLen} caracteres` : "sin descripción"));

  const h1Status = facts.h1Count === 1 ? "pass" : facts.h1Count === 0 ? "fail" : "warn";
  signals.push(signal("h1", "Encabezado principal", h1Status, h1Status === "pass" ? 5 : h1Status === "warn" ? 3 : 0, 5, `${facts.h1Count} H1`));

  signals.push(signal("form", "Formulario de contacto", facts.hasForm ? "pass" : "fail", facts.hasForm ? 5 : 0, 5, facts.hasForm ? "formulario detectado" : "sin formulario"));
  signals.push(signal("whatsapp", "WhatsApp", facts.hasWhatsapp ? "pass" : "fail", facts.hasWhatsapp ? 5 : 0, 5, facts.hasWhatsapp ? "detectado" : "sin WhatsApp"));
  signals.push(signal("booking", "Cita online", facts.hasBooking ? "pass" : "fail", facts.hasBooking ? 5 : 0, 5, facts.hasBooking ? "detectada" : "sin cita online"));

  const year = now.getFullYear();
  const freshness = facts.copyrightYear == null ? "fail" : facts.copyrightYear >= year - 1 ? "pass" : "warn";
  signals.push(
    signal(
      "freshness",
      "Contenido actualizado",
      freshness,
      freshness === "pass" ? 10 : freshness === "warn" ? 5 : 0,
      10,
      facts.copyrightYear ? `copyright ${facts.copyrightYear}` : "sin año visible"
    )
  );

  let grade = signals.reduce((sum, item) => sum + item.points, 0);
  let cap: number | null = null;
  let capReason = "";
  if (facts.placeholder) {
    cap = 20;
    capReason = "dominio aparcado, en construcción o plantilla vacía";
  } else if (!https) {
    cap = 35;
    capReason = "sin HTTPS";
  } else if (!facts.hasViewport) {
    cap = 55;
    capReason = "no adaptada a móvil";
  }

  if (cap != null && grade > cap) {
    signals.push(signal("cap", `Tope: ${capReason}`, "fail", cap - grade, 0, capReason));
    grade = cap;
  }

  const quality: SiteQuality = facts.placeholder ? "bad" : grade >= 70 ? "good" : grade >= 40 ? "weak" : "bad";
  return { quality, grade, signals };
}

function unknownScan(url: string, scannedAt: string, error: string): SiteScan {
  return {
    url,
    finalUrl: null,
    status: null,
    ms: 0,
    bytes: 0,
    quality: "unknown",
    grade: 0,
    signals: [signal("reach", "La web responde", "na", 0, 30, error)],
    emails: [],
    phones: [],
    socials: [],
    contactName: null,
    contactRole: null,
    emailChecks: [],
    freeHosting: isFreeHosting(url),
    placeholder: false,
    error,
    scannedAt,
  };
}

function findContactUrl(html: string, baseUrl: string): string | null {
  const $ = load(html);
  let base: URL;
  try {
    base = new URL(baseUrl);
  } catch {
    return null;
  }
  const candidates: Array<{ url: string; priority: number }> = [];
  $("a[href]").each((_, el) => {
    const href = ($(el).attr("href") || "").trim();
    if (!href || href.startsWith("#") || /^(mailto|tel|javascript):/i.test(href)) return;
    let target: URL;
    try {
      target = new URL(href, base);
    } catch {
      return;
    }
    if (target.hostname !== base.hostname) return;
    const path = target.pathname.toLowerCase();
    const priority = /contacto|contact/.test(path) ? 0 : /nosotros|about|quienes|quiénes|equipo|team/.test(path) ? 1 : 2;
    if (priority > 1) return;
    candidates.push({ url: target.toString(), priority });
  });
  candidates.sort((a, b) => a.priority - b.priority);
  return candidates[0]?.url ?? null;
}

function finishScan(
  url: string,
  scannedAt: string,
  page: { finalUrl: string; status: number | null; ms: number; bytes: number },
  facts: SiteFacts,
  classified: ClassifiedSite,
  contacts: ContactInfo,
  emailChecks: EmailCheck[]
): SiteScan {
  return {
    url,
    finalUrl: page.finalUrl,
    status: page.status,
    ms: page.ms,
    bytes: page.bytes,
    quality: classified.quality,
    grade: classified.grade,
    signals: classified.signals,
    emails: contacts.emails,
    phones: contacts.phones,
    socials: contacts.socials,
    contactName: contacts.contactName,
    contactRole: contacts.contactRole,
    emailChecks,
    freeHosting: facts.freeHosting,
    placeholder: facts.placeholder,
    scannedAt,
  };
}

export async function scanSite(rawUrl: string, options: ScanOptions = {}): Promise<SiteScan> {
  const scannedAt = new Date().toISOString();
  const url = normalizeUrl(rawUrl);
  try {
    assertPublicUrl(url);
  } catch (err) {
    return unknownScan(url, scannedAt, err instanceof Error ? err.message : "URL no válida");
  }

  const page = await fetchText(url, options.timeoutMs ?? 8000);
  if (!page.ok) {
    const blocked = page.status != null && [401, 403, 429].includes(page.status);
    if (blocked || page.status == null) {
      return unknownScan(url, scannedAt, page.error ?? "No se pudo comprobar la web");
    }
    const facts = factsFromHtml("", page.finalUrl, {
      ok: false,
      status: page.status,
      ms: page.ms,
      bytes: page.bytes,
      isHtml: false,
    });
    return finishScan(url, scannedAt, page, facts, classifySite(facts), emptyContacts(), []);
  }

  const contentType = page.headers["content-type"] ?? "";
  const isHtml = /text\/html|application\/xhtml/i.test(contentType) || (!contentType && page.html.includes("<html"));
  const facts = factsFromHtml(page.html, page.finalUrl, {
    ok: true,
    status: page.status,
    ms: page.ms,
    bytes: page.bytes,
    isHtml,
  });

  let contacts = extractContacts(page.html);
  if (options.includeContactPage !== false) {
    const contactUrl = findContactUrl(page.html, page.finalUrl);
    if (contactUrl) {
      const extra = await fetchText(contactUrl, options.timeoutMs ?? 8000);
      if (extra.ok && extra.html) {
        contacts = mergeContacts(contacts, extractContacts(extra.html));
      }
    }
  }

  const emailChecks = await verifyEmails(contacts.emails, 2);
  return finishScan(url, scannedAt, page, facts, classifySite(facts), contacts, emailChecks);
}
