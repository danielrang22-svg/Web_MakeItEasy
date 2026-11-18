import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthRole } from '@/lib/auth';
import { findCategory } from '@/lib/radar/categories';
import { RadarUpstreamError, searchOsm, zoneFromSelection } from '@/lib/radar/osm';
import { normalizeRadius } from '@/lib/radar/radius';
import { applyScanToBusiness, getFreshScans } from '@/lib/radar/siteScanStore';
import type { ZoneSelection } from '@/lib/radar/types';

export const maxDuration = 60;

interface CompetitorsBody {
  businessId?: unknown;
  name?: unknown;
  lat?: unknown;
  lng?: unknown;
  niche?: unknown;
  category?: unknown;
  radiusKm?: unknown;
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuthRole(request);
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const body = (await request.json()) as CompetitorsBody;
    const lat = Number(body.lat);
    const lng = Number(body.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json({ error: 'Faltan coordenadas válidas del negocio' }, { status: 400 });
    }

    const niche = typeof body.niche === 'string' ? body.niche.trim() : '';
    const category = typeof body.category === 'string' ? body.category.trim() : '';
    if (!niche && !category) {
      return NextResponse.json({ error: 'Falta el nicho o la categoría' }, { status: 400 });
    }

    const radiusKm = normalizeRadius(body.radiusKm) ?? 2.5;
    const businessId = typeof body.businessId === 'string' ? body.businessId : '';
    const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : 'Competencia';

    const selection: ZoneSelection = {
      displayName: `${name} · competencia`,
      label: name,
      lat,
      lng,
      bbox: [lat - 0.02, lng - 0.02, lat + 0.02, lng + 0.02],
    };
    const zone = zoneFromSelection(selection, radiusKm);
    const validNiche = niche && findCategory(niche) ? niche : '';
    const keyword = validNiche ? '' : niche || category;
    const outcome = await searchOsm(name, validNiche, keyword, 'fast', zone, radiusKm);
    const ids = outcome.businesses.map((business) => business.id);
    const scans = await getFreshScans(ids);
    const competitors = outcome.businesses
      .filter((business) => business.id !== businessId)
      .map((business) => applyScanToBusiness(business, scans.get(business.id)))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    return NextResponse.json({
      zone: outcome.zone,
      provider: outcome.provider,
      note: outcome.note,
      competitors,
    });
  } catch (error) {
    if (error instanceof RadarUpstreamError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('POST /api/radar/competitors error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No se pudo comparar la competencia' },
      { status: 500 }
    );
  }
}
