import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAuthRole } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import { generateStandardContract } from "@/lib/utils/contratoTemplate";

// GET: List all contracts (requires authentication)
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuthRole(request);
    if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const proyectoId = searchParams.get("proyectoId");
    const cotizacionId = searchParams.get("cotizacionId");

    const where: any = {};
    if (proyectoId) where.proyectoId = proyectoId;
    if (cotizacionId) where.cotizacionId = cotizacionId;

    const contratos = await prisma.contrato.findMany({
      where,
      include: {
        cotizacion: {
          select: {
            codigo: true,
            tituloPropuesta: true,
            empresaNombre: true,
          }
        }
      },
      orderBy: { fechaCreacion: "desc" }
    });

    return NextResponse.json(contratos);
  } catch (error) {
    console.error("GET /api/contratos error:", error);
    return NextResponse.json({ error: "Error al obtener contratos" }, { status: 500 });
  }
}

// POST: Generate a new contract from a quotation
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuthRole(request);
    if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await request.json();
    const { cotizacionId, trmAplicada, condicionesPago } = body;

    if (!cotizacionId) {
      return NextResponse.json({ error: "Falta cotizacionId" }, { status: 400 });
    }

    // Fetch the quotation with its line items
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id: cotizacionId },
    });

    if (!cotizacion) {
      return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 });
    }

    // Check if a project is already created/associated with this quotation
    const proyecto = await prisma.proyecto.findFirst({
      where: { cotizacionId: cotizacionId }
    });

    const trmNum = Number(trmAplicada) || 1.0;

    // Generate contract content
    const contenidoPlantilla = generateStandardContract({
      codigo: cotizacion.codigo,
      empresaNombre: cotizacion.empresaNombre,
      contactoNombre: cotizacion.contactoNombre,
      tituloPropuesta: cotizacion.tituloPropuesta,
      totalProyectoCore: cotizacion.totalProyectoCore,
      feeMensual: cotizacion.feeMensual,
      feeMensualIncluye: cotizacion.feeMensualIncluye,
      moneda: cotizacion.moneda,
      trmAplicada: trmNum,
      condicionesPago: condicionesPago,
      fasesJson: cotizacion.fasesJson,
    });

    // Create the contract in DB
    const contrato = await prisma.contrato.create({
      data: {
        cotizacionId: cotizacion.id,
        proyectoId: proyecto?.id || null,
        estado: "PENDIENTE",
        trmAplicada: trmNum,
        condicionesPago: condicionesPago || "",
        contenidoPlantilla,
      }
    });

    // Optionally update quotation status to APROBADA_CLIENTE if not already?
    // Let's keep status changes manual or let the user decide, but we can set it to APROBADA_CLIENTE or keep it.
    // The prompt says "un pop up cuando cambie de estado crear el boton de generar contrato...".
    // We will update the status of the quotation to APROBADA_CLIENTE when they click confirm.
    
    auditLog("GENERATE_CONTRACT", contrato.id, auth.email);

    return NextResponse.json(contrato);
  } catch (error) {
    console.error("POST /api/contratos error:", error);
    return NextResponse.json({ error: "Error al generar contrato" }, { status: 500 });
  }
}
