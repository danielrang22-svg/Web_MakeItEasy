import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuthRole } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const auth = await verifyAuthRole(request);
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const flows = await prisma.automationFlow.findMany({
      orderBy: { fechaCreacion: 'desc' }
    });
    return NextResponse.json(flows);
  } catch (error) {
    console.error('GET /api/flows error:', error);
    return NextResponse.json({ error: 'Error al obtener flujos de automatización' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuthRole(request);
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const body = await request.json();
    
    if (!body.proyectoId || !body.nombre || !body.estado || !body.tipo) {
      return NextResponse.json({ error: 'Faltan campos requeridos (proyectoId, nombre, estado, tipo)' }, { status: 400 });
    }

    const newFlow = await prisma.automationFlow.create({
      data: {
        proyectoId: body.proyectoId,
        nombre: body.nombre,
        estado: body.estado, // "ACTIVO" | "PAUSADO" | "ERROR"
        tipo: body.tipo,
        ejecuciones24h: Number(body.ejecuciones24h) || 0,
        tasaExito: Number(body.tasaExito) ?? 100.0,
        tiempoPromedio: Number(body.tiempoPromedio) || 0.0,
        notas: body.notas ?? '',
      }
    });

    return NextResponse.json(newFlow, { status: 201 });
  } catch (error) {
    console.error('POST /api/flows error:', error);
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
