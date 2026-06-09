import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuthRole } from '@/lib/auth';

// PATCH — Update agent details (name, prompt, connection, status)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuthRole(request);
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { nombre, descripcion, systemPrompt, activo, connectionId } = body;

    // If activating this agent, deactivate all other agents first
    if (activo === true) {
      await prisma.agent.updateMany({ data: { activo: false } });
    }

    const updateData: Record<string, unknown> = {};
    if (nombre !== undefined) updateData.nombre = nombre;
    if (descripcion !== undefined) updateData.descripcion = descripcion || null;
    if (systemPrompt !== undefined) updateData.systemPrompt = systemPrompt;
    if (activo !== undefined) updateData.activo = activo;
    if (connectionId !== undefined) updateData.connectionId = connectionId;

    const updated = await prisma.agent.update({
      where: { id },
      data: updateData,
      include: { conexion: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH /api/admin/agentes/[id] error:', error);
    return NextResponse.json({ error: 'Error al actualizar agente' }, { status: 500 });
  }
}

// DELETE — Remove agent
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuthRole(request);
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { id } = await params;

    await prisma.agent.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/admin/agentes/[id] error:', error);
    return NextResponse.json({ error: 'Error al eliminar agente' }, { status: 500 });
  }
}
