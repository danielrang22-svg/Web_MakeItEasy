"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Clipboard,
  Download,
  ExternalLink,
  Globe,
  Loader2,
  MapPin,
  MessageCircle,
  Phone,
  RefreshCw,
  Sparkles,
  TriangleAlert,
  Users,
} from "lucide-react";
import RadarNav from "@/components/radar/RadarNav";
import AuditPanel from "@/components/radar/AuditPanel";
import {
  getAnalysis,
  getBusinessSnapshot,
  getSettings,
  radarRepository,
  saveAnalysis,
  saveBusinessSnapshot,
  type RadarAnalysisRecord,
} from "@/lib/radar/repository";
import { scoreClasses } from "@/lib/radar/score";
import { applyScanSummary, qualityClasses, qualityLabel } from "@/lib/radar/siteQuality";
import { whatsappUrl } from "@/lib/radar/outreach";
import {
  whatsappConfidenceLabel,
  whatsappKindClasses,
  whatsappKindLabel,
} from "@/lib/radar/whatsapp";
import type {
  RadarBusiness,
  RadarLeadStatus,
  SiteScan,
  WhatsAppVerification,
} from "@/lib/radar/types";

const TONES = [
  { value: "cercano", label: "Cercano" },
  { value: "directo", label: "Directo" },
  { value: "formal", label: "Formal" },
] as const;

interface Drafts {
  callScript: string;
  whatsapp: string;
  email: { subject: string; body: string };
}

function scoreColor(value: number | null | undefined): string {
  if (value == null) return "text-muted-foreground";
  if (value >= 90) return "text-emerald-400";
  if (value >= 50) return "text-amber-300";
  return "text-red-400";
}

