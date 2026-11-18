import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthRole } from '@/lib/auth';
import { runAudit } from '@/lib/radar/audit';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const auth = await verifyAuthRole(request);
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const body = await request.json();
    const url = typeof body?.url === 'string' ? body.url.trim() : '';

    if (!url) {
      return NextResponse.json({ error: 'Falta la URL a auditar' }, { status: 400 });
    }

    const raw = body?.business;
    const business =
      raw && typeof raw === 'object'
        ? {
            name: typeof raw.name === 'string' ? raw.name.slice(0, 200) : undefined,
            address: typeof raw.address === 'string' ? raw.address.slice(0, 300) : undefined,
            phone: typeof raw.phone === 'string' ? raw.phone.slice(0, 60) : undefined,
            city: typeof raw.city === 'string' ? raw.city.slice(0, 120) : undefined,
          }
        : undefined;

    const report = await runAudit(url, { business });
    return NextResponse.json(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error auditando la web';
    const status = /inválida|internas|admiten/i.test(message) ? 400 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
