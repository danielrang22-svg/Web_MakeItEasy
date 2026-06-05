import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAuthRole } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuthRole(request);
    if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const data = await prisma.proveedor.findMany({
      orderBy: { nombre: "asc" }
    });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Error de servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuthRole(request, ["admin", "ventas"]);
    if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await request.json();
    const existe = await prisma.proveedor.findUnique({
      where: { nombre: body.nombre }
    });

    if (existe) {
      return NextResponse.json({ error: "Facturación: Ya existe un proveedor con ese nombre exacto." }, { status: 400 });
    }

    const nuevo = await prisma.proveedor.create({
      data: {
        nombre: body.nombre,
        nit: body.nit || "",
        especialidad: body.especialidad || "",
        telefono: body.telefono || "",
        email: body.email || "",
        notas: body.notas || ""
      }
    });

    return NextResponse.json(nuevo, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Error de servidor al crear proveedor" }, { status: 500 });
  }
}
