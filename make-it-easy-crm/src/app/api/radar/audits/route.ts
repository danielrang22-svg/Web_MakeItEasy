import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthRole } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const auth = await verifyAuthRole(request);
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const placeId = request.nextUrl.searchParams.get('businessId');
  if (!placeId) return NextResponse.json({ error: 'Falta businessId' }, { status: 400 });

  const rows = await prisma.radarAudit.findMany({
    where: { radarPlaceId: placeId },
    orderBy: { createdAt: 'desc' },
    take: 12,
    select: { id: true, createdAt: true, globalScore: true, potentialScore: true, url: true },
  });

  return NextResponse.json({ audits: rows });
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuthRole(request);
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const body = await request.json();
    const { businessId, businessName, url, report } = body ?? {};

    if (!businessId || !businessName || !report) {
      return NextResponse.json({ error: 'Faltan datos de la auditoría' }, { status: 400 });
    }

    const created = await prisma.radarAudit.create({
      data: {
        radarPlaceId: String(businessId),
        businessName: String(businessName).slice(0, 200),
        url: url ? String(url).slice(0, 500) : null,
        globalScore: Number(report.globalScore) || 0,
        potentialScore: Number(report.potentialScore) || 0,
        areaScores: JSON.stringify(report.areas ?? []),
        checksJson: JSON.stringify(report.checks ?? []),
      },
      select: { id: true, createdAt: true, globalScore: true, potentialScore: true },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('POST /api/radar/audits error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No se pudo guardar la auditoría' },
      { status: 500 }
    );
  }
}
