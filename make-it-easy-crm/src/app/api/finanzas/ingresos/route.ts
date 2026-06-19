import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET: Listar todos los ingresos
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const proyectoId = searchParams.get("proyectoId");

    const where = proyectoId ? { proyectoId } : {};

    const ingresos = await prisma.ingreso.findMany({
      where,
      orderBy: { fecha: "desc" },
      include: {
        proyecto: {
          select: { id: true, titulo: true, clienteNombre: true }
        }
      }
    });

    return NextResponse.json(ingresos);
  } catch (error) {
    console.error("Error fetching ingresos:", error);
    return NextResponse.json({ error: "Error al obtener ingresos" }, { status: 500 });
  }
}

// POST: Registrar un nuevo ingreso/abono
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { concepto, monto, moneda, trm, fecha, metodoPago, estado, notas, proyectoId } = body;

    if (!concepto || !monto) {
      return NextResponse.json({ error: "Concepto y monto son requeridos" }, { status: 400 });
    }

    const nuevoIngreso = await prisma.ingreso.create({
      data: {
        concepto,
        monto: parseFloat(monto),
        moneda: moneda || "COP",
        trm: trm ? parseFloat(trm) : 1.0,
        fecha: fecha ? new Date(fecha) : new Date(),
        metodoPago,
        estado: estado || "COMPLETADO",
        notas,
        proyectoId
      },
    });

    return NextResponse.json(nuevoIngreso, { status: 201 });
  } catch (error) {
    console.error("Error creating ingreso:", error);
    return NextResponse.json({ error: "Error al crear ingreso" }, { status: 500 });
  }
}
