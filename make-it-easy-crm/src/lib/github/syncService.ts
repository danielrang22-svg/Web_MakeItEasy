import prisma from "@/lib/prisma";

export interface ParsedTask {
  code: string;
  title: string;
  description: string;
  module: string;
  points: number | null;
  priority: number;
  dueDateStr: string;
  status: string;
}

export interface ParsedPhase {
  title: string;
  objective: string;
  tasks: ParsedTask[];
}

export function parseStatus(statusStr: string): string {
  const s = statusStr.toLowerCase();
  if (s.includes("✅") || s.includes("completada") || s.includes("completado") || s.includes("done")) {
    return "COMPLETADO";
  }
  if (s.includes("🟦") || s.includes("en progreso") || s.includes("progreso") || s.includes("progress")) {
    return "EN_PROGRESO";
  }
  if (s.includes("🔁") || s.includes("revisión") || s.includes("revision") || s.includes("review") || s.includes("pr abierto")) {
    return "REVISION";
  }
  if (s.includes("⚠️") || s.includes("bloqueada") || s.includes("bloqueado") || s.includes("blocked")) {
    return "PENDIENTE";
  }
  return "PENDIENTE";
}

export function parsePriority(priorityStr: string): number {
  const p = priorityStr.toLowerCase();
  if (p.includes("alta") || p.includes("high") || p.includes("urgente") || p.includes("urgent")) {
    return 3;
  }
  if (p.includes("media") || p.includes("medium")) {
    return 2;
  }
  if (p.includes("baja") || p.includes("low")) {
    return 1;
  }
  return 0;
}

export function parseModule(moduleStr: string): string {
  const m = moduleStr.toLowerCase();
  if (m.includes("product") || m.includes("producto") || m.includes("design") || m.includes("diseño")) return "product";
  if (m.includes("bug") || m.includes("fix") || m.includes("error")) return "bug";
  return "development";
}

export function parsePlanMarkdown(markdown: string): ParsedPhase[] {
  const phases: ParsedPhase[] = [];
  
  // Split by "## FASE" or "## Fase"
  const blocks = markdown.split(/##\s+FASE/i);
  
  // Skip the first block (executive summary)
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    const lines = block.split("\n");
    
    if (lines.length === 0) continue;
    
    const title = "FASE" + lines[0].trim();
    let objective = "";
    
    // Find objective (lines starting with **Objetivo)
    const objLine = lines.find(l => l.toLowerCase().includes("**objetivo"));
    if (objLine) {
      objective = objLine.replace(/\*\*[Oo]bjetivo[^\*]*\*\*[:]?\s*/, "").trim();
    }
    
    const parsedPhase: ParsedPhase = {
      title,
      objective,
      tasks: []
    };
    
    // Parse table rows
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
        const cols = trimmed.split("|").map(c => c.trim());
        // A valid row has at least 9 elements from split
        if (cols.length >= 9) {
          const code = cols[2];
          // Ignore header or separator rows
          if (!code || code === "ID Tarea" || code.startsWith("---")) {
            continue;
          }
          
          const titleCell = cols[3];
          const descCell = cols[4];
          const moduleCell = cols[5];
          const pointsCell = cols[6];
          const prioCell = cols[7];
          const dateCell = cols[8];
          const statusCell = cols[9];
          
          parsedPhase.tasks.push({
            code,
            title: titleCell,
            description: descCell,
            module: parseModule(moduleCell),
            points: parseInt(pointsCell) || null,
            priority: parsePriority(prioCell),
            dueDateStr: dateCell,
            status: parseStatus(statusCell)
          });
        }
      }
    }
    
    phases.push(parsedPhase);
  }
  
  return phases;
}

export async function fetchPlanFromGithub(repo: string): Promise<string> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN no configurado en el servidor");
  }

  const headers = {
    "Authorization": `Bearer ${token}`,
    "Accept": "application/vnd.github.v3+json",
  };

  let res = await fetch(`https://api.github.com/repos/${repo}/contents/_BLUEPRINT/PLAN_DE_TRABAJO.md`, { headers });
  if (!res.ok) {
    res = await fetch(`https://api.github.com/repos/${repo}/contents/PLAN_DE_TRABAJO.md`, { headers });
  }

  if (!res.ok) {
    throw new Error(`No se pudo encontrar el plan de trabajo en el repositorio (Status ${res.status})`);
  }

  const json = await res.json();
  if (!json || !json.content) {
    throw new Error("Formato de respuesta de GitHub inválido o archivo vacío");
  }

  return Buffer.from(json.content, "base64").toString("utf-8");
}

