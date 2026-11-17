import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthRole } from '@/lib/auth';
import { RadarUpstreamError, suggestZones } from '@/lib/radar/osm';

export const maxDuration = 20;

export async function GET(request: NextRequest) {
  const auth = await verifyAuthRole(request);
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const q = (request.nextUrl.searchParams.get('q') || '').trim();
  if (q.length < 3) return NextResponse.json({ suggestions: [] });

  try {
    const suggestions = await suggestZones(q);
    return NextResponse.json({ suggestions });
  } catch (error) {
    if (error instanceof RadarUpstreamError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('GET /api/radar/zones error:', error);
    return NextResponse.json({ error: 'No se pudieron buscar zonas' }, { status: 500 });
  }
}
