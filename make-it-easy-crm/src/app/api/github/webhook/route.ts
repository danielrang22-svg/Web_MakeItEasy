import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    // Event: Pull Request (opened or closed)
    if (payload.pull_request) {
      const pr = payload.pull_request;
      const branchName = pr.head.ref;
      const repoFullName = payload.repository?.full_name;
      
      const project = repoFullName ? await prisma.proyecto.findFirst({
        where: { githubRepo: repoFullName }
      }) : null;
      
      if (payload.action === "opened" || payload.action === "reopened") {
        if (branchName) {
          let associated = false;
          
          if (project) {
            const match = branchName.match(/(?:^|[^0-9])(?:T|t)?(\d+\.\d+)(?:$|[^0-9])/i);
            if (match) {
              const taskCode = match[1];
              const taskTag = `Plan: ${taskCode}`;
              
              const tasks = await prisma.tarea.findMany({
                where: { proyectoId: project.id }
              });
              
              const matchingTask = tasks.find(t => {
                if (!t.etiquetas) return false;
                try {
                  const tags = JSON.parse(t.etiquetas);
                  return Array.isArray(tags) && tags.includes(taskTag);
                } catch {
                  return false;
                }
              });
              
              if (matchingTask) {
                await prisma.tarea.update({
                  where: { id: matchingTask.id },
                  data: {
                    githubBranch: branchName,
                    githubPrNumber: pr.number,
                    estado: "REVISION"
                  }
                });
                associated = true;
                console.log(`[GitHub Webhook] PR #${pr.number} (rama ${branchName}) enlazado automáticamente a Tarea ${matchingTask.id} (${taskCode}) y movida a REVISION`);
              }
            }
          }
          
          if (!associated) {
            await prisma.tarea.updateMany({
              where: { githubBranch: branchName },
              data: { githubPrNumber: pr.number }
            });
            console.log(`[GitHub Webhook] PR #${pr.number} enlazado a la rama ${branchName} por coincidencia exacta`);
          }
        }
      } else if (payload.action === "closed" && pr.merged) {
        if (branchName) {
          const matchingTasks = await prisma.tarea.findMany({
            where: {
              proyectoId: project?.id,
              OR: [
                { githubBranch: branchName },
                { githubPrNumber: pr.number }
              ]
            }
          });
          
          if (matchingTasks.length > 0) {
            await prisma.tarea.updateMany({
              where: { id: { in: matchingTasks.map(t => t.id) } },
              data: { estado: "COMPLETADO", completadaEn: new Date() }
            });
            console.log(`[GitHub Webhook] ${matchingTasks.length} tarea(s) cerradas automáticamente por el PR merged de la rama ${branchName}`);
          }
        }
      }
    }

    // Event: Issue Comment (Comments on PRs trigger this too if it's a general comment)
    if (payload.action === "created" && payload.comment && payload.issue && payload.issue.pull_request) {
      const issueNumber = payload.issue.number;
      const commentBody = payload.comment.body;
      const commentId = payload.comment.id.toString();
      const autor = payload.comment.user.login;

      const tareasEnlazadas = await prisma.tarea.findMany({
        where: { githubPrNumber: issueNumber }
      });

      for (const tarea of tareasEnlazadas) {
        // Prevent duplicate comments if synced from CRM
        const existing = await prisma.comentarioTarea.findFirst({
          where: { githubCommentId: commentId }
        });
        if (!existing) {
          await prisma.comentarioTarea.create({
            data: {
              tareaId: tarea.id,
              cuerpo: commentBody,
              autorNombre: autor,
              autorEmail: `${autor}@github.com`,
              githubCommentId: commentId
            }
          });
          console.log(`[GitHub Webhook] Comentario sincronizado de GitHub a Tarea ${tarea.id}`);
        }
      }
    }

    // Event: Push (Check for PLAN_DE_TRABAJO.md updates)
    if (payload.commits && payload.repository) {
      const repoFullName = payload.repository.full_name;
      const ref = payload.ref;
      const defaultBranch = payload.repository.default_branch;
      
      if (ref === `refs/heads/${defaultBranch}` || ref === "refs/heads/main" || ref === "refs/heads/master") {
        const hasPlanUpdate = payload.commits.some((c: any) => 
          c.added?.some((f: string) => f.includes("PLAN_DE_TRABAJO.md")) ||
          c.modified?.some((f: string) => f.includes("PLAN_DE_TRABAJO.md"))
        );
        
        if (hasPlanUpdate) {
          const project = await prisma.proyecto.findFirst({
            where: { githubRepo: repoFullName }
          });
          
          if (project && project.githubRepo) {
            console.log(`[GitHub Webhook] Push detectado con actualización de plan de trabajo en ${repoFullName}. Sincronizando...`);
            const { fetchPlanFromGithub, parsePlanMarkdown, syncPlanToDb } = await import("@/lib/github/syncService");
            
            try {
              const markdown = await fetchPlanFromGithub(project.githubRepo);
              const phases = parsePlanMarkdown(markdown);
              if (phases.length > 0) {
                const res = await syncPlanToDb(project.id, phases);
                console.log(`[GitHub Webhook] Sync exitoso para ${project.id}:`, res);
              }
            } catch (err) {
              console.error(`[GitHub Webhook] Error sincronizando plan para ${project.id}:`, err);
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/github/webhook error:", error);
    return NextResponse.json({ error: "Webhook fail" }, { status: 500 });
  }
}
