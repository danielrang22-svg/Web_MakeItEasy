import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthRole } from '@/lib/auth';
import prisma from '@/lib/prisma';

/** Configuración que necesita el módulo Radar (cualquier rol autenticado). */
export async function GET(request: NextRequest) {
  const auth = await verifyAuthRole(request);
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const agents = await prisma.agent.findMany({
    where: { proposito: 'radar' },
    select: { id: true, nombre: true, activo: true, conexion: { select: { proveedor: true, modelo: true } } },
    orderBy: [{ activo: 'desc' }, { fechaCreacion: 'desc' }],
  });

  return NextResponse.json({
    agents,
    pagespeedConfigured: !!process.env.PAGESPEED_API_KEY?.trim(),
  });
}
