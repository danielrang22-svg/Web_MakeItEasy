import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthRole } from '@/lib/auth';
import { chatJSON, AiConfigError, AiRequestError } from '@/lib/ai/chat';
import { fetchWebsite } from '@/lib/radar/webfetch';

export const maxDuration = 90;

interface AnalyzeBody {
  business?: {
    name?: string;
    category?: string;
    address?: string;
    phone?: string;
    website?: string;
    websiteKind?: string;
    tags?: Record<string, string>;
  };
  pagespeed?: {
    performance?: number | null;
    seo?: number | null;
    accessibility?: number | null;
    bestPractices?: number | null;
  } | null;
  agentId?: string;
}

interface Analysis {
  summary: string;
  checklist: {
    https: boolean;
    mobileFriendly: boolean;
    whatsapp: boolean;
    onlineBooking: boolean;
    contactForm: boolean;
    outdatedCopyright: boolean;
  };
  contacts: { emails: string[]; socials: string[] };
  problems: Array<{ title: string; detail: string }>;
  recommendedService: { type: string; reason: string };
}

const SYSTEM = `Eres un consultor de ventas de servicios digitales para negocios locales en España.
Analizas la web de un negocio y devuelves SOLO un objeto JSON con este esquema exacto:
{
  "summary": "string (2 frases, qué hace el negocio y cómo se ve su presencia digital)",
  "checklist": {
    "https": boolean,
    "mobileFriendly": boolean,
    "whatsapp": boolean,
    "onlineBooking": boolean,
    "contactForm": boolean,
    "outdatedCopyright": boolean
  },
  "contacts": { "emails": ["string"], "socials": ["string"] },
  "problems": [{ "title": "string", "detail": "string" }],
  "recommendedService": { "type": "web_nueva | agente_whatsapp | sistema_citas", "reason": "string" }
}
Reglas:
- Español de España, tono profesional y directo.
- Entre 3 y 5 problemas, concretos y en lenguaje llano (sin jerga técnica).
- No inventes datos que no aparezcan en el contenido o en el snapshot.
- El servicio recomendado debe ser uno de los tres tipos indicados.`;

