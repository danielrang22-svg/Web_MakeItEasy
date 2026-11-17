import { load } from "cheerio";
import { promises as dns } from "node:dns";
import type { EmailCheck } from "./types";

export interface ContactInfo {
  emails: string[];
  phones: string[];
  socials: string[];
  contactName: string | null;
  contactRole: string | null;
}

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const STRICT_EMAIL_RE =
  /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;
const PHONE_RE = /(?:\+?57[\s.-]?)?(?:3\d{2}|60\d)[\s.-]?\d{3}[\s.-]?\d{4}/g;
const SOCIAL_RE =
  /https?:\/\/(?:www\.)?(instagram\.com|facebook\.com|tiktok\.com|linkedin\.com|youtube\.com|twitter\.com|x\.com)\/[A-Za-z0-9_./-]+/gi;
const ROLE_RE =
  /(due[ñn][oa]|propietari[oa]|gerente(?:\s+general)?|administrador[a]?|director[a]?|fundador[a]?|ceo|representante\s+legal)/i;
const ROLE_EMAIL_RE =
  /^(info|ventas|contacto|hola|admin|administracion|administración|soporte|servicio|servicios|atencion|atención|gerencia|comercial|marketing|webmaster|postmaster|noreply|no-reply|mail)$/i;
const NAME_RE =
  /\b([A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,}(?:\s+(?:de\s+la\s+|del\s+|de\s+)?[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,}){1,3})\b/;
const TITLE_WORDS_RE =
  /(arquitecto|dise[ñn]ador|desarrollador|consultor|especialista|ingeniero|analista|coordinador|asesor|agencia|equipo|procesos|soluciones|servicios|manager|founder|owner)/i;

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "tempmail.com",
  "temp-mail.org",
  "10minutemail.com",
  "yopmail.com",
  "trashmail.com",
  "sharklasers.com",
]);

const BLOCKED_DOMAINS = new Set(["example.com", "example.org", "sentry.io", "wixpress.com", "domain.com"]);

function cleanEmails(html: string): string[] {
  const found = html.match(EMAIL_RE) ?? [];
  const out = new Set<string>();
  for (const raw of found) {
    const email = raw.trim().toLowerCase().replace(/\.$/, "");
    if (/\.(png|jpe?g|gif|webp|svg)$/i.test(email)) continue;
    if (!STRICT_EMAIL_RE.test(email)) continue;
    const domain = email.split("@")[1] ?? "";
    if (!domain || BLOCKED_DOMAINS.has(domain)) continue;
    if (domain.includes("wixpress") || domain.includes("sentry")) continue;
    out.add(email);
    if (out.size >= 6) break;
  }
  return [...out];
}

function cleanPhones(html: string, $: ReturnType<typeof load>): string[] {
  const byDigits = new Map<string, string>();
  const candidates = [...(html.match(PHONE_RE) ?? [])];
  $('a[href^="tel:"]').each((_, el) => {
    const href = ($(el).attr("href") || "").replace(/^tel:/i, "");
    if (href) candidates.push(decodeURIComponent(href));
  });
  for (const candidate of candidates) {
    const digits = candidate.replace(/\D/g, "");
    const valid = digits.length === 10 || (digits.length === 12 && digits.startsWith("57"));
    if (!valid) continue;
    byDigits.set(digits, candidate.trim().replace(/\s+/g, " "));
    if (byDigits.size >= 5) break;
  }
  return [...byDigits.values()];
}

function cleanSocials(html: string): string[] {
  const out = new Set<string>();
  for (const match of html.match(SOCIAL_RE) ?? []) {
    out.add(match.replace(/\/$/, ""));
    if (out.size >= 6) break;
  }
  return [...out];
}

function extractName(line: string): string | null {
  const withoutRole = line.replace(ROLE_RE, " ").replace(/[|,.:;·–—-]+/g, " ");
  const match = withoutRole.match(NAME_RE);
  if (!match) return null;
  const name = match[1].replace(/\s+/g, " ").trim();
  if (name.length < 5 || name.length > 60) return null;
  if (TITLE_WORDS_RE.test(name)) return null;
  return name;
}

function findDecisionMaker($: ReturnType<typeof load>): { name: string; role: string } | null {
  const lines: string[] = [];
  $("p, li, h1, h2, h3, h4, h5, h6, span, strong, td, address, figcaption").each((_, el) => {
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (text.length >= 8 && text.length <= 160) lines.push(text);
  });
  for (const line of lines) {
    const roleMatch = line.match(ROLE_RE);
    if (!roleMatch) continue;
    const name = extractName(line);
    if (!name) continue;
    return { name, role: roleMatch[0].toLowerCase() };
  }
  return null;
}

export function extractContacts(html: string): ContactInfo {
  const $ = load(html);
  const decision = findDecisionMaker($);
  const bodyText = $("body").text().replace(/\s+/g, " ");
  return {
    emails: cleanEmails(html),
    phones: cleanPhones(`${html} ${bodyText}`, $),
    socials: cleanSocials(html),
    contactName: decision?.name ?? null,
    contactRole: decision?.role ?? null,
  };
}

export function mergeContacts(primary: ContactInfo, extra: ContactInfo): ContactInfo {
  return {
    emails: [...new Set([...primary.emails, ...extra.emails])].slice(0, 6),
    phones: [...new Set([...primary.phones, ...extra.phones])].slice(0, 5),
    socials: [...new Set([...primary.socials, ...extra.socials])].slice(0, 6),
    contactName: extra.contactName ?? primary.contactName,
    contactRole: extra.contactRole ?? primary.contactRole,
  };
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), ms);
    }),
  ]);
}

const MX_CACHE = new Map<string, { exists: boolean; at: number }>();
const MX_TTL = 60 * 60 * 1000;

async function defaultMxExists(domain: string): Promise<boolean> {
  const cached = MX_CACHE.get(domain);
  if (cached && Date.now() - cached.at < MX_TTL) return cached.exists;
  const records = await withTimeout(dns.resolveMx(domain), 1800);
  if (records === null) return false;
  const exists = records.length > 0;
  MX_CACHE.set(domain, { exists, at: Date.now() });
  return exists;
}

export async function verifyEmailWith(
  email: string,
  mxExists: (domain: string) => Promise<boolean>
): Promise<EmailCheck> {
  const normalized = email.trim().toLowerCase();
  if (!STRICT_EMAIL_RE.test(normalized)) {
    return { email: normalized, status: "invalid", reason: "formato inválido" };
  }
  const [local, domain] = normalized.split("@");
  if (!domain) {
    return { email: normalized, status: "invalid", reason: "dominio inexistente" };
  }
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return { email: normalized, status: "invalid", reason: "dominio desechable" };
  }
  const hasMx = await mxExists(domain);
  if (!hasMx) {
    return { email: normalized, status: "invalid", reason: "el dominio no recibe correo (sin MX)" };
  }
  if (ROLE_EMAIL_RE.test(local)) {
    return { email: normalized, status: "risky", reason: "buzón genérico, no personal" };
  }
  return { email: normalized, status: "verified", reason: "dominio con correo activo" };
}

export function verifyEmail(email: string): Promise<EmailCheck> {
  return verifyEmailWith(email, defaultMxExists);
}

export async function verifyEmails(emails: string[], limit = 3): Promise<EmailCheck[]> {
  return Promise.all(emails.slice(0, limit).map((email) => verifyEmail(email)));
}
