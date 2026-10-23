const UA = "Mozilla/5.0 (compatible; MakeItEasyRadar/1.0; +https://makeiteasycol.com)";

export interface FetchResult {
  ok: boolean;
  status: number | null;
  finalUrl: string;
  html: string;
  bytes: number;
  ms: number;
  headers: Record<string, string>;
  error?: string;
}

export function assertPublicUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("URL no válida");
  }
  if (!/^https?:$/.test(url.protocol)) throw new Error("Solo se admiten http y https");

  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    /^\[?::1\]?$/.test(host)
  ) {
    throw new Error("No se pueden auditar direcciones internas");
  }
  return url;
}

function headersToObject(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key.toLowerCase()] = value;
  });
  return out;
}

export async function fetchText(url: string, timeoutMs = 8000): Promise<FetchResult> {
  const started = Date.now();
  try {
    assertPublicUrl(url);
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "*/*" },
      signal: AbortSignal.timeout(timeoutMs),
      redirect: "follow",
    });
    const body = await res.text();
    return {
      ok: res.ok,
      status: res.status,
      finalUrl: res.url || url,
      html: body.slice(0, 1_500_000),
      bytes: Buffer.byteLength(body, "utf8"),
      ms: Date.now() - started,
      headers: headersToObject(res.headers),
    };
  } catch (err) {
    return {
      ok: false,
      status: null,
      finalUrl: url,
      html: "",
      bytes: 0,
      ms: Date.now() - started,
      headers: {},
      error: err instanceof Error ? err.message.slice(0, 140) : "Error de red",
    };
  }
}

export async function fetchRedirect(url: string, timeoutMs = 6000): Promise<{ status: number | null; location: string | null; error?: string }> {
  try {
    assertPublicUrl(url);
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "*/*" },
      signal: AbortSignal.timeout(timeoutMs),
      redirect: "manual",
    });
    return { status: res.status, location: res.headers.get("location") };
  } catch (err) {
    return { status: null, location: null, error: err instanceof Error ? err.message : "Error" };
  }
}
