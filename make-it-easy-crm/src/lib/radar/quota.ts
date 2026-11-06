import prisma from "@/lib/prisma";

export const RADAR_LIMITS = {
  dailySearches: Number(process.env.RADAR_DAILY_SEARCHES ?? 20),
  dailyExhaustive: Number(process.env.RADAR_DAILY_EXHAUSTIVE ?? 3),
  maxResults: Number(process.env.RADAR_MAX_RESULTS ?? 60),
};

/** Colombia no tiene horario de verano: UTC-5 fijo. */
const BOGOTA_OFFSET_MS = 5 * 60 * 60 * 1000;

export interface UsageInfo {
  used: number;
  exhaustiveUsed: number;
  limits: typeof RADAR_LIMITS;
  resetsAt: string;
  timezone: "America/Bogota";
}

/** Día actual en hora de Colombia (00:00 a 24:00). */
export function bogotaDayRange(now = new Date()): { start: Date; end: Date; resetsAt: Date } {
  const shifted = new Date(now.getTime() - BOGOTA_OFFSET_MS);
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth();
  const day = shifted.getUTCDate();
  const start = new Date(Date.UTC(year, month, day, 5, 0, 0, 0));
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end, resetsAt: end };
}

export async function getUsage(email: string): Promise<UsageInfo> {
  const { start, end, resetsAt } = bogotaDayRange();
  const where = { userEmail: email, createdAt: { gte: start, lt: end } };

  const [used, exhaustiveUsed] = await Promise.all([
    prisma.radarSearchLog.count({ where }),
    prisma.radarSearchLog.count({ where: { ...where, mode: "exhaustive" } }),
  ]);

  return {
    used,
    exhaustiveUsed,
    limits: RADAR_LIMITS,
    resetsAt: resetsAt.toISOString(),
    timezone: "America/Bogota",
  };
}

export class RadarQuotaError extends Error {
  status = 429;
  code = "RADAR_QUOTA";
  usage: UsageInfo;
  constructor(message: string, usage: UsageInfo) {
    super(message);
    this.name = "RadarQuotaError";
    this.usage = usage;
  }
}

export async function assertQuota(email: string, mode: "fast" | "exhaustive"): Promise<UsageInfo> {
  const usage = await getUsage(email);

  if (usage.used >= usage.limits.dailySearches) {
    throw new RadarQuotaError(
      `Límite diario de ${usage.limits.dailySearches} búsquedas alcanzado. Se reinicia a las 00:00 (hora Colombia).`,
      usage
    );
  }

  if (mode === "exhaustive" && usage.exhaustiveUsed >= usage.limits.dailyExhaustive) {
    throw new RadarQuotaError(
      `Límite diario de ${usage.limits.dailyExhaustive} búsquedas exhaustivas alcanzado. Se reinicia a las 00:00 (hora Colombia).`,
      usage
    );
  }

  return usage;
}

export async function recordSearch(input: {
  email: string;
  zoneKey: string;
  niche: string;
  mode: string;
  provider: string;
  resultCount: number;
  newCount: number;
  cached: boolean;
}): Promise<void> {
  await prisma.radarSearchLog.create({
    data: {
      userEmail: input.email,
      zoneKey: input.zoneKey.slice(0, 120),
      niche: input.niche.slice(0, 80),
      mode: input.mode,
      provider: input.provider,
      resultCount: input.resultCount,
      newCount: input.newCount,
      cached: input.cached,
    },
  });
}
