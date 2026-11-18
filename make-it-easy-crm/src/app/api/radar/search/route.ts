import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthRole } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { searchOsm, zoneFromSelection, RadarUpstreamError } from '@/lib/radar/osm';
import { assertQuota, getUsage, recordSearch, RadarQuotaError, RADAR_LIMITS } from '@/lib/radar/quota';
import { readSearchCache, searchCacheKey, writeSearchCache } from '@/lib/radar/searchCache';
import { applyScanToBusiness, getFreshScans } from '@/lib/radar/siteScanStore';
import { isDeficientQuality } from '@/lib/radar/siteQuality';
import { normalizeRadius } from '@/lib/radar/radius';
import type { RadarBusiness, RadarZone, ZoneSelection } from '@/lib/radar/types';

export const maxDuration = 90;

interface SearchBody {
  zona?: string;
  nicho?: string;
  keyword?: string;
  mode?: 'fast' | 'exhaustive';
  onlyNew?: boolean;
  force?: boolean;
  zoneSelection?: unknown;
  radiusKm?: unknown;
  filtros?: {
    onlyNoWebsite?: boolean;
    onlyWithPhone?: boolean;
    hideUnnamed?: boolean;
    objective?: 'sin_web' | 'web_deficiente' | 'ambos';
    maxSiteGrade?: number | null;
    requireEmail?: boolean;
    whatsapp?: 'any' | 'sin_agente' | 'manual' | 'automation' | 'unknown';
  };
}

function isDeficientCandidate(business: RadarBusiness): boolean {
  if (business.websiteKind !== 'own') return false;
  return isDeficientQuality(business.siteQuality) || !business.siteQuality || business.siteQuality === 'unknown';
}

function zoneIsTiny(zone: RadarZone): boolean {
  const [s, w, n, e] = zone.bbox;
  const latKm = Math.abs(n - s) * 111.32;
  const lngKm = Math.abs(e - w) * 111.32 * Math.cos((((s + n) / 2) * Math.PI) / 180);
  return latKm * lngKm < 0.3 || Math.max(latKm, lngKm) < 1;
}

function parseZoneSelection(value: unknown): ZoneSelection | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const lat = Number(record.lat);
  const lng = Number(record.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null;
  }
  if (!Array.isArray(record.bbox) || record.bbox.length !== 4) return null;
  const bbox = record.bbox.map(Number);
  if (bbox.some((value) => !Number.isFinite(value))) return null;
  const displayName = typeof record.displayName === 'string' ? record.displayName.trim() : '';
  if (!displayName) return null;
  const label = typeof record.label === 'string' ? record.label.trim() : '';
  return {
    displayName,
    label: label || undefined,
    lat,
    lng,
    bbox: bbox as [number, number, number, number],
  };
}

