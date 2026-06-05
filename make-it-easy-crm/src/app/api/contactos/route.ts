import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuthRole } from '@/lib/auth';
import { requireFields, sanitize } from '@/lib/validate';

export async function GET(request: NextRequest) {
  const auth = await verifyAuthRole(request);
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const data = await prisma.contacto.findMany({ orderBy: { fechaCreacion: 'desc' } });
    return NextResponse.json(data);
  } catch (error) { return NextResponse.json({ error: 'Error' }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuthRole(request);
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const body = await request.json();
    const fieldError = requireFields(body, ['nombre', 'telefono', 'email']);
    if (fieldError) return NextResponse.json({ error: fieldError }, { status: 400 });

    const newData = await prisma.contacto.create({
      data: {
        nombre: sanitize(body.nombre),
        cargo: sanitize(body.cargo) || '',
        empresaId: body.empresaId || '',
        empresaNombre: sanitize(body.empresaNombre) || '',
        telefono: sanitize(body.telefono),
        telefono2: sanitize(body.telefono2) || '',
        email: sanitize(body.email),
        email2: sanitize(body.email2) || '',
        notas: sanitize(body.notas) || '',
        tags: Array.isArray(body.tags) ? body.tags.join(',') : (body.tags || ''),
      }
    });
    return NextResponse.json(newData, { status: 201 });
  } catch (error) { return NextResponse.json({ error: 'Error' }, { status: 500 }); }
}
