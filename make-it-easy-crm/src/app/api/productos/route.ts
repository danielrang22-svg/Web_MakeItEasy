import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuthRole } from '@/lib/auth';
import { requireFields, sanitize } from '@/lib/validate';

export async function GET(request: NextRequest) {
  const auth = await verifyAuthRole(request);
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const data = await prisma.producto.findMany({ 
      where: { activo: true },
      orderBy: { nombre: 'asc' } 
    });
    return NextResponse.json(data);
  } catch (error) { 
    console.error("Error GET productos:", error);
    return NextResponse.json({ error: 'Error' }, { status: 500 }); 
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuthRole(request);
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const body = await request.json();
    const fieldError = requireFields(body, ['referencia', 'nombre']);
    if (fieldError) return NextResponse.json({ error: fieldError }, { status: 400 });

    const referencia = sanitize(body.referencia);
    const nombre = sanitize(body.nombre);

    // 1. Verificar si ya existe en la BD local para evitar duplicados
    const localExists = await prisma.producto.findUnique({ where: { referencia } });
    if (localExists) {
        return NextResponse.json({ error: 'Ya existe un producto en el CRM con esta referencia' }, { status: 400 });
    }

    const tipo = body.tipo || 'servicio';
    const descripcion = sanitize(body.descripcion || '');
    const precioSugerido = Number(body.precioSugerido) || 0;

    // 2. Crear en la BD local
    const newData = await prisma.producto.create({
      data: {
        referencia,
        nombre,
        proveedor: sanitize(body.proveedor) || '',
        costoEstimado: Number(body.costoEstimado) || 0,
        precioSugerido,
        tipo,
        descripcion,
      }
    });

    return NextResponse.json(newData, { status: 201 });
  } catch (error: any) {
    console.error("Error POST productos:", error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe un producto con esta referencia' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 }); 
  }
}

