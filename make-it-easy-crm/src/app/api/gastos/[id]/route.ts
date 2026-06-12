import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAuthRole } from "@/lib/auth";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await verifyAuthRole(request);
    if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    try {
        const { id } = await params;
        const body = await request.json();

        const updatedGasto = await prisma.gasto.update({
            where: { id },
            data: {
                concepto: body.concepto,
                monto: body.monto ? Number(body.monto) : undefined,
                moneda: body.moneda,
                fecha: body.fecha ? new Date(body.fecha) : undefined,
                categoria: body.categoria,
                recurrente: body.recurrente,
                estado: body.estado,
                notas: body.notas,
                proyectoId: body.proyectoId,
                proveedorId: body.proveedorId,
            }
        });

        return NextResponse.json(updatedGasto);
    } catch (error) {
        console.error("PUT /api/gastos/[id] error:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await verifyAuthRole(request);
    if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    try {
        const { id } = await params;
        await prisma.gasto.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("DELETE /api/gastos/[id] error:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
