import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import OpenAI from "openai";
import { verifyAuthRole } from "@/lib/auth";
import mammoth from "mammoth";

export async function POST(request: NextRequest) {
  const auth = await verifyAuthRole(request);
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    
    if (!files?.length) {
      return NextResponse.json({ error: "No se proporcionaron archivos." }, { status: 400 });
    }

    const aiConn = await prisma.aiConnection.findFirst({
      where: { proveedor: "openai" }
    });

    let apiKey = aiConn?.apiKey;
    if (!apiKey) {
      apiKey = process.env.OPENAI_API_KEY;
    }

    if (!apiKey) {
      return NextResponse.json({ error: "No hay una API Key de OpenAI configurada." }, { status: 500 });
    }

    const upperKey = apiKey.toUpperCase();
    const isPlaceholder = upperKey.includes('COLOCA') || upperKey.includes('AQUI_TU_API_KEY') || upperKey.startsWith('SK-COLOCA');
    const hasNonAscii = /[^\x00-\x7F]/.test(apiKey);
    const hasWhitespace = /\s/.test(apiKey);

    if (hasNonAscii || hasWhitespace || isPlaceholder) {
      return NextResponse.json({ error: "La API Key configurada es inválida (valor por defecto). Edítala en Ajustes -> Agente IA." }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey });

    let documentText = "";
    const imageParts: { type: "image_url", image_url: { url: string } }[] = [];

    for (const file of files) {
      const mimeType = file.type || "";
      const name = file.name.toLowerCase();
      
      const isPdf = mimeType === "application/pdf" || name.endsWith(".pdf");
      const isWord = name.endsWith(".docx");
      const isText = mimeType.startsWith("text/") || name.endsWith(".txt") || name.endsWith(".md");
      const isImage = mimeType.startsWith("image/");

      if (isPdf) {
        const pdf = require("pdf-parse");
        const arrayBuffer = await file.arrayBuffer();
        const pdfData = await pdf(Buffer.from(arrayBuffer));
        documentText += `\n--- CONTENIDO DEL ARCHIVO PDF (${file.name}) ---\n${pdfData.text}\n`;
      } else if (isWord) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ buffer: Buffer.from(arrayBuffer) });
        documentText += `\n--- CONTENIDO DEL ARCHIVO WORD (${file.name}) ---\n${result.value}\n`;
      } else if (isText) {
        const text = await file.text();
        documentText += `\n--- CONTENIDO DEL ARCHIVO DE TEXTO (${file.name}) ---\n${text}\n`;
      } else if (isImage) {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Data = buffer.toString("base64");
        imageParts.push({
          type: "image_url",
          image_url: { url: `data:${mimeType};base64,${base64Data}` }
        });
      } else {
        // Fallback for unknown text-like files
        try {
          const text = await file.text();
          documentText += `\n--- CONTENIDO DEL ARCHIVO (${file.name}) ---\n${text.substring(0, 5000)}\n`;
        } catch (e) {
          console.warn("Could not read file", file.name);
        }
      }
    }

    const systemPrompt = `Eres un experto Technical Project Manager.
El usuario ha proporcionado documentos (briefs, requerimientos, minutas). Extrae de allí las tareas y entregables para un proyecto.

INSTRUCCIONES:
1. Agrupa los requerimientos lógicamente en Milestones (Hitos).
2. Para cada milestone, genera las Tareas (Issues) necesarias.
3. Clasifica las tareas en: 'product' (historias), 'development' (tareas técnicas), o 'bug'.
4. Asigna prioridades (0=none, 1=low, 2=medium, 3=high, 4=urgent).
5. Sugiere etiquetas y estimados en puntos de historia (1, 2, 3, 5, 8).
6. Devuelve ÚNICAMENTE un JSON con esta estructura:
{
  "milestones": [
    { "idTemp": "m1", "nombre": "Fase 1: Backend", "descripcion": "..." }
  ],
  "tareas": [
    {
      "titulo": "Crear modelo de BD",
      "descripcion": "...",
      "tipo": "development",
      "prioridad": 3,
      "estimado": 5,
      "etiquetas": ["backend", "db"],
      "milestoneIdTemp": "m1" 
    }
  ]
}`;

    const messages: any[] = [
      { role: "system", content: systemPrompt },
      { 
        role: "user", 
        content: imageParts.length > 0 
          ? [{ type: "text", text: `DOCUMENTOS DE TEXTO:\n${documentText}` }, ...imageParts]
          : `DOCUMENTOS DE TEXTO:\n${documentText}` 
      }
    ];

    const completion = await openai.chat.completions.create({
      model: imageParts.length > 0 ? "gpt-4o" : "gpt-4o-mini",
      messages,
      temperature: 0.5,
      response_format: { type: "json_object" }
    });

    const resultStr = completion.choices[0].message.content || "{}";
    const resultJson = JSON.parse(resultStr);

    return NextResponse.json(resultJson);

  } catch (error: any) {
    console.error("POST /api/tareas/importar error:", error);
    let msg = error instanceof Error ? error.message : 'Error desconocido procesando el archivo';
    
    // Interceptar el error 401 de OpenAI de raiz
    if (msg.includes('401') && msg.toLowerCase().includes('api key')) {
      msg = 'La API Key de OpenAI configurada es incorrecta o es un valor de prueba (ej. COLOCA_AQUI...). Por favor, actualízala con una clave real en Ajustes -> Agente IA.';
    }
    
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
