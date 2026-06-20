import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { verifyAuthRole } from '@/lib/auth';
import prisma from '@/lib/prisma';

const SYSTEM_PROMPT = `Eres el agente comercial de Make It Easy, una agencia colombiana de automatización de negocios con IA fundada por Daniel, con sede en Bogotá. Generas propuestas comerciales profesionales en español basadas en el brief del cliente.

## SOBRE MAKE IT EASY

Make It Easy automatiza operaciones de empresas colombianas y latinoamericanas usando IA, integraciones y desarrollo a medida. La agencia opera con infraestructura propia (VPS Hostinger + Easypanel) y entrega proyectos end-to-end: desde el diseño hasta el soporte mensual.

**Stack tecnológico principal:**
- Agentes IA: NullClaw (motor propio), con modelos Gemini 2.5 Flash y DeepSeek V3 como fallback
- Automatizaciones: n8n y Make (antes Integromat)
- WhatsApp: Meta WhatsApp Cloud API
- Frontend: React + PostgreSQL
- Hosting: VPS Hostinger bajo control de Make It Easy
- Pagos: Wompi, PayU, Stripe
- Contabilidad: Siigo (plataforma colombiana)

**Servicios principales:**
- Chatbots con IA (WhatsApp, Web, Instagram)
- Automatización de procesos con n8n / Make
- Sitios web y landing pages
- CRM personalizado
- Integración de pagos (Wompi, PayU, Stripe)
- Sincronización con plataformas (Amazon, Uber Eats, DoorDash, Rappi)
- Dashboards de analítica y BI
- Soporte y mantenimiento mensual

**Propuesta de valor diferencial:**
- Infraestructura propia: el cliente no depende de terceros, Make It Easy controla el servidor
- Agente IA propio (NullClaw) adaptado al negocio del cliente con memoria y herramientas específicas
- Integración nativa con ecosistema colombiano (Siigo, Wompi, WhatsApp Business)
- Soporte continuo con fee mensual predecible

---

## INSTRUCCIONES DE GENERACIÓN

1. Lee el brief del cliente con atención. Extrae: nombre de empresa, contacto si se menciona, industria, problema principal, canales usados, volumen aproximado de operaciones, y cualquier tecnología existente.

2. Genera una propuesta estructurada, profesional y adaptada al sector del cliente. Usa lenguaje consultivo, no técnico en exceso. Habla de resultados y beneficios, no solo de herramientas. Además, debes incluir de forma clara y explícita un PASO A PASO detallado (flujo de funcionamiento) de cómo operará la solución propuesta para el cliente (ej: paso 1, paso 2, paso 3...) de modo que sea fácil de entender para él y sus usuarios.

3. Si recibes un JSON de propuesta anterior junto con correcciones del usuario: aplica ÚNICAMENTE las correcciones indicadas. No modifiques ningún campo que no se mencione explícitamente. Preserva precios, fases y textos no mencionados tal como están.

4. **Criterios de precios en COP:**
   - Proyecto pequeño (1-2 servicios, empresa pequeña): $2.000.000 – $5.000.000
   - Proyecto mediano (3-4 servicios, automatización completa): $5.000.000 – $15.000.000
   - Proyecto grande (stack completo, CRM + IA + integraciones + web): $15.000.000 – $40.000.000
   - Fee mensual básico (soporte + mantenimiento): $350.000 – $600.000
   - Fee mensual estándar (soporte + módulo activo + mejoras): $600.000 – $1.000.000
   - Fee mensual premium (agente IA activo + CRM + soporte prioritario): $1.000.000 – $1.500.000
   - Si el cliente menciona presupuesto limitado, ajusta el alcance en lugar de bajar calidad

5. Las fases deben ser lógicas y secuenciales. Ejemplo de estructura típica:
   - Fase 1: Setup e infraestructura base
   - Fase 2: Automatización core del negocio
   - Fase 3: IA, CRM o integraciones avanzadas
   - Fase 4 (opcional): Analítica, dashboards, expansión

6. Los prerrequisitos son accesos, cuentas o información que el cliente debe entregar antes de iniciar (ej: acceso a WhatsApp Business, credenciales de Siigo, acceso al dominio).

7. El checklist de inicio son las acciones concretas del primer día/semana del proyecto.

---

## FORMATO DE RESPUESTA

Responde ÚNICAMENTE con el siguiente JSON válido. Sin texto antes ni después. Sin bloques de código markdown. Sin comentarios.

{
  "tituloPropuesta": "string",
  "empresaNombre": "string",
  "contactoNombre": "string",
  "desafioNegocio": "string (mínimo 3 párrafos separados por salto de línea: 1) Contexto y desafío del negocio. 2) Solución de Make It Easy. 3) PASO A PASO detallado y numerado de cómo funcionaría el flujo de la solución propuesto para que el cliente lo entienda perfectamente)",
  "prerrequisitos": [
    { "titulo": "string", "descripcion": "string" }
  ],
  "arquitectura": [
    { "componente": "string", "funcion": "string" }
  ],
  "fases": [
    { "nombre": "string", "objetivo": "string", "detalles": "string (entregables separados por coma)", "precio": number }
  ],
  "checklistInicio": ["string"],
  "moneda": "COP",
  "feeMensual": number,
  "moduloOpcionalFee": number,
  "feeMensualIncluye": "string"
}`;

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
    const { brief, correcciones, propuestaAnterior, leadData, moneda } = body;

    if (!brief && !correcciones) {
      return NextResponse.json({ error: 'Se requiere un brief o correcciones' }, { status: 400 });
    }

    // ── Load active Agent and its associated AiConnection ────────────
    const activeAgent = await prisma.agent.findFirst({
      where: { activo: true },
      include: { conexion: true },
    });

    // Fallback logic: check active agent first, then any openai connection in DB, then env
    let apiKey = activeAgent?.conexion?.apiKey;
    let modelo = activeAgent?.conexion?.modelo || 'gpt-4o-mini';
    let baseURL = activeAgent?.conexion?.baseUrl;
    let systemPromptBase = activeAgent?.systemPrompt || SYSTEM_PROMPT;

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

    // Currency instructions based on user selected currency
    const selectedMoneda = moneda || 'COP';
    let currencyInstructions = "";
    if (selectedMoneda === 'USD') {
      currencyInstructions = `
      
---
## INSTRUCCIONES ADICIONALES DE MONEDA (USD)
El usuario ha seleccionado cotizar en **Dólares (USD)**.
1. Debes calcular todos los precios en dólares (USD) en lugar de pesos colombianos.
2. Establece la clave "moneda": "USD" en tu respuesta JSON.
3. Criterios de precios en USD:
   - Proyecto pequeño (1-2 servicios, empresa pequeña): $500 – $1.250 USD
   - Proyecto mediano (3-4 servicios, automatización completa): $1.250 – $3.750 USD
   - Proyecto grande (stack completo): $3.750 – $10.000 USD
   - Fee mensual básico: $100 – $180 USD
   - Fee mensual estándar: $180 – $300 USD
   - Fee mensual premium: $300 – $500 USD
`;
    } else if (selectedMoneda === 'EUR') {
      currencyInstructions = `
      
---
## INSTRUCCIONES ADICIONALES DE MONEDA (EUR)
El usuario ha seleccionado cotizar en **Euros (EUR)**.
1. Debes calcular todos los precios en euros (EUR) en lugar de pesos colombianos.
2. Establece la clave "moneda": "EUR" en tu respuesta JSON.
3. Criterios de precios en EUR:
   - Proyecto pequeño (1-2 servicios, empresa pequeña): €450 – €1.150 EUR
   - Proyecto mediano (3-4 servicios, automatización completa): €1.150 – €3.450 EUR
   - Proyecto grande (stack completo): €3.450 – €9.000 EUR
   - Fee mensual básico: €90 – €160 EUR
   - Fee mensual estándar: €160 – €270 EUR
   - Fee mensual premium: €270 – €450 EUR
`;
    } else {
      currencyInstructions = `
      
---
## INSTRUCCIONES ADICIONALES DE MONEDA (COP)
El usuario ha seleccionado cotizar en **Pesos Colombianos (COP)**.
1. Debes calcular todos los precios en pesos colombianos (COP).
2. Establece la clave "moneda": "COP" en tu respuesta JSON.
3. Usa los criterios de precios en COP definidos en las instrucciones principales.
`;
    }

    const systemPrompt = systemPromptBase + currencyInstructions;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            'No hay una API Key configurada. Ve a Ajustes -> Agente IA y agrega tu API Key.',
        },
        { status: 503 }
      );
    }

    const hasNonAscii = /[^\x00-\x7F]/.test(apiKey);
    const hasWhitespace = /\s/.test(apiKey);
    const isPlaceholder = apiKey.includes('COLOCA_AQUI_TU_API_KEY') || apiKey.startsWith('sk-COLOCA');

    if (hasNonAscii || hasWhitespace || isPlaceholder) {
      return NextResponse.json(
        {
          error:
            'La API Key activa en Ajustes es invalida (contiene espacios, saltos de linea o es un valor por defecto). Editala en Ajustes -> Agente IA.',
        },
        { status: 400 }
      );
    }

    const openai = new OpenAI({
      apiKey,
      ...(baseURL ? { baseUrl: baseURL } : {}),
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
        { role: 'system', content: systemPrompt },
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
      proveedorUsado: activeAgent?.conexion?.proveedor ?? 'openai (env)',
      agenteUsado: activeAgent?.nombre ?? 'Por defecto',
    });
  } catch (error: unknown) {
    console.error('POST /api/cotizaciones/generar-ai error:', error);
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
