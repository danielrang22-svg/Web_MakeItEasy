import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { verifyAuthRole } from '@/lib/auth';
import prisma from '@/lib/prisma';

const PROVIDER_BASE_URLS: Record<string, string | undefined> = {
  openai: undefined,
  deepseek: 'https://api.deepseek.com',
  anthropic: undefined,
  gemini: 'https://generativelanguage.googleapis.com/v1beta/openai/',
};

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuthRole(request);
    if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const empresaNombre = formData.get('empresaNombre') as string;
    const contactoNombre = formData.get('contactoNombre') as string;
    const estado = formData.get('estado') as string;

    if (!file) {
      return NextResponse.json({ error: 'No se envió ningún archivo' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let extractedText = '';

    // Extracción de texto según el formato
    if (file.name.toLowerCase().endsWith('.pdf')) {
      const pdfParse = require('pdf-parse');
      // @ts-ignore
      const pdfData = await pdfParse(buffer);
      extractedText = pdfData.text;
    } else if (file.name.toLowerCase().endsWith('.docx')) {
      const mammoth = (await import('mammoth')).default;
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value;
    } else if (file.name.toLowerCase().endsWith('.txt')) {
      extractedText = buffer.toString('utf-8');
    } else {
      return NextResponse.json({ error: 'Formato no soportado. Usa PDF, DOCX o TXT.' }, { status: 400 });
    }

    // Limitar el texto extraído para no desbordar el token limit (aprox 30k chars)
    if (extractedText.length > 30000) {
      extractedText = extractedText.substring(0, 30000);
    }

    // Prompt para estructurar la cotización
    const systemPrompt = `
      Eres un experto analista comercial. Tu tarea es extraer la información de la siguiente cotización o propuesta comercial cruda
      y estructurarla exactamente en el formato JSON que el CRM MakeItEasy espera.
      Devuelve ÚNICAMENTE un JSON válido sin markdown ni formato de bloques de código.

      Campos a extraer:
      - tituloPropuesta (String): Título o resumen de la propuesta.
      - desafioNegocio (String): El reto, problema u objetivo del cliente.
      - prerrequisitos (Array): Array de objetos { titulo: string, descripcion: string } con requerimientos previos. Si no hay, devuelve [].
      - arquitectura (Array): Array de objetos { componente: string, funcion: string }.
      - fases (Array): Array de objetos { nombre: string, objetivo: string, detalles: string, precio: number }.
      - checklistInicio (Array): Array de strings de entregables o ítems para iniciar el proyecto.
      - feeMensual (Number): Precio recurrente mensual. Si no hay, 0.
      - moduloOpcionalFee (Number): Si hay precios opcionales o addons. Si no, 0.
      - feeMensualIncluye (String): Qué incluye el fee mensual.
      - moneda (String): "COP" o "USD".
      - observaciones (String): Notas adicionales.

      No incluyas la empresa ni el contacto (esos ya los sabemos).
    `;

    const activeAgent = await prisma.agent.findFirst({
      where: { activo: true },
      include: { conexion: true },
    });

    // Fallback logic: check active agent first, then any openai connection in DB, then env
    let apiKey = activeAgent?.conexion?.apiKey;
    let modelo = activeAgent?.conexion?.modelo || 'gpt-4o-mini';
    let baseURL = activeAgent?.conexion?.baseUrl || PROVIDER_BASE_URLS[activeAgent?.conexion?.proveedor ?? 'openai'];

    if (!apiKey) {
      const fallbackConnection = await prisma.aiConnection.findFirst({
        where: { proveedor: "openai" }
      });
      if (fallbackConnection?.apiKey) {
        apiKey = fallbackConnection.apiKey;
        modelo = fallbackConnection.modelo || modelo;
        baseURL = fallbackConnection.baseUrl || baseURL;
      } else {
        apiKey = process.env.OPENAI_API_KEY;
      }
    }

    if (!apiKey) {
      return NextResponse.json({ error: 'No hay una API Key configurada.' }, { status: 503 });
    }

    const isPlaceholder = apiKey.includes('COLOCA_AQUI_TU_API_KEY') || apiKey.startsWith('sk-COLOCA');
    if (isPlaceholder) {
      const fallbackConnection = await prisma.aiConnection.findFirst({
        where: { proveedor: "openai" }
      });
      if (fallbackConnection?.apiKey && !fallbackConnection.apiKey.includes('COLOCA_AQUI_TU_API_KEY') && !fallbackConnection.apiKey.startsWith('sk-COLOCA')) {
        apiKey = fallbackConnection.apiKey;
        modelo = fallbackConnection.modelo || modelo;
        baseURL = fallbackConnection.baseUrl || baseURL;
      } else {
        return NextResponse.json({ error: 'La API Key activa en Ajustes es invalida (valor por defecto). Editala en Ajustes -> Agente IA.' }, { status: 400 });
      }
    }

    const openai = new OpenAI({
      apiKey,
      ...(baseURL ? { baseUrl: baseURL } : {}),
    });

    const completion = await openai.chat.completions.create({
      model: modelo,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Extrae la información de esta cotización y conviértela en JSON:\n\n${extractedText}` },
      ],
      temperature: 0.2,
      max_tokens: 3000,
      response_format: { type: 'json_object' },
    });

    const aiResponse = completion.choices[0]?.message?.content ?? '{}';

    let parsedData = {};
    try {
        let cleanJson = aiResponse.trim();
        if (cleanJson.startsWith('```json')) cleanJson = cleanJson.replace('```json', '');
        if (cleanJson.endsWith('```')) cleanJson = cleanJson.substring(0, cleanJson.lastIndexOf('```'));
        parsedData = JSON.parse(cleanJson.trim());
    } catch (e) {
        console.error("Failed to parse AI JSON:", aiResponse);
        return NextResponse.json({ error: 'La IA no devolvió un formato válido', raw: aiResponse }, { status: 500 });
    }

    // Retornamos el JSON combinando la data estructurada y la ingresada manualmente
    return NextResponse.json({
        empresaNombre: empresaNombre || "",
        contactoNombre: contactoNombre || "",
        estado: estado || "BORRADOR",
        ...parsedData
    });

  } catch (error) {
    console.error('POST /api/cotizaciones/importar error:', error);
    const msg = error instanceof Error ? error.message : 'Error desconocido al importar';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
