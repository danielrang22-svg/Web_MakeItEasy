import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuthRole } from '@/lib/auth';
import { sanitize } from '@/lib/validate';

export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const auth = await verifyAuthRole(request);
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const { id } = await props.params;
    const body = await request.json();
    const updated = await prisma.empresa.update({
      where: { id },
      data: {
        nombre: body.nombre !== undefined ? sanitize(body.nombre) : undefined,
        nit: body.nit !== undefined ? sanitize(body.nit) : undefined,
        direccion: body.direccion !== undefined ? sanitize(body.direccion) : undefined,
        ciudad: body.ciudad !== undefined ? sanitize(body.ciudad) : undefined,
        sector: body.sector !== undefined ? sanitize(body.sector) : undefined,
        tamano: body.tamano !== undefined ? sanitize(body.tamano) : undefined,
        telefono: body.telefono !== undefined ? sanitize(body.telefono) : undefined,
        email: body.email !== undefined ? sanitize(body.email) : undefined,
        notas: body.notas !== undefined ? sanitize(body.notas) : undefined,
      }
    });
    return NextResponse.json(updated);
  } catch (error) { return NextResponse.json({ error: 'Error' }, { status: 500 }); }
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const auth = await verifyAuthRole(request, ["admin"]);
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const { id } = await props.params;
    await prisma.empresa.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) { return NextResponse.json({ error: 'Error' }, { status: 500 }); }
}
