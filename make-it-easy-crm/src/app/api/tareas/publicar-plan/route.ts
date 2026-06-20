import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAuthRole } from "@/lib/auth";
import { commitPlanToGithub, parsePlanMarkdown, syncPlanToDb } from "@/lib/github/syncService";

export async function POST(request: NextRequest) {
  const auth = await verifyAuthRole(request);
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await request.json();
    const { proyectoId, milestones, tareas } = body;

    if (!proyectoId || !milestones || !tareas) {
      return NextResponse.json({ error: "Faltan parámetros requeridos" }, { status: 400 });
    }

    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId }
    });

    if (!proyecto) {
      return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    }

    if (!proyecto.githubRepo) {
      return NextResponse.json({ error: "Este proyecto no tiene un repositorio de GitHub asociado" }, { status: 400 });
    }

    // 1. Generate Markdown content
    let markdown = `# Plan de Trabajo: ${proyecto.titulo}\n`;
    markdown += `**Generado:** ${new Date().toLocaleDateString("es-ES")} | **Inicio estimado:** ${proyecto.fechaInicio ? new Date(proyecto.fechaInicio).toLocaleDateString("es-ES") : "Por definir"}\n`;
    markdown += `**Velocidad asumida:** 10 puntos / semana (ajustable)\n\n`;
    
    markdown += `---\n\n`;
    markdown += `## Instrucciones para el Agente de Desarrollo (Cursor / Coding AI)\n`;
    markdown += `> [!IMPORTANT]\n`;
    markdown += `> Este plan de trabajo es la única fuente de verdad para el desarrollo del proyecto.\n`;
    markdown += `> Sigue estas pautas para mantener sincronizado el CRM MakeItEasy:\n`;
    markdown += `> 1. **Comenzar Tarea**: Cambia el estado en la tabla de \`⬜ Pendiente\` a \`🟦 En progreso\` y haz push.\n`;
    markdown += `> 2. **Completar Tarea**: Cambia el estado en la tabla a \`✅ Completada\` y haz push.\n`;
    markdown += `> 3. **Modificaciones de Alcance**: Puedes editar títulos, descripciones o prioridades directamente en la tabla. Al hacer push, el CRM actualizará automáticamente el backlog.\n\n`;
    
    markdown += `---\n\n`;
    markdown += `## Resumen Ejecutivo\n\n`;
    
    const totalPuntos = tareas.reduce((acc: number, t: any) => acc + (parseInt(t.estimado) || 0), 0);
    markdown += `| Métrica | Valor |\n`;
    markdown += `|---------|-------|\n`;
    markdown += `| Total de tareas | ${tareas.length} |\n`;
    markdown += `| Total de puntos | ${totalPuntos} |\n`;
    markdown += `| Fases | ${milestones.length} |\n\n`;
    
    markdown += `---\n\n`;

    // Process milestones and tasks
    milestones.forEach((m: any, phaseIndex: number) => {
      const phaseNum = phaseIndex + 1;
      const phaseTasks = tareas.filter((t: any) => t.milestoneIdTemp === m.idTemp || t.milestoneId === m.id);
      const phasePoints = phaseTasks.reduce((acc: number, t: any) => acc + (parseInt(t.estimado) || 0), 0);

      markdown += `## FASE ${phaseNum}: ${m.nombre}\n`;
      markdown += `**Objetivo de la fase:** ${m.descripcion || "Por definir"}\n`;
      markdown += `**Puntos totales:** ${phasePoints}\n\n`;

      markdown += `| # | ID Tarea | Tarea | Descripción | Módulo | Puntos | Prioridad | Fecha | Estado |\n`;
      markdown += `|---|----------|-------|-------------|--------|--------|-----------|-------|--------|\n`;

      phaseTasks.forEach((t: any, taskIndex: number) => {
        const taskNum = `${phaseNum}.${taskIndex + 1}`;
        const taskId = `T${taskNum}`;
        const priorityStr = t.prioridad === 3 ? "Alta" : t.prioridad === 2 ? "Media" : t.prioridad === 1 ? "Baja" : "Media";
        const moduleStr = t.tipo || "development";
        const pointsStr = t.estimado || "3";
        const descStr = (t.descripcion || "Sin descripción").replace(/\n/g, " ");
        
        markdown += `| ${taskNum} | ${taskId} | ${t.titulo} | ${descStr} | ${moduleStr} | ${pointsStr} | ${priorityStr} | - | ⬜ Pendiente |\n`;
      });

      markdown += `\n---\n\n`;
    });

    // 2. Commit to GitHub
    console.log(`[publicar-plan] Committing PLAN_DE_TRABAJO.md to ${proyecto.githubRepo}...`);
    await commitPlanToGithub(
      proyecto.githubRepo,
      markdown,
      "docs: actualiza PLAN_DE_TRABAJO.md por Agente de Tareas MakeItEasy"
    );

    // 3. Trigger immediate sync to DB
    const parsedPhases = parsePlanMarkdown(markdown);
    if (parsedPhases.length > 0) {
      await syncPlanToDb(proyecto.id, parsedPhases);
    }

    return NextResponse.json({ success: true, message: "Plan publicado y sincronizado con éxito" });

  } catch (error: any) {
    console.error("POST /api/tareas/publicar-plan error:", error);
    return NextResponse.json({ error: error.message || "Error al publicar plan de trabajo" }, { status: 500 });
  }
}
