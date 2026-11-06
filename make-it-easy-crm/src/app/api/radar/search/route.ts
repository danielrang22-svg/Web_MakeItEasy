import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthRole } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { searchOsm, RadarUpstreamError } from '@/lib/radar/osm';
import { assertQuota, getUsage, recordSearch, RadarQuotaError, RADAR_LIMITS } from '@/lib/radar/quota';
import { readSearchCache, searchCacheKey, writeSearchCache } from '@/lib/radar/searchCache';
import type { RadarBusiness, RadarZone } from '@/lib/radar/types';

export const maxDuration = 90;

interface SearchBody {
  zona?: string;
  nicho?: string;
  keyword?: string;
  mode?: 'fast' | 'exhaustive';
  onlyNew?: boolean;
  filtros?: {
    onlyNoWebsite?: boolean;
    onlyWithPhone?: boolean;
    hideUnnamed?: boolean;
  };
}

function applyFilters(items: RadarBusiness[], body: SearchBody): RadarBusiness[] {
  const f = body.filtros ?? {};
  return items.filter((b) => {
    if (f.onlyNoWebsite && b.websiteKind === 'own') return false;
    if (f.onlyWithPhone && !b.phone) return false;
    if (f.hideUnnamed && b.name === '(sin nombre)') return false;
    return true;
  });
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuthRole(request);
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const body = (await request.json()) as SearchBody;
    const zona = (body.zona || '').trim();
    const nicho = (body.nicho || '').trim();
    const keyword = (body.keyword || '').trim();
    const mode = body.mode === 'exhaustive' ? 'exhaustive' : 'fast';

    if (!zona) {
      return NextResponse.json({ error: 'Escribe una zona (ciudad, barrio o código postal).' }, { status: 400 });
    }
    if (!nicho && !keyword) {
      return NextResponse.json({ error: 'Elige un nicho o escribe una palabra clave.' }, { status: 400 });
    }

    const key = searchCacheKey(zona, nicho, keyword, mode);
    const cachedRow = await readSearchCache(key);

    let rawBusinesses: RadarBusiness[];
    let zone: RadarZone;
    let provider: string;
    let cached = false;
    let usage = await getUsage(auth.email);

    if (cachedRow) {
      rawBusinesses = cachedRow.businesses;
      zone = cachedRow.zone;
      provider = cachedRow.provider;
      cached = true;
    } else {
      usage = await assertQuota(auth.email, mode);
      const outcome = await searchOsm(zona, nicho, keyword, mode);
      rawBusinesses = outcome.businesses;
      zone = outcome.zone;
      provider = outcome.provider;
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

    if (!cached && trimmed.length > 0) {
      await prisma.$transaction(
        trimmed.map((b) =>
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
              seenCount: { increment: 1 },
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

    let enriched: RadarBusiness[] = trimmed.map((b) => ({
      ...b,
      isNew: !existingSet.has(b.id),
      saved: savedSet.has(b.id),
      audited: auditSet.has(b.id),
    }));

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

    return NextResponse.json({
      zone,
      businesses: enriched,
      source: 'osm',
      provider,
      total: enriched.length,
      newCount,
      savedCount: enriched.filter((b) => b.saved).length,
      cached,
      usage,
      warnings: [
        'Fuente gratuita: OpenStreetMap. No incluye reseñas ni valoraciones de Google.',
        ...(cached ? ['Resultado desde caché: no consume búsqueda.'] : []),
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
