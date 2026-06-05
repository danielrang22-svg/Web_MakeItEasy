import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuthRole } from '@/lib/auth';

// PATCH — Update AI config (activate, change model/key)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuthRole(request);
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { nombre, proveedor, modelo, apiKey, baseUrl, activo, etiqueta } = body;

    // If activating this config, deactivate all others first
    if (activo === true) {
      await prisma.aiConfig.updateMany({ data: { activo: false } });
    }

    const updateData: Record<string, unknown> = {};
    if (nombre !== undefined) updateData.nombre = nombre;
    if (proveedor !== undefined) updateData.proveedor = proveedor;
    if (modelo !== undefined) updateData.modelo = modelo;
    if (apiKey !== undefined && apiKey !== '' && !apiKey.startsWith('****')) {
      updateData.apiKey = apiKey; // Only update if a real key is provided
    }
    if (baseUrl !== undefined) updateData.baseUrl = baseUrl || null;
    if (activo !== undefined) updateData.activo = activo;
    if (etiqueta !== undefined) updateData.etiqueta = etiqueta || null;

    const updated = await prisma.aiConfig.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      ...updated,
      apiKey: `****${updated.apiKey.slice(-4)}`,
    });
  } catch (error) {
    console.error('PATCH /api/admin/ai-config/[id] error:', error);
    return NextResponse.json({ error: 'Error al actualizar configuración' }, { status: 500 });
  }
}

// DELETE — Remove AI config
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuthRole(request);
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { id } = await params;

    await prisma.aiConfig.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/admin/ai-config/[id] error:', error);
    return NextResponse.json({ error: 'Error al eliminar configuración' }, { status: 500 });
  }
}
