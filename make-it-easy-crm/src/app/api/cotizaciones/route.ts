import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuthRole } from '@/lib/auth';
import { auditLog } from '@/lib/audit';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuthRole(request);
    if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const data = await prisma.cotizacion.findMany({ 
      orderBy: { fechaCreacion: 'desc' } 
    });
    return NextResponse.json(data);
  } catch (error) {
    console.error('GET /api/cotizaciones error:', error);
    return NextResponse.json({ error: 'Error al obtener cotizaciones' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuthRole(request);
    if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await request.json();

    const cotizacionData = {
      codigo:            body.codigo            ?? '',
      version:           body.version           ?? 1,
      vendedor:          body.vendedor          ?? 'Daniel Rangel',
      fecha:             body.fecha             ? new Date(body.fecha) : new Date(),
      leadId:            body.leadId            || null,
      empresaNombre:     body.empresaNombre     ?? '',
      contactoNombre:    body.contactoNombre    ?? '',
      estado:            body.estado            ?? 'BORRADOR',
      
      // Proposal Content
      tituloPropuesta:   body.tituloPropuesta    ?? 'Propuesta Comercial: Ecosistema Digital Omnicanal',
      desafioNegocio:    body.desafioNegocio     ?? '',
      prerrequisitos:    body.prerrequisitos     ?? '[]',
      arquitecturaJson:  body.arquitecturaJson   ?? '[]',
      fasesJson:         body.fasesJson          ?? '[]',
      checklistInicio:   body.checklistInicio    ?? '[]',
      
      // Pricing
      totalProyectoCore: Number(body.totalProyectoCore)  || 0,
      moduloOpcionalFee: Number(body.moduloOpcionalFee)  || 0,
      feeMensual:        Number(body.feeMensual)         || 0,
      feeMensualIncluye: body.feeMensualIncluye          ?? '',
      moneda:            body.moneda                     ?? 'COP',
      
      observaciones:     body.observaciones              ?? '',
      validez:           body.validez                    ?? '30 días',
    };

    const newData = await prisma.cotizacion.create({ 
      data: cotizacionData
    });

    // If proposal is approved, move lead to GANADO (won)
    if (cotizacionData.estado === "APROBADA" && cotizacionData.leadId) {
        await prisma.lead.update({
            where: { id: cotizacionData.leadId },
            data: { etapa: "GANADO" }
        });
    }

    return NextResponse.json(newData, { status: 201 });
  } catch (error) {
    console.error('POST /api/cotizaciones error:', error);
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
