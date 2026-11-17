"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, MapPin, Play } from "lucide-react";
import RadarNav from "@/components/radar/RadarNav";
import { RADAR_CATEGORIES } from "@/lib/radar/categories";
import { applyScanSummary, isDeficientQuality } from "@/lib/radar/siteQuality";
import type { RadarBusiness, SiteScan } from "@/lib/radar/types";

interface NicheRow {
  id: string;
  label: string;
  total: number;
  noWebPct: number;
  withPhonePct: number;
  badWebPct: number;
  scanned: number;
  avgScore: number;
  opportunity: number;
  error?: string;
}

export default function NichesPage() {
  const [zona, setZona] = useState("");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [rows, setRows] = useState<NicheRow[]>([]);
  const [error, setError] = useState("");
  const [scanSample, setScanSample] = useState(false);

  async function scanSampleFor(items: RadarBusiness[]): Promise<RadarBusiness[]> {
    const pending = items
      .filter(
        (b) =>
          b.websiteKind === "own" && b.website && (!b.siteQuality || b.siteQuality === "unknown")
      )
      .slice(0, 3);
    if (pending.length === 0) return items;
    const res = await fetch("/api/radar/site-scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessIds: pending.map((b) => b.id) }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "No se pudieron analizar las webs");
    const scans = (data.scans ?? {}) as Record<string, SiteScan>;
    return items.map((b) => (scans[b.id] ? applyScanSummary(b, scans[b.id]) : b));
  }

  async function run() {
    if (!zona.trim()) {
      setError("Escribe una zona para analizar los nichos.");
      return;
    }
    setRunning(true);
    setError("");
    setRows([]);
    setProgress(0);

    const results: NicheRow[] = [];

    for (let i = 0; i < RADAR_CATEGORIES.length; i++) {
      const cat = RADAR_CATEGORIES[i];
      try {
        const res = await fetch("/api/radar/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ zona: zona.trim(), nicho: cat.id, mode: "fast" }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Error en ${cat.label}`);

        let items = (Array.isArray(data.businesses) ? data.businesses : []) as RadarBusiness[];
        let scanError = "";
        if (scanSample) {
          try {
            items = await scanSampleFor(items);
          } catch (err) {
            scanError = err instanceof Error ? err.message : "No se pudo analizar la muestra";
          }
        }

        const total = items.length;
        const noWeb = items.filter((b) => b.websiteKind !== "own").length;
        const withPhone = items.filter((b) => !!b.phone).length;
        const scanned = items.filter(
          (b) => b.websiteKind === "own" && b.siteQuality && b.siteQuality !== "unknown"
        ).length;
        const deficient = items.filter((b) => isDeficientQuality(b.siteQuality)).length;
        const badWebPct = scanned ? Math.round((deficient / scanned) * 100) : 0;
        const avgScore = total ? Math.round(items.reduce((a, b) => a + b.score, 0) / total) : 0;
        const noWebPct = total ? Math.round((noWeb / total) * 100) : 0;
        const opportunity = Math.round(
          ((noWeb + deficient) / Math.max(1, total)) * 100 * Math.log10(total + 1)
        );

        results.push({
          id: cat.id,
          label: cat.label,
          total,
          noWebPct,
          withPhonePct: total ? Math.round((withPhone / total) * 100) : 0,
          badWebPct,
          scanned,
          avgScore,
          opportunity,
          error: scanError || undefined,
        });
      } catch (err) {
        results.push({
          id: cat.id,
          label: cat.label,
          total: 0,
          noWebPct: 0,
          withPhonePct: 0,
          badWebPct: 0,
          scanned: 0,
          avgScore: 0,
          opportunity: 0,
          error: err instanceof Error ? err.message : "Error",
        });
      }

      setProgress(i + 1);
      setRows([...results].sort((a, b) => b.opportunity - a.opportunity));
      await new Promise((r) => setTimeout(r, 350));
    }

    setRunning(false);
  }

  return (
    <div className="px-4 md:px-6 pb-32">
      <div className="mt-4"><RadarNav /></div>

      <div className="mt-4">
        <h1 className="text-xl font-bold">Radar de nichos</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Compara 14 categorías en una zona y detecta dónde hay más negocios sin web o con una web mal hecha.
        </p>
      </div>

      <div className="mt-4 bg-card ring-1 ring-border rounded-2xl p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[240px]">
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Zona</label>
          <div className="relative">
            <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={zona}
              onChange={(e) => setZona(e.target.value)}
              placeholder="Dos Hermanas, Sevilla"
              className="w-full pl-9 pr-3 py-2.5 bg-muted rounded-xl ring-1 ring-border focus:ring-2 focus:ring-cyan-500 outline-none text-sm"
            />
          </div>
        </div>
        <button onClick={run} disabled={running} className="px-4 py-2.5 rounded-xl bg-cyan-500 text-slate-950 text-sm font-bold hover:bg-cyan-400 disabled:opacity-50 flex items-center gap-2">
          {running ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
          {running ? `${progress}/${RADAR_CATEGORIES.length}` : "Analizar nichos"}
        </button>
      </div>

      <label className="flex items-center gap-2 text-[11px] text-muted-foreground mt-2 cursor-pointer">
        <input
          type="checkbox"
          checked={scanSample}
          onChange={(e) => setScanSample(e.target.checked)}
          className="accent-cyan-500"
        />
        Analizar hasta 3 webs por nicho para medir «web mala» (más lento y consume cuota de webs)
      </label>

      <p className="text-[11px] text-muted-foreground mt-2">
        Gratis: se hacen {RADAR_CATEGORIES.length} búsquedas en OpenStreetMap (una por nicho). Suele tardar entre 20 y 40 segundos.
      </p>

      {error && <div className="mt-3 p-3 rounded-xl bg-red-500/10 ring-1 ring-red-500/30 text-xs text-red-300">{error}</div>}

      {running && (
        <div className="mt-4 h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-cyan-400 transition-all" style={{ width: `${(progress / RADAR_CATEGORIES.length) * 100}%` }} />
        </div>
      )}

      {rows.length > 0 && (
        <div className="mt-4 bg-card ring-1 ring-border rounded-2xl overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5">#</th>
                <th className="px-3 py-2.5">Nicho</th>
                <th className="px-3 py-2.5 text-center">Negocios</th>
                <th className="px-3 py-2.5 text-center">Sin web</th>
                <th className="px-3 py-2.5 text-center">Web mala</th>
                <th className="px-3 py-2.5 text-center">Con teléfono</th>
                <th className="px-3 py-2.5 text-center">Score medio</th>
                <th className="px-3 py-2.5 text-right">Ver</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row, index) => (
                <tr key={row.id} className="hover:bg-muted/20">
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{index + 1}</td>
                  <td className="px-3 py-2.5">
                    <p className="text-sm font-semibold">{row.label}</p>
                    {row.error && <p className="text-[10px] text-red-400">{row.error}</p>}
                  </td>
                  <td className="px-3 py-2.5 text-center text-xs">{row.total}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${row.noWebPct >= 60 ? "bg-emerald-500/15 text-emerald-300" : row.noWebPct >= 30 ? "bg-amber-500/15 text-amber-300" : "bg-muted text-muted-foreground"}`}>
                      {row.noWebPct}%
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded ${
                        row.badWebPct >= 60
                          ? "bg-red-500/15 text-red-300"
                          : row.badWebPct >= 30
                          ? "bg-amber-500/15 text-amber-300"
                          : "bg-muted text-muted-foreground"
                      }`}
                      title={
                        row.scanned > 0
                          ? `${row.badWebPct}% de ${row.scanned} web(s) analizadas`
                          : "Sin webs analizadas en este nicho"
                      }
                    >
                      {row.badWebPct}%
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center text-xs text-muted-foreground">{row.withPhonePct}%</td>
                  <td className="px-3 py-2.5 text-center text-xs text-muted-foreground">{row.avgScore}</td>
                  <td className="px-3 py-2.5 text-right">
                    <Link
                      href={`/radar?zona=${encodeURIComponent(zona)}&nicho=${row.id}`}
                      className="text-[11px] font-semibold text-cyan-400 hover:underline"
                    >
                      Ver negocios
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground mt-3">
        «Oportunidad» combina los negocios sin web y las webs deficientes con el volumen de negocios. OSM no ofrece reseñas ni valoraciones.
      </p>
    </div>
  );
}
