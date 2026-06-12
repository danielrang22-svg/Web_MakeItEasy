import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuthRole } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const auth = await verifyAuthRole(request);
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const body = await request.json();
    const { tareaId, autorNombre, autorEmail, cuerpo } = body;

    if (!tareaId || !cuerpo) {
      return NextResponse.json({ error: 'tareaId y cuerpo son requeridos' }, { status: 400 });
    }

    let githubCommentId = null;

    // Fetch task and project info to sync with GitHub
    const tarea = await prisma.tarea.findUnique({
      where: { id: tareaId },
      include: { proyecto: true }
    });

    if (tarea && tarea.githubPrNumber && tarea.proyecto?.githubRepo) {
      const token = process.env.GITHUB_TOKEN;
      if (token) {
        const ghResponse = await fetch(`https://api.github.com/repos/${tarea.proyecto.githubRepo}/issues/${tarea.githubPrNumber}/comments`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ body: `**${autorNombre || 'Usuario'} (CRM):**\n${cuerpo}` })
        });
        
        if (ghResponse.ok) {
          const ghData = await ghResponse.json();
          githubCommentId = ghData.id.toString();
        } else {
          console.error("Failed to sync comment to GitHub:", await ghResponse.text());
        }
      }
    }

    const comentario = await prisma.comentarioTarea.create({
      data: {
        tareaId,
        autorNombre: autorNombre || 'Usuario',
        autorEmail: autorEmail || 'user@example.com',
        cuerpo,
        githubCommentId
      },
    });

    return NextResponse.json(comentario, { status: 201 });
  } catch (error) {
    console.error('POST /api/comentarios error:', error);
    return NextResponse.json({ error: 'Error al crear comentario' }, { status: 500 });
  }
}
