import prisma from "@/lib/prisma";
import { decryptSecret } from "./crypto";
import { getProvider, resolveBaseUrl, providerSupportsJson } from "./providers";

export interface ResolvedConnection {
  agentId?: string;
  agentName?: string;
  connectionId: string;
  connectionName: string;
  proveedor: string;
  modelo: string;
  apiKey: string;
  baseUrl?: string;
  supportsJson: boolean;
  source: "agent" | "connection" | "active" | "env";
}

export class AiConfigError extends Error {
  status: number;
  constructor(message: string, status = 503) {
    super(message);
    this.name = "AiConfigError";
    this.status = status;
  }
}

interface ResolveOptions {
  agentId?: string | null;
  proposito?: string | null;
  connectionId?: string | null;
}

type ConnectionLike = {
  id: string;
  nombre: string;
  proveedor: string;
  modelo: string;
  apiKey: string;
  baseUrl: string | null;
};

function build(
  connection: ConnectionLike,
  source: ResolvedConnection["source"],
  agent?: { id: string; nombre: string }
): ResolvedConnection {
  const provider = getProvider(connection.proveedor);
  if (provider?.disabledReason) {
    throw new AiConfigError(
      `El proveedor "${provider.label}" no está disponible: ${provider.disabledReason}`
    );
  }

  const apiKey = decryptSecret(connection.apiKey);
  if (!apiKey) {
    throw new AiConfigError(
      `La conexión "${connection.nombre}" no tiene una API key válida. Edítala en Ajustes → Agentes y APIs.`
    );
  }

  return {
    agentId: agent?.id,
    agentName: agent?.nombre,
    connectionId: connection.id,
    connectionName: connection.nombre,
    proveedor: connection.proveedor,
    modelo: connection.modelo,
    apiKey,
    baseUrl: resolveBaseUrl(connection.proveedor, connection.baseUrl),
    supportsJson: providerSupportsJson(connection.proveedor),
    source,
  };
}

/**
 * Resuelve qué conexión usar, en este orden:
 * 1. connectionId explícita
 * 2. agentId explícito
 * 3. agente activo del propósito indicado
 * 4. cualquier agente activo
 * 5. primera conexión guardada
 * 6. OPENAI_API_KEY del entorno
 */
export async function resolveAiConnection(opts: ResolveOptions = {}): Promise<ResolvedConnection> {
  if (opts.connectionId) {
    const connection = await prisma.aiConnection.findUnique({ where: { id: opts.connectionId } });
    if (!connection) throw new AiConfigError("La conexión seleccionada no existe.", 404);
    return build(connection as ConnectionLike, "connection");
  }

  if (opts.agentId) {
    const agent = await prisma.agent.findUnique({
      where: { id: opts.agentId },
      include: { conexion: true },
    });
    if (!agent) throw new AiConfigError("El agente seleccionado no existe.", 404);
    return build(agent.conexion as ConnectionLike, "agent", agent);
  }

  if (opts.proposito) {
    const agent = await prisma.agent.findFirst({
      where: { proposito: opts.proposito, activo: true },
      include: { conexion: true },
    });
    if (agent) return build(agent.conexion as ConnectionLike, "active", agent);
  }

  const activeAgent = await prisma.agent.findFirst({
    where: { activo: true },
    include: { conexion: true },
  });
  if (activeAgent) return build(activeAgent.conexion as ConnectionLike, "active", activeAgent);

  const first = await prisma.aiConnection.findFirst({ orderBy: { fechaCreacion: "desc" } });
  if (first) return build(first as ConnectionLike, "connection");

  const envKey = process.env.OPENAI_API_KEY?.trim();
  if (envKey) {
    return {
      connectionId: "env",
      connectionName: "OPENAI_API_KEY",
      proveedor: "openai",
      modelo: process.env.OPENAI_MODEL || "gpt-4o-mini",
      apiKey: envKey,
      baseUrl: undefined,
      supportsJson: true,
      source: "env",
    };
  }

  throw new AiConfigError(
    "No hay ninguna API de IA configurada. Ve a Ajustes → Agentes y APIs y crea una conexión.",
    503
  );
}
