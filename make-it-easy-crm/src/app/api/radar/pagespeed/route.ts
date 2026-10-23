import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthRole } from '@/lib/auth';

export const maxDuration = 60;

/**
 * PageSpeed Insights (gratis). Requiere una API key gratuita en
 * PAGESPEED_API_KEY (no necesita facturación).
 */
export async function POST(request: NextRequest) {
  const auth = await verifyAuthRole(request);
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const { url } = await request.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Falta la URL a analizar' }, { status: 400 });
    }

    let target: URL;
    try {
      target = new URL(url);
    } catch {
      return NextResponse.json({ error: 'URL no válida' }, { status: 400 });
    }
    if (!/^https?:$/.test(target.protocol)) {
      return NextResponse.json({ error: 'Solo se admiten http y https' }, { status: 400 });
    }

    const key = process.env.PAGESPEED_API_KEY?.trim();
    if (!key) {
      return NextResponse.json(
        {
          error:
            'PageSpeed no está configurado. Crea una API key gratuita (sin tarjeta) en Google Cloud, habilita "PageSpeed Insights API" y añade PAGESPEED_API_KEY al .env del servidor.',
          code: 'NO_KEY',
        },
        { status: 503 }
      );
    }

    const params = new URLSearchParams({ url: target.toString(), strategy: 'mobile', key });
    for (const category of ['performance', 'seo', 'accessibility', 'best-practices']) {
      params.append('category', category);
    }

    const res = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params.toString()}`, {
      signal: AbortSignal.timeout(55000),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      const message = data?.error?.message || `PageSpeed respondió HTTP ${res.status}`;
      return NextResponse.json({ error: message }, { status: 502 });
    }

    const categories = data.lighthouseResult?.categories ?? {};
    const audit = data.lighthouseResult?.audits ?? {};

    const score = (name: string): number | null => {
      const value = categories[name]?.score;
      return typeof value === 'number' ? Math.round(value * 100) : null;
    };

    const screenshot = audit['final-screenshot']?.details?.data as string | undefined;

    return NextResponse.json({
      url: target.toString(),
      scores: {
        performance: score('performance'),
        seo: score('seo'),
        accessibility: score('accessibility'),
        bestPractices: score('best-practices'),
      },
      metrics: {
        fcp: audit['first-contentful-paint']?.displayValue ?? null,
        lcp: audit['largest-contentful-paint']?.displayValue ?? null,
        cls: audit['cumulative-layout-shift']?.displayValue ?? null,
        tbt: audit['total-blocking-time']?.displayValue ?? null,
      },
      screenshot: screenshot?.startsWith('data:image') ? screenshot : null,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error analizando la web' },
      { status: 500 }
    );
  }
}