export async function syncPlanToDb(proyectoId: string, parsedPhases: ParsedPhase[]) {
  // Load existing milestones
  const existingMilestones = await prisma.milestone.findMany({
    where: { proyectoId }
  });
  
  // Load existing tasks
  const existingTasks = await prisma.tarea.findMany({
    where: { proyectoId }
  });
  
  let phasesSynced = 0;
  let tasksSynced = 0;
  
  const parsedTaskCodes = new Set<string>();
  const parsedPhaseNames = new Set<string>();
  
  for (const phase of parsedPhases) {
    parsedPhaseNames.add(phase.title);
    
    // Find or create milestone
    let milestone = existingMilestones.find(m => m.nombre === phase.title);
    if (milestone) {
      milestone = await prisma.milestone.update({
        where: { id: milestone.id },
        data: { descripcion: phase.objective }
      });
    } else {
      milestone = await prisma.milestone.create({
        data: {
          proyectoId,
          nombre: phase.title,
          descripcion: phase.objective
        }
      });
      existingMilestones.push(milestone); // Add to array for reference
    }
    phasesSynced++;
    
    // Process tasks
    for (const task of phase.tasks) {
      parsedTaskCodes.add(task.code);
      const taskTag = `Plan: ${task.code}`;
      
      // Find task by tag
      const existingTask = existingTasks.find(t => {
        if (!t.etiquetas) return false;
        try {
          const tags = JSON.parse(t.etiquetas);
          return Array.isArray(tags) && tags.includes(taskTag);
        } catch {
          return false;
        }
      });
      
      if (existingTask) {
        // Update task
        await prisma.tarea.update({
          where: { id: existingTask.id },
          data: {
            titulo: task.title,
            descripcion: task.description,
            tipo: task.module,
            prioridad: task.priority,
            estimado: task.points,
            estado: task.status,
            milestoneId: milestone.id,
            completadaEn: (task.status === "COMPLETADO" && existingTask.estado !== "COMPLETADO") ? new Date() : existingTask.completadaEn
          }
        });
      } else {
        // Create task
        await prisma.tarea.create({
          data: {
            proyectoId,
            milestoneId: milestone.id,
            titulo: task.title,
            descripcion: task.description,
            tipo: task.module,
            prioridad: task.priority,
            estimado: task.points,
            estado: task.status,
            etiquetas: JSON.stringify([taskTag]),
            completadaEn: task.status === "COMPLETADO" ? new Date() : null
          }
        });
      }
      tasksSynced++;
    }
  }
  
  // Cleanup deleted tasks (tasks that have a Plan tag but are no longer in the markdown)
  let tasksDeleted = 0;
  for (const t of existingTasks) {
    if (t.etiquetas) {
      try {
        const tags = JSON.parse(t.etiquetas);
        const planTag = tags.find((tag: string) => tag.startsWith("Plan: "));
        if (planTag) {
          const code = planTag.replace("Plan: ", "");
          if (!parsedTaskCodes.has(code)) {
            // Task is in DB but not in parsed markdown plan -> delete it
            await prisma.tarea.delete({ where: { id: t.id } });
            tasksDeleted++;
          }
        }
      } catch (e) {
        // Ignore invalid json
      }
    }
  }
  
  // Cleanup deleted milestones (milestones that are no longer in the markdown plan)
  for (const m of existingMilestones) {
    if (!parsedPhaseNames.has(m.nombre)) {
      // First delete its tasks to avoid FK errors
      await prisma.tarea.deleteMany({ where: { milestoneId: m.id } });
      await prisma.milestone.delete({ where: { id: m.id } });
    }
  }
  
  return { success: true, phasesSynced, tasksSynced, tasksDeleted };
}

export async function commitPlanToGithub(repo: string, markdown: string, message: string): Promise<{ success: boolean; sha?: string }> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN no configurado en el servidor");
  }

  const headers = {
    "Authorization": `Bearer ${token}`,
    "Accept": "application/vnd.github.v3+json",
    "Content-Type": "application/json"
  };

  // 1. Try to find the file first to get its SHA if it exists
  let sha: string | undefined;
  let targetPath = "_BLUEPRINT/PLAN_DE_TRABAJO.md";
  
  try {
    let res = await fetch(`https://api.github.com/repos/${repo}/contents/_BLUEPRINT/PLAN_DE_TRABAJO.md`, { headers });
    if (!res.ok) {
      res = await fetch(`https://api.github.com/repos/${repo}/contents/PLAN_DE_TRABAJO.md`, { headers });
      if (res.ok) {
        targetPath = "PLAN_DE_TRABAJO.md";
      }
    }
    
    if (res.ok) {
      const data = await res.json();
      sha = data.sha;
    }
  } catch (err) {
    console.warn("[commitPlanToGithub] Error checking existing file: ", err);
  }

  // 2. Base64 encode the markdown content
  const contentBase64 = Buffer.from(markdown, "utf-8").toString("base64");

  // 3. Perform the PUT request to create/update
  const putUrl = `https://api.github.com/repos/${repo}/contents/${targetPath}`;
  const body = {
    message,
    content: contentBase64,
    sha // If undefined, GitHub API creates a new file; if present, updates it
  };

  const putRes = await fetch(putUrl, {
    method: "PUT",
    headers,
    body: JSON.stringify(body)
  });

  if (!putRes.ok) {
    const errorText = await putRes.text();
    throw new Error(`Failed to commit file to GitHub (Status ${putRes.status}): ${errorText}`);
  }

  const putData = await putRes.json();
  return { success: true, sha: putData.content?.sha };
}

