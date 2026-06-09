import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuthRole } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuthRole(request);
    if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const usuario = await prisma.usuario.findUnique({ where: { email: auth.email } });
    if (!usuario) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    const notificaciones = await prisma.notificacion.findMany({
      where: { usuarioId: usuario.id, leida: false },
      orderBy: { fechaCreacion: 'desc' }
    });

    return NextResponse.json(notificaciones);
  } catch (error) {
    console.error("GET /api/notificaciones error:", error);
    return NextResponse.json({ error: 'Error al obtener notificaciones' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAuthRole(request);
    if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { ids } = await request.json(); // Array de IDs de notificaciones a marcar como leídas
    if (!ids || !Array.isArray(ids)) {
      return NextResponse.json({ error: "IDs inválidos" }, { status: 400 });
    }

    const usuario = await prisma.usuario.findUnique({ where: { email: auth.email } });
    if (!usuario) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    // Actualizamos solo las notificaciones de ese usuario
    const updated = await prisma.notificacion.updateMany({
      where: {
        id: { in: ids },
        usuarioId: usuario.id
      },
      data: { leida: true }
    });

    return NextResponse.json({ success: true, count: updated.count });
  } catch (error) {
    console.error("PUT /api/notificaciones error:", error);
    return NextResponse.json({ error: 'Error al actualizar notificaciones' }, { status: 500 });
  }
}
