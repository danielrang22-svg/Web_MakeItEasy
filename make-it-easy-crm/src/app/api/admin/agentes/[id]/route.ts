import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuthRole } from '@/lib/auth';
import { maskSecret } from '@/lib/ai/crypto';
import { getProvider } from '@/lib/ai/providers';

const PROPOSITOS = ['cotizaciones', 'tareas', 'radar', 'personalizado'] as const;
type Proposito = (typeof PROPOSITOS)[number];

function normalizeProposito(value: unknown): Proposito {
  return PROPOSITOS.includes(value as Proposito) ? (value as Proposito) : 'personalizado';
}

// PATCH — Actualizar agente (nombre, prompt, propósito, conexión y estado)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuthRole(request, ['admin']);
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { nombre, descripcion, systemPrompt, activo, connectionId } = body;

    const current = await prisma.agent.findUnique({ where: { id } });
    if (!current) return NextResponse.json({ error: 'Agente no encontrado' }, { status: 404 });

    const proposito = body.proposito !== undefined
      ? normalizeProposito(body.proposito)
      : (current.proposito as Proposito);

    if (connectionId !== undefined) {
      const connection = await prisma.aiConnection.findUnique({ where: { id: connectionId } });
      if (!connection) {
        return NextResponse.json({ error: 'La conexión indicada no existe' }, { status: 400 });
      }
      const provider = getProvider(connection.proveedor);
      if (provider?.disabledReason) {
        return NextResponse.json({ error: provider.disabledReason }, { status: 400 });
      }
    }

    // Un solo agente activo por propósito
    if (activo === true) {
      await prisma.agent.updateMany({
        where: { proposito, activo: true, NOT: { id } },
        data: { activo: false },
      });
    }

    const updateData: Record<string, unknown> = {};
    if (nombre !== undefined) updateData.nombre = String(nombre).trim();
    if (descripcion !== undefined) updateData.descripcion = descripcion || null;
    if (systemPrompt !== undefined) updateData.systemPrompt = systemPrompt;
    if (body.proposito !== undefined) updateData.proposito = proposito;
    if (activo !== undefined) updateData.activo = activo;
    if (connectionId !== undefined) updateData.connectionId = connectionId;

    const updated = await prisma.agent.update({
      where: { id },
      data: updateData,
      include: { conexion: true },
    });

    return NextResponse.json({
      ...updated,
      conexion: updated.conexion
        ? { ...updated.conexion, apiKey: maskSecret(updated.conexion.apiKey) }
        : null,
    });
  } catch (error) {
    console.error('PATCH /api/admin/agentes/[id] error:', error);
    return NextResponse.json({ error: 'Error al actualizar agente' }, { status: 500 });
  }
}

// DELETE — Eliminar agente
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuthRole(request, ['admin']);
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { id } = await params;
    await prisma.agent.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/admin/agentes/[id] error:', error);
    return NextResponse.json({ error: 'Error al eliminar agente' }, { status: 500 });
  }
}
