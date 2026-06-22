import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auditLog } from "@/lib/audit";

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const body = await request.json();
    const { nombreFirmante, cedulaFirmante } = body;

    if (!nombreFirmante || !cedulaFirmante) {
      return NextResponse.json({ error: "Nombre y Cédula/Identificación son requeridos para firmar" }, { status: 400 });
    }

    const contrato = await prisma.contrato.findUnique({
      where: { id }
    });

    if (!contrato) {
      return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 });
    }

    if (contrato.estado === "FIRMADO") {
      return NextResponse.json({ error: "El contrato ya ha sido firmado anteriormente" }, { status: 400 });
    }

    // Get client IP address
    const ipFirma = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
                    request.headers.get("x-real-ip") ||
                    "127.0.0.1";

    const fechaFirma = new Date();

    const updatedContrato = await prisma.contrato.update({
      where: { id },
      data: {
        estado: "FIRMADO",
        nombreFirmante,
        cedulaFirmante,
        ipFirma,
        fechaFirma,
      }
    });

    // Audit log
    auditLog("SIGN_CONTRACT", id, `Client: ${nombreFirmante} (${cedulaFirmante}) IP: ${ipFirma}`);

    // If the contract is signed, let's automatically associate/create the project or update project if it exists.
    // If a project exists, we can add a bitacora note that the contract was signed.
    if (updatedContrato.proyectoId) {
      await prisma.bitacoraProyecto.create({
        data: {
          proyectoId: updatedContrato.proyectoId,
          autorNombre: "Sistema (Firma Digital)",
          autorEmail: "sistema@makeiteasycol.com",
          entrada: `El cliente ${nombreFirmante} (${cedulaFirmante}) ha firmado digitalmente el contrato correspondiente a la cotización vinculada. IP: ${ipFirma}.`,
          tipo: "DECISION"
        }
      });
    }

    return NextResponse.json(updatedContrato);
  } catch (error) {
    console.error("POST /api/contratos/[id]/firmar error:", error);
    return NextResponse.json({ error: "Error al registrar la firma del contrato" }, { status: 500 });
  }
}
