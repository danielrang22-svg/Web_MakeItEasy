import prisma from "@/lib/prisma";
import type { RadarBusiness, RadarZone } from "./types";

const TTL_MS = 24 * 60 * 60 * 1000;

export function searchCacheKey(zone: string, niche: string, keyword: string, mode: string): string {
  return [zone, niche, keyword, mode].map((v) => v.trim().toLowerCase()).join("|").slice(0, 300);
}

export interface CachedSearch {
  zone: RadarZone;
  businesses: RadarBusiness[];
  provider: string;
}

interface CachePayload {
  zone: RadarZone;
  businesses: RadarBusiness[];
}

export async function readSearchCache(key: string): Promise<CachedSearch | null> {
  const row = await prisma.radarSearchCache.findUnique({ where: { key } });
  if (!row) return null;

  if (row.expiresAt.getTime() <= Date.now()) {
    await prisma.radarSearchCache.delete({ where: { key } }).catch(() => undefined);
    return null;
  }

  try {
    const parsed = JSON.parse(row.payload) as CachePayload;
    if (!parsed?.zone || !Array.isArray(parsed.businesses)) return null;
    return { zone: parsed.zone, businesses: parsed.businesses, provider: row.provider };
  } catch {
    return null;
  }
}

export async function writeSearchCache(
  key: string,
  zone: RadarZone,
  businesses: RadarBusiness[],
  provider: string
): Promise<void> {
  const expiresAt = new Date(Date.now() + TTL_MS);
  const payload = JSON.stringify({ zone, businesses });
  await prisma.radarSearchCache.upsert({
    where: { key },
    create: { key, payload, provider, expiresAt },
    update: { payload, provider, expiresAt, createdAt: new Date() },
  });
}
