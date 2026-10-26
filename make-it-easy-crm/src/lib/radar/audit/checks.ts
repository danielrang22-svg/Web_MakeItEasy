import { load } from "cheerio";
import type { AuditArea, AuditCheck, AuditImpact, AuditStatus } from "./types";
import type { FetchResult } from "./fetch";

export interface AuditContext {
  page: FetchResult;
  robots: FetchResult;
  sitemap: FetchResult;
  httpRedirect: { status: number | null; location: string | null };
  notFound: FetchResult;
  category?: string;
}

const CRITICAL = new Set([
  "idx_meta_robots",
  "idx_canonical",
  "idx_https_redirect",
  "tech_https",
  "on_title",
  "on_h1",
  "loc_tel_link",
  "conv_whatsapp",
  "conv_form",
]);

function C(
  id: string,
  area: AuditArea,
  label: string,
  status: AuditStatus,
  impact: AuditImpact,
  evidence: string,
  fix: string
): AuditCheck {
  return {
    id,
    area,
    label,
    status,
    impact,
    weight: CRITICAL.has(id) ? 2 : 1,
    evidence,
    fix,
  };
}

function normalizeUrl(value: string, base: string): string {
  try {
    const u = new URL(value, base);
    u.hash = "";
    return u.toString().replace(/\/$/, "");
  } catch {
    return value;
  }
}

function robotsBlocksAll(robots: string): boolean {
  const lines = robots.split(/\r?\n/).map((l) => l.trim().toLowerCase());
  let applies = false;
  for (const line of lines) {
    if (line.startsWith("user-agent:")) {
      applies = line.includes("*");
      continue;
    }
    if (applies && /^disallow:\s*\/\s*$/.test(line)) return true;
  }
  return false;
}

function parseJsonLd(html: string): string[] {
  const types: string[] = [];
  const matches = [...html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)];
  for (const m of matches) {
    try {
      const parsed = JSON.parse(m[1].trim());
      const visit = (node: unknown) => {
        if (Array.isArray(node)) return node.forEach(visit);
        if (!node || typeof node !== "object") return;
        const obj = node as Record<string, unknown>;
        if (typeof obj["@type"] === "string") types.push(obj["@type"] as string);
        if (Array.isArray(obj["@graph"])) visit(obj["@graph"]);
      };
      visit(parsed);
    } catch {
      // JSON-LD inválido: se ignora aquí, lo detecta el check
    }
  }
  return [...new Set(types)];
}

