import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuthRole } from '@/lib/auth';
import { assertSiteScanQuota, getUsage, RadarQuotaError } from '@/lib/radar/quota';
import { getFreshScans, saveScan } from '@/lib/radar/siteScanStore';
import { scanSite } from '@/lib/radar/siteScan';
import type { SiteScan } from '@/lib/radar/types';

export const maxDuration = 120;

const MAX_PER_CALL = 10;
const CONCURRENCY = 4;

interface ScanBody {
  businessIds?: unknown;
  force?: unknown;
}

async function mapLimit<T>(items: T[], limit: number, task: (item: T) => Promise<void>): Promise<void> {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const current = cursor;
      cursor += 1;
      await task(items[current]);
    }
  });
  await Promise.all(workers);
}

function normalizeIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const ids = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
  return [...new Set(ids)].slice(0, MAX_PER_CALL);
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuthRole(request);
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const body = (await request.json()) as ScanBody;
    const ids = normalizeIds(body.businessIds);
    const force = body.force === true;

    if (ids.length === 0) {
      return NextResponse.json({ error: 'Falta la lista de negocios a analizar' }, { status: 400 });
    }

    const rows = await prisma.radarBusiness.findMany({
      where: { externalId: { in: ids } },
      select: { externalId: true, website: true, websiteKind: true },
    });
    const byId = new Map(rows.map((row) => [row.externalId, row]));
    const scannable = ids
      .map((id) => byId.get(id))
      .filter((row): row is { externalId: string; website: string; websiteKind: string } => !!row)
      .filter((row) => row.websiteKind === 'own' && row.website.trim().length > 0);

    const scannableIds = new Set(scannable.map((row) => row.externalId));
    const skipped = ids.filter((id) => !scannableIds.has(id));
    const cached = force
      ? new Map<string, SiteScan>()
      : await getFreshScans(scannable.map((row) => row.externalId), undefined, {
          requireWhatsApp: true,
        });
    const pending = scannable.filter((row) => !cached.has(row.externalId));

    if (pending.length > 0) {
      await assertSiteScanQuota(auth.email, pending.length);
    }

    const scans: Record<string, SiteScan> = {};
    const errors: Array<{ businessId: string; error: string }> = [];

    for (const [businessId, scan] of cached) {
      scans[businessId] = scan;
    }

    await mapLimit(pending, CONCURRENCY, async (row) => {
      try {
        const scan = await scanSite(row.website, { timeoutMs: 8000, includeContactPage: true });
        await saveScan(row.externalId, auth.email, scan);
        scans[row.externalId] = scan;
      } catch (err) {
        errors.push({
          businessId: row.externalId,
          error: err instanceof Error ? err.message : 'No se pudo analizar la web',
        });
      }
    });

    const usage = await getUsage(auth.email);
    return NextResponse.json({ scans, skipped, errors, usage });
  } catch (error) {
    if (error instanceof RadarQuotaError) {
      return NextResponse.json(
        { error: error.message, code: error.code, usage: error.usage },
        { status: 429 }
      );
    }
    console.error('POST /api/radar/site-scan error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No se pudieron analizar las webs' },
      { status: 500 }
    );
  }
}