export async function POST(request: NextRequest) {
  const auth = await verifyAuthRole(request);
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const body = (await request.json()) as AnalyzeBody;
    const business = body.business;
    if (!business?.name) {
      return NextResponse.json({ error: 'Falta el negocio a analizar' }, { status: 400 });
    }

    const hasOwnWebsite = business.websiteKind === 'own' && !!business.website;

    if (!hasOwnWebsite) {
      const analysis: Analysis = {
        summary: `${business.name} (${business.category || 'negocio local'}) no tiene una web propia registrada. Su presencia digital depende de fichas externas o redes sociales.`,
        checklist: {
          https: false,
          mobileFriendly: false,
          whatsapp: false,
          onlineBooking: false,
          contactForm: false,
          outdatedCopyright: false,
        },
        contacts: { emails: [], socials: business.website ? [business.website] : [] },
        problems: [
          {
            title: 'No hay web propia',
            detail: 'Cuando alguien busca el negocio no encuentra una página con servicios, precios ni formulario de contacto.',
          },
          {
            title: 'Sin captación de contactos',
            detail: 'No existe un formulario ni un canal propio para recibir solicitudes y hacer seguimiento.',
          },
          {
            title: 'Dependencia de terceros',
            detail: 'La información vive en directorios o redes sociales que no controlas y que no posicionan en Google.',
          },
        ],
        recommendedService: {
          type: 'web_nueva',
          reason: 'Una web propia con WhatsApp y formulario es la base para captar y medir clientes.',
        },
      };

      return NextResponse.json({ analysis, meta: { ai: false, website: null } });
    }

    const snapshot = await fetchWebsite(business.website as string);

    const ps = body.pagespeed;
    const context = [
      `NEGOCIO: ${business.name}`,
      `CATEGORÍA: ${business.category || 'no indicada'}`,
      `DIRECCIÓN: ${business.address || 'no indicada'}`,
      `TELÉFONO: ${business.phone || 'no indicado'}`,
      `WEB: ${business.website}`,
      ps
        ? `PAGESPEED MÓVIL: rendimiento=${ps.performance ?? '?'} seo=${ps.seo ?? '?'} accesibilidad=${ps.accessibility ?? '?'} buenas prácticas=${ps.bestPractices ?? '?'}`
        : 'PAGESPEED: no disponible',
      snapshot.ok
        ? [
            `TÍTULO: ${snapshot.title}`,
            `META DESCRIPCIÓN: ${snapshot.description}`,
            `H1: ${snapshot.h1.join(' | ') || 'ninguno'}`,
            `H2: ${snapshot.h2.join(' | ') || 'ninguno'}`,
            `HTTPS: ${snapshot.https}`,
            `VIEWPORT MÓVIL: ${snapshot.hasViewport}`,
            `WHATSAPP: ${snapshot.hasWhatsapp}`,
            `RESERVA/CITA: ${snapshot.hasBooking}`,
            `FORMULARIO: ${snapshot.hasForm}`,
            `AÑO COPYRIGHT: ${snapshot.copyrightYear ?? 'no visible'}`,
            `EMAILS: ${snapshot.emails.join(', ') || 'ninguno'}`,
            `REDES: ${snapshot.socials.join(', ') || 'ninguna'}`,
            `TEXTO DE LA WEB (recortado):\n${snapshot.text.slice(0, 8000)}`,
          ].join('\n')
        : `NO SE PUDO LEER LA WEB: ${snapshot.error ?? 'error desconocido'}`,
    ].join('\n\n');

    const { data, meta } = await chatJSON<Analysis>({
      system: SYSTEM,
      user: `Analiza este negocio y su web:\n\n${context}`,
      proposito: 'radar',
      agentId: body.agentId,
      temperature: 0.3,
      maxTokens: 1400,
      timeoutMs: 60000,
    });

    return NextResponse.json({
      analysis: normalizeAnalysis(data),
      meta: {
        ai: true,
        website: {
          ok: snapshot.ok,
          finalUrl: snapshot.finalUrl ?? snapshot.url,
          error: snapshot.error,
          title: snapshot.title,
          emails: snapshot.emails,
          socials: snapshot.socials,
          hasWhatsapp: snapshot.hasWhatsapp,
          hasBooking: snapshot.hasBooking,
          hasForm: snapshot.hasForm,
          hasViewport: snapshot.hasViewport,
          https: snapshot.https,
          copyrightYear: snapshot.copyrightYear,
        },
        provider: meta.provider,
        model: meta.model,
        latencyMs: meta.latencyMs,
      },
    });
  } catch (error) {
    if (error instanceof AiConfigError) {
      return NextResponse.json({ error: error.message, code: 'AI_CONFIG' }, { status: error.status });
    }
    if (error instanceof AiRequestError) {
      return NextResponse.json({ error: error.message, code: 'AI_REQUEST' }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error analizando el negocio' },
      { status: 500 }
    );
  }
}

function bool(value: unknown): boolean {
  return value === true;
}

function normalizeAnalysis(raw: Analysis): Analysis {
  const checklist = raw?.checklist ?? ({} as Analysis['checklist']);
  const problems = Array.isArray(raw?.problems)
    ? raw.problems
        .filter((p) => p && typeof p.title === 'string')
        .slice(0, 5)
        .map((p) => ({ title: String(p.title).slice(0, 120), detail: String(p.detail ?? '').slice(0, 400) }))
    : [];

  return {
    summary: String(raw?.summary ?? '').slice(0, 600),
    checklist: {
      https: bool(checklist.https),
      mobileFriendly: bool(checklist.mobileFriendly),
      whatsapp: bool(checklist.whatsapp),
      onlineBooking: bool(checklist.onlineBooking),
      contactForm: bool(checklist.contactForm),
      outdatedCopyright: bool(checklist.outdatedCopyright),
    },
    contacts: {
      emails: Array.isArray(raw?.contacts?.emails) ? raw.contacts.emails.slice(0, 6).map(String) : [],
      socials: Array.isArray(raw?.contacts?.socials) ? raw.contacts.socials.slice(0, 6).map(String) : [],
    },
    problems,
    recommendedService: {
      type: String(raw?.recommendedService?.type ?? 'web_nueva'),
      reason: String(raw?.recommendedService?.reason ?? '').slice(0, 600),
    },
  };
}
