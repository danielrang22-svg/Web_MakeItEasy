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

export interface RedirectHop {
  url: string;
  status: number | null;
  location: string | null;
}

export interface RedirectChainResult {
  chain: RedirectHop[];
  finalUrl: string;
  loop: boolean;
  exceeded: boolean;
  error?: string;
}

export async function followRedirects(
  rawUrl: string,
  maxHops = 5,
  timeoutMs = 6000
): Promise<RedirectChainResult> {
  const chain: RedirectHop[] = [];
  const seen = new Set<string>();
  let current = rawUrl;

  for (let hop = 0; hop < maxHops; hop++) {
    if (seen.has(current)) {
      return { chain, finalUrl: current, loop: true, exceeded: false };
    }
    seen.add(current);

    try {
      assertPublicUrl(current);
      const res = await fetch(current, {
        headers: { "User-Agent": UA, Accept: "*/*" },
        signal: AbortSignal.timeout(timeoutMs),
        redirect: "manual",
      });
      const location = res.headers.get("location");
      chain.push({ url: current, status: res.status, location });

      if (!location || res.status < 300 || res.status >= 400) {
        return { chain, finalUrl: current, loop: false, exceeded: false };
      }

      try {
        current = new URL(location, current).toString();
      } catch {
        return { chain, finalUrl: current, loop: false, exceeded: false };
      }
    } catch (err) {
      return {
        chain,
        finalUrl: current,
        loop: false,
        exceeded: false,
        error: err instanceof Error ? err.message.slice(0, 140) : "Error de red",
      };
    }
  }

  return { chain, finalUrl: current, loop: false, exceeded: true };
}

export interface UrlCheck {
  url: string;
  status: number | null;
  ok: boolean;
  unknown: boolean;
  error?: string;
}

export async function checkUrls(urls: string[], timeoutMs = 3500): Promise<UrlCheck[]> {
  const unique = [...new Set(urls)].slice(0, 8);
  return Promise.all(
    unique.map(async (url): Promise<UrlCheck> => {
      try {
        assertPublicUrl(url);
        const res = await fetch(url, {
          method: "HEAD",
          headers: { "User-Agent": UA, Accept: "*/*" },
          signal: AbortSignal.timeout(timeoutMs),
          redirect: "follow",
        });
        if (res.status === 405 || res.status === 501) {
          return await checkUrlGet(url, timeoutMs);
        }
        const unknown = [401, 403, 429].includes(res.status);
        return {
          url,
          status: res.status,
          ok: res.status < 400,
          unknown,
        };
      } catch (err) {
        return {
          url,
          status: null,
          ok: false,
          unknown: true,
          error: err instanceof Error ? err.message.slice(0, 100) : "Error de red",
        };
      }
    })
  );
}

async function checkUrlGet(url: string, timeoutMs: number): Promise<UrlCheck> {
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { "User-Agent": UA, Accept: "*/*" },
      signal: AbortSignal.timeout(timeoutMs),
      redirect: "follow",
    });
    const unknown = [401, 403, 429].includes(res.status);
    return { url, status: res.status, ok: res.status < 400, unknown };
  } catch (err) {
    return {
      url,
      status: null,
      ok: false,
      unknown: true,
      error: err instanceof Error ? err.message.slice(0, 100) : "Error de red",
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
