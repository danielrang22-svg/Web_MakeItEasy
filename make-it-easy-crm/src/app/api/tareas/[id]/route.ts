import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuthRole } from '@/lib/auth';

export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const auth = await verifyAuthRole(request);
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const { id } = await props.params;
    const body = await request.json();
    const updateData: any = {};

    if (body.titulo !== undefined) updateData.titulo = body.titulo;
    if (body.descripcion !== undefined) updateData.descripcion = body.descripcion;
    if (body.tipo !== undefined) updateData.tipo = body.tipo;
    if (body.prioridad !== undefined) updateData.prioridad = body.prioridad;
    if (body.asignadoEmail !== undefined) updateData.asignadoEmail = body.asignadoEmail || null;
    if (body.estimado !== undefined) updateData.estimado = body.estimado ? Number(body.estimado) : null;
    if (body.githubBranch !== undefined) updateData.githubBranch = body.githubBranch || null;
    if (body.fechaLimite !== undefined) updateData.fechaLimite = body.fechaLimite ? new Date(body.fechaLimite) : null;
    if (body.etiquetas !== undefined) updateData.etiquetas = body.etiquetas ? JSON.stringify(body.etiquetas) : null;
    if (body.milestoneId !== undefined) updateData.milestoneId = body.milestoneId || null;
    if (body.parentId !== undefined) updateData.parentId = body.parentId || null;

    // Handle estado change + completadaEn
    if (body.estado !== undefined) {
      updateData.estado = body.estado;
      updateData.completadaEn = body.estado === 'COMPLETADO' ? new Date() : null;
    }

    const tarea = await prisma.tarea.update({
      where: { id },
      data: updateData,
      include: {
        subtareas: true,
        comentarios: { orderBy: { createdAt: 'asc' } },
        milestone: { select: { id: true, nombre: true } },
      },
    });

    return NextResponse.json(tarea);
  } catch (error) {
    console.error('PUT /api/tareas/[id] error:', error);
    return NextResponse.json({ error: 'Error al actualizar tarea' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const auth = await verifyAuthRole(request, ['admin']);
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const { id } = await props.params;
    await prisma.tarea.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/tareas/[id] error:', error);
    return NextResponse.json({ error: 'Error al eliminar tarea' }, { status: 500 });
  }
}
