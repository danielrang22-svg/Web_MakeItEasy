import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuthRole } from '@/lib/auth';

// GET — List all AI configs (API keys masked)
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuthRole(request);
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const configs = await prisma.aiConfig.findMany({
      orderBy: { fechaCreacion: 'desc' },
    });

    // Mask API key: show only last 4 chars
    const masked = configs.map((c) => ({
      ...c,
      apiKey: c.apiKey ? `****${c.apiKey.slice(-4)}` : '****',
    }));

    return NextResponse.json(masked);
  } catch (error) {
    console.error('GET /api/admin/ai-config error:', error);
    return NextResponse.json({ error: 'Error al obtener configuraciones de IA' }, { status: 500 });
  }
}

// POST — Create new AI config
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuthRole(request);
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await request.json();
    const { nombre, proveedor, modelo, apiKey, baseUrl, activo, etiqueta } = body;

    if (!nombre || !proveedor || !modelo || !apiKey) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: nombre, proveedor, modelo, apiKey' },
        { status: 400 }
      );
    }

    // If this config is being set as active, deactivate all others
    if (activo) {
      await prisma.aiConfig.updateMany({ data: { activo: false } });
    }

    const config = await prisma.aiConfig.create({
      data: {
        nombre,
        proveedor,
        modelo,
        apiKey,
        baseUrl: baseUrl || null,
        activo: activo ?? false,
        etiqueta: etiqueta || null,
      },
    });

    return NextResponse.json({
      ...config,
      apiKey: `****${config.apiKey.slice(-4)}`,
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/ai-config error:', error);
    return NextResponse.json({ error: 'Error al crear configuración' }, { status: 500 });
  }
}
