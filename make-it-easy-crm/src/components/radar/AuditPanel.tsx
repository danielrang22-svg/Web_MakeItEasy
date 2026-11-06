"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ChevronDown, Clipboard, FileText, Loader2, Play, Receipt } from "lucide-react";
import type { AuditReport } from "@/lib/radar/audit/types";
import { getAudit, getSettings, saveAudit } from "@/lib/radar/repository";
import { addOnsFor, formatCop, recommendPackage } from "@/lib/radar/packages";
import { printAuditReport } from "@/lib/radar/report";
import type { RadarBusiness } from "@/lib/radar/types";

interface HistoryRow {
  id: string;
  createdAt: string;
  globalScore: number;
  potentialScore: number;
  url?: string | null;
}

function tone(score: number | null): string {
  if (score == null) return "text-muted-foreground";
  if (score >= 75) return "text-emerald-400";
  if (score >= 50) return "text-amber-300";
  return "text-red-400";
}

function bar(score: number | null): string {
  if (score == null) return "bg-muted";
  if (score >= 75) return "bg-emerald-400";
  if (score >= 50) return "bg-amber-400";
  return "bg-red-400";
}

const STATUS_STYLE: Record<string, string> = {
  pass: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  warn: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  fail: "bg-red-500/15 text-red-300 ring-red-500/30",
  na: "bg-muted text-muted-foreground ring-border",
};