function applyFilters(items: RadarBusiness[], body: SearchBody): RadarBusiness[] {
  const f = body.filtros ?? {};
  return items.filter((b) => {
    if (f.onlyNoWebsite && b.websiteKind === 'own') return false;
    if (f.onlyWithPhone && !b.phone) return false;
    if (f.hideUnnamed && b.name === '(sin nombre)') return false;
    if (f.objective === 'sin_web' && b.websiteKind === 'own') return false;
    if (f.objective === 'web_deficiente' && !isDeficientCandidate(b)) return false;
    if (typeof f.maxSiteGrade === 'number' && (b.siteGrade == null || b.siteQuality === 'unknown' || b.siteGrade > f.maxSiteGrade)) {
      return false;
    }
    if (f.requireEmail && !b.email) return false;
    if (f.whatsapp === 'sin_agente' && b.whatsappKind === 'automation') return false;
    if (f.whatsapp === 'manual' && b.whatsappKind !== 'manual') return false;
    if (f.whatsapp === 'automation' && b.whatsappKind !== 'automation') return false;
    if (f.whatsapp === 'unknown' && b.whatsappKind && b.whatsappKind !== 'unknown') return false;
    return true;
  });
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuthRole(request);
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const body = (await request.json()) as SearchBody;
    const selectedZone = parseZoneSelection(body.zoneSelection);
    const radiusKm = normalizeRadius(body.radiusKm);
    const zona = (body.zona || selectedZone?.displayName || '').trim();
    const nicho = (body.nicho || '').trim();
    const keyword = (body.keyword || '').trim();
    const mode = body.mode === 'exhaustive' ? 'exhaustive' : 'fast';

    if (!zona) {
      return NextResponse.json({ error: 'Escribe una zona (ciudad, barrio o código postal).' }, { status: 400 });
    }
    if (!nicho && !keyword) {
      return NextResponse.json({ error: 'Elige un nicho o escribe una palabra clave.' }, { status: 400 });
    }

    const key = searchCacheKey(
      zona,
      nicho,
      keyword,
      mode,
      [
        selectedZone ? `${selectedZone.lat.toFixed(5)},${selectedZone.lng.toFixed(5)}` : '',
        radiusKm ?? '',
      ]
        .filter(Boolean)
        .join('|')
    );
    let cachedRow = await readSearchCache(key);
    if (body.force) cachedRow = null;
    if (cachedRow && cachedRow.businesses.length === 0 && zoneIsTiny(cachedRow.zone)) {
      cachedRow = null;
    }

    let rawBusinesses: RadarBusiness[];
    let zone: RadarZone;
    let provider: string;
    let cached = false;
    let searchNote = "";
    let usage = await getUsage(auth.email);

    if (cachedRow) {
      rawBusinesses = cachedRow.businesses;
      zone = cachedRow.zone;
      provider = cachedRow.provider;
      cached = true;
      searchNote = zone.note ?? "";
    } else {
      usage = await assertQuota(auth.email, mode);
      const outcome = await searchOsm(
        zona,
        nicho,
        keyword,
        mode,
        selectedZone ? zoneFromSelection(selectedZone, radiusKm ?? undefined) : undefined,
        radiusKm ?? undefined
      );
      rawBusinesses = outcome.businesses;
      zone = outcome.zone;
      provider = outcome.provider;
      searchNote = outcome.note ?? zone.note ?? "";
      await writeSearchCache(key, zone, rawBusinesses, provider).catch(() => undefined);
    }

    const trimmed = rawBusinesses.slice(0, RADAR_LIMITS.maxResults);
    const ids = trimmed.map((b) => b.id);

    const existing = ids.length
      ? await prisma.radarBusiness.findMany({
          where: { externalId: { in: ids } },
          select: { externalId: true },
        })
      : [];
    const existingSet = new Set(existing.map((e) => e.externalId));

    const missing = trimmed.filter((b) => !existingSet.has(b.id));
    if (missing.length > 0) {
      await prisma.$transaction(
        missing.map((b) =>
          prisma.radarBusiness.upsert({
            where: { externalId: b.id },
            create: {
              externalId: b.id,
              name: b.name.slice(0, 240),
              category: b.category.slice(0, 160),
              address: b.address.slice(0, 300),
              phone: b.phone.slice(0, 60),
              website: b.website.slice(0, 500),
              websiteKind: b.websiteKind,
              source: b.source,
              score: b.score,
              payload: JSON.stringify(b),
            },
            update: {
              name: b.name.slice(0, 240),
              category: b.category.slice(0, 160),
              address: b.address.slice(0, 300),
              phone: b.phone.slice(0, 60),
              website: b.website.slice(0, 500),
              websiteKind: b.websiteKind,
              score: b.score,
              payload: JSON.stringify(b),
            },
          })
        )
      ).catch((err) => {
        console.error('POST /api/radar/search upsert error:', err);
      });
    }

    const [savedRows, auditRows] = await Promise.all([
      ids.length
        ? prisma.radarLead.findMany({
            where: { ownerEmail: auth.email, businessId: { in: ids } },
            select: { businessId: true },
          })
        : [],
      ids.length
        ? prisma.radarAudit.findMany({
            where: { radarPlaceId: { in: ids } },
            select: { radarPlaceId: true },
          })
        : [],
    ]);

    const savedSet = new Set(savedRows.map((r) => r.businessId));
    const auditSet = new Set(auditRows.map((r) => r.radarPlaceId));

    const scans = await getFreshScans(ids);
    let enriched: RadarBusiness[] = trimmed.map((b) =>
      applyScanToBusiness(
        {
          ...b,
          niche: b.niche ?? (nicho || keyword),
          isNew: !existingSet.has(b.id),
          saved: savedSet.has(b.id),
          audited: auditSet.has(b.id),
        },
        scans.get(b.id)
      )
    );

    const newCount = enriched.filter((b) => b.isNew).length;

    if (!cached) {
      await recordSearch({
        email: auth.email,
        zoneKey: zona,
        niche: nicho || keyword,
        mode,
        provider,
        resultCount: enriched.length,
        newCount,
        cached: false,
      }).catch(() => undefined);
      usage = await getUsage(auth.email);
    }

    enriched = applyFilters(enriched, body);
    if (body.onlyNew) enriched = enriched.filter((b) => !b.saved);

    const siteScannedCount = enriched.filter(
      (b) => b.websiteKind === 'own' && b.siteQuality && b.siteQuality !== 'unknown'
    ).length;
    const siteDeficientCount = enriched.filter((b) => isDeficientQuality(b.siteQuality)).length;
    const whatsappScannedCount = enriched.filter(
      (b) => b.whatsappKind && b.whatsappKind !== 'unknown'
    ).length;
    const whatsappAutomationCount = enriched.filter((b) => b.whatsappKind === 'automation').length;
    const unknownSites = enriched.filter(
      (b) => b.websiteKind === 'own' && (!b.siteQuality || b.siteQuality === 'unknown')
    ).length;

    return NextResponse.json({
      zone,
      businesses: enriched,
      source: 'osm',
      provider,
      total: enriched.length,
      newCount,
      savedCount: enriched.filter((b) => b.saved).length,
      siteScannedCount,
      siteDeficientCount,
      whatsappScannedCount,
      whatsappAutomationCount,
      cached,
      usage,
      warnings: [
        'Fuente gratuita: OpenStreetMap. No incluye reseñas ni valoraciones de Google.',
        ...(searchNote ? [searchNote] : []),
        ...(cached ? ['Resultado desde caché: no consume búsqueda.'] : []),
        ...(unknownSites > 0 && body.filtros?.objective === 'web_deficiente'
          ? [`${unknownSites} web(s) aún sin analizar. Pulsa «Analizar webs» para confirmar su calidad.`]
          : []),
      ],
    });
  } catch (error) {
    if (error instanceof RadarQuotaError) {
      return NextResponse.json({ error: error.message, code: error.code, usage: error.usage }, { status: 429 });
    }
    if (error instanceof RadarUpstreamError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('POST /api/radar/search error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error buscando negocios' },
      { status: 500 }
    );
  }
}
