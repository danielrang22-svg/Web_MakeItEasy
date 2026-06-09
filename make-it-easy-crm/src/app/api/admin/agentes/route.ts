import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuthRole } from '@/lib/auth';

// GET — List all agents
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuthRole(request);
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const agents = await prisma.agent.findMany({
      include: { conexion: true },
      orderBy: { fechaCreacion: 'desc' },
    });

    return NextResponse.json(agents);
  } catch (error) {
    console.error('GET /api/admin/agentes error:', error);
    return NextResponse.json({ error: 'Error al obtener agentes' }, { status: 500 });
  }
}

// POST — Create new agent
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuthRole(request);
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await request.json();
    const { nombre, descripcion, systemPrompt, activo, connectionId } = body;

    if (!nombre || !systemPrompt || !connectionId) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: nombre, systemPrompt, connectionId' },
        { status: 400 }
      );
    }

    // If setting this agent as active, deactivate all other agents
    if (activo) {
      await prisma.agent.updateMany({ data: { activo: false } });
    }

    const agent = await prisma.agent.create({
      data: {
        nombre,
        descripcion: descripcion || null,
        systemPrompt,
        activo: activo ?? false,
        connectionId,
      },
      include: { conexion: true },
    });

    return NextResponse.json(agent, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/agentes error:', error);
    return NextResponse.json({ error: 'Error al crear agente' }, { status: 500 });
  }
}
