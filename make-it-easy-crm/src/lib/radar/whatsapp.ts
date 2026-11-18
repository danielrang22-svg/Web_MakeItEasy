import type { WhatsAppConfidence, WhatsAppDetection, WhatsAppKind } from "./types";

const WA_LINK_RE = /(?:wa\.me\/|api\.whatsapp\.com\/|whatsapp:\/\/send|wa\.link\/)/i;
const WA_TEXT_RE = /whatsapp/i;
const BUSINESS_API_RE = /(graph\.facebook\.com|whatsapp[ _-]?(business|cloud|api)|waba)/i;
const AUTO_RE =
  /(chatbot|bot de whatsapp|asistente virtual|agente virtual|responde 24\/7|atenci[oó]n 24\/7|24 horas|respuesta autom[aá]tica|automatizaci[oó]n|inteligencia artificial|\bia\b)/i;

const WHATSAPP_PROVIDERS: Array<{ label: string; patterns: string[] }> = [
  { label: "Wati", patterns: ["wati.io", "wati.ai", "clients.wati.io"] },
  { label: "360dialog", patterns: ["360dialog.com"] },
  { label: "Gupshup", patterns: ["gupshup.io"] },
  { label: "Take Blip", patterns: ["blip.ai", "take.net"] },
  { label: "Yalo", patterns: ["yalo.ai"] },
  { label: "Botmaker", patterns: ["botmaker.com"] },
  { label: "Zoko", patterns: ["zoko.io"] },
  { label: "Trengo", patterns: ["trengo.com"] },
  { label: "Respond.io", patterns: ["respond.io"] },
  { label: "ManyChat", patterns: ["manychat.com"] },
  { label: "Chatwoot", patterns: ["chatwoot.com"] },
];

const CHAT_PROVIDERS: Array<{ label: string; patterns: string[] }> = [
  { label: "Intercom", patterns: ["intercom.io", "intercomcdn.com"] },
  { label: "Tidio", patterns: ["tidio.co", "tidio.com"] },
  { label: "Crisp", patterns: ["crisp.chat"] },
  { label: "Tawk.to", patterns: ["tawk.to"] },
  { label: "Zendesk", patterns: ["zendesk.com", "zopim.com"] },
  { label: "HubSpot", patterns: ["hubspot.com", "hs-scripts.com"] },
  { label: "Drift", patterns: ["drift.com"] },
  { label: "LiveChat", patterns: ["livechatinc.com"] },
  { label: "Freshchat", patterns: ["freshchat", "freshworks.com"] },
  { label: "Landbot", patterns: ["landbot.io"] },
  { label: "Typebot", patterns: ["typebot.io"] },
  { label: "Botpress", patterns: ["botpress.cloud", "botpress.com"] },
  { label: "Dialogflow", patterns: ["dialogflow"] },
  { label: "Twilio", patterns: ["twilio.com", "twiliocdn.com"] },
  { label: "Infobip", patterns: ["infobip.com"] },
  { label: "MessageBird", patterns: ["messagebird.com", "bird.com"] },
  { label: "Vonage", patterns: ["vonage.com", "nexmo.com"] },
];

const KIND_RANK: Record<WhatsAppKind, number> = {
  unknown: 0,
  none: 1,
  widget: 2,
  manual: 3,
  automation: 4,
};

const CONFIDENCE_RANK: Record<WhatsAppConfidence, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

function findProvider(
  haystack: string,
  providers: Array<{ label: string; patterns: string[] }>
): string | null {
  for (const provider of providers) {
    if (provider.patterns.some((pattern) => haystack.includes(pattern))) return provider.label;
  }
  return null;
}

function extractWhatsAppNumber(html: string): string {
  const patterns = [
    /wa\.me\/(\d{7,15})/i,
    /api\.whatsapp\.com\/send\?phone=(\d{7,15})/i,
    /whatsapp:\/\/send\?phone=(\d{7,15})/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return match[1];
  }
  return "";
}

function higherConfidence(a: WhatsAppConfidence, b: WhatsAppConfidence): WhatsAppConfidence {
  return CONFIDENCE_RANK[a] >= CONFIDENCE_RANK[b] ? a : b;
}

