const UA =
  "Mozilla/5.0 (compatible; MakeItEasyRadar/1.0; +https://makeiteasycol.com)";

export interface WebSnapshot {
  ok: boolean;
  url: string;
  finalUrl?: string;
  status?: number;
  title: string;
  description: string;
  h1: string[];
  h2: string[];
  text: string;
  emails: string[];
  socials: string[];
  phones: string[];
  hasWhatsapp: boolean;
  hasBooking: boolean;
  hasForm: boolean;
  hasViewport: boolean;
  https: boolean;
  copyrightYear: number | null;
  error?: string;
}

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export async function fetchWebsite(url: string): Promise<WebSnapshot> {
  const empty: WebSnapshot = {
    ok: false,
    url,
    title: "",
    description: "",
    h1: [],
    h2: [],
    text: "",
    emails: [],
    socials: [],
    phones: [],
    hasWhatsapp: false,
    hasBooking: false,
    hasForm: false,
    hasViewport: false,
    https: url.startsWith("https://"),
    copyrightYear: null,
  };

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ...empty, error: "URL no válida" };
  }

  if (!/^https?:$/.test(parsed.protocol)) {
    return { ...empty, error: "Solo se admiten http y https" };
  }

  const host = parsed.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  ) {
    return { ...empty, error: "No se pueden analizar direcciones internas" };
  }

  try {
    const res = await fetch(parsed.toString(), {
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
      signal: AbortSignal.timeout(15000),
      redirect: "follow",
    });

    if (!res.ok) {
      return { ...empty, status: res.status, error: `La web respondió HTTP ${res.status}` };
    }

    const type = res.headers.get("content-type") || "";
    if (!type.includes("text/html") && !type.includes("application/xhtml")) {
      return { ...empty, status: res.status, error: `La URL no devuelve HTML (${type || "desconocido"})` };
    }

    const raw = await res.text();
    const html = raw.slice(0, 2_000_000);

    const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").trim();
    const description =
      (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i)?.[1] ||
        html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i)?.[1] ||
        "").trim();

    const h1 = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)]
      .map((m) => stripTags(m[1]))
      .filter(Boolean)
      .slice(0, 5);
    const h2 = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)]
      .map((m) => stripTags(m[1]))
      .filter(Boolean)
      .slice(0, 10);

    const text = stripTags(html).slice(0, 12000);

    const emails = [...new Set(html.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [])]
      .filter((e) => !/\.(png|jpe?g|gif|webp|svg)$/i.test(e))
      .slice(0, 8);

    const socialMatches = [
      ...html.matchAll(/https?:\/\/(?:www\.)?(instagram\.com|facebook\.com|tiktok\.com|linkedin\.com|youtube\.com|twitter\.com|x\.com)\/[A-Za-z0-9_./-]+/gi),
    ].map((m) => m[0]);
    const socials = [...new Set(socialMatches)].slice(0, 8);

    const phoneMatches = [
      ...html.matchAll(/(?:\+34[\s.-]?)?(?:6|7|9)\d{2}[\s.-]?\d{2,3}[\s.-]?\d{2,3}[\s.-]?\d{0,2}/g),
    ].map((m) => m[0].trim());
    const phones = [...new Set(phoneMatches)].filter((p) => p.replace(/\D/g, "").length >= 9).slice(0, 5);

    const lower = html.toLowerCase();
    const hasWhatsapp = /wa\.me|api\.whatsapp\.com|whatsapp/i.test(lower);
    const hasBooking = /(reservar|reserva|cita previa|pedir cita|agendar|booking|appointment|calendly|booksy|treatwell)/i.test(lower);
    const hasForm = /<form[\s>]/i.test(lower);
    const hasViewport = /<meta[^>]+name=["']viewport["']/i.test(lower);

    const years = [...html.matchAll(/(?:©|&copy;|copyright)[^0-9]{0,40}(20\d{2})/gi)].map((m) => Number(m[1]));
    const copyrightYear = years.length ? Math.max(...years) : null;

    return {
      ok: true,
      url,
      finalUrl: res.url || url,
      status: res.status,
      title: title.slice(0, 200),
      description: description.slice(0, 300),
      h1,
      h2,
      text,
      emails,
      socials,
      phones,
      hasWhatsapp,
      hasBooking,
      hasForm,
      hasViewport,
      https: (res.url || url).startsWith("https://"),
      copyrightYear,
    };
  } catch (err) {
    return {
      ...empty,
      error:
        err instanceof Error
          ? `No se pudo descargar la web (${err.message.slice(0, 80)})`
          : "No se pudo descargar la web",
    };
  }
}
