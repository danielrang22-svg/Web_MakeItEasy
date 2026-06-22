import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;

    const contrato = await prisma.contrato.findUnique({
      where: { id },
      include: {
        cotizacion: {
          select: {
            codigo: true,
            tituloPropuesta: true,
            empresaNombre: true,
            contactoNombre: true,
            totalProyectoCore: true,
            feeMensual: true,
            moneda: true,
          }
        }
      }
    });

    if (!contrato) {
      return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 });
    }

    return NextResponse.json(contrato);
  } catch (error) {
    console.error("GET /api/contratos/[id] error:", error);
    return NextResponse.json({ error: "Error al obtener el contrato" }, { status: 500 });
  }
}