export function runChecks(ctx: AuditContext): { checks: AuditCheck[]; title: string; description: string } {
  const { page, robots, sitemap, httpRedirect, notFound } = ctx;
  const html = page.html;
  const $ = load(html);
  const text = $("body").text().replace(/\s+/g, " ").trim();
  const lower = text.toLowerCase();
  const origin = new URL(page.finalUrl).origin;
  const checks: AuditCheck[] = [];

  const title = ($("title").first().text() || "").trim();
  const description = ($('meta[name="description"]').attr("content") || "").trim();

  /* ── Indexación ── */
  const robotsOk = robots.status === 200 && robots.html.length > 0;
  const robotsAll = robotsOk && robotsBlocksAll(robots.html);
  checks.push(
    C(
      "idx_robots",
      "indexacion",
      "robots.txt accesible",
      robotsOk ? (robotsAll ? "fail" : "pass") : robots.status === 404 ? "warn" : "fail",
      robotsAll ? "alto" : "medio",
      robotsOk ? (robotsAll ? "robots.txt bloquea todo el sitio (Disallow: /)" : "robots.txt correcto") : `robots.txt respondió ${robots.status ?? "error"}`,
      robotsAll ? "Elimina el Disallow: / o limita el bloqueo a rutas internas." : "Publica un robots.txt con Allow: / y la línea Sitemap."
    )
  );

  const sitemapLocs = (sitemap.html.match(/<loc>/gi) || []).length;
  checks.push(
    C(
      "idx_sitemap",
      "indexacion",
      "sitemap.xml accesible",
      sitemap.status === 200 && sitemapLocs > 0 ? "pass" : sitemap.status === 404 ? "fail" : "warn",
      "alto",
      sitemap.status === 200 ? `${sitemapLocs} URLs en el sitemap` : `sitemap.xml respondió ${sitemap.status ?? "error"}`,
      "Genera un sitemap.xml con las URLs canónicas y enlázalo en robots.txt."
    )
  );

  const robotsMeta = ($('meta[name="robots"]').attr("content") || "").toLowerCase();
  checks.push(
    C(
      "idx_meta_robots",
      "indexacion",
      "Home indexable",
      robotsMeta.includes("noindex") ? "fail" : "pass",
      "alto",
      robotsMeta ? `meta robots: ${robotsMeta}` : "sin meta robots (indexable por defecto)",
      "Quita el noindex de la home si quieres aparecer en Google."
    )
  );

  const canonicalHref = $('link[rel="canonical"]').attr("href");
  const canonical = canonicalHref ? normalizeUrl(canonicalHref, page.finalUrl) : "";
  const selfCanonical = canonical === normalizeUrl(page.finalUrl, page.finalUrl);
  checks.push(
    C(
      "idx_canonical",
      "indexacion",
      "Canonical correcta",
      !canonicalHref ? "fail" : selfCanonical ? "pass" : "warn",
      "alto",
      canonicalHref ? `canonical: ${canonicalHref}` : "sin etiqueta canonical",
      "Añade <link rel=\"canonical\"> apuntando a la propia URL de la página."
    )
  );

  const redirectsToHttps =
    httpRedirect.status !== null &&
    [301, 302, 307, 308].includes(httpRedirect.status) &&
    (httpRedirect.location || "").startsWith("https://");
  checks.push(
    C(
      "idx_https_redirect",
      "indexacion",
      "HTTP redirige a HTTPS",
      page.finalUrl.startsWith("https://") && redirectsToHttps ? "pass" : page.finalUrl.startsWith("https://") ? "warn" : "fail",
      "alto",
      redirectsToHttps ? `HTTP ${httpRedirect.status} → ${httpRedirect.location}` : `HTTP respondió ${httpRedirect.status ?? "sin redirección"}`,
      "Fuerza un 301 de http:// a https:// en el servidor."
    )
  );

  checks.push(
    C(
      "idx_404",
      "indexacion",
      "404 personalizada",
      notFound.status === 404 ? "pass" : notFound.status === 200 ? "fail" : "warn",
      "bajo",
      `URL inexistente respondió ${notFound.status ?? "error"}`,
      "Crea una página 404 con enlaces útiles y devuelve el código 404 real."
    )
  );

  const xRobots = (page.headers["x-robots-tag"] || "").toLowerCase();
  checks.push(
    C(
      "idx_xrobots",
      "indexacion",
      "Cabecera X-Robots-Tag",
      xRobots.includes("noindex") ? "fail" : "pass",
      "medio",
      xRobots ? `X-Robots-Tag: ${xRobots}` : "sin cabecera restrictiva",
      "Elimina el noindex de la cabecera X-Robots-Tag."
    )
  );

  /* ── Técnico ── */
  const httpsOk = page.finalUrl.startsWith("https://");
  checks.push(C("tech_https", "tecnico", "HTTPS", httpsOk ? "pass" : "fail", "alto", page.finalUrl, "Instala un certificado SSL válido."));

  const hsts = page.headers["strict-transport-security"] || "";
  checks.push(
    C("tech_hsts", "tecnico", "HSTS", /max-age=\d+/.test(hsts) && !/max-age=0/.test(hsts) ? "pass" : "warn", "medio", hsts || "sin cabecera HSTS", "Añade Strict-Transport-Security con max-age de un año.")
  );

  const encoding = page.headers["content-encoding"] || "";
  checks.push(
    C("tech_compression", "tecnico", "Compresión", /gzip|br|deflate/.test(encoding) ? "pass" : "fail", "medio", encoding || "sin compresión", "Activa gzip o Brotli en el servidor.")
  );

  const cacheControl = page.headers["cache-control"] || "";
  checks.push(
    C("tech_cache", "tecnico", "Cabeceras de caché", cacheControl ? "pass" : "warn", "bajo", cacheControl || "sin Cache-Control en el HTML", "Define Cache-Control para HTML y assets.")
  );

  const responseMs = page.ms;
  checks.push(
    C(
      "tech_response",
      "tecnico",
      "Tiempo de respuesta",
      responseMs < 1500 ? "pass" : responseMs < 3000 ? "warn" : "fail",
      "alto",
      `${responseMs} ms`,
      "Mejora el hosting, activa caché y reduce el trabajo del servidor."
    )
  );

  checks.push(
    C(
      "tech_weight",
      "tecnico",
      "Peso del HTML",
      page.bytes < 150_000 ? "pass" : page.bytes < 300_000 ? "warn" : "fail",
      "medio",
      `${Math.round(page.bytes / 1024)} KB`,
      "Reduce el HTML: elimina estilos y scripts en línea innecesarios."
    )
  );

  const imgs = $("img");
  const imgTotal = imgs.length;
  let missingAlt = 0;
  let missingDims = 0;
  let lazy = 0;
  imgs.each((_, el) => {
    const img = $(el);
    const alt = img.attr("alt");
    if (alt === undefined || alt.trim() === "") missingAlt++;
    if (!img.attr("width") || !img.attr("height")) missingDims++;
    if ((img.attr("loading") || "").toLowerCase() === "lazy") lazy++;
  });

  checks.push(
    C(
      "tech_img_alt",
      "tecnico",
      "Alt en imágenes",
      imgTotal === 0 ? "na" : missingAlt === 0 ? "pass" : missingAlt <= 2 ? "warn" : "fail",
      "medio",
      imgTotal === 0 ? "sin imágenes" : `${missingAlt} de ${imgTotal} sin alt`,
      "Añade texto alternativo descriptivo a cada imagen."
    )
  );

  checks.push(
    C(
      "tech_img_dims",
      "tecnico",
      "Dimensiones y lazy load",
      imgTotal === 0 ? "na" : missingDims === 0 ? "pass" : missingDims <= 2 ? "warn" : "fail",
      "medio",
      imgTotal === 0 ? "sin imágenes" : `${missingDims} sin width/height · ${lazy} con lazy`,
      "Define width/height y loading=\"lazy\" en las imágenes."
    )
  );

  const viewport = ($('meta[name="viewport"]').attr("content") || "").toLowerCase();
  checks.push(
    C("tech_viewport", "tecnico", "Adaptada a móvil", viewport.includes("width=device-width") ? "pass" : "fail", "alto", viewport || "sin meta viewport", "Añade <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">.")
  );

  const lang = ($("html").attr("lang") || "").trim();
  checks.push(C("tech_lang", "tecnico", "Idioma declarado", lang ? "pass" : "fail", "bajo", lang ? `lang="${lang}"` : "sin atributo lang", "Declara el idioma en <html lang=\"es\">."));

  /* ── On-page ── */
  const titleLen = title.length;
  checks.push(
    C("on_title", "onpage", "Título SEO", titleLen >= 25 && titleLen <= 60 ? "pass" : titleLen >= 10 && titleLen <= 70 ? "warn" : "fail", "alto", `${titleLen} caracteres · «${title.slice(0, 80)}»`, "Escribe un título de 25-60 caracteres con la keyword principal.")
  );

  const descLen = description.length;
  checks.push(
    C("on_desc", "onpage", "Meta descripción", descLen >= 70 && descLen <= 160 ? "pass" : descLen >= 40 && descLen <= 200 ? "warn" : "fail", "medio", `${descLen} caracteres`, "Añade una descripción de 70-160 caracteres con propuesta de valor.")
  );

  const h1s = $("h1");
  const h1Count = h1s.length;
  const h1Text = h1s.first().text().replace(/\s+/g, " ").trim();
  checks.push(
    C("on_h1", "onpage", "H1 único", h1Count === 1 ? "pass" : h1Count === 0 ? "fail" : "warn", "alto", `${h1Count} H1${h1Text ? ` · «${h1Text.slice(0, 70)}»` : ""}`, "Deja un solo H1 con la propuesta principal.")
  );

  checks.push(
    C("on_h1_quality", "onpage", "H1 descriptivo", h1Text.length >= 10 && !/^(inicio|home|bienvenido)$/i.test(h1Text) ? "pass" : "warn", "medio", h1Text ? `${h1Text.length} caracteres` : "sin H1", "Usa un H1 que explique qué ofrece el negocio.")
  );

  const h2Count = $("h2").length;
  checks.push(C("on_h2", "onpage", "Jerarquía H2", h2Count >= 2 ? "pass" : h2Count === 1 ? "warn" : "fail", "medio", `${h2Count} H2`, "Organiza el contenido en secciones con H2."));

  const ogTitle = $('meta[property="og:title"]').attr("content");
  const ogDesc = $('meta[property="og:description"]').attr("content");
  const ogImage = $('meta[property="og:image"]').attr("content");
  const ogCount = [ogTitle, ogDesc, ogImage].filter(Boolean).length;
  checks.push(C("on_og", "onpage", "Open Graph", ogCount === 3 ? "pass" : ogCount > 0 ? "warn" : "fail", "bajo", `${ogCount}/3 etiquetas`, "Añade og:title, og:description y og:image."));

  checks.push(C("on_twitter", "onpage", "Twitter Card", $('meta[name="twitter:card"]').attr("content") ? "pass" : "warn", "bajo", $('meta[name="twitter:card"]').attr("content") || "sin twitter:card", "Añade twitter:card summary_large_image."));

  const ldTypes = parseJsonLd(html);
  const relevantTypes = ["LocalBusiness", "Organization", "Service", "FAQPage", "WebSite", "Store", "MedicalBusiness", "Restaurant", "AutoRepair"];
  const hasRelevant = ldTypes.some((t) => relevantTypes.includes(t));
  checks.push(
    C("on_schema", "onpage", "Datos estructurados", hasRelevant ? "pass" : ldTypes.length ? "warn" : "fail", "medio", ldTypes.length ? ldTypes.join(", ") : "sin JSON-LD", "Añade JSON-LD de LocalBusiness, Service y FAQPage.")
  );

  const hreflangs = $('link[rel="alternate"][hreflang]').length;
  checks.push(C("on_hreflang", "onpage", "Hreflang", hreflangs > 0 ? "pass" : "na", "bajo", hreflangs > 0 ? `${hreflangs} alternates` : "sitio de un solo idioma", "Solo necesario si hay versiones por idioma o región."));

  const internalLinks = new Set<string>();
  const finalHost = new URL(page.finalUrl).hostname;
  $("a[href]").each((_, el) => {
    const href = ($(el).attr("href") || "").trim();
    if (!href || href.startsWith("#") || /^(mailto|tel|javascript):/i.test(href)) return;
    try {
      const url = new URL(href, page.finalUrl);
      if (url.hostname === finalHost) internalLinks.add(url.pathname);
    } catch {
      // ignorar
    }
  });
  checks.push(
    C("on_internal_links", "onpage", "Enlazado interno", internalLinks.size >= 5 ? "pass" : internalLinks.size >= 1 ? "warn" : "fail", "medio", `${internalLinks.size} enlaces internos únicos`, "Enlaza servicios y páginas clave desde la home.")
  );

  /* ── Local ── */
  const phoneDigits = (text.match(/(?:\+57[\s.-]?)?(?:3\d{2}|60\d)[\s.-]?\d{3}[\s.-]?\d{4}/g) || []).length;
  const hasStreet = /(calle|cl\.?|carrera|cra\.?|avenida|av\.?|avda|diagonal|transversal|plaza|camino|carretera|manzana|mz\.?|kil[oó]metro|km)/i.test(text);
  const hasPostcode = /\b\d{6}\b/.test(text);
  const nap = phoneDigits > 0 && hasStreet;
  checks.push(
    C(
      "loc_nap",
      "local",
      "Nombre, dirección y teléfono",
      nap ? "pass" : phoneDigits > 0 || hasStreet ? "warn" : "fail",
      "medio",
      `${phoneDigits} teléfonos · ${hasStreet ? "dirección" : "sin dirección"} · ${hasPostcode ? "código postal" : "sin CP"}`,
      "Muestra dirección completa y teléfono en el pie y en la página de contacto."
    )
  );

  checks.push(C("loc_tel_link", "local", "Teléfono pulsable", $('a[href^="tel:"]').length > 0 ? "pass" : "fail", "alto", `${$('a[href^="tel:"]').length} enlaces tel:`, "Convierte el teléfono en un enlace tel: para llamar desde el móvil."));

  const mapLinks = $('a[href*="google.com/maps"], a[href*="maps.app.goo.gl"], iframe[src*="google.com/maps"]').length;
  checks.push(C("loc_map", "local", "Mapa o ficha de Google", mapLinks > 0 ? "pass" : "warn", "bajo", `${mapLinks} referencias a mapas`, "Incrusta el mapa o enlaza tu ficha de Google Business Profile."));

  const hasHours = /horario|de lunes a|lunes a viernes|24 horas/i.test(text) || /OpeningHours/i.test(ldTypes.join(","));
  checks.push(C("loc_hours", "local", "Horario visible", hasHours ? "pass" : "warn", "bajo", hasHours ? "horario publicado" : "sin horario visible", "Publica el horario en la web y en Google Business Profile."));

  /* ── Conversión ── */
  const whatsappLinks = $('a[href*="wa.me"], a[href*="api.whatsapp.com"], a[href*="whatsapp"]').length;
  const hasWhatsapp = whatsappLinks > 0 || /whatsapp/i.test(text);
  checks.push(
    C("conv_whatsapp", "conversion", "WhatsApp", hasWhatsapp ? "pass" : "fail", "alto", whatsappLinks ? `${whatsappLinks} enlaces` : hasWhatsapp ? "mencionado en texto" : "sin WhatsApp", "Añade un botón de WhatsApp visible en la cabecera y en cada servicio.")
  );

  const forms = $("form").length;
  checks.push(C("conv_form", "conversion", "Formulario de contacto", forms > 0 ? "pass" : "fail", "alto", `${forms} formularios`, "Incluye un formulario corto (nombre, teléfono y motivo)."));

  const booking = /(reservar|cita previa|pedir cita|agendar|booking|appointment|calendly|booksy|treatwell)/i.test(html);
  checks.push(C("conv_booking", "conversion", "Cita o reserva online", booking ? "pass" : "fail", "alto", booking ? "detectado" : "no detectado", "Añade reserva o cita online; reduce llamadas y fricción."));

  const chat = /(tawk|crisp\.chat|intercom|hubspot|zendesk|livechat|drift\.com|tidio)/i.test(html);
  checks.push(C("conv_chat", "conversion", "Chat en la web", chat ? "pass" : "warn", "bajo", chat ? "widget detectado" : "sin chat", "Un chat o agente de IA mejora la captación fuera de horario."));

  const ctaMatches = [...html.matchAll(/<(a|button)[^>]*>([\s\S]{0,120}?)<\/\1>/gi)]
    .map((m) => m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
    .filter((t) => /presupuesto|contactar|llamar|reservar|cita|solicitar|comprar|escr[ií]benos/i.test(t));
  checks.push(C("conv_cta", "conversion", "Llamadas a la acción", ctaMatches.length >= 2 ? "pass" : ctaMatches.length === 1 ? "warn" : "fail", "medio", `${ctaMatches.length} CTAs detectadas`, "Coloca CTAs claros («Pedir presupuesto», «Llamar») en cada sección."));

  const legal = $('a[href*="privacidad"], a[href*="aviso-legal"], a[href*="aviso legal"], a[href*="politica"], a[href*="legal"]').length;
  checks.push(C("conv_legal", "conversion", "Aviso legal y privacidad", legal >= 2 ? "pass" : legal === 1 ? "warn" : "fail", "medio", `${legal} enlaces legales`, "Publica aviso legal, privacidad y tratamiento de datos (Ley 1581 de Colombia)."));

  const currentYear = new Date().getFullYear();
  const years = [...text.matchAll(/(20\d{2})/g)].map((m) => Number(m[1]));
  const maxYear = years.length ? Math.max(...years) : 0;
  checks.push(
    C("conv_copyright", "conversion", "Contenido actualizado", maxYear >= currentYear - 1 ? "pass" : maxYear > 0 ? "warn" : "fail", "bajo", maxYear ? `año ${maxYear}` : "sin año visible", "Actualiza el copyright y revisa contenidos antiguos.")
  );

  return { checks, title, description };
}

export function areaScores(checks: AuditCheck[]) {
  const areas: AuditArea[] = ["indexacion", "tecnico", "onpage", "local", "conversion"];
  return areas.map((area) => {
    const items = checks.filter((c) => c.area === area && c.status !== "na");
    const totalWeight = items.reduce((sum, c) => sum + c.weight, 0);
    const earned = items.reduce(
      (sum, c) => sum + (c.status === "pass" ? c.weight : c.status === "warn" ? c.weight * 0.5 : 0),
      0
    );
    return {
      area,
      score: totalWeight > 0 ? Math.round((earned / totalWeight) * 100) : null,
      pass: items.filter((c) => c.status === "pass").length,
      warn: items.filter((c) => c.status === "warn").length,
      fail: items.filter((c) => c.status === "fail").length,
      na: checks.filter((c) => c.area === area && c.status === "na").length,
    };
  });
}
