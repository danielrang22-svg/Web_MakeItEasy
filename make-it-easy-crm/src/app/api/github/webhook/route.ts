import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    // Event: Pull Request (opened or closed)
    if (payload.pull_request) {
      const pr = payload.pull_request;
      const branchName = pr.head.ref;
      
      if (payload.action === "opened" || payload.action === "reopened") {
        if (branchName) {
          await prisma.tarea.updateMany({
            where: { githubBranch: branchName },
            data: { githubPrNumber: pr.number }
          });
          console.log(`[GitHub Webhook] PR #${pr.number} enlazado a la rama ${branchName}`);
        }
      } else if (payload.action === "closed" && pr.merged) {
        if (branchName) {
          const tareas = await prisma.tarea.findMany({
            where: { githubBranch: branchName, estado: { not: "COMPLETADO" } }
          });
          if (tareas.length > 0) {
            await prisma.tarea.updateMany({
              where: { id: { in: tareas.map(t => t.id) } },
              data: { estado: "COMPLETADO", completadaEn: new Date() }
            });
            console.log(`[GitHub Webhook] Tareas cerradas automáticamente por el PR merged de la rama ${branchName}`);
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/github/webhook error:", error);
    return NextResponse.json({ error: "Webhook fail" }, { status: 500 });
  }
}
