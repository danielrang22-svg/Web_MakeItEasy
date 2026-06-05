import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAuthRole } from "@/lib/auth";

export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyAuthRole(request, ["admin"]);
    if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    // Limpia todas las tablas transaccionales en una única operación segura (ignora Usuarios)
    await prisma.$transaction([
      prisma.automationFlow.deleteMany({}),
      prisma.proyecto.deleteMany({}),
      prisma.cotizacion.deleteMany({}),
      prisma.interaccion.deleteMany({}),
      prisma.contacto.deleteMany({}),
      prisma.empresa.deleteMany({}),
      prisma.lead.deleteMany({}),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reseteando BD:", error);
    return NextResponse.json({ error: "Error interno reseteando base de datos" }, { status: 500 });
  }
}
