import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuthRole } from '@/lib/auth';
import { requireFields, sanitize } from '@/lib/validate';

export async function GET(request: NextRequest) {
  const auth = await verifyAuthRole(request);
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const data = await prisma.empresa.findMany({ orderBy: { fechaCreacion: 'desc' } });
    return NextResponse.json(data);
  } catch (error) { return NextResponse.json({ error: 'Error' }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuthRole(request);
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const body = await request.json();
    const fieldError = requireFields(body, ['nombre']);
    if (fieldError) return NextResponse.json({ error: fieldError }, { status: 400 });

    const newData = await prisma.empresa.create({
      data: {
        nombre: sanitize(body.nombre),
        nit: sanitize(body.nit) || '',
        direccion: sanitize(body.direccion) || '',
        ciudad: sanitize(body.ciudad) || '',
        sector: sanitize(body.sector) || '',
        tamano: body.tamano || '',
        telefono: sanitize(body.telefono) || '',
        email: sanitize(body.email) || '',
        notas: sanitize(body.notas) || '',
      }
    });
    return NextResponse.json(newData, { status: 201 });
  } catch (error) { return NextResponse.json({ error: 'Error' }, { status: 500 }); }
}
