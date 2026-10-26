import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAuthRole } from "@/lib/auth";
import { sanitize } from "@/lib/validate";
import { isRadarLeadStatus } from "@/lib/radar/statuses";
import type { RadarBusiness, RadarLead } from "@/lib/radar/types";

interface RadarLeadRow {
  businessId: string;
  ownerEmail: string;
  ownerName: string;
  status: string;
  notes: string;
  nextActionAt: Date | null;
  business: string;
  fechaCreacion: Date;
  fechaActualizacion: Date;
}

const MAX_BUSINESSES = 200;
const MAX_BUSINESS_BYTES = 60_000;
const MAX_NOTES = 2_000;

function parseBusiness(raw: string): RadarBusiness | null {
  try {
    const value = JSON.parse(raw) as RadarBusiness;
    if (!value || typeof value.id !== "string" || typeof value.name !== "string") return null;
    return value;
  } catch {
    return null;
  }
}

function serializeLead(row: RadarLeadRow): RadarLead | null {
  const business = parseBusiness(row.business);
  if (!business) return null;
  return {
    businessId: row.businessId,
    status: isRadarLeadStatus(row.status) ? row.status : "NUEVO",
    notes: row.notes,
    nextActionAt: row.nextActionAt ? row.nextActionAt.toISOString() : null,
    createdAt: row.fechaCreacion.toISOString(),
    updatedAt: row.fechaActualizacion.toISOString(),
    business,
  };
}

async function listLeads(ownerEmail: string): Promise<RadarLead[]> {
  const rows = await prisma.radarLead.findMany({
    where: { ownerEmail },
    orderBy: { fechaActualizacion: "desc" },
  });
  return rows.map(serializeLead).filter((lead): lead is RadarLead => lead !== null);
}

export async function GET(request: NextRequest) {
  const auth = await verifyAuthRole(request);
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const scope = request.nextUrl.searchParams.get("scope");
    if (scope === "all" && auth.role === "admin") {
      const rows = await prisma.radarLead.findMany({
        orderBy: { fechaActualizacion: "desc" },
      });
      const leads = rows.map(serializeLead).filter((lead): lead is RadarLead => lead !== null);
      return NextResponse.json({ leads, scope: "all" });
    }
    return NextResponse.json({ leads: await listLeads(auth.email) });
  } catch (error) {
    console.error("GET /api/radar/leads", error);
    return NextResponse.json({ error: "No se pudieron cargar los leads" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuthRole(request);
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const businesses = Array.isArray(body?.businesses) ? body.businesses : null;
    if (!businesses || businesses.length === 0) {
      return NextResponse.json({ error: "No hay negocios que guardar" }, { status: 400 });
    }
    if (businesses.length > MAX_BUSINESSES) {
      return NextResponse.json(
        { error: `Máximo ${MAX_BUSINESSES} negocios por petición` },
        { status: 400 }
      );
    }

    const prepared: Array<{ businessId: string; business: string }> = [];
    for (const item of businesses) {
      const business = item as Partial<RadarBusiness> | null;
      if (!business || typeof business.id !== "string" || typeof business.name !== "string") {
        return NextResponse.json({ error: "Negocio inválido" }, { status: 400 });
      }
      const serialized = JSON.stringify(business);
      if (Buffer.byteLength(serialized, "utf8") > MAX_BUSINESS_BYTES) {
        return NextResponse.json({ error: "El negocio es demasiado grande" }, { status: 400 });
      }
      prepared.push({ businessId: business.id, business: serialized });
    }

    await prisma.$transaction(
      prepared.map((item) =>
        prisma.radarLead.upsert({
          where: {
            ownerEmail_businessId: {
              ownerEmail: auth.email,
              businessId: item.businessId,
            },
          },
          create: {
            businessId: item.businessId,
            ownerEmail: auth.email,
            ownerName: auth.nombre || "",
            business: item.business,
          },
          update: {
            ownerName: auth.nombre || "",
            business: item.business,
          },
        })
      )
    );

    return NextResponse.json({ leads: await listLeads(auth.email) });
  } catch (error) {
    console.error("POST /api/radar/leads", error);
    return NextResponse.json({ error: "No se pudieron guardar los leads" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await verifyAuthRole(request);
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const businessId = typeof body?.businessId === "string" ? body.businessId : "";
    if (!businessId) {
      return NextResponse.json({ error: "Falta el negocio" }, { status: 400 });
    }

    const data: { status?: string; notes?: string; nextActionAt?: Date | null } = {};

    if (body?.status !== undefined) {
      if (!isRadarLeadStatus(body.status)) {
        return NextResponse.json({ error: "Estado no válido" }, { status: 400 });
      }
      data.status = body.status;
    }

    if (body?.notes !== undefined) {
      if (typeof body.notes !== "string") {
        return NextResponse.json({ error: "Notas no válidas" }, { status: 400 });
      }
      data.notes = sanitize(body.notes).slice(0, MAX_NOTES);
    }

    if (body?.nextActionAt !== undefined) {
      if (body.nextActionAt === null || body.nextActionAt === "") {
        data.nextActionAt = null;
      } else {
        const date = new Date(String(body.nextActionAt));
        if (Number.isNaN(date.getTime())) {
          return NextResponse.json({ error: "Fecha no válida" }, { status: 400 });
        }
        data.nextActionAt = date;
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
    }

    const where = {
      ownerEmail_businessId: {
        ownerEmail: auth.email,
        businessId,
      },
    };
    const existing = await prisma.radarLead.findUnique({ where });
    if (!existing) {
      return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });
    }

    await prisma.radarLead.update({ where, data });
    return NextResponse.json({ leads: await listLeads(auth.email) });
  } catch (error) {
    console.error("PATCH /api/radar/leads", error);
    return NextResponse.json({ error: "No se pudo actualizar el lead" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await verifyAuthRole(request);
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (body?.all === true) {
      await prisma.radarLead.deleteMany({ where: { ownerEmail: auth.email } });
      return NextResponse.json({ leads: [] });
    }

    const businessId = typeof body?.businessId === "string" ? body.businessId : "";
    if (!businessId) {
      return NextResponse.json({ error: "Falta el negocio" }, { status: 400 });
    }

    await prisma.radarLead.deleteMany({
      where: { ownerEmail: auth.email, businessId },
    });
    return NextResponse.json({ leads: await listLeads(auth.email) });
  } catch (error) {
    console.error("DELETE /api/radar/leads", error);
    return NextResponse.json({ error: "No se pudo eliminar el lead" }, { status: 500 });
  }
}
