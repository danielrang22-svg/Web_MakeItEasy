import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuthRole } from '@/lib/auth';

// GET /api/milestones?proyectoId=xxx
export async function GET(request: NextRequest) {
  const auth = await verifyAuthRole(request);
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const proyectoId = searchParams.get('proyectoId');
  if (!proyectoId) return NextResponse.json({ error: 'proyectoId requerido' }, { status: 400 });

  try {
    const milestones = await prisma.milestone.findMany({
      where: { proyectoId },
      include: {
        tareas: { select: { id: true, estado: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(milestones);
  } catch (error) {
    console.error('GET /api/milestones error:', error);
    return NextResponse.json({ error: 'Error al obtener milestones' }, { status: 500 });
  }
}

// POST /api/milestones
export async function POST(request: NextRequest) {
  const auth = await verifyAuthRole(request);
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const body = await request.json();
    const { proyectoId, nombre, descripcion, fechaObjetivo } = body;

    if (!proyectoId || !nombre) {
      return NextResponse.json({ error: 'proyectoId y nombre son requeridos' }, { status: 400 });
    }

    const milestone = await prisma.milestone.create({
      data: {
        proyectoId,
        nombre,
        descripcion: descripcion || null,
        fechaObjetivo: fechaObjetivo ? new Date(fechaObjetivo) : null,
      },
    });

    return NextResponse.json(milestone, { status: 201 });
  } catch (error) {
    console.error('POST /api/milestones error:', error);
    return NextResponse.json({ error: 'Error al crear milestone' }, { status: 500 });
  }
}

// PUT /api/milestones (update via body.id)
export async function PUT(request: NextRequest) {
  const auth = await verifyAuthRole(request);
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const body = await request.json();
    const { id, nombre, descripcion, fechaObjetivo, completado } = body;
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

    const milestone = await prisma.milestone.update({
      where: { id },
      data: {
        nombre: nombre ?? undefined,
        descripcion: descripcion ?? undefined,
        fechaObjetivo: fechaObjetivo !== undefined ? (fechaObjetivo ? new Date(fechaObjetivo) : null) : undefined,
        completado: completado ?? undefined,
      },
    });

    return NextResponse.json(milestone);
  } catch (error) {
    console.error('PUT /api/milestones error:', error);
    return NextResponse.json({ error: 'Error al actualizar milestone' }, { status: 500 });
  }
}
