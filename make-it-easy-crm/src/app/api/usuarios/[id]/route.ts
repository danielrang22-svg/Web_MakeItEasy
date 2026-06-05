import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAuthRole } from "@/lib/auth";

export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyAuthRole(request, ["admin"]);
    if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await props.params;
    const body = await request.json();
    const { rol, activo } = body;

    // Soft-lock prevention
    const targetUser = await prisma.usuario.findUnique({ where: { id } });
    if (!targetUser) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    if (activo === false && targetUser.email === auth.email) {
      return NextResponse.json({ error: "No puedes desactivar tu propia cuenta" }, { status: 400 });
    }

    const updated = await prisma.usuario.update({
      where: { id },
      data: {
        rol: rol !== undefined ? rol : targetUser.rol,
        activo: activo !== undefined ? activo : targetUser.activo
      },
      select: { id: true, email: true, nombre: true, rol: true, activo: true }
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Error de servidor" }, { status: 500 });
  }
}
