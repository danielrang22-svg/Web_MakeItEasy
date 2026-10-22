import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuthRole } from '@/lib/auth';
import { maskSecret } from '@/lib/ai/crypto';

const PROPOSITOS = ['cotizaciones', 'tareas', 'radar', 'personalizado'] as const;
type Proposito = (typeof PROPOSITOS)[number];

function normalizeProposito(value: unknown): Proposito {
  return PROPOSITOS.includes(value as Proposito) ? (value as Proposito) : 'personalizado';
}

function maskConnection<T extends { apiKey: string }>(connection: T | null | undefined) {
  if (!connection) return connection ?? null;
  return { ...connection, apiKey: maskSecret(connection.apiKey) };
}

// GET — Lista de agentes con su conexión (clave enmascarada)
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuthRole(request, ['admin']);
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const agents = await prisma.agent.findMany({
      include: { conexion: true },
      orderBy: [{ proposito: 'asc' }, { fechaCreacion: 'desc' }],
    });

    return NextResponse.json(
      agents.map((a) => ({ ...a, conexion: maskConnection(a.conexion) }))
    );
  } catch (error) {
    console.error('GET /api/admin/agentes error:', error);
    return NextResponse.json({ error: 'Error al obtener agentes' }, { status: 500 });
  }
}

// POST — Crear agente
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuthRole(request, ['admin']);
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await request.json();
    const { nombre, descripcion, systemPrompt, activo, connectionId } = body;
    const proposito = normalizeProposito(body.proposito);

    if (!nombre || !systemPrompt || !connectionId) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: nombre, systemPrompt, connectionId' },
        { status: 400 }
      );
    }

    const connection = await prisma.aiConnection.findUnique({ where: { id: connectionId } });
    if (!connection) {
      return NextResponse.json({ error: 'La conexión indicada no existe' }, { status: 400 });
    }

    // Solo puede haber un agente activo por propósito
    if (activo) {
      await prisma.agent.updateMany({
        where: { proposito, activo: true },
        data: { activo: false },
      });
    }

    const agent = await prisma.agent.create({
      data: {
        nombre: String(nombre).trim(),
        descripcion: descripcion || null,
        proposito,
        systemPrompt,
        activo: activo ?? false,
        connectionId,
      },
      include: { conexion: true },
    });

    return NextResponse.json(
      { ...agent, conexion: maskConnection(agent.conexion) },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/admin/agentes error:', error);
    return NextResponse.json({ error: 'Error al crear agente' }, { status: 500 });
  }
}
