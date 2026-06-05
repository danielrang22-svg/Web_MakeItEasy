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
    const { 
      codigo, version, vendedor, fecha, leadId, empresaNombre, contactoNombre, 
      estado, tituloPropuesta, desafioNegocio, prerrequisitos, arquitecturaJson, 
      fasesJson, checklistInicio, totalProyectoCore, moduloOpcionalFee, 
      feeMensual, feeMensualIncluye, moneda, observaciones, validez 
    } = body;

    const cotizacionData: any = {};
    if (codigo !== undefined) cotizacionData.codigo = codigo;
    if (version !== undefined) cotizacionData.version = version;
    if (vendedor !== undefined) cotizacionData.vendedor = vendedor;
    if (fecha !== undefined) cotizacionData.fecha = new Date(fecha);
    if (leadId !== undefined) cotizacionData.leadId = leadId || null;
    if (empresaNombre !== undefined) cotizacionData.empresaNombre = empresaNombre;
    if (contactoNombre !== undefined) cotizacionData.contactoNombre = contactoNombre;
    if (estado !== undefined) cotizacionData.estado = estado;
    
    // Rich Proposal Fields
    if (tituloPropuesta !== undefined) cotizacionData.tituloPropuesta = tituloPropuesta;
    if (desafioNegocio !== undefined) cotizacionData.desafioNegocio = desafioNegocio;
    if (prerrequisitos !== undefined) cotizacionData.prerrequisitos = prerrequisitos;
    if (arquitecturaJson !== undefined) cotizacionData.arquitecturaJson = arquitecturaJson;
    if (fasesJson !== undefined) cotizacionData.fasesJson = fasesJson;
    if (checklistInicio !== undefined) cotizacionData.checklistInicio = checklistInicio;
    
    // Pricing
    if (totalProyectoCore !== undefined) cotizacionData.totalProyectoCore = Number(totalProyectoCore) || 0;
    if (moduloOpcionalFee !== undefined) cotizacionData.moduloOpcionalFee = Number(moduloOpcionalFee) || 0;
    if (feeMensual !== undefined) cotizacionData.feeMensual = Number(feeMensual) || 0;
    if (feeMensualIncluye !== undefined) cotizacionData.feeMensualIncluye = feeMensualIncluye;
    if (moneda !== undefined) cotizacionData.moneda = moneda;
    
    if (observaciones !== undefined) cotizacionData.observaciones = observaciones;
    if (validez !== undefined) cotizacionData.validez = validez;

    const updated = await prisma.cotizacion.update({
      where: { id },
      data: cotizacionData
    });

    // If proposal is approved, move lead to GANADO (won)
    if (body.estado === "APROBADA" && updated.leadId) {
        await prisma.lead.update({
            where: { id: updated.leadId },
            data: { etapa: "GANADO" }
        });
    }

    auditLog("UPDATE_COTIZACION", id, auth.email);
    return NextResponse.json(updated);
  } catch (error) { 
    console.error("PUT /api/cotizaciones/[id] error:", error);
    return NextResponse.json({ error: 'Error al actualizar cotización' }, { status: 500 }); 
  }
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyAuthRole(request, ["admin"]);
    if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await props.params;
    await prisma.cotizacion.delete({ where: { id } });
    
    auditLog("DELETE_COTIZACION", id, auth.email);
    return NextResponse.json({ success: true });
  } catch (error) { 
    console.error("DELETE /api/cotizaciones/[id] error:", error);
    return NextResponse.json({ error: 'Error al eliminar cotización' }, { status: 500 }); 
  }
}
