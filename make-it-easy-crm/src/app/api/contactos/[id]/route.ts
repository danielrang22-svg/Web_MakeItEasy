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
    // Validar empresaId si se está actualizando
    if (body.empresaId) {
      const empresa = await prisma.empresa.findUnique({ where: { id: body.empresaId } });
      if (!empresa) return NextResponse.json({ error: 'La empresa especificada no existe' }, { status: 400 });
    }

    const updated = await prisma.contacto.update({
      where: { id },
      data: {
        nombre: body.nombre !== undefined ? sanitize(body.nombre) : undefined,
        cargo: body.cargo !== undefined ? sanitize(body.cargo) : undefined,
        empresaId: body.empresaId !== undefined ? sanitize(body.empresaId) : undefined,
        empresaNombre: body.empresaNombre !== undefined ? sanitize(body.empresaNombre) : undefined,
        telefono: body.telefono !== undefined ? sanitize(body.telefono) : undefined,
        telefono2: body.telefono2 !== undefined ? sanitize(body.telefono2) : undefined,
        email: body.email !== undefined ? sanitize(body.email) : undefined,
        email2: body.email2 !== undefined ? sanitize(body.email2) : undefined,
        notas: body.notas !== undefined ? sanitize(body.notas) : undefined,
        tags: Array.isArray(body.tags) 
          ? body.tags.map((t: any) => sanitize(String(t))).join(',') 
          : (body.tags !== undefined ? sanitize(String(body.tags)) : undefined),
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
    await prisma.contacto.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) { return NextResponse.json({ error: 'Error' }, { status: 500 }); }
}
