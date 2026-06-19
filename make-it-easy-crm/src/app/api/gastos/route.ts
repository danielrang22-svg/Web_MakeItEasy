import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAuthRole } from "@/lib/auth";

export async function GET(request: NextRequest) {
    const auth = await verifyAuthRole(request);
    if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const proyectoId = searchParams.get("proyectoId");
    
    try {
        const gastos = await prisma.gasto.findMany({
            where: proyectoId ? { proyectoId } : undefined,
            orderBy: { fecha: "desc" },
            include: { 
                proyecto: { select: { titulo: true, clienteNombre: true } }, 
                proveedor: { select: { nombre: true } },
                usuario: { select: { nombre: true } }
            }
        });
        return NextResponse.json(gastos);
    } catch (error) {
        console.error("GET /api/gastos error:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const auth = await verifyAuthRole(request);
    if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    try {
        const body = await request.json();
        
        const newGasto = await prisma.gasto.create({
            data: {
                concepto: body.concepto,
                monto: Number(body.monto),
                moneda: body.moneda || "COP",
                fecha: body.fecha ? new Date(body.fecha) : undefined,
                categoria: body.categoria || "GENERAL",
                recurrente: body.recurrente || false,
                estado: body.estado || "PAGADO",
                notas: body.notas || null,
                proyectoId: body.proyectoId || null,
                proveedorId: body.proveedorId || null,
                usuarioId: body.usuarioId || null,
            }
        });

        return NextResponse.json(newGasto, { status: 201 });
    } catch (error) {
        console.error("POST /api/gastos error:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
