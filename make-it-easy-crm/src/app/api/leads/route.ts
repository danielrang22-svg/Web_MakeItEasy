import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuthRole } from '@/lib/auth';
import { requireFields, requireNumber, sanitize } from '@/lib/validate';

export async function GET(request: NextRequest) {
  const auth = await verifyAuthRole(request);
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const leads = await prisma.lead.findMany({
      orderBy: { fechaCreacion: 'desc' },
    });
    return NextResponse.json(leads);
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching leads' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuthRole(request);
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const body = await request.json();

    const fieldError = requireFields(body, ['nombreContacto', 'empresa', 'etapa']);
    if (fieldError) return NextResponse.json({ error: fieldError }, { status: 400 });

    const numError = requireNumber(body, 'valorEstimado');
    if (numError) return NextResponse.json({ error: numError }, { status: 400 });

    const newLead = await prisma.lead.create({
      data: {
        titulo: sanitize(body.titulo) || '',
        nombreContacto: sanitize(body.nombreContacto),
        empresa: sanitize(body.empresa),
        valorEstimado: Number(body.valorEstimado) || 0,
        telefono: sanitize(body.telefono) || '',
        email: sanitize(body.email) || '',
        notas: sanitize(body.notas) || '',
        etapa: body.etapa,
        origenLead: sanitize(body.origenLead) || 'Manual',
        
        // Custom Make It Easy fields
        sector: sanitize(body.sector) || '',
        numEmpleados: sanitize(body.numEmpleados) || '',
        procesoAAutomatizar: sanitize(body.procesoAAutomatizar) || '',
        planInteres: sanitize(body.planInteres) || '',
      },
    });
    return NextResponse.json(newLead, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Error creating lead' }, { status: 500 });
  }
}
