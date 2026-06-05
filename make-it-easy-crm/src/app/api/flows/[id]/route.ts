import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuthRole } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAuthRole(request);
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const { id } = await params;
    const body = await request.json();

    const existingFlow = await prisma.automationFlow.findUnique({ where: { id } });
    if (!existingFlow) {
      return NextResponse.json({ error: 'Flujo no encontrado' }, { status: 404 });
    }

    const updated = await prisma.automationFlow.update({
      where: { id },
      data: {
        nombre: body.nombre !== undefined ? body.nombre : undefined,
        estado: body.estado !== undefined ? body.estado : undefined,
        tipo: body.tipo !== undefined ? body.tipo : undefined,
        ejecuciones24h: body.ejecuciones24h !== undefined ? Number(body.ejecuciones24h) : undefined,
        tasaExito: body.tasaExito !== undefined ? Number(body.tasaExito) : undefined,
        tiempoPromedio: body.tiempoPromedio !== undefined ? Number(body.tiempoPromedio) : undefined,
        notas: body.notas !== undefined ? body.notas : undefined,
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PUT /api/flows/[id] error:', error);
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAuthRole(request);
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const { id } = await params;
    const existingFlow = await prisma.automationFlow.findUnique({ where: { id } });
    if (!existingFlow) {
      return NextResponse.json({ error: 'Flujo no encontrado' }, { status: 404 });
    }

    await prisma.automationFlow.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/flows/[id] error:', error);
    return NextResponse.json({ error: 'Error al eliminar el flujo' }, { status: 500 });
  }
}
