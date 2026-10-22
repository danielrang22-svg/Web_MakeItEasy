import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuthRole } from '@/lib/auth';
import { encryptSecret, maskSecret } from '@/lib/ai/crypto';
import { PROVIDER_LIST, getProvider, resolveBaseUrl } from '@/lib/ai/providers';

function validate(body: Record<string, unknown>) {
  const nombre = typeof body.nombre === 'string' ? body.nombre.trim() : '';
  const proveedor = typeof body.proveedor === 'string' ? body.proveedor.trim() : '';
  const modelo = typeof body.modelo === 'string' ? body.modelo.trim() : '';
  const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : '';
  const baseUrl = typeof body.baseUrl === 'string' ? body.baseUrl.trim() : '';

  if (!nombre || !proveedor || !modelo || !apiKey) {
    return { error: 'Faltan campos requeridos: nombre, proveedor, modelo y API key.' };
  }

  const provider = getProvider(proveedor);
  if (!provider) {
    return { error: `Proveedor no soportado: ${proveedor}` };
  }
  if (provider.disabledReason) {
    return { error: provider.disabledReason };
  }
  if (provider.requiresBaseUrl && !baseUrl) {
    return { error: `El proveedor ${provider.label} requiere una base URL.` };
  }
  if (apiKey.startsWith('****')) {
    return { error: 'La API key no es válida.' };
  }

  return { nombre, proveedor, modelo, apiKey, baseUrl: baseUrl || null };
}

// GET — Lista de conexiones (claves enmascaradas)
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuthRole(request, ['admin']);
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const connections = await prisma.aiConnection.findMany({
      orderBy: { fechaCreacion: 'desc' },
    });

    return NextResponse.json({
      connections: connections.map((c) => ({
        ...c,
        apiKey: maskSecret(c.apiKey),
      })),
      providers: PROVIDER_LIST,
    });
  } catch (error) {
    console.error('GET /api/admin/ai-config error:', error);
    return NextResponse.json({ error: 'Error al obtener conexiones de IA' }, { status: 500 });
  }
}

// POST — Crear conexión
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuthRole(request, ['admin']);
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await request.json();
    const parsed = validate(body);
    if ('error' in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const connection = await prisma.aiConnection.create({
      data: {
        nombre: parsed.nombre,
        proveedor: parsed.proveedor,
        modelo: parsed.modelo,
        apiKey: encryptSecret(parsed.apiKey),
        baseUrl: parsed.baseUrl,
      },
    });

    return NextResponse.json(
      {
        ...connection,
        apiKey: maskSecret(connection.apiKey),
        baseUrlEfectiva: resolveBaseUrl(connection.proveedor, connection.baseUrl) ?? null,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/admin/ai-config error:', error);
    return NextResponse.json({ error: 'Error al crear conexión' }, { status: 500 });
  }
}
