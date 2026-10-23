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
  Phone,
  RefreshCw,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import RadarNav from "@/components/radar/RadarNav";
import {
  getAnalysis,
  getBusinessSnapshot,
  getSettings,
  radarRepository,
  saveAnalysis,
  type RadarAnalysisRecord,
} from "@/lib/radar/repository";
import { scoreClasses } from "@/lib/radar/score";
import type { RadarBusiness, RadarLeadStatus } from "@/lib/radar/types";

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

  useEffect(() => {
    if (!id) return;
    const snap = getBusinessSnapshot(id);
    setBusiness(snap);
    const saved = getAnalysis(id);
    if (saved) setRecord(saved);
    const lead = radarRepository.list().find((l) => l.businessId === id);
    if (lead) {
      setNotes(lead.notes);
      setStatus(lead.status);
      setNextAction(lead.nextActionAt ? lead.nextActionAt.slice(0, 10) : "");
    }
    const settings = getSettings();
    setTone(settings.tone);
  }, [id]);

  const seller = useMemo(() => getSettings(), []);
  const saved = useMemo(
    () => (business ? radarRepository.list().some((l) => l.businessId === business.id) : false),
    [business]
  );

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
        analysis: data.analysis,
        meta: data.meta,
      };
      setRecord(next);
      saveAnalysis(next);

      if (saved) {
        radarRepository.update(business.id, { status: "ANALIZADO" });
        setStatus("ANALIZADO");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo analizar el negocio");
    } finally {
      setLoading(false);
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

  function saveLead() {
    if (!business) return;
    radarRepository.upsert([business]);
    radarRepository.update(business.id, {
      status,
      notes,
      nextActionAt: nextAction ? new Date(nextAction).toISOString() : null,
    });
    setNotice("Guardado en Mis leads.");
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
      radarRepository.upsert([business]);
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
              <span className={`text-sm font-bold px-3 py-1.5 rounded-xl ring-1 ${scoreClasses(business.score)}`}>
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
            </details>
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
            <button onClick={saveLead} className="w-full py-2 rounded-lg bg-muted text-xs font-bold hover:bg-muted/70">
              Guardar en Mis leads
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
