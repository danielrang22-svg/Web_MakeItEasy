import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthRole } from '@/lib/auth';
import { searchOsm, RadarUpstreamError } from '@/lib/radar/osm';
import type { RadarBusiness } from '@/lib/radar/types';

export const maxDuration = 90;

interface SearchBody {
  zona?: string;
  nicho?: string;
  keyword?: string;
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

    if (!zona) {
      return NextResponse.json({ error: 'Escribe una zona (ciudad, barrio o código postal).' }, { status: 400 });
    }
    if (!nicho && !keyword) {
      return NextResponse.json({ error: 'Elige un nicho o escribe una palabra clave.' }, { status: 400 });
    }

    const { zone, businesses, cached } = await searchOsm(zona, nicho, keyword);
    const filtered = applyFilters(businesses, body);

    return NextResponse.json({
      zone,
      businesses: filtered,
      source: 'osm',
      total: filtered.length,
      cached,
      warnings: [
        'Fuente gratuita: OpenStreetMap. No incluye reseñas ni valoraciones de Google, así que la puntuación se calcula con web, teléfono, dirección y horario.',
      ],
    });
  } catch (error) {
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