export default function AuditPanel({ business }: { business: RadarBusiness }) {
  const router = useRouter();
  const params = useSearchParams();
  const [report, setReport] = useState<AuditReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [openArea, setOpenArea] = useState<string | null>("indexacion");
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [quoting, setQuoting] = useState(false);

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch(`/api/radar/audits?businessId=${encodeURIComponent(business.id)}`);
      if (!res.ok) return;
      const data = await res.json();
      setHistory(data.audits ?? []);
    } catch {
      // sin historial
    }
  }, [business.id]);

  useEffect(() => {
    const saved = getAudit<AuditReport>(business.id);
    if (saved) setReport(saved);
    void loadHistory();
  }, [business.id, loadHistory]);

  useEffect(() => {
    if (params.get("audit") === "1" && business.websiteKind === "own" && business.website) {
      void audit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business.id]);

  async function audit() {
    if (!business.website) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/radar/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: business.website }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo auditar la web");

      setReport(data as AuditReport);
      saveAudit(business.id, data);

      void fetch("/api/radar/audits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: business.id,
          businessName: business.name,
          url: business.website,
          report: data,
        }),
      }).then(() => loadHistory()).catch(() => undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error auditando la web");
    } finally {
      setLoading(false);
    }
  }

  async function copySummary() {
    if (!report) return;
    const text = [
      `Auditoría SEO — ${business.name}`,
      `Nota global: ${report.globalScore}/100 (potencial ${report.potentialScore})`,
      ...report.areas.map((a) => `${a.label}: ${a.score ?? "—"}`),
      report.critical.length ? `Críticos: ${report.critical.join(", ")}` : "",
      `Fallos: ${report.checks.filter((c) => c.status === "fail").length} · Avisos: ${report.checks.filter((c) => c.status === "warn").length}`,
      report.url,
    ]
      .filter(Boolean)
      .join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  async function createQuote() {
    if (!report) return;
    setQuoting(true);
    setError("");
    try {
      const pkg = recommendPackage(report);
      const addOns = addOnsFor(report);
      const total = pkg.fromCop + addOns.reduce((sum, a) => sum + a.fromCop, 0);

      const impRes = await fetch("/api/radar/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business }),
      });
      const imp = await impRes.json();
      if (!impRes.ok) throw new Error(imp.error || "No se pudo crear el lead");

      const desafio = report.critical.length
        ? `Fallos críticos detectados: ${report.critical.join(", ")}.`
        : `Nota SEO actual ${report.globalScore}/100; potencial ${report.potentialScore}/100.`;

      const res = await fetch("/api/cotizaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresaNombre: business.name,
          contactoNombre: business.name,
          leadId: imp.leadId ?? null,
          tituloPropuesta: `${pkg.label} para ${business.name}`,
          desafioNegocio: `${desafio} ${pkg.pitch}`,
          totalProyectoCore: total,
          moduloOpcionalFee: 0,
          feeMensual: pkg.recurring?.fromCop ?? 0,
          feeMensualIncluye: pkg.recurring?.label ?? "",
          moneda: "COP",
          estado: "BORRADOR",
          observaciones: `Auditoría SEO ${report.globalScore}/100 (potencial ${report.potentialScore}). ${report.url}`,
          validez: "30 días",
        }),
      });
      const quote = await res.json();
      if (!res.ok) throw new Error(quote.error || "No se pudo crear la cotización");

      router.push("/cotizaciones");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la cotización");
    } finally {
      setQuoting(false);
    }
  }

  if (business.websiteKind !== "own" || !business.website) {
    return (
      <div className="bg-card ring-1 ring-border rounded-2xl p-5">
        <h2 className="text-sm font-bold">Auditoría SEO</h2>
        <p className="text-xs text-muted-foreground mt-2">
          Sin web propia no hay nada que auditar. La oportunidad es directa: web nueva con WhatsApp, formulario y
          cita online. No se gasta ninguna llamada a la IA.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
          <span className="px-2 py-1 rounded-lg bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30">Sin web propia</span>
          <span className="px-2 py-1 rounded-lg bg-muted text-muted-foreground ring-1 ring-border">Oportunidad alta</span>
        </div>
      </div>
    );
  }

  const pkg = report ? recommendPackage(report) : null;
  const addOns = report ? addOnsFor(report) : [];
  const previous = history.length > 0 ? history[0] : null;

  return (
    <div className="bg-card ring-1 ring-border rounded-2xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold">Auditoría SEO</h2>
          <p className="text-[10px] text-muted-foreground">
            {report ? `${report.checks.length} comprobaciones · ${new Date(report.fetchedAt).toLocaleDateString("es-ES")}` : "38 comprobaciones · 0 tokens"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {report && (
            <button onClick={copySummary} className="px-2.5 py-1.5 rounded-lg bg-muted text-[11px] font-semibold hover:bg-muted/70 flex items-center gap-1">
              <Clipboard size={12} /> {copied ? "Copiado" : "Copiar"}
            </button>
          )}
          <button
            onClick={audit}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 text-xs font-bold hover:bg-cyan-400 disabled:opacity-40 flex items-center gap-1.5"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
            {loading ? "Auditando…" : report ? "Reauditar" : "Auditar SEO"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-3 flex items-start gap-2 p-2.5 rounded-lg bg-red-500/10 ring-1 ring-red-500/30 text-[11px] text-red-300">
          <AlertCircle size={13} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {!report && !loading && !error && (
        <p className="text-xs text-muted-foreground mt-3">
          Analiza indexación, técnico, on-page, local y conversión. Tarda unos segundos y no consume tokens.
        </p>
      )}

      {report && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/40 rounded-xl p-3">
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Nota actual</p>
              <p className={`text-3xl font-bold ${tone(report.globalScore)}`}>{report.globalScore}<span className="text-sm text-muted-foreground">/100</span></p>
            </div>
            <div className="bg-cyan-500/10 ring-1 ring-cyan-500/30 rounded-xl p-3">
              <p className="text-[10px] uppercase font-bold text-cyan-300">Potencial</p>
              <p className="text-3xl font-bold text-cyan-300">{report.potentialScore}<span className="text-sm text-muted-foreground">/100</span></p>
            </div>
          </div>

          {history.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
              <span className="font-bold uppercase tracking-wider">Historial</span>
              {history.slice(0, 4).map((h, i) => {
                const next = history[i + 1];
                const delta = next ? h.globalScore - next.globalScore : 0;
                return (
                  <span key={h.id} className="px-2 py-0.5 rounded bg-muted">
                    {new Date(h.createdAt).toLocaleDateString("es-ES")} · {h.globalScore}
                    {delta !== 0 && (
                      <span className={delta > 0 ? " text-emerald-400" : " text-red-400"}>
                        {delta > 0 ? ` +${delta}` : ` ${delta}`}
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
          )}

          <div className="space-y-2">
            {report.areas.map((a) => (
              <div key={a.area}>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">{a.label}</span>
                  <span className={`font-bold ${tone(a.score)}`}>{a.score ?? "—"}</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                  <div className={`h-full ${bar(a.score)}`} style={{ width: `${a.score ?? 0}%` }} />
                </div>
              </div>
            ))}
          </div>

          {report.critical.length > 0 && (
            <div className="p-3 rounded-xl bg-red-500/10 ring-1 ring-red-500/30">
              <p className="text-[10px] uppercase font-bold text-red-300">Fallos críticos</p>
              <p className="text-[11px] text-red-200 mt-1">{report.critical.join(" · ")}</p>
            </div>
          )}

          {report.quickWins.length > 0 && (
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Arreglos rápidos</p>
              <ul className="space-y-1">
                {report.quickWins.map((q) => (
                  <li key={q} className="text-[11px] text-muted-foreground flex gap-1.5">
                    <span className="text-cyan-400">•</span> {q}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {pkg && (
            <div className="p-3 rounded-xl bg-cyan-500/10 ring-1 ring-cyan-500/30">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] uppercase font-bold text-cyan-300">Propuesta recomendada</p>
                  <p className="text-sm font-bold mt-0.5">{pkg.label} · desde {formatCop(pkg.fromCop)}</p>
                  <p className="text-[11px] text-muted-foreground">{pkg.pitch}</p>
                  {addOns.length > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Opcional: {addOns.map((a) => `${a.label} (${formatCop(a.fromCop)})`).join(" · ")}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  onClick={() =>
                    printAuditReport({
                      business,
                      report,
                      pkg,
                      addOns,
                      sellerName: getSettings().sellerName,
                    })
                  }
                  className="px-2.5 py-1.5 rounded-lg bg-muted text-[11px] font-semibold hover:bg-muted/70 flex items-center gap-1"
                >
                  <FileText size={12} /> Informe PDF
                </button>
                <button
                  onClick={createQuote}
                  disabled={quoting}
                  className="px-2.5 py-1.5 rounded-lg bg-cyan-500 text-slate-950 text-[11px] font-bold hover:bg-cyan-400 disabled:opacity-40 flex items-center gap-1"
                >
                  {quoting ? <Loader2 size={12} className="animate-spin" /> : <Receipt size={12} />}
                  {quoting ? "Creando…" : "Crear cotización"}
                </button>
              </div>
            </div>
          )}

          <div className="space-y-1">
            {report.areas.map((area) => {
              const items = report.checks.filter((c) => c.area === area.area);
              const fails = items.filter((c) => c.status === "fail").length;
              const open = openArea === area.area;
              return (
                <div key={area.area} className="border border-border rounded-xl overflow-hidden">
                  <button
                    onClick={() => setOpenArea(open ? null : area.area)}
                    className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-muted/30"
                  >
                    <span className="text-[11px] font-semibold">{area.label}</span>
                    <span className="flex items-center gap-2">
                      {fails > 0 && <span className="text-[10px] text-red-400">{fails} fallos</span>}
                      <ChevronDown size={13} className={`text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
                    </span>
                  </button>
                  {open && (
                    <ul className="px-3 pb-2 space-y-1.5">
                      {items.map((c) => (
                        <li key={c.id} className="flex items-start gap-2">
                          <span className={`mt-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded ring-1 ${STATUS_STYLE[c.status]}`}>
                            {c.status === "pass" ? "OK" : c.status === "warn" ? "AVISO" : c.status === "fail" ? "FALLO" : "N/A"}
                          </span>
                          <div className="min-w-0">
                            <p className="text-[11px] font-medium leading-tight">{c.label}</p>
                            <p className="text-[10px] text-muted-foreground leading-snug">{c.evidence}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
