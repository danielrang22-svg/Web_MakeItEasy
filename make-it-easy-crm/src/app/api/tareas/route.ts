import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuthRole } from '@/lib/auth';

// GET /api/tareas?proyectoId=xxx
export async function GET(request: NextRequest) {
  const auth = await verifyAuthRole(request);
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const proyectoId = searchParams.get('proyectoId');
  const parentId = searchParams.get('parentId');

  if (!proyectoId) return NextResponse.json({ error: 'proyectoId requerido' }, { status: 400 });

  try {
    const where: any = { proyectoId };
    if (parentId === 'null' || parentId === '') {
      where.parentId = null;
    } else if (parentId) {
      where.parentId = parentId;
    }

    const tareas = await prisma.tarea.findMany({
      where,
      include: {
        subtareas: {
          include: {
            comentarios: { orderBy: { createdAt: 'asc' } },
          },
        },
        comentarios: { orderBy: { createdAt: 'asc' } },
        milestone: { select: { id: true, nombre: true } },
      },
      orderBy: [{ prioridad: 'desc' }, { createdAt: 'asc' }],
    });

    return NextResponse.json(tareas);
  } catch (error) {
    console.error('GET /api/tareas error:', error);
    return NextResponse.json({ error: 'Error al obtener tareas' }, { status: 500 });
  }
}

// POST /api/tareas
export async function POST(request: NextRequest) {
  const auth = await verifyAuthRole(request);
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const body = await request.json();
    const {
      proyectoId, parentId, milestoneId, titulo, descripcion,
      tipo, estado, prioridad, asignadoEmail, estimado,
      githubBranch, fechaLimite, etiquetas,
    } = body;

    if (!proyectoId || !titulo) {
      return NextResponse.json({ error: 'proyectoId y titulo son requeridos' }, { status: 400 });
    }

    const tarea = await prisma.tarea.create({
      data: {
        proyectoId,
        parentId: parentId || null,
        milestoneId: milestoneId || null,
        titulo,
        descripcion: descripcion || null,
        tipo: tipo || 'development',
        estado: estado || 'PENDIENTE',
        prioridad: typeof prioridad === 'number' ? prioridad : 0,
        asignadoEmail: asignadoEmail || null,
        estimado: estimado ? Number(estimado) : null,
        githubBranch: githubBranch || null,
        fechaLimite: fechaLimite ? new Date(fechaLimite) : null,
        etiquetas: etiquetas ? JSON.stringify(etiquetas) : null,
      },
      include: {
        subtareas: true,
        comentarios: true,
        milestone: { select: { id: true, nombre: true } },
      },
    });

    return NextResponse.json(tarea, { status: 201 });
  } catch (error) {
    console.error('POST /api/tareas error:', error);
    return NextResponse.json({ error: 'Error al crear tarea' }, { status: 500 });
  }
}
