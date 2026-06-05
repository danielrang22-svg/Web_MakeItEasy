import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { verifyAuthRole } from '@/lib/auth';
import prisma from '@/lib/prisma';

const SYSTEM_PROMPT = `Eres un experto consultor comercial de Make It Easy, una empresa colombiana de automatización de negocios con IA. Tu tarea es generar la estructura de una propuesta comercial profesional basada en el brief del cliente.

Make It Easy ofrece estos servicios principales:
- Chatbots con IA (WhatsApp, Web, Instagram)
- Automatización de procesos con n8n / Make
- Sitios web y landing pages
- CRM personalizado
- Integración de pagos (Wompi, PayU, Stripe)
- Sincronización con plataformas (Amazon, Uber Eats, DoorDash, Rappi)
- Dashboards de analítica y BI
- Soporte y mantenimiento mensual

INSTRUCCIONES:
1. Lee el brief del cliente cuidadosamente.
2. Genera una propuesta comercial estructurada y profesional en español.
3. Si recibes el JSON de una propuesta anterior y correcciones del usuario, aplica EXACTAMENTE las correcciones indicadas sin cambiar lo que no se menciona.
4. Sugiere precios en COP realistas basados en el alcance (proyectos pequeños $2M-$5M COP, medianos $5M-$15M COP, grandes $15M+ COP). Fee mensual entre $350.000 y $1.500.000 COP.
5. El JSON de respuesta debe tener EXACTAMENTE esta estructura, sin texto adicional:

{
  "tituloPropuesta": "string",
  "empresaNombre": "string (extraída del brief)",
  "contactoNombre": "string (si se menciona, sino vacío)",
  "desafioNegocio": "string (párrafo profesional describiendo el problema y la solución propuesta, mínimo 3 oraciones)",
  "prerrequisitos": [
    { "titulo": "string", "descripcion": "string" }
  ],
  "arquitectura": [
    { "componente": "string", "funcion": "string" }
  ],
  "fases": [
    { "nombre": "string (ej: Fase 1: Setup y Core)", "objetivo": "string", "detalles": "string (entregables separados por coma)", "precio": number }
  ],
  "checklistInicio": ["string"],
  "moneda": "COP",
  "feeMensual": number,
  "moduloOpcionalFee": number,
  "feeMensualIncluye": "string"
}

RESPONDE ÚNICAMENTE CON EL JSON VÁLIDO. Sin texto antes ni después del JSON.`;

// Supported providers and their base URLs
const PROVIDER_BASE_URLS: Record<string, string | undefined> = {
  openai: undefined, // uses OpenAI default
  deepseek: 'https://api.deepseek.com',
  anthropic: undefined, // not supported via OpenAI-compat yet
  gemini: 'https://generativelanguage.googleapis.com/v1beta/openai/',
};

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuthRole(request);
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await request.json();
    const { brief, correcciones, propuestaAnterior, leadData } = body;

    if (!brief && !correcciones) {
      return NextResponse.json({ error: 'Se requiere un brief o correcciones' }, { status: 400 });
    }

    // ── Load active AI config from DB ──────────────────────────────
    const aiConfig = await prisma.aiConfig.findFirst({
      where: { activo: true },
    });

    // Fallback to env variable if no DB config is active
    const apiKey = aiConfig?.apiKey || process.env.OPENAI_API_KEY;
    const modelo = aiConfig?.modelo || 'gpt-4o-mini';
    const baseURL = aiConfig?.baseUrl || PROVIDER_BASE_URLS[aiConfig?.proveedor ?? 'openai'];

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            'No hay una API Key configurada. Ve a Ajustes → Agente IA y agrega tu API Key.',
        },
        { status: 503 }
      );
    }

    const openai = new OpenAI({
      apiKey,
      ...(baseURL ? { baseURL } : {}),
    });
    // ──────────────────────────────────────────────────────────────

    // Build the user message
    let userMessage = '';

    if (propuestaAnterior && correcciones) {
      userMessage = `Tengo una propuesta comercial ya generada y necesito que apliques las siguientes correcciones:

CORRECCIONES A APLICAR:
${correcciones}

PROPUESTA ANTERIOR (JSON):
${JSON.stringify(propuestaAnterior, null, 2)}

Aplica las correcciones indicadas y devuelve el JSON completo actualizado.`;
    } else {
      userMessage = `Genera una propuesta comercial profesional basada en este brief del cliente:

BRIEF DEL CLIENTE:
${brief}`;

      if (leadData) {
        userMessage += `

DATOS DEL LEAD EN CRM:
- Empresa: ${leadData.empresa || 'N/A'}
- Sector: ${leadData.sector || 'N/A'}
- Número de empleados: ${leadData.numEmpleados || 'N/A'}
- Proceso a automatizar: ${leadData.procesoAAutomatizar || 'N/A'}
- Plan de interés: ${leadData.planInteres || 'N/A'}
- Valor estimado del lead: ${leadData.valorEstimado ? `$${leadData.valorEstimado.toLocaleString('es-CO')} COP` : 'N/A'}`;
      }
    }

    const completion = await openai.chat.completions.create({
      model: modelo,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 3000,
      response_format: { type: 'json_object' },
    });

    const rawContent = completion.choices[0]?.message?.content ?? '{}';

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      return NextResponse.json(
        { error: 'El modelo devolvió un JSON inválido. Intenta de nuevo.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      propuesta: parsed,
      tokensUsed: completion.usage?.total_tokens ?? 0,
      modeloUsado: modelo,
      proveedorUsado: aiConfig?.proveedor ?? 'openai (env)',
    });
  } catch (error: unknown) {
    console.error('POST /api/cotizaciones/generar-ai error:', error);
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