function BusinessContent() {
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get("id") || "";

  const [business, setBusiness] = useState<RadarBusiness | null>(null);
  const [record, setRecord] = useState<RadarAnalysisRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [drafts, setDrafts] = useState<Drafts | null>(null);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [tone, setTone] = useState<string>("cercano");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<RadarLeadStatus>("NUEVO");
  const [nextAction, setNextAction] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [savingLead, setSavingLead] = useState(false);
  const [siteScanning, setSiteScanning] = useState(false);
  const [whatsappVerified, setWhatsappVerified] = useState<WhatsAppVerification>("");
  const [whatsappNotes, setWhatsappNotes] = useState("");
  const [savingWhatsApp, setSavingWhatsApp] = useState(false);
  const [competitors, setCompetitors] = useState<RadarBusiness[] | null>(null);
  const [loadingCompetitors, setLoadingCompetitors] = useState(false);
  const [competitorError, setCompetitorError] = useState("");

  useEffect(() => {
    if (!id) return;
    let alive = true;
    const snap = getBusinessSnapshot(id);
    setBusiness(snap);
    const savedAnalysis = getAnalysis(id);
    if (savedAnalysis) setRecord(savedAnalysis);
    const settings = getSettings();
    setTone(settings.tone);

    radarRepository
      .load()
      .then((list) => {
        if (!alive) return;
        const lead = list.find((l) => l.businessId === id);
        if (!lead) return;
        setNotes(lead.notes);
        setStatus(lead.status);
        setNextAction(lead.nextActionAt ? lead.nextActionAt.slice(0, 10) : "");
        setWhatsappVerified((lead.whatsappVerified as WhatsAppVerification) || "");
        setWhatsappNotes(lead.whatsappNotes || "");
        setIsSaved(true);
      })
      .catch(() => undefined);

    return () => {
      alive = false;
    };
  }, [id]);

  const seller = useMemo(() => getSettings(), []);
  const whatsappTestUrl = business
    ? whatsappUrl(
        business.whatsappNumber || business.phone,
        "Hola, quería hacer una consulta sobre sus servicios."
      )
    : null;
  const bookingDetected =
    business?.siteSignals?.find((signal) => signal.id === "booking")?.status === "pass";
  const formDetected =
    business?.siteSignals?.find((signal) => signal.id === "form")?.status === "pass";
  const whatsappPitch =
    business?.whatsappKind === "automation"
      ? "Vender mejora o migración del agente actual"
      : business?.whatsappKind === "manual" || business?.whatsappKind === "none"
      ? "Vender agente de WhatsApp"
      : "Verificar WhatsApp antes de proponer";

  if (!business) {
    return (
      <div className="px-4 md:px-6 pb-32">
        <div className="mt-4"><RadarNav /></div>
        <div className="mt-6 bg-card ring-1 ring-border rounded-2xl p-10 text-center">
          <AlertCircle size={26} className="mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm font-semibold">No encuentro este negocio en la sesión</p>
          <p className="text-xs text-muted-foreground mt-1">
            Vuelve a la búsqueda y pulsa «Ficha» en el negocio que quieras analizar.
          </p>
          <Link href="/radar" className="inline-flex mt-4 px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-bold">
            Volver a buscar
          </Link>
        </div>
      </div>
    );
  }

  async function analyze() {
    if (!business) return;
    setLoading(true);
    setError("");
    setNotice("");

    let pagespeed: RadarAnalysisRecord["pagespeed"] = null;

    if (business.websiteKind === "own" && business.website) {
      try {
        const res = await fetch("/api/radar/pagespeed", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: business.website }),
        });
        const data = await res.json();
        if (res.ok) {
          pagespeed = { ...data.scores, screenshot: data.screenshot, metrics: data.metrics };
        } else if (data.code === "NO_KEY") {
          setNotice("PageSpeed no está configurado; el análisis sigue sin notas de velocidad.");
        } else {
          setNotice(`PageSpeed: ${data.error}`);
        }
      } catch {
        setNotice("PageSpeed no respondió; seguimos con el resto del análisis.");
      }
    }

    try {
      const res = await fetch("/api/radar/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business: {
            name: business.name,
            category: business.category,
            address: business.address,
            phone: business.phone,
            website: business.website,
            websiteKind: business.websiteKind,
            tags: business.tags,
          },
          pagespeed: pagespeed
            ? {
                performance: pagespeed.performance,
                seo: pagespeed.seo,
                accessibility: pagespeed.accessibility,
                bestPractices: pagespeed.bestPractices,
              }
            : null,
          agentId: seller.agentId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo analizar");

      const next: RadarAnalysisRecord = {
        businessId: business.id,
        analyzedAt: new Date().toISOString(),
        pagespeed,
        analysis: data.analysis ?? null,
        meta: data.meta,
      };
      setRecord(next);
      saveAnalysis(next);

      if (data.aiError) {
        setNotice(`Análisis IA no disponible: ${data.aiError}`);
      }

      if (isSaved) {
        await radarRepository.update(business.id, { status: "ANALIZADO" }).catch(() => undefined);
        setStatus("ANALIZADO");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo analizar el negocio");
    } finally {
      setLoading(false);
    }
  }

  async function scanSiteQuality(force = false) {
    if (!business) return;
    setSiteScanning(true);
    setError("");
    try {
      const res = await fetch("/api/radar/site-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessIds: [business.id], force: force || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo analizar la web");
      const scan = (data.scans as Record<string, SiteScan> | undefined)?.[business.id];
      if (!scan) {
        setNotice("Esta ficha no tiene una web propia que analizar.");
        return;
      }
      const next = applyScanSummary(business, scan);
      setBusiness(next);
      saveBusinessSnapshot(next);
      setNotice("Web analizada y clasificada.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo analizar la web");
    } finally {
      setSiteScanning(false);
    }
  }

  async function generateDrafts() {
    if (!business) return;
    setDraftsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/radar/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business,
          analysis: record?.analysis ?? {
            summary: "",
            problems: [],
            recommendedService: { type: "web_nueva", reason: "" },
          },
          seller,
          tone,
          agentId: seller.agentId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudieron generar los borradores");
      setDrafts(data.drafts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error generando los borradores");
    } finally {
      setDraftsLoading(false);
    }
  }

  async function saveLead() {
    if (!business) return;
    const wasSaved = isSaved;
    setSavingLead(true);
    try {
      await radarRepository.upsert([business]);
      await radarRepository.update(business.id, {
        status,
        notes,
        nextActionAt: nextAction ? new Date(nextAction).toISOString() : null,
        whatsappVerified,
        whatsappNotes,
      });
      setIsSaved(true);
      setNotice(wasSaved ? "Cambios guardados." : "Lead creado en Mis leads.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar en Mis leads");
    } finally {
      setSavingLead(false);
    }
  }

  async function saveWhatsAppVerification() {
    if (!business || !isSaved) return;
    setSavingWhatsApp(true);
    try {
      await radarRepository.update(business.id, { whatsappVerified, whatsappNotes });
      setNotice("Verificación de WhatsApp guardada.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la verificación");
    } finally {
      setSavingWhatsApp(false);
    }
  }

  async function loadCompetitors() {
    if (!business) return;
    if (business.lat == null || business.lng == null) {
      setCompetitorError("Esta ficha no tiene coordenadas para comparar.");
      return;
    }
    setLoadingCompetitors(true);
    setCompetitorError("");
    try {
      const res = await fetch("/api/radar/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: business.id,
          name: business.name,
          lat: business.lat,
          lng: business.lng,
          niche: business.niche,
          category: business.category,
          radiusKm: 5,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo comparar la competencia");
      setCompetitors(Array.isArray(data.competitors) ? (data.competitors as RadarBusiness[]) : []);
    } catch (err) {
      setCompetitorError(err instanceof Error ? err.message : "No se pudo comparar la competencia");
    } finally {
      setLoadingCompetitors(false);
    }
  }

  async function importToCrm() {
    if (!business) return;
    setImporting(true);
    try {
      const res = await fetch("/api/radar/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo importar");
      await radarRepository
        .upsert([business])
        .then(() => setIsSaved(true))
        .catch(() => undefined);
      router.push(`/leads`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo importar al CRM");
    } finally {
      setImporting(false);
    }
  }

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      setError("No se pudo copiar al portapapeles");
    }
  }

  function printFicha() {
    if (!business) return;
    const a = record?.analysis;
    const w = window.open("", "_blank", "width=820,height=900");
    if (!w) return;
    const checklist = a
      ? Object.entries(a.checklist)
          .map(([k, v]) => `<li>${k}: <strong>${v ? "sí" : "no"}</strong></li>`)
          .join("")
      : "";
    const problems = a?.problems.map((p) => `<li><strong>${escapeHtml(p.title)}</strong>: ${escapeHtml(p.detail)}</li>`).join("") ?? "";
    w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Ficha ${escapeHtml(business.name)}</title>
      <style>body{font-family:Segoe UI,Arial,sans-serif;margin:32px;color:#111}h1{font-size:22px;margin:0 0 4px}h2{font-size:15px;margin:22px 0 6px;border-bottom:1px solid #ddd;padding-bottom:4px}small{color:#555}ul{padding-left:18px}li{margin:4px 0}.box{border:1px solid #ddd;border-radius:8px;padding:10px;margin-top:8px}</style>
      </head><body>
      <h1>${escapeHtml(business.name)}</h1>
      <small>${escapeHtml(business.category)} · ${escapeHtml(business.address || "sin dirección")}</small>
      <h2>Contacto</h2>
      <p>Teléfono: ${escapeHtml(business.phone || "no disponible")}<br>Web: ${escapeHtml(business.website || "sin web propia")}<br>Mapa: ${escapeHtml(business.mapsUrl)}</p>
      <h2>Puntuación de oportunidad</h2>
      <p><strong>${business.score}/100</strong></p>
      <ul>${business.breakdown.map((b) => `<li>${escapeHtml(b.label)}: ${b.points > 0 ? "+" : ""}${b.points}</li>`).join("")}</ul>
      ${a ? `<h2>Resumen</h2><p>${escapeHtml(a.summary)}</p><h2>Comprobación</h2><ul>${checklist}</ul><h2>Problemas</h2><ul>${problems}</ul><h2>Servicio recomendado</h2><p>${escapeHtml(a.recommendedService.type)} — ${escapeHtml(a.recommendedService.reason)}</p>` : ""}
      ${record?.pagespeed ? `<h2>PageSpeed móvil</h2><p>Rendimiento ${record.pagespeed.performance ?? "?"} · SEO ${record.pagespeed.seo ?? "?"} · Accesibilidad ${record.pagespeed.accessibility ?? "?"} · Buenas prácticas ${record.pagespeed.bestPractices ?? "?"}</p>` : ""}
      ${notes ? `<h2>Notas</h2><p>${escapeHtml(notes)}</p>` : ""}
      </body></html>`);
    w.document.close();
    w.focus();
    w.print();
  }

  return (
    <div className="px-4 md:px-6 pb-32">
      <div className="mt-4"><RadarNav /></div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <Link href="/radar" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ArrowLeft size={13} /> Volver a la búsqueda
        </Link>
        <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground">Datos: OpenStreetMap</span>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-3 p-3 rounded-xl bg-red-500/10 ring-1 ring-red-500/30 text-xs text-red-300">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {notice && (
        <div className="mt-4 flex items-start gap-3 p-3 rounded-xl bg-amber-500/10 ring-1 ring-amber-500/30 text-xs text-amber-300">
          <TriangleAlert size={15} className="shrink-0 mt-0.5" />
          <span>{notice}</span>
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card ring-1 ring-border rounded-2xl p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold">{business.name}</h1>
                <p className="text-xs text-muted-foreground">{business.category}</p>
              </div>
              <span
                className={`text-sm font-bold px-3 py-1.5 rounded-xl ring-1 ${scoreClasses(business.score)}`}
                title="Oportunidad comercial de 0 a 100: prioriza a quién contactar; no mide la calidad del negocio."
              >
                {business.score}/100
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 text-sm">
              <div className="flex items-start gap-2">
                <MapPin size={15} className="text-muted-foreground mt-0.5 shrink-0" />
                <span className="text-muted-foreground">{business.address || "Sin dirección registrada"}</span>
              </div>
              <div className="flex items-start gap-2">
                <Phone size={15} className="text-muted-foreground mt-0.5 shrink-0" />
                {business.phone ? (
                  <a href={`tel:${business.phone}`} className="text-cyan-400 hover:underline">{business.phone}</a>
                ) : (
                  <span className="text-muted-foreground">Sin teléfono registrado</span>
                )}
              </div>
              <div className="flex items-start gap-2">
                <Globe size={15} className="text-muted-foreground mt-0.5 shrink-0" />
                {business.website ? (
                  <a href={business.website} target="_blank" rel="noopener" className="text-cyan-400 hover:underline truncate">
                    {business.website}
                  </a>
                ) : (
                  <span className="text-amber-300">Sin web propia (OSM)</span>
                )}
              </div>
              <div className="flex items-start gap-2">
                <ExternalLink size={15} className="text-muted-foreground mt-0.5 shrink-0" />
                <a href={business.mapsUrl} target="_blank" rel="noopener" className="text-cyan-400 hover:underline">Abrir en el mapa</a>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              {business.phone && (
                <a href={`tel:${business.phone}`} className="px-3 py-1.5 rounded-lg bg-muted text-xs font-semibold hover:bg-muted/70">Llamar</a>
              )}
              {business.website && (
                <a href={business.website} target="_blank" rel="noopener" className="px-3 py-1.5 rounded-lg bg-muted text-xs font-semibold hover:bg-muted/70">Abrir web</a>
              )}
              <button onClick={generateDrafts} disabled={draftsLoading} className="px-3 py-1.5 rounded-lg bg-muted text-xs font-semibold hover:bg-muted/70 disabled:opacity-40">
                {draftsLoading ? "Generando…" : "Borradores"}
              </button>
              <button onClick={printFicha} className="px-3 py-1.5 rounded-lg bg-muted text-xs font-semibold hover:bg-muted/70 flex items-center gap-1">
                <Download size={13} /> Exportar ficha
              </button>
              {!isSaved ? (
                <button
                  onClick={() => void saveLead()}
                  disabled={savingLead}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 text-xs font-bold hover:bg-emerald-400 disabled:opacity-40"
                >
                  {savingLead ? "Guardando…" : "Convertir en lead"}
                </button>
              ) : (
                <span className="px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30 text-xs font-bold">
                  En Mis leads
                </span>
              )}
              <button onClick={importToCrm} disabled={importing} className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 text-xs font-bold hover:bg-cyan-400 disabled:opacity-40">
                {importing ? "Importando…" : "Enviar al CRM"}
              </button>
            </div>

            <details className="mt-3">
              <summary className="text-[11px] text-muted-foreground cursor-pointer">Ver desglose de la puntuación</summary>
              <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                {business.breakdown.map((b) => (
                  <li key={b.label} className="flex justify-between text-[11px] text-muted-foreground">
                    <span>{b.label}</span>
                    <span className={b.points >= 0 ? "text-emerald-400" : "text-red-400"}>{b.points > 0 ? "+" : ""}{b.points}</span>
                  </li>
                ))}
              </ul>
              <p className="text-[10px] text-muted-foreground mt-2">
                Oportunidad = prioridad comercial. La nota Web mide la salud del sitio; son cosas distintas.
              </p>
            </details>
          </div>

          {business.websiteKind === "own" && (
            <div className="bg-card ring-1 ring-border rounded-2xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-bold flex items-center gap-2">
                  <Globe size={15} className="text-cyan-400" /> Salud de la web
                </h2>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ring-1 ${qualityClasses(
                      business.siteQuality
                    )}`}
                  >
                    {qualityLabel(business.siteQuality, business.siteGrade)}
                  </span>
                  <button
                    onClick={() => void scanSiteQuality()}
                    disabled={siteScanning}
                    className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 text-xs font-bold hover:bg-cyan-400 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {siteScanning ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                    {siteScanning ? "Analizando…" : "Analizar web"}
                  </button>
                </div>
              </div>

              {business.siteQuality && business.siteQuality !== "unknown" ? (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(business.siteSignals ?? []).map((signal) => (
                    <div key={signal.id} className="flex items-start justify-between gap-2 text-[11px] bg-muted/40 rounded-lg px-2.5 py-2">
                      <span className="text-muted-foreground">{signal.label}</span>
                      <span
                        className={`text-right ${
                          signal.status === "pass"
                            ? "text-emerald-400"
                            : signal.status === "warn"
                            ? "text-amber-300"
                            : signal.status === "fail"
                            ? "text-red-400"
                            : "text-muted-foreground"
                        }`}
                        title={signal.evidence}
                      >
                        {signal.evidence}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground mt-2">
                  Analiza la web para saber si está bien hecha: HTTPS, móvil, contenido, WhatsApp, formulario, reservas y frescura.
                </p>
              )}

              {(business.email || business.contactName) && (
                <div className="mt-3 p-3 rounded-xl bg-muted/40">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Contacto enriquecido
                  </p>
                  {business.email && (
                    <p className="text-xs mt-1">
                      <a href={`mailto:${business.email}`} className="text-cyan-400 hover:underline">
                        {business.email}
                      </a>
                      {business.emailStatus && (
                        <span className="text-[10px] text-muted-foreground ml-2">
                          {business.emailStatus === "verified"
                            ? "verificado"
                            : business.emailStatus === "risky"
                            ? "buzón genérico"
                            : "inválido"}
                        </span>
                      )}
                    </p>
                  )}
                  {business.contactName && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {business.contactName}
                      {business.contactRole ? ` · ${business.contactRole}` : ""}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="bg-card ring-1 ring-border rounded-2xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <MessageCircle size={15} className="text-cyan-400" /> WhatsApp y automatización
              </h2>
              <span
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ring-1 ${whatsappKindClasses(
                  business.whatsappKind
                )}`}
              >
                {whatsappKindLabel(business.whatsappKind)}
              </span>
            </div>

            <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
              {business.whatsappProvider && (
                <p>
                  Proveedor: <strong className="text-foreground">{business.whatsappProvider}</strong>
                </p>
              )}
              {business.whatsappConfidence && (
                <p>Detección: {whatsappConfidenceLabel(business.whatsappConfidence)}</p>
              )}
              {business.whatsappNumber && <p>Número: {business.whatsappNumber}</p>}
            </div>

            {(business.whatsappEvidence ?? []).length > 0 && (
              <ul className="mt-2 space-y-1">
                {(business.whatsappEvidence ?? []).map((item) => (
                  <li key={item} className="text-[11px] text-muted-foreground">
                    · {item}
                  </li>
                ))}
              </ul>
            )}

            <p className="text-[10px] text-muted-foreground mt-2">
              Detectado desde la web pública. Un agente del lado de Meta puede no dejar rastro:
              verifica manualmente antes de afirmarlo.
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {whatsappTestUrl && (
                <a
                  href={whatsappTestUrl}
                  target="_blank"
                  rel="noopener"
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30 text-xs font-bold hover:bg-emerald-500/25"
                >
                  Probar WhatsApp
                </a>
              )}
              {business.websiteKind === "own" && (
                <button
                  onClick={() => void scanSiteQuality(true)}
                  disabled={siteScanning}
                  className="px-3 py-1.5 rounded-lg bg-muted text-xs font-semibold hover:bg-muted/70 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {siteScanning ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                  Reanalizar web
                </button>
              )}
            </div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className="text-[10px] uppercase font-bold text-muted-foreground">
                Resultado de la prueba
                <select
                  value={whatsappVerified}
                  onChange={(event) => setWhatsappVerified(event.target.value as WhatsAppVerification)}
                  className="w-full mt-1 px-2 py-2 bg-muted rounded-lg text-xs ring-1 ring-border outline-none normal-case font-normal"
                >
                  <option value="">Sin verificar</option>
                  <option value="bot">Bot</option>
                  <option value="humano">Humano</option>
                  <option value="desconocido">Desconocido</option>
                </select>
              </label>
              <label className="text-[10px] uppercase font-bold text-muted-foreground">
                Notas de WhatsApp
                <input
                  value={whatsappNotes}
                  onChange={(event) => setWhatsappNotes(event.target.value)}
                  placeholder="Ej: respondió bot con menú; humano a los 2 min"
                  className="w-full mt-1 px-2 py-2 bg-muted rounded-lg text-xs ring-1 ring-border outline-none normal-case font-normal"
                />
              </label>
            </div>

            {isSaved ? (
              <button
                onClick={() => void saveWhatsAppVerification()}
                disabled={savingWhatsApp}
                className="mt-2 px-3 py-1.5 rounded-lg bg-muted text-xs font-bold hover:bg-muted/70 disabled:opacity-50"
              >
                {savingWhatsApp ? "Guardando…" : "Guardar verificación"}
              </button>
            ) : (
              <p className="text-[10px] text-muted-foreground mt-2">
                Convierte en lead para guardar la verificación.
              </p>
            )}
          </div>

          <div className="bg-card ring-1 ring-border rounded-2xl p-5">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <Sparkles size={15} className="text-cyan-400" /> Servicios y huecos
            </h2>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              {[
                [
                  "Web",
                  business.websiteKind === "own"
                    ? qualityLabel(business.siteQuality, business.siteGrade)
                    : "Sin web propia",
                ],
                ["WhatsApp", whatsappKindLabel(business.whatsappKind)],
                ["Citas online", bookingDetected ? "Detectado" : "No detectado"],
                ["Formulario", formDetected ? "Detectado" : "No detectado"],
                [
                  "Automatización",
                  business.whatsappKind === "automation" ? "Probable" : "No detectada",
                ],
                [
                  "SEO",
                  business.siteGrade == null ? "Sin analizar" : `${business.siteGrade}/100`,
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-2.5 py-2"
                >
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-semibold text-right">{value}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-cyan-300 mt-3">
              Pitch sugerido: <strong>{whatsappPitch}</strong>
            </p>
          </div>

          <div className="bg-card ring-1 ring-border rounded-2xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <Users size={15} className="text-cyan-400" /> Competencia
              </h2>
              <button
                onClick={() => void loadCompetitors()}
                disabled={loadingCompetitors}
                className="px-3 py-1.5 rounded-lg bg-muted text-xs font-semibold hover:bg-muted/70 disabled:opacity-50 flex items-center gap-1.5"
              >
                {loadingCompetitors ? <Loader2 size={13} className="animate-spin" /> : <Users size={13} />}
                {loadingCompetitors ? "Comparando…" : "Comparar"}
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Top 5 del mismo nicho a 5 km, excluyendo esta ficha.
            </p>

            {competitorError && <p className="text-[11px] text-red-400 mt-2">{competitorError}</p>}
            {competitors && competitors.length === 0 && (
              <p className="text-[11px] text-muted-foreground mt-2">
                No se encontraron competidores en ese radio.
              </p>
            )}
            {competitors && competitors.length > 0 && (
              <div className="mt-3 space-y-2">
                {competitors.map((competitor) => (
                  <div key={competitor.id} className="rounded-lg bg-muted/40 p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate">{competitor.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {competitor.category} · {competitor.address || "sin dirección"}
                        </p>
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ring-1 ${scoreClasses(competitor.score)}`}>
                        {competitor.score}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {competitor.websiteKind === "own" ? (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ring-1 ${qualityClasses(competitor.siteQuality)}`}>
                          {qualityLabel(competitor.siteQuality, competitor.siteGrade)}
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30">
                          Sin web propia
                        </span>
                      )}
                      {competitor.whatsappKind && competitor.whatsappKind !== "unknown" && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ring-1 ${whatsappKindClasses(competitor.whatsappKind)}`}>
                          {whatsappKindLabel(competitor.whatsappKind)}
                        </span>
                      )}
                    </div>
                    {competitor.website && (
                      <a
                        href={competitor.website}
                        target="_blank"
                        rel="noopener"
                        className="text-[10px] text-cyan-400 hover:underline block truncate mt-1"
                      >
                        {competitor.website.replace(/^https?:\/\//, "")}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-card ring-1 ring-border rounded-2xl p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold flex items-center gap-2"><Sparkles size={15} className="text-cyan-400" /> Análisis de la web</h2>
              <button onClick={analyze} disabled={loading} className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 text-xs font-bold hover:bg-cyan-400 disabled:opacity-40 flex items-center gap-1.5">
                {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                {loading ? "Analizando…" : record ? "Volver a analizar" : "Analizar"}
              </button>
            </div>

            {!record && !loading && (
              <p className="text-xs text-muted-foreground mt-3">
                {business.websiteKind === "own"
                  ? "Pulsa Analizar para medir velocidad, revisar la web y detectar qué ofrecerle."
                  : "Sin web propia: el análisis se basa en los datos del negocio (sin PageSpeed)."}
              </p>
            )}

            {record?.pagespeed && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
                {[
                  ["Rendimiento", record.pagespeed.performance],
                  ["SEO", record.pagespeed.seo],
                  ["Accesibilidad", record.pagespeed.accessibility],
                  ["Buenas prácticas", record.pagespeed.bestPractices],
                ].map(([label, value]) => (
                  <div key={String(label)} className="bg-muted/50 rounded-xl p-3 text-center">
                    <p className={`text-xl font-bold ${scoreColor(value as number | null)}`}>{value ?? "—"}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            )}

            {record?.pagespeed?.screenshot && (
              <img src={record.pagespeed.screenshot} alt={`Captura de ${business.name}`} className="mt-3 rounded-xl ring-1 ring-border w-full" />
            )}

            {record?.analysis && (
              <div className="mt-4 space-y-4">
                <p className="text-sm text-muted-foreground">{record.analysis.summary}</p>

                <div>
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Comprobación</h3>
                  <div className="flex flex-wrap gap-2">
                    {[
                      ["HTTPS", record.analysis.checklist.https],
                      ["Móvil", record.analysis.checklist.mobileFriendly],
                      ["WhatsApp", record.analysis.checklist.whatsapp],
                      ["Cita online", record.analysis.checklist.onlineBooking],
                      ["Formulario", record.analysis.checklist.contactForm],
                      ["Copyright antiguo", record.analysis.checklist.outdatedCopyright],
                    ].map(([label, ok]) => (
                      <span key={String(label)} className={`text-[11px] px-2 py-1 rounded-lg ring-1 ${ok ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30" : "bg-red-500/10 text-red-300 ring-red-500/30"}`}>
                        {label}: {ok ? "sí" : "no"}
                      </span>
                    ))}
                  </div>
                </div>

                {record.analysis.problems.length > 0 && (
                  <div>
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Problemas detectados</h3>
                    <ul className="space-y-2">
                      {record.analysis.problems.map((p) => (
                        <li key={p.title} className="text-xs">
                          <strong className="text-foreground">{p.title}</strong>
                          <p className="text-muted-foreground">{p.detail}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="p-3 rounded-xl bg-cyan-500/10 ring-1 ring-cyan-500/30">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">Servicio recomendado</p>
                  <p className="text-sm font-semibold mt-1">{record.analysis.recommendedService.type.replace(/_/g, " ")}</p>
                  <p className="text-xs text-muted-foreground">{record.analysis.recommendedService.reason}</p>
                </div>
              </div>
            )}
          </div>
          <AuditPanel business={business} />
        </div>

        <div className="space-y-4">
          <div className="bg-card ring-1 ring-border rounded-2xl p-4">
            <h2 className="text-sm font-bold mb-3">Seguimiento</h2>
            <label className="text-[10px] uppercase font-bold text-muted-foreground">Estado</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as RadarLeadStatus)} className="w-full mt-1 mb-3 px-2 py-2 bg-muted rounded-lg text-xs ring-1 ring-border outline-none">
              {["NUEVO", "ANALIZADO", "CONTACTADO", "RESPONDIO", "REUNION", "CLIENTE", "DESCARTADO"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <label className="text-[10px] uppercase font-bold text-muted-foreground">Próxima acción</label>
            <input type="date" value={nextAction} onChange={(e) => setNextAction(e.target.value)} className="w-full mt-1 mb-3 px-2 py-2 bg-muted rounded-lg text-xs ring-1 ring-border outline-none" />
            <label className="text-[10px] uppercase font-bold text-muted-foreground">Notas</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} className="w-full mt-1 mb-3 px-2 py-2 bg-muted rounded-lg text-xs ring-1 ring-border outline-none resize-none" placeholder="Qué le dijiste, cuándo volver a llamar…" />
            <button
              onClick={() => void saveLead()}
              disabled={savingLead}
              className="w-full py-2 rounded-lg bg-muted text-xs font-bold hover:bg-muted/70 disabled:opacity-50"
            >
              {savingLead ? "Guardando…" : isSaved ? "Guardar cambios" : "Convertir en lead"}
            </button>
          </div>

          <div className="bg-card ring-1 ring-border rounded-2xl p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <h2 className="text-sm font-bold">Primer contacto</h2>
              <select value={tone} onChange={(e) => setTone(e.target.value)} className="px-2 py-1 bg-muted rounded-lg text-[11px] ring-1 ring-border outline-none">
                {TONES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <p className="text-[10px] text-amber-300/90 leading-snug">
              Borradores para contactar de forma personal. No envíes mensajes comerciales masivos sin consentimiento.
            </p>

            {!drafts && (
              <button onClick={generateDrafts} disabled={draftsLoading} className="mt-3 w-full py-2 rounded-lg bg-muted text-xs font-bold hover:bg-muted/70 disabled:opacity-40 flex items-center justify-center gap-1.5">
                {draftsLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                {draftsLoading ? "Redactando…" : "Generar borradores"}
              </button>
            )}

            {drafts && (
              <div className="mt-3 space-y-3">
                {[
                  ["Llamada (30 s)", drafts.callScript, "call"],
                  ["WhatsApp", drafts.whatsapp, "wa"],
                  ["Correo", `${drafts.email.subject}\n\n${drafts.email.body}`, "email"],
                ].map(([label, text, key]) => (
                  <div key={key} className="bg-muted/40 rounded-xl p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
                      <button onClick={() => copy(text, key)} className="text-muted-foreground hover:text-foreground">
                        {copied === key ? <Check size={13} className="text-emerald-400" /> : <Clipboard size={13} />}
                      </button>
                    </div>
                    <pre className="text-[11px] whitespace-pre-wrap font-sans text-muted-foreground mt-1">{text}</pre>
                  </div>
                ))}
                <button onClick={generateDrafts} disabled={draftsLoading} className="w-full py-2 rounded-lg bg-muted text-xs font-bold hover:bg-muted/70 disabled:opacity-40">
                  Regenerar con tono «{tone}»
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BusinessPage() {
  return (
    <Suspense fallback={<div className="px-6 py-10 text-sm text-muted-foreground">Cargando ficha…</div>}>
      <BusinessContent />
    </Suspense>
  );
}

function escapeHtml(value: string): string {
  return String(value).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m] || m));
}
