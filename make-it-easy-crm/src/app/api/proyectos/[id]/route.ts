import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuthRole } from '@/lib/auth';
import { auditLog } from '@/lib/audit';

export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyAuthRole(request);
    if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await props.params;
    const body = await request.json();
    
    // Sanitize body to only allow safe fields
    const { estado, notas, fechaEntregaEstimada, herramientasUsadas } = body;
    const dataToUpdate: any = {};
    if (estado !== undefined) dataToUpdate.estado = estado;
    if (notas !== undefined) dataToUpdate.notas = notas;
    if (fechaEntregaEstimada !== undefined) dataToUpdate.fechaEntregaEstimada = fechaEntregaEstimada ? new Date(fechaEntregaEstimada) : null;
    if (herramientasUsadas !== undefined) dataToUpdate.herramientasUsadas = herramientasUsadas;

    const updated = await prisma.proyecto.update({ where: { id }, data: dataToUpdate });
    
    // If project is finalized (e.g. SOPORTE stage or similar)
    if (estado === "SOPORTE") {
        if (updated.leadId) {
            await prisma.lead.update({
                where: { id: updated.leadId },
                data: { etapa: "GANADO" }
            });
        }
    }
    
    auditLog("UPDATE_PROYECTO", id, auth.email);
    return NextResponse.json(updated);
  } catch (error) { 
    console.error("Error PUT proyectos:", error);
    return NextResponse.json({ error: 'Error al actualizar proyecto' }, { status: 500 }); 
  }
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyAuthRole(request, ["admin"]);
    if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await props.params;
    // Cascade delete related automation flows
    await prisma.automationFlow.deleteMany({ where: { proyectoId: id } });
    await prisma.proyecto.delete({ where: { id } });
    
    auditLog("DELETE_PROYECTO", id, auth.email);
    return NextResponse.json({ success: true });
  } catch (error) { 
    console.error("Error DELETE proyectos:", error);
    return NextResponse.json({ error: 'Error al eliminar proyecto' }, { status: 500 }); 
  }
}
