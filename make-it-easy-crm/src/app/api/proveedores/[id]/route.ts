import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAuthRole } from "@/lib/auth";

export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyAuthRole(request, ["admin", "ventas"]);
    if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await props.params;
    const body = await request.json();

    const { nombre, nit, especialidad, telefono, email, notas } = body;
    const updateData: any = {};
    if (nombre !== undefined) updateData.nombre = nombre;
    if (nit !== undefined) updateData.nit = nit;
    if (especialidad !== undefined) updateData.especialidad = especialidad;
    if (telefono !== undefined) updateData.telefono = telefono;
    if (email !== undefined) updateData.email = email;
    if (notas !== undefined) updateData.notas = notas;

    const actualizado = await prisma.proveedor.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json(actualizado);
  } catch (error: any) {
    if (error.code === 'P2002') {
       return NextResponse.json({ error: "Nombre duplicado con otro proveedor" }, { status: 400 });
    }
    return NextResponse.json({ error: "Error interno al actualizar" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyAuthRole(request, ["admin"]);
    if (!auth) return NextResponse.json({ error: "Solo administradores pueden eliminar proveedores permanentemente" }, { status: 401 });

    const { id } = await props.params;
    await prisma.proveedor.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Error al purgar el proveedor" }, { status: 500 });
  }
}
