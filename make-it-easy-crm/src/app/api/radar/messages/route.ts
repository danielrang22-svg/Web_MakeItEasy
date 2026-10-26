import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthRole } from '@/lib/auth';
import { chatJSON, AiConfigError, AiRequestError } from '@/lib/ai/chat';

export const maxDuration = 60;

const SYSTEM = `Eres un vendedor experto de servicios digitales para negocios locales en Colombia.
Escribes mensajes breves, humanos y sin promesas exageradas.
Devuelve SOLO un objeto JSON:
{
  "callScript": "guion de llamada de 30 segundos (máx. 90 palabras)",
  "whatsapp": "mensaje de WhatsApp (máx. 60 palabras, sin emojis excesivos)",
  "email": { "subject": "asunto", "body": "cuerpo del correo (máx. 140 palabras)" }
}
Reglas:
- Español de Colombia, tuteo.
- Menciona 1 o 2 problemas concretos detectados.
- Termina con una propuesta de conversación, nunca con presión.
- No inventes datos del negocio.`;

export async function POST(request: NextRequest) {
  const auth = await verifyAuthRole(request);
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const body = await request.json();
    const business = body?.business ?? {};
    const analysis = body?.analysis ?? {};
    const seller = body?.seller ?? {};
    const tone = typeof body?.tone === 'string' ? body.tone : 'cercano';

    if (!business?.name) {
      return NextResponse.json({ error: 'Falta el negocio' }, { status: 400 });
    }

    const problems = Array.isArray(analysis?.problems)
      ? analysis.problems.map((p: { title?: string; detail?: string }) => `- ${p.title}: ${p.detail}`).join('\n')
      : 'Sin problemas detectados';

    const context = [
      `NEGOCIO: ${business.name} (${business.category || 'sin categoría'})`,
      `DIRECCIÓN: ${business.address || 'no indicada'}`,
      `WEB: ${business.website || 'sin web propia'}`,
      `RESUMEN: ${analysis?.summary || 'no disponible'}`,
      `PROBLEMAS:\n${problems}`,
      `SERVICIO RECOMENDADO: ${analysis?.recommendedService?.type || 'web_nueva'} — ${analysis?.recommendedService?.reason || ''}`,
      `MI PERFIL: ${seller.name || 'Asesor de Make it Easy'}`,
      `QUÉ VENDO: ${seller.whatISell || 'webs, agentes de IA por WhatsApp y sistemas de citas'}`,
      `MI PROPUESTA: ${seller.proposal || 'soluciones sencillas que ahorran tiempo y captan clientes'}`,
      `TONO: ${tone}`,
    ].join('\n');

    const { data, meta } = await chatJSON<{
      callScript?: string;
      whatsapp?: string;
      email?: { subject?: string; body?: string };
    }>({
      system: SYSTEM,
      user: `Redacta los tres borradores para este negocio:\n\n${context}`,
      proposito: 'radar',
      agentId: body?.agentId,
      temperature: 0.6,
      maxTokens: 900,
      timeoutMs: 45000,
    });

    return NextResponse.json({
      drafts: {
        tone,
        callScript: String(data?.callScript ?? '').slice(0, 1400),
        whatsapp: String(data?.whatsapp ?? '').slice(0, 900),
        email: {
          subject: String(data?.email?.subject ?? '').slice(0, 160),
          body: String(data?.email?.body ?? '').slice(0, 2500),
        },
      },
      meta: { provider: meta.provider, model: meta.model, latencyMs: meta.latencyMs },
    });
  } catch (error) {
    if (error instanceof AiConfigError) {
      return NextResponse.json({ error: error.message, code: 'AI_CONFIG' }, { status: error.status });
    }
    if (error instanceof AiRequestError) {
      return NextResponse.json({ error: error.message, code: 'AI_REQUEST' }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error generando los borradores' },
      { status: 500 }
    );
  }
}
