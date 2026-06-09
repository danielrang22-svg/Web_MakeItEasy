import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuthRole } from '@/lib/auth';

// GET — List all AI connections (API keys masked)
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuthRole(request);
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const connections = await prisma.aiConnection.findMany({
      orderBy: { fechaCreacion: 'desc' },
    });

    // Mask API key: show only last 4 chars
    const masked = connections.map((c) => ({
      ...c,
      apiKey: c.apiKey ? `****${c.apiKey.slice(-4)}` : '****',
    }));

    return NextResponse.json(masked);
  } catch (error) {
    console.error('GET /api/admin/ai-config error:', error);
    return NextResponse.json({ error: 'Error al obtener conexiones de IA' }, { status: 500 });
  }
}

// POST — Create new AI connection
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuthRole(request);
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await request.json();
    const { nombre, proveedor, modelo, apiKey, baseUrl } = body;

    if (!nombre || !proveedor || !modelo || !apiKey) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: nombre, proveedor, modelo, apiKey' },
        { status: 400 }
      );
    }

    const connection = await prisma.aiConnection.create({
      data: {
        nombre,
        proveedor,
        modelo,
        apiKey,
        baseUrl: baseUrl || null,
      },
    });

    return NextResponse.json({
      ...connection,
      apiKey: `****${connection.apiKey.slice(-4)}`,
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/ai-config error:', error);
    return NextResponse.json({ error: 'Error al crear conexión' }, { status: 500 });
  }
}
