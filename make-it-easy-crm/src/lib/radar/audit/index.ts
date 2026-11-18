import { load } from "cheerio";
import { assertPublicUrl, checkUrls, fetchText, followRedirects } from "./fetch";
import { areaScores, runChecks } from "./checks";
import {
  AREA_META,
  type AuditAreaScore,
  type AuditBusiness,
  type AuditCheck,
  type AuditReport,
} from "./types";

const cache = new Map<string, { at: number; report: AuditReport }>();
const TTL = 1000 * 60 * 60 * 24;

export interface RunAuditOptions {
  business?: AuditBusiness;
}

export async function runAudit(rawUrl: string, options: RunAuditOptions = {}): Promise<AuditReport> {
  const url = assertPublicUrl(rawUrl).toString();
  const business = options.business;
  const cacheKey = `${url}|${business?.name ?? ""}|${business?.address ?? ""}|${business?.phone ?? ""}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < TTL) return hit.report;

  const started = Date.now();
  const page = await fetchText(url, 18000);

  if (!page.ok || !page.html) {
    throw new Error(
      page.error
        ? `No se pudo acceder a la web: ${page.error}`
        : `La web respondió ${page.status ?? "sin respuesta"}`
    );
  }

  const origin = new URL(page.finalUrl).origin;
  const httpUrl = url.startsWith("https:") ? url.replace("https:", "http:") : url;
  const notFoundUrl = `${origin}/radar-404-${Date.now().toString(36)}`;

  const [robots, sitemap, notFound, redirectChain] = await Promise.all([
    fetchText(`${origin}/robots.txt`, 7000),
    fetchText(`${origin}/sitemap.xml`, 7000),
    fetchText(notFoundUrl, 7000),
    followRedirects(httpUrl, 5, 6000),
  ]);

  const $ = load(page.html);
  const finalHost = new URL(page.finalUrl).hostname;
  const internalLinks: string[] = [];
  $("a[href]").each((_, el) => {
    const href = ($(el).attr("href") || "").trim();
    if (!href || href.startsWith("#") || /^(mailto|tel|javascript):/i.test(href)) return;
    try {
      const target = new URL(href, page.finalUrl);
      if (target.hostname !== finalHost) return;
      if (/\.(png|jpe?g|gif|webp|svg|pdf|zip|mp4|mp3)$/i.test(target.pathname)) return;
      internalLinks.push(target.toString());
    } catch {
      // ignorar
    }
  });

  const hreflangUrls: string[] = [];
  $('link[rel="alternate"][hreflang]').each((_, el) => {
    const href = ($(el).attr("href") || "").trim();
    if (!href) return;
    try {
      hreflangUrls.push(new URL(href, page.finalUrl).toString());
    } catch {
      // ignorar
    }
  });

  const sitemapUrls = [...sitemap.html.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)]
    .map((match) => match[1])
    .slice(0, 5);

  const [brokenLinks, hreflangStatus, sitemapStatus] = await Promise.all([
    checkUrls(internalLinks.slice(0, 6)),
    checkUrls(hreflangUrls.slice(0, 5)),
    checkUrls(sitemapUrls),
  ]);

  const httpRedirect = {
    status: redirectChain.chain[0]?.status ?? null,
    location: redirectChain.chain[0]?.location ?? null,
  };

  const { checks, title, description } = runChecks({
    page,
    robots,
    sitemap,
    httpRedirect,
    notFound,
    redirectChain,
    brokenLinks,
    hreflangStatus,
    sitemapStatus,
    business,
  });

  const rawAreas = areaScores(checks);
  const areas: AuditAreaScore[] = rawAreas.map((a) => ({
    ...a,
    label: AREA_META[a.area].label,
    weight: AREA_META[a.area].weight,
  }));

  const evaluable = areas.filter((a) => a.score !== null);
  const weightSum = evaluable.reduce((sum, a) => sum + a.weight, 0);
  const globalScore = weightSum
    ? Math.round(evaluable.reduce((sum, a) => sum + (a.score as number) * a.weight, 0) / weightSum)
    : 0;

  const potentialScore = Math.max(globalScore, Math.min(99, Math.round(globalScore + (100 - globalScore) * 0.55)));

  const quickWins = unique(
    checks
      .filter((c) => (c.status === "fail" || c.status === "warn") && (c.impact === "alto" || c.weight === 2))
      .slice(0, 8)
      .map((c) => c.fix)
  ).slice(0, 6);

  const critical = checks.filter((c) => c.status === "fail" && c.weight === 2).map((c) => c.label);

  const report: AuditReport = {
    url,
    finalUrl: page.finalUrl,
    fetchedAt: new Date().toISOString(),
    durationMs: Date.now() - started,
    globalScore,
    potentialScore,
    areas,
    checks,
    quickWins,
    critical,
    meta: {
      status: page.status,
      responseMs: page.ms,
      htmlBytes: page.bytes,
      compressed: /gzip|br|deflate/.test(page.headers["content-encoding"] || ""),
      title,
      description,
    },
  };

  cache.set(cacheKey, { at: Date.now(), report });
  return report;
}

export function sortChecks(checks: AuditCheck[]): AuditCheck[] {
  const order = { fail: 0, warn: 1, pass: 2, na: 3 } as const;
  return [...checks].sort((a, b) => order[a.status] - order[b.status] || b.weight - a.weight);
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
