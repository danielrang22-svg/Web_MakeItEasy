export type ProviderId =
  | "openai"
  | "deepseek"
  | "gemini"
  | "openrouter"
  | "anthropic"
  | "custom";

export interface ProviderInfo {
  id: ProviderId;
  label: string;
  /** baseURL para el SDK de OpenAI (undefined = endpoint oficial de OpenAI). */
  baseUrl?: string;
  /** Modelos sugeridos en la UI. El campo es libre. */
  models: string[];
  /** ¿Acepta response_format: json_object? */
  supportsJson: boolean;
  /** Necesita que el usuario escriba una baseUrl. */
  requiresBaseUrl?: boolean;
  /** Motivo por el que no se puede usar todavía. */
  disabledReason?: string;
}

export const PROVIDERS: Record<ProviderId, ProviderInfo> = {
  openai: {
    id: "openai",
    label: "OpenAI",
    models: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "gpt-4.1"],
    supportsJson: true,
  },
  deepseek: {
    id: "deepseek",
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com",
    models: ["deepseek-chat", "deepseek-reasoner"],
    supportsJson: true,
  },
  gemini: {
    id: "gemini",
    label: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/",
    models: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"],
    supportsJson: true,
  },
  openrouter: {
    id: "openrouter",
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    models: ["openai/gpt-4o-mini", "google/gemini-2.5-flash", "deepseek/deepseek-chat"],
    supportsJson: true,
  },
  anthropic: {
    id: "anthropic",
    label: "Anthropic Claude",
    models: ["claude-3-5-haiku-20241022", "claude-sonnet-4-5"],
    supportsJson: false,
    disabledReason:
      "Anthropic no usa el formato OpenAI. Queda deshabilitado hasta tener un adaptador propio.",
  },
  custom: {
    id: "custom",
    label: "Custom (compatible con OpenAI)",
    models: [],
    supportsJson: true,
    requiresBaseUrl: true,
  },
};

export const PROVIDER_LIST: ProviderInfo[] = Object.values(PROVIDERS);

export function getProvider(id: string): ProviderInfo | null {
  return PROVIDERS[id as ProviderId] ?? null;
}

/** baseUrl efectiva: la guardada manda; si está vacía se deriva del proveedor. */
export function resolveBaseUrl(proveedor: string, baseUrl?: string | null): string | undefined {
  if (baseUrl && baseUrl.trim()) return baseUrl.trim().replace(/\/+$/, "");
  const provider = getProvider(proveedor);
  return provider?.baseUrl;
}

export function providerSupportsJson(proveedor: string): boolean {
  return getProvider(proveedor)?.supportsJson ?? true;
}
