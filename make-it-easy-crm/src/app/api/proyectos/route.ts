import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuthRole } from '@/lib/auth';
import { requireFields, sanitize } from '@/lib/validate';

export async function GET(request: NextRequest) {
  const auth = await verifyAuthRole(request);
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const proyectos = await prisma.proyecto.findMany({
      orderBy: { fechaCreacion: 'desc' },
    });
    return NextResponse.json(proyectos);
  } catch (error) {
    console.error('GET /api/proyectos error:', error);
    return NextResponse.json({ error: 'Error fetching proyectos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuthRole(request);
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const body = await request.json();
    const fieldError = requireFields(body, ['cotizacionId', 'titulo', 'clienteNombre', 'estado']);
    if (fieldError) return NextResponse.json({ error: fieldError }, { status: 400 });

    let valorTotal = 0;
    let moneda = "COP";

    if (body.cotizacionId) {
      const cot = await prisma.cotizacion.findUnique({
        where: { id: body.cotizacionId }
      });
      if (cot) {
        valorTotal = cot.totalProyectoCore;
        moneda = cot.moneda;
      }
    }

    const newProyecto = await prisma.proyecto.create({
      data: {
        leadId:               body.leadId            || null,
        cotizacionId:         body.cotizacionId,
        titulo:               sanitize(body.titulo),
        clienteNombre:        sanitize(body.clienteNombre),
        estado:               body.estado,
        fechaEntregaEstimada: body.fechaEntregaEstimada ? new Date(body.fechaEntregaEstimada) : null,
        notas:                sanitize(body.notas) ?? '',
        herramientasUsadas:   body.herramientasUsadas ?? '',
        valorTotal:           valorTotal,
        moneda:               moneda,
      },
    });

    if (newProyecto.leadId) {
      await prisma.lead.update({
        where: { id: newProyecto.leadId },
        data: { etapa: "EN_DESARROLLO" },
      });
    }

    return NextResponse.json(newProyecto, { status: 201 });
  } catch (error) {
    console.error('POST /api/proyectos error:', error);
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
