import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuthRole } from '@/lib/auth';
import { sanitize } from '@/lib/validate';
import { auditLog } from '@/lib/audit';

export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyAuthRole(request);
    if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await props.params;
    const body = await request.json();
    const { 
      titulo, nombreContacto, empresa, valorEstimado, telefono, email, notas, 
      etapa, origenLead, sector, numEmpleados, procesoAAutomatizar, planInteres 
    } = body;
    
    // Whitelisting and sanitization
    const data: any = {};
    if (titulo !== undefined) data.titulo = sanitize(titulo);
    if (nombreContacto !== undefined) data.nombreContacto = sanitize(nombreContacto);
    if (empresa !== undefined) data.empresa = sanitize(empresa);
    if (valorEstimado !== undefined) data.valorEstimado = Number(valorEstimado);
    if (telefono !== undefined) data.telefono = sanitize(telefono);
    if (email !== undefined) data.email = sanitize(email);
    if (notas !== undefined) data.notas = sanitize(notas);
    if (origenLead !== undefined) data.origenLead = sanitize(origenLead);
    
    // Custom Make It Easy fields
    if (sector !== undefined) data.sector = sanitize(sector);
    if (numEmpleados !== undefined) data.numEmpleados = sanitize(numEmpleados);
    if (procesoAAutomatizar !== undefined) data.procesoAAutomatizar = sanitize(procesoAAutomatizar);
    if (planInteres !== undefined) data.planInteres = sanitize(planInteres);

    // Validate Etapa against new enum
    if (etapa !== undefined) {
      const validEtapas = ["NUEVO", "CONTACTADO", "PROPUESTA", "NEGOCIACION", "GANADO", "PERDIDO"];
      if (!validEtapas.includes(etapa)) {
        return NextResponse.json({ error: "Etapa inválida" }, { status: 400 });
      }
      data.etapa = etapa;
    }

    const updatedLead = await prisma.lead.update({
      where: { id },
      data: data,
    });
    
    auditLog("UPDATE", id, auth.email);
    
    return NextResponse.json(updatedLead);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Error updating lead' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyAuthRole(request, ["admin"]);
    if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await props.params;

    await prisma.lead.delete({
      where: { id },
    });
    
    auditLog("DELETE", id, auth.email);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Error deleting lead' }, { status: 500 });
  }
}
