import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuthRole } from '@/lib/auth';
import { auditLog } from '@/lib/audit';
import { sendEmail } from '@/lib/utils/email';

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

    const existing = await prisma.cotizacion.findUnique({ where: { id } });

    const updated = await prisma.cotizacion.update({
      where: { id },
      data: cotizacionData
    });

    // Notificaciones y Emails por cambio de estado
    if (existing && existing.estado !== estado) {
      const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const cotizacionLink = `${BASE_URL}/cotizaciones`;

      if (estado === "REVISION_TECNICA") {
        // Notificar a los admins
        const admins = await prisma.usuario.findMany({ where: { rol: "admin", activo: true } });
        for (const admin of admins) {
          await prisma.notificacion.create({
            data: {
              usuarioId: admin.id,
              titulo: "Nueva Cotización por Revisar",
              mensaje: `${auth.nombre} envió la cotización ${updated.codigo} (${updated.empresaNombre}) para revisión técnica.`,
              enlace: cotizacionLink
            }
          });
          
          await sendEmail({
            to: admin.email,
            subject: `Revisión Técnica Requerida: Cotización ${updated.codigo}`,
            html: `<p>Hola ${admin.nombre},</p>
                   <p>El comercial <strong>${auth.nombre}</strong> ha enviado la cotización <strong>${updated.codigo}</strong> de la empresa ${updated.empresaNombre} para revisión técnica.</p>
                   <p><a href="${cotizacionLink}">Haz clic aquí para revisarla y aprobarla</a>.</p>`
          });
        }
      } else if (estado === "APROBADA_TECNICAMENTE") {
        // Notificar al vendedor original (buscamos por el nombre del vendedor guardado en la cotización)
        const comercial = await prisma.usuario.findFirst({ where: { nombre: updated.vendedor, activo: true } });
        if (comercial) {
          await prisma.notificacion.create({
            data: {
              usuarioId: comercial.id,
              titulo: "Cotización Aprobada",
              mensaje: `La cotización ${updated.codigo} ha sido aprobada técnicamente por ${auth.nombre}. Ya puedes exportarla a PDF.`,
              enlace: cotizacionLink
            }
          });

          await sendEmail({
            to: comercial.email,
            subject: `Cotización Aprobada: ${updated.codigo}`,
            html: `<p>Hola ${comercial.nombre},</p>
                   <p>Tu cotización <strong>${updated.codigo}</strong> (${updated.empresaNombre}) ha sido <strong>Aprobada Técnicamente</strong> por ${auth.nombre}.</p>
                   <p>Ya puedes ingresar al sistema y exportarla como PDF para enviarla al cliente.</p>
                   <p><a href="${cotizacionLink}">Ir a mis cotizaciones</a></p>`
          });
        }
      }
    }

    // If proposal is approved definitively (won), move lead to GANADO
    if (estado === "ENVIADA_CLIENTE" || estado === "APROBADA") {
        if (updated.leadId) {
            await prisma.lead.update({
                where: { id: updated.leadId },
                data: { etapa: "GANADO" }
            });
        }
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
