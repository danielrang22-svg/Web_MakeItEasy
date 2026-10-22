import OpenAI from "openai";
import { resolveAiConnection, AiConfigError, type ResolvedConnection } from "./resolve";
import { PROVIDER_LIST } from "./providers";

export { AiConfigError, PROVIDER_LIST };
export type { ResolvedConnection };

export interface ChatJsonOptions {
  system: string;
  user: string;
  agentId?: string | null;
  proposito?: string | null;
  connectionId?: string | null;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

export interface ChatJsonResult<T> {
  data: T;
  meta: {
    provider: string;
    model: string;
    connectionName: string;
    latencyMs: number;
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  };
}

export class AiRequestError extends Error {
  status: number;
  provider?: string;
  constructor(message: string, status = 502, provider?: string) {
    super(message);
    this.name = "AiRequestError";
    this.status = status;
    this.provider = provider;
  }
}

function parseJsonLoose(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error("La respuesta no contiene JSON válido");
  }
}

function providerErrorMessage(err: unknown): string {
  if (!err || typeof err !== "object") return "Error desconocido del proveedor de IA";
  const e = err as {
    message?: string;
    status?: number;
    error?: { message?: string };
    response?: { data?: { error?: { message?: string } } };
  };
  return (
    e.error?.message ||
    e.response?.data?.error?.message ||
    e.message ||
    "Error desconocido del proveedor de IA"
  );
}

function providerStatus(err: unknown): number {
  if (err && typeof err === "object" && "status" in err) {
    const status = (err as { status?: unknown }).status;
    if (typeof status === "number" && status >= 400) return status;
  }
  return 502;
}

/**
 * Una llamada de chat que devuelve JSON validado.
 * Reintenta una vez si el modelo no devuelve JSON parseable.
 */
export async function chatJSON<T = unknown>(options: ChatJsonOptions): Promise<ChatJsonResult<T>> {
  const connection = await resolveAiConnection({
    agentId: options.agentId,
    proposito: options.proposito,
    connectionId: options.connectionId,
  });

  const client = new OpenAI({
    apiKey: connection.apiKey,
    baseURL: connection.baseUrl,
    timeout: options.timeoutMs ?? 45000,
    maxRetries: 0,
  });

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: options.system },
    { role: "user", content: options.user },
  ];

  const started = Date.now();
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const completion = await client.chat.completions.create({
        model: connection.modelo,
        messages,
        temperature: attempt === 0 ? (options.temperature ?? 0.3) : 0,
        ...(options.maxTokens ? { max_tokens: options.maxTokens } : {}),
        ...(connection.supportsJson ? { response_format: { type: "json_object" as const } } : {}),
      });

      const content = completion.choices[0]?.message?.content ?? "";
      if (!content.trim()) throw new Error("El modelo devolvió una respuesta vacía");

      const data = parseJsonLoose(content) as T;

      return {
        data,
        meta: {
          provider: connection.proveedor,
          model: connection.modelo,
          connectionName: connection.connectionName,
          latencyMs: Date.now() - started,
          usage: completion.usage ?? undefined,
        },
      };
    } catch (err) {
      lastError = err;
      const message = providerErrorMessage(err);

      // Algunos proveedores compatibles rechazan response_format: reintento sin él.
      if (attempt === 0 && /response_format|json_object/i.test(message)) {
        try {
          const completion = await client.chat.completions.create({
            model: connection.modelo,
            messages: [
              ...messages,
              {
                role: "user",
                content: "Devuelve únicamente un objeto JSON válido, sin texto adicional.",
              },
            ],
            temperature: 0,
            ...(options.maxTokens ? { max_tokens: options.maxTokens } : {}),
          });
          const content = completion.choices[0]?.message?.content ?? "";
          return {
            data: parseJsonLoose(content) as T,
            meta: {
              provider: connection.proveedor,
              model: connection.modelo,
              connectionName: connection.connectionName,
              latencyMs: Date.now() - started,
              usage: completion.usage ?? undefined,
            },
          };
        } catch (inner) {
          lastError = inner;
        }
      }

      // Si fue un JSON inválido, reintentamos con corrección explícita.
      if (/JSON/i.test(providerErrorMessage(lastError)) && attempt === 0) {
        messages.push({
          role: "assistant",
          content: "La respuesta anterior no era JSON válido.",
        });
        messages.push({
          role: "user",
          content: "Devuelve de nuevo la respuesta, esta vez solo JSON válido y sin markdown.",
        });
        continue;
      }

      break;
    }
  }

  throw new AiRequestError(
    providerErrorMessage(lastError),
    providerStatus(lastError),
    connection.proveedor
  );
}

export interface TestConnectionResult {
  ok: boolean;
  provider: string;
  model: string;
  connectionName: string;
  latencyMs: number;
  error?: string;
}

/** Ping real a la conexión: 1 token de respuesta. */
export async function testConnection(connectionId: string): Promise<TestConnectionResult> {
  const started = Date.now();
  try {
    const connection = await resolveAiConnection({ connectionId });
    const client = new OpenAI({
      apiKey: connection.apiKey,
      baseURL: connection.baseUrl,
      timeout: 20000,
      maxRetries: 0,
    });

    await client.chat.completions.create({
      model: connection.modelo,
      messages: [{ role: "user", content: "Responde solo: OK" }],
      max_tokens: 5,
      temperature: 0,
    });

    return {
      ok: true,
      provider: connection.proveedor,
      model: connection.modelo,
      connectionName: connection.connectionName,
      latencyMs: Date.now() - started,
    };
  } catch (err) {
    return {
      ok: false,
      provider: "",
      model: "",
      connectionName: "",
      latencyMs: Date.now() - started,
      error: err instanceof AiConfigError ? err.message : providerErrorMessage(err),
    };
  }
}
