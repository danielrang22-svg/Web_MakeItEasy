import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuthRole } from '@/lib/auth';

// PATCH — Update AI connection
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuthRole(request);
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { nombre, proveedor, modelo, apiKey, baseUrl } = body;

    const updateData: Record<string, unknown> = {};
    if (nombre !== undefined) updateData.nombre = nombre;
    if (proveedor !== undefined) updateData.proveedor = proveedor;
    if (modelo !== undefined) updateData.modelo = modelo;
    if (apiKey !== undefined && apiKey !== '' && !apiKey.startsWith('****')) {
      updateData.apiKey = apiKey; // Only update if a real key is provided
    }
    if (baseUrl !== undefined) updateData.baseUrl = baseUrl || null;

    const updated = await prisma.aiConnection.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      ...updated,
      apiKey: `****${updated.apiKey.slice(-4)}`,
    });
  } catch (error) {
    console.error('PATCH /api/admin/ai-config/[id] error:', error);
    return NextResponse.json({ error: 'Error al actualizar conexión' }, { status: 500 });
  }
}

// DELETE — Remove AI connection
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuthRole(request);
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { id } = await params;

    await prisma.aiConnection.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/admin/ai-config/[id] error:', error);
    return NextResponse.json({ error: 'Error al eliminar conexión' }, { status: 500 });
  }
}