export function detectWhatsApp(html: string, text: string): WhatsAppDetection {
  const lowerHtml = html.toLowerCase();
  const lowerText = text.toLowerCase();
  const provider = findProvider(lowerHtml, WHATSAPP_PROVIDERS);
  const webChatProvider = findProvider(lowerHtml, CHAT_PROVIDERS);
  const hasLink = WA_LINK_RE.test(html);
  const hasBusinessApi = BUSINESS_API_RE.test(lowerHtml);
  const auto = AUTO_RE.test(lowerText) || AUTO_RE.test(lowerHtml);
  const number = extractWhatsAppNumber(html);
  const evidence: string[] = [];

  if (provider) evidence.push(`${provider} detectado en la web`);
  if (webChatProvider) evidence.push(`${webChatProvider} detectado en la web`);
  if (hasLink) evidence.push("enlace de WhatsApp (wa.me/api.whatsapp)");
  if (hasBusinessApi) evidence.push("referencia a WhatsApp Business API");
  if (auto) evidence.push("texto de bot/atención 24/7");

  if (provider) {
    return {
      kind: "automation",
      provider,
      webChatProvider,
      confidence: auto || hasBusinessApi ? "high" : "medium",
      evidence,
      number,
      hasLink,
      hasBusinessApi,
    };
  }

  if (hasBusinessApi) {
    return {
      kind: "automation",
      provider: null,
      webChatProvider,
      confidence: "medium",
      evidence,
      number,
      hasLink,
      hasBusinessApi,
    };
  }

  if (hasLink) {
    return {
      kind: "manual",
      provider: null,
      webChatProvider,
      confidence: auto ? "medium" : "high",
      evidence,
      number,
      hasLink,
      hasBusinessApi,
    };
  }

  if (webChatProvider) {
    return {
      kind: "widget",
      provider: null,
      webChatProvider,
      confidence: "medium",
      evidence,
      number: "",
      hasLink: false,
      hasBusinessApi,
    };
  }

  if (WA_TEXT_RE.test(text)) {
    return {
      kind: "manual",
      provider: null,
      webChatProvider: null,
      confidence: "low",
      evidence: ["menciona WhatsApp sin enlace directo"],
      number: "",
      hasLink: false,
      hasBusinessApi,
    };
  }

  return {
    kind: "none",
    provider: null,
    webChatProvider: null,
    confidence: "high",
    evidence: [],
    number: "",
    hasLink: false,
    hasBusinessApi: false,
  };
}

export function whatsappFromTags(
  tags: Record<string, string> | undefined | null
): WhatsAppDetection | null {
  const raw = (tags?.["contact:whatsapp"] || tags?.whatsapp || "").trim();
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  const number = digits.length >= 7 && digits.length <= 15 ? digits : "";
  return {
    kind: "manual",
    provider: null,
    webChatProvider: null,
    confidence: "medium",
    evidence: ["etiqueta OSM contact:whatsapp"],
    number,
    hasLink: /wa\.me|api\.whatsapp\.com|whatsapp:\/\//i.test(raw),
    hasBusinessApi: false,
  };
}

export function mergeWhatsAppDetections(
  primary: WhatsAppDetection,
  extra: WhatsAppDetection
): WhatsAppDetection {
  const winner =
    KIND_RANK[extra.kind] > KIND_RANK[primary.kind]
      ? extra
      : KIND_RANK[extra.kind] < KIND_RANK[primary.kind]
      ? primary
      : CONFIDENCE_RANK[extra.confidence] > CONFIDENCE_RANK[primary.confidence]
      ? extra
      : primary;

  return {
    ...winner,
    provider: primary.provider ?? extra.provider,
    webChatProvider: primary.webChatProvider ?? extra.webChatProvider,
    confidence: higherConfidence(primary.confidence, extra.confidence),
    evidence: [...new Set([...primary.evidence, ...extra.evidence])],
    number: primary.number || extra.number,
    hasLink: primary.hasLink || extra.hasLink,
    hasBusinessApi: primary.hasBusinessApi || extra.hasBusinessApi,
  };
}

export function whatsappKindLabel(kind: WhatsAppKind | undefined | null): string {
  switch (kind) {
    case "automation":
      return "Automatización probable";
    case "manual":
      return "WhatsApp manual";
    case "widget":
      return "Chat web";
    case "none":
      return "Sin WhatsApp";
    default:
      return "Sin analizar";
  }
}

export function whatsappKindClasses(kind: WhatsAppKind | undefined | null): string {
  switch (kind) {
    case "automation":
      return "bg-cyan-500/15 text-cyan-300 ring-cyan-500/30";
    case "manual":
      return "bg-amber-500/15 text-amber-300 ring-amber-500/30";
    case "widget":
      return "bg-sky-500/15 text-sky-300 ring-sky-500/30";
    case "none":
      return "bg-red-500/15 text-red-300 ring-red-500/30";
    default:
      return "bg-muted text-muted-foreground ring-border";
  }
}

export function whatsappConfidenceLabel(confidence: WhatsAppConfidence | undefined | null): string {
  if (confidence === "high") return "confianza alta";
  if (confidence === "medium") return "confianza media";
  if (confidence === "low") return "confianza baja";
  return "";
}
