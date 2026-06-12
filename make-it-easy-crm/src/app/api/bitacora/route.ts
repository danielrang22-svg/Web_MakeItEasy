import { NextRequest, NextResponse } from "next/server";
import { verifyAuthRole } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await verifyAuthRole(request);
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const proyectoId = searchParams.get("proyectoId");

  if (!proyectoId) {
    return NextResponse.json({ error: "Falta proyectoId" }, { status: 400 });
  }

  try {
    const bitacora = await prisma.bitacoraProyecto.findMany({
      where: { proyectoId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(bitacora);
  } catch (error) {
    console.error("GET /api/bitacora error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuthRole(request);
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await request.json();
    const { proyectoId, autorNombre, autorEmail, entrada, tipo } = body;

    if (!proyectoId || !entrada || !autorNombre || !autorEmail) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    const entry = await prisma.bitacoraProyecto.create({
      data: {
        proyectoId,
        autorNombre,
        autorEmail,
        entrada,
        tipo: tipo || "NOTA"
      }
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error("POST /api/bitacora error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
