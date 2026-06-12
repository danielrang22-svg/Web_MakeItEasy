import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import OpenAI from "openai";
import { verifyAuthRole } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const auth = await verifyAuthRole(request);
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await request.json();
    const { 
      cotizacionId, // Si se va a generar desde una cotización existente
      descripcionUsuario, // Si el usuario escribe "necesito tareas para X"
      tareasActuales, // Para correcciones "reemplaza X con Y"
      correcciones 
    } = body;

    const aiConn = await prisma.aiConnection.findFirst({
      where: { proveedor: "openai" }
    });

    if (!aiConn?.apiKey) {
      return NextResponse.json({ error: "No hay una API Key de OpenAI configurada." }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey: aiConn.apiKey });

    let context = "";

    if (cotizacionId) {
      const cotizacion = await prisma.cotizacion.findUnique({
        where: { id: cotizacionId },
        include: { fases: true }
      });
      if (cotizacion) {
        context += `Cotización: ${cotizacion.titulo}\n`;
        context += `Fases de la cotización:\n${JSON.stringify(cotizacion.fases, null, 2)}\n\n`;
      }
    }

    if (descripcionUsuario) {
      context += `Descripción adicional del usuario: ${descripcionUsuario}\n\n`;
    }

    if (tareasActuales) {
      context += `Tareas actuales en el tablero:\n${JSON.stringify(tareasActuales, null, 2)}\n\n`;
    }

    if (correcciones) {
      context += `Correcciones solicitadas por el usuario:\n${correcciones}\n\n`;
    }

    const systemPrompt = `Eres un experto Technical Project Manager.
Tu objetivo es generar o actualizar una lista de tareas (issues) y milestones (hitos) para un proyecto de desarrollo o servicios.

INSTRUCCIONES:
1. Analiza el contexto proporcionado (Fases de la cotización, descripción del usuario, tareas actuales o correcciones).
2. Si se proporciona una Cotización con Fases, crea un Milestone por cada Fase y tareas asociadas a ese milestone.
3. Clasifica las tareas en tipos: 'product' (historias de usuario / funcionalidades grandes), 'development' (tareas técnicas específicas), o 'bug'.
4. Sugiere una prioridad: 0 (none), 1 (low), 2 (medium), 3 (high), 4 (urgent).
5. Sugiere etiquetas (array de strings) como "frontend", "backend", "diseño", "infra", etc.
6. Sugiere estimados en puntos de historia (1, 2, 3, 5, 8) para las tareas de desarrollo.
7. Devuelve SIEMPRE y ÚNICAMENTE un objeto JSON válido con la siguiente estructura (NO envíes backticks ni markdown):
{
  "milestones": [
    { "idTemp": "m1", "nombre": "Fase 1: Diseño", "descripcion": "..." }
  ],
  "tareas": [
    {
      "titulo": "Implementar Auth",
      "descripcion": "...",
      "tipo": "product",
      "prioridad": 3,
      "estimado": 5,
      "etiquetas": ["backend", "seguridad"],
      "milestoneIdTemp": "m1" 
    }
  ]
}
Nota: El 'milestoneIdTemp' en las tareas sirve para relacionarlas con el 'idTemp' de milestones en el mismo JSON. Si no hay milestones, devuélvelo como null.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: context || "Genera un esquema de tareas inicial para un proyecto web básico." }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const resultStr = completion.choices[0].message.content || "{}";
    const resultJson = JSON.parse(resultStr);

    return NextResponse.json(resultJson);

  } catch (error) {
    console.error("POST /api/tareas/generar-ai error:", error);
    return NextResponse.json({ error: "Error en IA" }, { status: 500 });
  }
}
