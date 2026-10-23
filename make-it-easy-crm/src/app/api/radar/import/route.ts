import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthRole } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { sanitize } from '@/lib/validate';

export async function POST(request: NextRequest) {
  const auth = await verifyAuthRole(request);
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const body = await request.json();
    const b = body?.business ?? {};

    if (!b.id || !b.name) {
      return NextResponse.json({ error: 'Faltan datos del negocio' }, { status: 400 });
    }

    const existing = await prisma.lead.findFirst({ where: { radarPlaceId: String(b.id) } });
    if (existing) {
      return NextResponse.json({ leadId: existing.id, duplicated: true });
    }

    const notes = [
      b.address ? `Dirección: ${b.address}` : '',
      b.website ? `Web: ${b.website}` : 'Sin web registrada (OpenStreetMap)',
      typeof b.score === 'number' ? `Puntuación de oportunidad: ${b.score}/100` : '',
      b.mapsUrl ? `Mapa: ${b.mapsUrl}` : '',
      'Origen: Radar de Clientes',
    ]
      .filter(Boolean)
      .join('\n');

    const lead = await prisma.lead.create({
      data: {
        titulo: sanitize(String(b.name)).slice(0, 200),
        nombreContacto: sanitize(String(b.name)).slice(0, 200),
        empresa: sanitize(String(b.name)).slice(0, 200),
        valorEstimado: 0,
        telefono: sanitize(String(b.phone ?? '')),
        email: '',
        notas: sanitize(notes),
        etapa: 'NUEVO',
        origenLead: 'Radar',
        sector: sanitize(String(b.category ?? '')),
        radarPlaceId: String(b.id),
      },
    });

    return NextResponse.json({ leadId: lead.id, duplicated: false }, { status: 201 });
  } catch (error) {
    console.error('POST /api/radar/import error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No se pudo crear el lead' },
      { status: 500 }
    );
  }
}
