import { NextRequest, NextResponse } from "next/server";
import { verifyAuthRole } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { fetchPlanFromGithub, parsePlanMarkdown, syncPlanToDb } from "@/lib/github/syncService";

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyAuthRole(request);
    if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await props.params;
    
    // Get project
    const project = await prisma.proyecto.findUnique({
      where: { id }
    });

    if (!project) {
      return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    }

    if (!project.githubRepo) {
      return NextResponse.json({ error: "Este proyecto no tiene un repositorio de GitHub vinculado" }, { status: 400 });
    }

    // Fetch plan
    const markdown = await fetchPlanFromGithub(project.githubRepo);
    
    // Parse
    const phases = parsePlanMarkdown(markdown);
    
    if (phases.length === 0) {
      return NextResponse.json({ error: "No se encontraron fases en el plan de trabajo" }, { status: 400 });
    }

    // Sync
    const result = await syncPlanToDb(project.id, phases);
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error en POST /api/proyectos/[id]/sync-plan:", error);
    return NextResponse.json({ error: error.message || "Error interno del servidor al sincronizar" }, { status: 500 });
  }
}
