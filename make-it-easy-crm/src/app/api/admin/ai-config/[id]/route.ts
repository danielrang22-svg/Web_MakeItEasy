import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuthRole } from '@/lib/auth';
import { encryptSecret, maskSecret } from '@/lib/ai/crypto';
import { getProvider, resolveBaseUrl } from '@/lib/ai/providers';

// PATCH — Actualizar conexión
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuthRole(request, ['admin']);
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { nombre, proveedor, modelo, apiKey, baseUrl } = body;

    if (proveedor !== undefined) {
      const provider = getProvider(proveedor);
      if (!provider) return NextResponse.json({ error: 'Proveedor no soportado' }, { status: 400 });
      if (provider.disabledReason) {
        return NextResponse.json({ error: provider.disabledReason }, { status: 400 });
      }
      if (provider.requiresBaseUrl && !baseUrl) {
        return NextResponse.json(
          { error: `El proveedor ${provider.label} requiere una base URL.` },
          { status: 400 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (nombre !== undefined) updateData.nombre = String(nombre).trim();
    if (proveedor !== undefined) updateData.proveedor = proveedor;
    if (modelo !== undefined) updateData.modelo = String(modelo).trim();
    if (apiKey !== undefined && apiKey !== '' && !String(apiKey).startsWith('****')) {
      updateData.apiKey = encryptSecret(String(apiKey).trim());
    }
    if (baseUrl !== undefined) updateData.baseUrl = baseUrl ? String(baseUrl).trim() : null;

    const updated = await prisma.aiConnection.update({ where: { id }, data: updateData });

    return NextResponse.json({
      ...updated,
      apiKey: maskSecret(updated.apiKey),
      baseUrlEfectiva: resolveBaseUrl(updated.proveedor, updated.baseUrl) ?? null,
    });
  } catch (error) {
    console.error('PATCH /api/admin/ai-config/[id] error:', error);
    return NextResponse.json({ error: 'Error al actualizar conexión' }, { status: 500 });
  }
}

// DELETE — Eliminar conexión (bloquea si algún agente la usa)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuthRole(request, ['admin']);
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { id } = await params;

    const inUse = await prisma.agent.count({ where: { connectionId: id } });
    if (inUse > 0) {
      return NextResponse.json(
        {
          error: `No se puede borrar: ${inUse} agente(s) usan esta conexión. Asígnales otra API primero.`,
        },
        { status: 409 }
      );
    }

    await prisma.aiConnection.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/admin/ai-config/[id] error:', error);
    return NextResponse.json({ error: 'Error al eliminar conexión' }, { status: 500 });
  }
}
