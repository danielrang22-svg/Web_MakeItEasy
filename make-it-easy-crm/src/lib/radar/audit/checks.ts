import { load } from "cheerio";
import type {
  AuditArea,
  AuditBusiness,
  AuditCheck,
  AuditGroup,
  AuditImpact,
  AuditStatus,
} from "./types";
import type { FetchResult, RedirectChainResult, UrlCheck } from "./fetch";

export interface AuditContext {
  page: FetchResult;
  robots: FetchResult;
  sitemap: FetchResult;
  httpRedirect: { status: number | null; location: string | null };
  notFound: FetchResult;
  category?: string;
  redirectChain?: RedirectChainResult;
  brokenLinks?: UrlCheck[];
  hreflangStatus?: UrlCheck[];
  sitemapStatus?: UrlCheck[];
  business?: AuditBusiness;
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
  fix: string,
  group?: AuditGroup
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
    group,
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

  const robotsHasSitemap = robotsOk && /sitemap:\s*\S+/i.test(robots.html);
  checks.push(
    C(
      "idx_robots_sitemap",
      "indexacion",
      "Sitemap declarado en robots.txt",
      robots.status === 404 ? "na" : robotsHasSitemap ? "pass" : "warn",
      "medio",
      robotsHasSitemap ? "Sitemap referenciado" : "robots.txt no referencia el sitemap",
      "Añade Sitemap: https://tu-dominio.com/sitemap.xml a robots.txt.",
      "rastreo"
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

  const sitemapLocUrls = [...sitemap.html.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((match) => match[1]);
  const sitemapAbsolute = sitemapLocUrls.filter((loc) => /^https?:\/\//i.test(loc)).length;
  const sitemapDuplicates = sitemapLocUrls.length - new Set(sitemapLocUrls).size;
  const sitemapLastmods = (sitemap.html.match(/<lastmod>/gi) || []).length;
  checks.push(
    C(
      "idx_sitemap_quality",
      "indexacion",
      "Calidad del sitemap",
      sitemapLocUrls.length === 0 ? "na" : sitemapDuplicates === 0 && sitemapAbsolute === sitemapLocUrls.length ? "pass" : "warn",
      "medio",
      `${sitemapLocUrls.length} URLs · ${sitemapDuplicates} duplicadas · ${sitemapLastmods} lastmod`,
      "Usa URLs absolutas, sin duplicados y añade lastmod.",
      "rastreo"
    )
  );

  const sitemapChecks = ctx.sitemapStatus ?? [];
  const sitemapBroken = sitemapChecks.filter((item) => !item.ok && !item.unknown);
  checks.push(
    C(
      "idx_sitemap_status",
      "indexacion",
      "Estado de las URLs del sitemap",
      sitemapChecks.length === 0 ? "na" : sitemapBroken.length === 0 ? "pass" : sitemapBroken.length === 1 ? "warn" : "fail",
      "medio",
      sitemapChecks.length === 0
        ? "sin URLs comprobadas"
        : `${sitemapChecks.length} comprobadas · ${sitemapBroken.length} con error`,
      "Las URLs del sitemap deben responder 200.",
      "rastreo"
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

  const soft404 =
    notFound.status === 200 &&
    /(no encontrad[oa]|not found|p\u00e1gina no existe|page not found|404)/i.test(notFound.html.slice(0, 8000));
  checks.push(
    C(
      "idx_soft_404",
      "indexacion",
      "Soft 404",
      notFound.status === 404 ? "pass" : soft404 ? "fail" : "warn",
      "medio",
      soft404 ? "responde 200 con texto de no encontrado" : `URL inexistente respondió ${notFound.status ?? "error"}`,
      "Devuelve un 404 real, no un 200 con contenido de error.",
      "rastreo"
    )
  );

  const chain = ctx.redirectChain;
  const chainStatus = !chain
    ? "na"
    : chain.loop || chain.exceeded
    ? "fail"
    : chain.error
    ? "warn"
    : chain.chain.length <= 1
    ? "pass"
    : chain.chain.length <= 3
    ? "warn"
    : "fail";
  const chainEvidence = !chain
    ? "sin datos"
    : chain.loop
    ? "bucle de redirección"
    : chain.exceeded
    ? `${chain.chain.length} saltos y sigue redirigiendo`
    : `${chain.chain.length} salto(s)`;
  checks.push(
    C(
      "tech_redirect_chain",
      "indexacion",
      "Cadena de redirecciones",
      chainStatus,
      "medio",
      chainEvidence,
      "Evita cadenas largas y bucles; enlaza directo a la URL final.",
      "rastreo"
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

  const mixedContent = httpsOk
    ? (html.match(/(?:src|href)=["']http:\/\//gi) || []).length +
      (html.match(/url\(\s*["']?http:\/\//gi) || []).length
    : 0;
  checks.push(
    C(
      "tech_mixed_content",
      "tecnico",
      "Contenido mixto",
      !httpsOk ? "na" : mixedContent === 0 ? "pass" : mixedContent <= 2 ? "warn" : "fail",
      "alto",
      !httpsOk ? "sin HTTPS" : `${mixedContent} recursos HTTP en página HTTPS`,
      "Sirve todos los recursos por HTTPS para evitar bloqueos y pérdida de confianza.",
      "tecnico"
    )
  );

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
  let modernImgs = 0;
  let legacyImgs = 0;
  const imgSources: string[] = [];
  imgs.each((_, el) => {
    const img = $(el);
    const alt = img.attr("alt");
    if (alt === undefined || alt.trim() === "") missingAlt++;
    if (!img.attr("width") || !img.attr("height")) missingDims++;
    if ((img.attr("loading") || "").toLowerCase() === "lazy") lazy++;
    const src = img.attr("src") || "";
    if (src) imgSources.push(src);
    if (/\.(webp|avif)(\?|$)/i.test(src)) modernImgs++;
    else if (/\.(jpe?g|png|gif)(\?|$)/i.test(src)) legacyImgs++;
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

  checks.push(
    C(
      "tech_img_format",
      "tecnico",
      "Formato de imágenes",
      imgTotal === 0 ? "na" : legacyImgs === 0 ? "pass" : modernImgs >= legacyImgs ? "warn" : "fail",
      "bajo",
      imgTotal === 0 ? "sin imágenes" : `${modernImgs} modernas · ${legacyImgs} jpg/png/gif`,
      "Usa WebP o AVIF y comprime las imágenes."
    )
  );

  const genericImages = imgSources.filter((src) =>
    /(^|\/)(img|image|foto|photo|dsc|captura|whatsapp)[-_]?\d*\.(jpe?g|png|webp|gif)/i.test(src)
  ).length;
  checks.push(
    C(
      "tech_img_names",
      "tecnico",
      "Nombres de imagen",
      imgTotal === 0 ? "na" : genericImages === 0 ? "pass" : genericImages <= 2 ? "warn" : "fail",
      "bajo",
      imgTotal === 0 ? "sin imágenes" : `${genericImages} nombres genéricos`,
      "Renombra las imágenes con la keyword y el servicio (ej: cambio-aceite-bogota.webp).",
      "tecnico"
    )
  );

  let missingSrcset = 0;
  imgs.each((_, el) => {
    if (!$(el).attr("srcset")) missingSrcset++;
  });
  checks.push(
    C(
      "tech_img_srcset",
      "tecnico",
      "Imágenes responsive",
      imgTotal === 0 ? "na" : missingSrcset === 0 ? "pass" : missingSrcset <= 2 ? "warn" : "fail",
      "bajo",
      imgTotal === 0 ? "sin imágenes" : `${missingSrcset} de ${imgTotal} sin srcset`,
      "Añade srcset/sizes para servir la imagen adecuada en móvil.",
      "tecnico"
    )
  );

  const viewport = ($('meta[name="viewport"]').attr("content") || "").toLowerCase();
  checks.push(
    C("tech_viewport", "tecnico", "Adaptada a móvil", viewport.includes("width=device-width") ? "pass" : "fail", "alto", viewport || "sin meta viewport", "Añade <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">.")
  );

  const lang = ($("html").attr("lang") || "").trim();
  checks.push(C("tech_lang", "tecnico", "Idioma declarado", lang ? "pass" : "fail", "bajo", lang ? `lang="${lang}"` : "sin atributo lang", "Declara el idioma en <html lang=\"es\">."));

  const finalPath = new URL(page.finalUrl).pathname;
  const urlIssues: string[] = [];
  if (/[A-Z]/.test(finalPath)) urlIssues.push("mayúsculas");
  if (/_/.test(finalPath)) urlIssues.push("guiones bajos");
  if (finalPath.length > 75) urlIssues.push("URL larga");
  if (/(?:sessionid|phpsessid|jsessionid)/i.test(page.finalUrl)) urlIssues.push("session id");
  if (/\?/.test(page.finalUrl)) urlIssues.push("parámetros");
  checks.push(
    C(
      "tech_url_structure",
      "tecnico",
      "Estructura de URL",
      urlIssues.length === 0 ? "pass" : urlIssues.length <= 1 ? "warn" : "fail",
      "bajo",
      urlIssues.length ? urlIssues.join(", ") : "URL limpia",
      "Usa minúsculas, guiones y evita parámetros innecesarios.",
      "tecnico"
    )
  );

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

  const headingLevels: number[] = [];
  $("h1,h2,h3,h4,h5,h6").each((_, el) => {
    const tag = ($(el).prop("tagName") || "").toString().toLowerCase();
    const level = Number(tag.replace("h", ""));
    if (level >= 1 && level <= 6) headingLevels.push(level);
  });
  let headingSkips = 0;
  for (let index = 1; index < headingLevels.length; index++) {
    if (headingLevels[index] > headingLevels[index - 1] + 1) headingSkips++;
  }
  checks.push(
    C(
      "on_heading_order",
      "onpage",
      "Orden de encabezados",
      headingLevels.length < 2 ? "na" : headingSkips === 0 ? "pass" : headingSkips === 1 ? "warn" : "fail",
      "medio",
      headingLevels.length < 2
        ? "menos de 2 encabezados"
        : `${headingLevels.slice(0, 20).join(" → ")}${headingLevels.length > 20 ? " …" : ""}`,
      "No saltes niveles: H1 → H2 → H3.",
      "onpage"
    )
  );

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
    C(
      "on_schema",
      "onpage",
      "Datos estructurados",
      hasRelevant ? "pass" : "warn",
      "medio",
      ldTypes.length
        ? ldTypes.join(", ")
        : "sin JSON-LD visible en HTML; si el CMS lo inyecta por JS, verificar en Rich Results",
      "Añade JSON-LD de LocalBusiness, Service y FAQPage; si ya existe, verifica con Rich Results Test.",
      "onpage"
    )
  );

  const hreflangLinks: Array<{ lang: string; href: string }> = [];
  $('link[rel="alternate"][hreflang]').each((_, el) => {
    const lang = ($(el).attr("hreflang") || "").trim();
    const href = ($(el).attr("href") || "").trim();
    if (lang && href) hreflangLinks.push({ lang, href });
  });
  checks.push(
    C(
      "on_hreflang",
      "onpage",
      "Hreflang",
      hreflangLinks.length > 0 ? "pass" : "na",
      "bajo",
      hreflangLinks.length > 0 ? `${hreflangLinks.length} alternates` : "sitio de un solo idioma",
      "Solo necesario si hay versiones por idioma o región.",
      "internacional"
    )
  );

  const selfUrl = normalizeUrl(page.finalUrl, page.finalUrl);
  const selfHreflang = hreflangLinks.some(
    (link) => normalizeUrl(link.href, page.finalUrl) === selfUrl
  );
  checks.push(
    C(
      "on_hreflang_self",
      "onpage",
      "Hreflang autorreferente",
      hreflangLinks.length === 0 ? "na" : selfHreflang ? "pass" : "fail",
      "bajo",
      hreflangLinks.length === 0
        ? "sin hreflang"
        : selfHreflang
        ? "la página se incluye a sí misma"
        : "falta la entrada autorreferente",
      "Incluye la propia página dentro del conjunto hreflang.",
      "internacional"
    )
  );

  const hasXDefault = hreflangLinks.some((link) => link.lang.toLowerCase() === "x-default");
  checks.push(
    C(
      "on_hreflang_xdefault",
      "onpage",
      "Hreflang x-default",
      hreflangLinks.length === 0 ? "na" : hasXDefault ? "pass" : "warn",
      "bajo",
      hreflangLinks.length === 0 ? "sin hreflang" : hasXDefault ? "x-default presente" : "sin x-default",
      "Añade x-default apuntando a la versión por defecto o al selector de idioma.",
      "internacional"
    )
  );

  const invalidHreflang = hreflangLinks.filter(
    (link) =>
      link.lang.toLowerCase() !== "x-default" &&
      (!/^[a-z]{2}(-[a-z]{2})?$/i.test(link.lang) || /-UK$/i.test(link.lang))
  );
  checks.push(
    C(
      "on_hreflang_codes",
      "onpage",
      "Códigos hreflang",
      hreflangLinks.length === 0 ? "na" : invalidHreflang.length === 0 ? "pass" : "fail",
      "bajo",
      hreflangLinks.length === 0
        ? "sin hreflang"
        : invalidHreflang.length
        ? `inválidos: ${invalidHreflang.map((link) => link.lang).join(", ")}`
        : "códigos válidos",
      "Usa ISO 639-1 + ISO 3166-1 (ej: en-GB, nunca en-UK).",
      "internacional"
    )
  );

  const hreflangStatus = ctx.hreflangStatus ?? [];
  const hreflangBroken = hreflangStatus.filter((item) => !item.ok && !item.unknown);
  checks.push(
    C(
      "on_hreflang_status",
      "onpage",
      "Estado de las versiones hreflang",
      hreflangStatus.length === 0 ? "na" : hreflangBroken.length === 0 ? "pass" : hreflangBroken.length === 1 ? "warn" : "fail",
      "bajo",
      hreflangStatus.length === 0
        ? "sin alternates comprobados"
        : `${hreflangStatus.length} comprobadas · ${hreflangBroken.length} con error`,
      "Todas las URLs hreflang deben responder 200 y ser indexables.",
      "internacional"
    )
  );

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

  const brokenLinksCheck = ctx.brokenLinks ?? [];
  const brokenLinksBad = brokenLinksCheck.filter((item) => !item.ok && !item.unknown);
  checks.push(
    C(
      "on_broken_links",
      "onpage",
      "Enlaces internos roto",
      brokenLinksCheck.length === 0 ? "na" : brokenLinksBad.length === 0 ? "pass" : brokenLinksBad.length === 1 ? "warn" : "fail",
      "medio",
      brokenLinksCheck.length === 0
        ? "sin enlaces comprobados"
        : `${brokenLinksCheck.length} comprobados · ${brokenLinksBad.length} con error`,
      "Corrige o elimina los enlaces internos que devuelven error.",
      "onpage"
    )
  );

  const wordCount = text.split(/\s+/).filter(Boolean).length;
  checks.push(
    C(
      "on_word_count",
      "onpage",
      "Profundidad de contenido",
      wordCount >= 300 ? "pass" : wordCount >= 150 ? "warn" : "fail",
      "medio",
      `${wordCount} palabras`,
      "Añade contenido útil: servicios, preguntas frecuentes y casos."
    )
  );

  let anchorTotal = 0;
  let genericAnchors = 0;
  $("a[href]").each((_, el) => {
    const anchorText = $(el).text().replace(/\s+/g, " ").trim();
    if (!anchorText) {
      genericAnchors++;
      anchorTotal++;
      return;
    }
    anchorTotal++;
    if (/^(clic|click|clic aqui|clic aqu\u00ed|aqui|aqu\u00ed|leer mas|leer m\u00e1s|ver mas|ver m\u00e1s|mas|m\u00e1s|ir|link|este enlace)$/i.test(anchorText)) {
      genericAnchors++;
    }
  });
  checks.push(
    C(
      "on_anchor_text",
      "onpage",
      "Texto de los enlaces",
      anchorTotal === 0 ? "na" : genericAnchors === 0 ? "pass" : genericAnchors <= 2 ? "warn" : "fail",
      "bajo",
      anchorTotal === 0 ? "sin enlaces" : `${genericAnchors} de ${anchorTotal} genéricos`,
      "Usa texto descriptivo («Pedir cita», «Ver servicio») en lugar de «clic aquí».",
      "onpage"
    )
  );

  let aboutLinks = 0;
  let contactLinks = 0;
  $("a[href]").each((_, el) => {
    const href = ($(el).attr("href") || "").toLowerCase();
    if (/nosotros|about|qui[eé]nes|equipo|team|historia/.test(href)) aboutLinks++;
    if (/contacto|contact/.test(href)) contactLinks++;
  });
  checks.push(
    C(
      "on_eeat_pages",
      "onpage",
      "Páginas de confianza",
      aboutLinks + contactLinks > 0 ? "pass" : "warn",
      "bajo",
      `${aboutLinks} sobre nosotros · ${contactLinks} contacto`,
      "Enlaza «Nosotros/Equipo» y «Contacto» para reforzar E-E-A-T.",
      "eeat"
    )
  );

  const reviewSignal =
    /(rese[\u00f1n]as?|reviews?|testimonios?|opiniones|casos de [e\u00e9]xito)/i.test(text) ||
    $('a[href*="google.com/maps"], a[href*="g.page"], a[href*="trustpilot"]').length > 0;
  checks.push(
    C(
      "on_reviews",
      "onpage",
      "Prueba social",
      reviewSignal ? "pass" : "warn",
      "bajo",
      reviewSignal ? "reseñas/testimonios detectados" : "sin reseñas o testimonios visibles",
      "Muestra reseñas, testimonios o casos reales.",
      "eeat"
    )
  );

  const eeatTrust =
    $('a[href*="privacidad"], a[href*="aviso-legal"], a[href*="terminos"], a[href*="t\u00e9rminos"]').length > 0;
  checks.push(
    C(
      "on_trust",
      "onpage",
      "Señales de confianza",
      eeatTrust ? "pass" : "warn",
      "bajo",
      eeatTrust ? "políticas legales visibles" : "sin enlaces legales visibles",
      "Publica privacidad, términos y aviso legal.",
      "eeat"
    )
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

  const auditBusiness = ctx.business;
  if (auditBusiness) {
    const businessPhoneDigits = (auditBusiness.phone || "").replace(/\D/g, "");
    const pageDigits = text.replace(/\D/g, "");
    const phoneFound =
      businessPhoneDigits.length >= 7 && pageDigits.includes(businessPhoneDigits.slice(-7));
    const addressTokens = (auditBusiness.address || auditBusiness.city || "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((token) => token.length > 3);
    const addressFound = addressTokens.some((token) => lower.includes(token));
    checks.push(
      C(
        "loc_nap_consistency",
        "local",
        "NAP coherente con la ficha",
        phoneFound && addressFound ? "pass" : "warn",
        "medio",
        `${phoneFound ? "teléfono visible" : "teléfono no visible"} · ${
          addressFound ? "dirección visible" : "dirección no visible"
        }`,
        "Alinea nombre, dirección y teléfono con Google y OpenStreetMap.",
        "local"
      )
    );

    const city = (auditBusiness.city || addressTokens[0] || "").toLowerCase();
    const cityFound =
      city.length > 2 &&
      (title.toLowerCase().includes(city) ||
        h1Text.toLowerCase().includes(city) ||
        lower.includes(city));
    checks.push(
      C(
        "loc_city_content",
        "local",
        "Ciudad en el contenido",
        cityFound ? "pass" : "warn",
        "bajo",
        city ? (cityFound ? `"${city}" visible` : `"${city}" no visible`) : "sin ciudad en la ficha",
        "Menciona la ciudad en el título, H1 y contenido local.",
        "local"
      )
    );

    const gbpLinks = $(
      'a[href*="g.page"], a[href*="business.google.com"], a[href*="maps.app.goo.gl"]'
    ).length;
    checks.push(
      C(
        "loc_gbp",
        "local",
        "Perfil de Google Business",
        gbpLinks > 0 ? "pass" : "warn",
        "bajo",
        `${gbpLinks} enlaces a Google Business`,
        "Enlaza tu ficha de Google Business Profile.",
        "local"
      )
    );
  } else {
    checks.push(
      C(
        "loc_nap_consistency",
        "local",
        "NAP coherente con la ficha",
        "na",
        "medio",
        "sin datos del negocio",
        "Compara el NAP con Google y OpenStreetMap.",
        "local"
      )
    );
    checks.push(
      C(
        "loc_city_content",
        "local",
        "Ciudad en el contenido",
        "na",
        "bajo",
        "sin datos del negocio",
        "Menciona la ciudad en título, H1 y contenido.",
        "local"
      )
    );
  }

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
    .filter((t) => /presupuesto|contactar|llamar|reservar|reserva|cita|solicitar|solicita|comprar|escr[ií]benos|agenda|diagn[oó]stico|cotiza|empezar|hablar|descubrir|pide/i.test(t));
  checks.push(C("conv_cta", "conversion", "Llamadas a la acción", ctaMatches.length >= 2 ? "pass" : ctaMatches.length === 1 ? "warn" : "fail", "medio", `${ctaMatches.length} CTAs detectadas`, "Coloca CTAs claros («Pedir presupuesto», «Llamar») en cada sección."));

  const legal = $('a[href*="privacidad"], a[href*="aviso-legal"], a[href*="aviso legal"], a[href*="politica"], a[href*="legal"]').length;
  checks.push(C("conv_legal", "conversion", "Aviso legal y privacidad", legal >= 2 ? "pass" : legal === 1 ? "warn" : "fail", "medio", `${legal} enlaces legales`, "Publica aviso legal, privacidad y tratamiento de datos (Ley 1581 de Colombia)."));

  const currentYear = new Date().getFullYear();
  const years = [...text.matchAll(/(20\d{2})/g)].map((m) => Number(m[1]));
  const maxYear = years.length ? Math.max(...years) : 0;
  checks.push(
    C("conv_copyright", "conversion", "Contenido actualizado", maxYear >= currentYear - 1 ? "pass" : maxYear > 0 ? "warn" : "fail", "bajo", maxYear ? `año ${maxYear}` : "sin año visible", "Actualiza el copyright y revisa contenidos antiguos.")
  );

  const GROUP_BY_AREA: Record<AuditArea, AuditGroup> = {
    indexacion: "rastreo",
    tecnico: "tecnico",
    onpage: "onpage",
    local: "local",
    conversion: "conversion",
  };
  for (const check of checks) {
    if (!check.group) check.group = GROUP_BY_AREA[check.area];
  }

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
