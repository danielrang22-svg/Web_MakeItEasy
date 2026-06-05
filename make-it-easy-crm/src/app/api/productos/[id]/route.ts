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
    const updateData: any = {};
    if (body.referencia !== undefined) updateData.referencia = sanitize(body.referencia);
    if (body.nombre !== undefined) updateData.nombre = sanitize(body.nombre);
    if (body.proveedor !== undefined) updateData.proveedor = sanitize(body.proveedor);
    if (body.costoEstimado !== undefined) updateData.costoEstimado = Number(body.costoEstimado);
    if (body.precioSugerido !== undefined) updateData.precioSugerido = Number(body.precioSugerido);
    if (body.tipo !== undefined) updateData.tipo = body.tipo;
    if (body.descripcion !== undefined) updateData.descripcion = sanitize(body.descripcion);

    const updatedData = await prisma.producto.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json(updatedData);
  } catch (error: any) { 
    console.error("Error PUT producto:", error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe un producto con esta referencia' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error' }, { status: 500 }); 
  }
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const auth = await verifyAuthRole(request, ["admin"]);
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const { id } = await props.params;
    
    // Buscar el producto antes de inactivarlo
    const product = await prisma.producto.findUnique({ where: { id } });
    if (!product) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });

    // En lugar de eliminar físicamente, lo marcamos como inactivo (soft-delete)
    await prisma.producto.update({ 
      where: { id },
      data: { activo: false }
    });
    return NextResponse.json({ success: true });
  } catch (error) { 
    console.error("Error DELETE producto:", error);
    return NextResponse.json({ error: 'Error al eliminar producto' }, { status: 500 }); 
  }
}
