"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  Globe,
  Loader2,
  Mail,
  Phone,
  ScanSearch,
  Search,
  User,
  Users,
} from "lucide-react";
import { RADAR_CATEGORIES } from "@/lib/radar/categories";
import RadarNav from "@/components/radar/RadarNav";
import ZoneAutocomplete from "@/components/radar/ZoneAutocomplete";
import { saveBusinessSnapshot } from "@/lib/radar/repository";
import { radarRepository } from "@/lib/radar/repository";
import { scoreClasses } from "@/lib/radar/score";
import { applyScanSummary, isDeficientQuality, qualityClasses, qualityLabel } from "@/lib/radar/siteQuality";
import { RADAR_RADIUS_OPTIONS } from "@/lib/radar/radius";
import type { RadarBusiness, RadarSearchResult, SiteScan, ZoneSuggestion } from "@/lib/radar/types";

const PAGE_SIZE = 20;
const SCAN_CHUNK = 10;

type RadarObjective = "ambos" | "sin_web" | "web_deficiente";

interface RadarUsageInfo {
  used: number;
  exhaustiveUsed: number;
  siteScansUsed: number;
  limits: {
    dailySearches: number;
    dailyExhaustive: number;
    dailySiteScans: number;
    maxResults: number;
  };
  resetsAt: string;
}

function RadarPageContent() {
  const [zona, setZona] = useState("");
  const [zoneSelection, setZoneSelection] = useState<ZoneSuggestion | null>(null);
  const [nicho, setNicho] = useState("talleres");
  const [keyword, setKeyword] = useState("");
  const [libre, setLibre] = useState(false);

  const [objective, setObjective] = useState<RadarObjective>("ambos");
  const [radiusKm, setRadiusKm] = useState<number | null>(null);
  const [onlyWithPhone, setOnlyWithPhone] = useState(false);
  const [hideUnnamed, setHideUnnamed] = useState(true);
  const [exhaustive, setExhaustive] = useState(false);
  const [onlyNew, setOnlyNew] = useState(true);
  const [usage, setUsage] = useState<RadarUsageInfo | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<{ done: number; total: number } | null>(null);
  const [scanError, setScanError] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<RadarSearchResult | null>(null);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  useEffect(() => {
    let alive = true;
    radarRepository
      .load()
      .then((list) => {
        if (alive) setSavedCount(list.length);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    fetch("/api/radar/config")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (alive && data?.usage) setUsage(data.usage);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const z = searchParams.get("zona");
    const n = searchParams.get("nicho");
    if (!z || !n) return;
    setZona(z);
    setLibre(false);
    setNicho(n);
    void runSearch(z, n, "", false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runSearch(zone: string, category: string, kw = "", ex = false, force = false) {
    if (!zone.trim()) {
      setError("Escribe una zona: ciudad, barrio o código postal.");
      return;
    }
    setLoading(true);
    setError("");
    setScanError("");
    setScanProgress(null);
    setResult(null);
    setSelected(new Set());
    setVisible(PAGE_SIZE);

    try {
      const res = await fetch("/api/radar/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zona: zone.trim(),
          nicho: category,
          keyword: kw,
          mode: ex ? "exhaustive" : "fast",
          onlyNew,
          force: force || undefined,
          zoneSelection: zoneSelection
            ? {
                displayName: zoneSelection.displayName,
                label: zoneSelection.label,
                lat: zoneSelection.lat,
                lng: zoneSelection.lon,
                bbox: zoneSelection.bbox,
              }
            : undefined,
          radiusKm: radiusKm ?? undefined,
          filtros: {
            objective,
            onlyWithPhone,
            hideUnnamed,
          },
        }),
      });
      const data = await res.json();
      if (data?.usage) setUsage(data.usage);
      if (!res.ok) throw new Error(data.error || "No se pudo completar la búsqueda");
      setResult(data as RadarSearchResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error buscando negocios");
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    return runSearch(zona, libre ? "" : nicho, libre ? keyword.trim() : "", exhaustive);
  }

  async function runSiteScan() {
    const items = result?.businesses ?? [];
    const pending = items.filter(
      (b) => b.websiteKind === "own" && b.website && (!b.siteQuality || b.siteQuality === "unknown")
    );
    if (pending.length === 0) {
      setToast({ message: "Todas las webs de esta búsqueda ya están analizadas.", type: "info" });
      return;
    }

    setScanning(true);
    setScanError("");
    setScanProgress({ done: 0, total: pending.length });
    try {
      const collected: Record<string, SiteScan> = {};
      let done = 0;
      for (let i = 0; i < pending.length; i += SCAN_CHUNK) {
        const chunk = pending.slice(i, i + SCAN_CHUNK).map((b) => b.id);
        const res = await fetch("/api/radar/site-scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ businessIds: chunk }),
        });
        const data = await res.json();
        if (data?.usage) setUsage(data.usage as RadarUsageInfo);
        if (!res.ok) throw new Error(data.error || "No se pudieron analizar las webs");
        Object.assign(collected, (data.scans ?? {}) as Record<string, SiteScan>);
        done += chunk.length;
        setScanProgress({ done, total: pending.length });
        setResult((prev) => {
          if (!prev) return prev;
          const businesses = prev.businesses.map((b) =>
            collected[b.id] ? applyScanSummary(b, collected[b.id]) : b
          );
          return {
            ...prev,
            businesses,
            siteScannedCount: businesses.filter(
              (b) => b.websiteKind === "own" && b.siteQuality && b.siteQuality !== "unknown"
            ).length,
            siteDeficientCount: businesses.filter((b) => isDeficientQuality(b.siteQuality)).length,
          };
        });
      }
      const total = Object.keys(collected).length;
      setToast({
        message: total > 0 ? `${total} web(s) analizadas y clasificadas.` : "No se pudo analizar ninguna web.",
        type: total > 0 ? "success" : "info",
      });
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Error analizando las webs");
    } finally {
      setScanning(false);
      setScanProgress(null);
    }
  }

  function openFicha(b: RadarBusiness) {
    saveBusinessSnapshot(b);
    router.push(`/radar/negocio?id=${encodeURIComponent(b.id)}`);
  }

  const filtered = useMemo(() => {
    const items = result?.businesses ?? [];
    return items
      .filter((b) => {
        if (objective === "sin_web" && b.websiteKind === "own") return false;
        if (
          objective === "web_deficiente" &&
          !(
            b.websiteKind === "own" &&
            (isDeficientQuality(b.siteQuality) || !b.siteQuality || b.siteQuality === "unknown")
          )
        ) {
          return false;
        }
        if (onlyWithPhone && !b.phone) return false;
        if (hideUnnamed && b.name === "(sin nombre)") return false;
        if (onlyNew && b.saved) return false;
        return true;
      })
      .sort((a, b) => b.score - a.score);
  }, [result, objective, onlyWithPhone, hideUnnamed, onlyNew]);

  const pendingSites = useMemo(
    () =>
      filtered.filter(
        (b) => b.websiteKind === "own" && b.website && (!b.siteQuality || b.siteQuality === "unknown")
      ).length,
    [filtered]
  );

  const shown = filtered.slice(0, visible);

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    const ids = shown.map((b) => b.id);
    const allSelected = ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  }

  async function saveSelected() {
    const businesses = filtered.filter((b) => selected.has(b.id));
    if (businesses.length === 0) return;
    try {
      const leads = await radarRepository.upsert(businesses);
      setSavedCount(leads.length);
      setSelected(new Set());
      setToast({
        message: `${businesses.length} negocio(s) guardados en Mis leads`,
        type: "success",
      });
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : "No se pudieron guardar los negocios",
        type: "error",
      });
    }
  }

  function exportCsv() {
    if (filtered.length === 0) return;
    const rows = [
      [
        "Nombre",
        "Categoria",
        "Direccion",
        "Telefono",
        "Web",
        "Tipo de web",
        "Calidad web",
        "Nota web",
        "Email",
        "Estado email",
        "Contacto",
        "Cargo",
        "Puntuacion",
        "Mapa",
      ],
      ...filtered.map((b) => [
        b.name,
        b.category,
        b.address,
        b.phone,
        b.website,
        b.websiteKind,
        qualityLabel(b.siteQuality, b.siteGrade),
        b.siteGrade == null ? "" : String(b.siteGrade),
        b.email ?? "",
        b.emailStatus ?? "",
        b.contactName ?? "",
        b.contactRole ?? "",
        String(b.score),
        b.mapsUrl,
      ]),
    ];
    const csv = rows
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `radar-${result?.zone.displayName ?? "busqueda"}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="px-4 md:px-6 pb-32">
      <div className="mt-4"><RadarNav /></div>

      <div className="mt-4 mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Search size={22} className="text-cyan-400" />
            Radar de Clientes
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Encuentra negocios locales sin web o con una web mal hecha, y prepara el primer contacto.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30 font-semibold">
            Gratis · OpenStreetMap
          </span>
          <span className="px-2.5 py-1 rounded-full bg-muted text-muted-foreground ring-1 ring-border flex items-center gap-1">
            <Users size={12} /> {savedCount} en Mis leads
          </span>
          {usage && (
            <span
              className={`px-2.5 py-1 rounded-full ring-1 flex items-center gap-1 ${
                usage.used >= usage.limits.dailySearches
                  ? "bg-red-500/15 text-red-300 ring-red-500/30"
                  : "bg-muted text-muted-foreground ring-border"
              }`}
              title="Se reinicia a las 00:00, hora Colombia"
            >
              Hoy: {usage.used}/{usage.limits.dailySearches} · exh. {usage.exhaustiveUsed}/{usage.limits.dailyExhaustive} · webs{" "}
              {usage.siteScansUsed}/{usage.limits.dailySiteScans}
            </span>
          )}
        </div>
      </div>

      {/* Buscador */}
      <form onSubmit={handleSearch} className="bg-card ring-1 ring-border rounded-2xl p-4 md:p-5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">
              Zona
            </label>
            <ZoneAutocomplete
              value={zona}
              onChange={(value) => {
                setZona(value);
                setZoneSelection((current) =>
                  current && current.displayName === value ? current : null
                );
              }}
              onSelect={(suggestion) => {
                setZona(suggestion.displayName);
                setZoneSelection(suggestion);
              }}
              placeholder="Mazurén, Suba, Bogotá · 41701 · Triana"
            />
          </div>

          <div className="md:col-span-4">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">
              Nicho
            </label>
            <select
              value={libre ? "__libre" : nicho}
              onChange={(e) => {
                if (e.target.value === "__libre") {
                  setLibre(true);
                } else {
                  setLibre(false);
                  setNicho(e.target.value);
                }
              }}
              className="w-full px-3 py-2.5 bg-muted rounded-xl ring-1 ring-border focus:ring-2 focus:ring-cyan-500 outline-none text-sm"
            >
              {RADAR_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
              <option value="__libre">Búsqueda libre por palabra…</option>
            </select>
          </div>

          <div className="md:col-span-3 flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-cyan-500 text-slate-950 font-bold text-sm hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              {loading ? "Buscando…" : "Buscar negocios"}
            </button>
          </div>

          {libre && (
            <div className="md:col-span-12">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">
                Palabra clave
              </label>
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Ej: taller, dental, peluquería…"
                className="w-full px-3 py-2.5 bg-muted rounded-xl ring-1 ring-border focus:ring-2 focus:ring-cyan-500 outline-none text-sm"
              />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-border">
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer" title="Oculta los negocios que ya tienes en Mis leads">
            <input type="checkbox" checked={onlyNew} onChange={(e) => setOnlyNew(e.target.checked)} className="accent-cyan-500" />
            Solo nuevos
          </label>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted-foreground">Objetivo:</span>
            {(
              [
                ["ambos", "Sin web + web mala"],
                ["sin_web", "Sin web"],
                ["web_deficiente", "Web mala o mejorable"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setObjective(value)}
                className={`px-2.5 py-1 rounded-lg ring-1 font-semibold ${
                  objective === value
                    ? "bg-cyan-500/15 text-cyan-300 ring-cyan-500/40"
                    : "bg-muted text-muted-foreground ring-border hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <label
            className="flex items-center gap-2 text-xs text-muted-foreground"
            title="Radio desde el centro de la zona; Zona completa usa el polígono o barrio"
          >
            <span>Radio</span>
            <select
              value={radiusKm ?? "zona"}
              onChange={(e) => setRadiusKm(e.target.value === "zona" ? null : Number(e.target.value))}
              className="px-2 py-1 bg-muted rounded-lg ring-1 ring-border outline-none"
            >
              <option value="zona">Zona completa</option>
              {RADAR_RADIUS_OPTIONS.map((km) => (
                <option key={km} value={km}>
                  {km} km
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={onlyWithPhone} onChange={(e) => setOnlyWithPhone(e.target.checked)} className="accent-cyan-500" />
            Solo con teléfono
          </label>
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={hideUnnamed} onChange={(e) => setHideUnnamed(e.target.checked)} className="accent-cyan-500" />
            Ocultar fichas sin nombre
          </label>
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer" title="Usa Overpass: puede tardar hasta 60 s, pero encuentra muchos más negocios">
            <input type="checkbox" checked={exhaustive} onChange={(e) => setExhaustive(e.target.checked)} className="accent-cyan-500" />
            Búsqueda exhaustiva (lenta)
          </label>
          {filtered.length > 0 && (
            <div className="ml-auto flex items-center gap-3">
              {pendingSites > 0 && (
                <button
                  type="button"
                  onClick={() => void runSiteScan()}
                  disabled={scanning}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/40 text-xs font-bold hover:bg-cyan-500/25 disabled:opacity-50"
                >
                  {scanning ? <Loader2 size={13} className="animate-spin" /> : <ScanSearch size={13} />}
                  {scanning && scanProgress
                    ? `Analizando ${scanProgress.done}/${scanProgress.total}`
                    : `Analizar webs (${pendingSites})`}
                </button>
              )}
              <button
                type="button"
                onClick={exportCsv}
                className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                <Download size={13} /> Exportar CSV
              </button>
            </div>
          )}
        </div>
      </form>

      {error && (
        <div className="mt-4 flex items-start gap-3 p-3 rounded-xl bg-red-500/10 ring-1 ring-red-500/30 text-xs text-red-300">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong className="block">No se pudo completar la búsqueda</strong>
            <span>{error}</span>
          </div>
          <button
            onClick={() => handleSearch()}
            className="shrink-0 px-2.5 py-1.5 rounded-lg ring-1 ring-red-500/40 font-semibold hover:bg-red-500/10"
          >
            Reintentar
          </button>
        </div>
      )}

      {scanError && (
        <div className="mt-4 flex items-start gap-3 p-3 rounded-xl bg-red-500/10 ring-1 ring-red-500/30 text-xs text-red-300">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong className="block">No se pudieron analizar las webs</strong>
            <span>{scanError}</span>
          </div>
          <button
            onClick={() => void runSiteScan()}
            className="shrink-0 px-2.5 py-1.5 rounded-lg ring-1 ring-red-500/40 font-semibold hover:bg-red-500/10"
          >
            Reintentar
          </button>
        </div>
      )}

      {scanning && scanProgress && (
        <div className="mt-4 p-3 rounded-xl bg-cyan-500/10 ring-1 ring-cyan-500/30 text-xs text-cyan-200">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <Loader2 size={13} className="animate-spin" /> Analizando webs: {scanProgress.done}/{scanProgress.total}
            </span>
            <span className="text-[10px] text-cyan-300/80">
              HTTPS, móvil, contenido y conversión
            </span>
          </div>
          <div className="mt-2 h-1 rounded-full bg-cyan-500/20 overflow-hidden">
            <div
              className="h-full bg-cyan-400 transition-all"
              style={{
                width: `${Math.round((scanProgress.done / Math.max(1, scanProgress.total)) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {loading && (
        <div className="mt-4 bg-card ring-1 ring-border rounded-2xl p-8 text-center text-sm text-muted-foreground">
          <Loader2 size={22} className="animate-spin mx-auto mb-3 text-cyan-400" />
          {exhaustive ? "Búsqueda exhaustiva en Overpass… puede tardar hasta 60 segundos." : "Consultando OpenStreetMap… suele tardar 1-3 segundos."}
        </div>
      )}

      {!loading && result && (
        <>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-muted-foreground">
              <span className="text-foreground font-semibold">{filtered.length}</span> negocios en{" "}
              <span className="text-foreground">{result.zone.displayName}</span>
              {typeof result.newCount === "number" && (
                <span className="ml-2 text-[10px] text-emerald-400">{result.newCount} nuevos</span>
              )}
              {(result.savedCount ?? 0) > 0 && (
                <span className="ml-1 text-[10px] text-muted-foreground">{result.savedCount} ya guardados</span>
              )}
              {result.cached && <span className="ml-2 px-2 py-0.5 rounded bg-muted text-[10px]">caché</span>}
              {(result.siteScannedCount ?? 0) > 0 && (
                <span className="ml-2 text-[10px] text-cyan-300">
                  {result.siteScannedCount} web(s) analizadas
                </span>
              )}
              {(result.siteDeficientCount ?? 0) > 0 && (
                <span className="ml-1 text-[10px] text-amber-300">
                  {result.siteDeficientCount} con web deficiente
                </span>
              )}
            </div>
            <div className="text-[10px] text-muted-foreground max-w-xl text-right">
              {result.warnings.join(" · ")}
            </div>
          </div>

          {filtered.length === 0 && (
            <div className="mt-4 bg-card ring-1 ring-border rounded-2xl p-10 text-center">
              <Search size={26} className="mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-semibold">Sin resultados con esos filtros</p>
              <p className="text-xs text-muted-foreground mt-1">
                Prueba a quitar filtros, ampliar la zona o usar otra categoría.
              </p>
              {result.cached && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      void runSearch(
                        zona,
                        libre ? "" : nicho,
                        libre ? keyword.trim() : "",
                        exhaustive,
                        true
                      )
                    }
                    className="mt-3 px-3 py-1.5 rounded-lg bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/40 text-xs font-bold hover:bg-cyan-500/25"
                  >
                    Reintentar sin caché
                  </button>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    Si la zona se guardó mal en caché, este botón vuelve a geocodificarla.
                  </p>
                </>
              )}
            </div>
          )}

          {filtered.length > 0 && (
            <>
              {/* Tabla escritorio */}
              <div className="hidden md:block mt-3 bg-card ring-1 ring-border rounded-2xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2.5 w-8">
                        <input
                          type="checkbox"
                          checked={shown.length > 0 && shown.every((b) => selected.has(b.id))}
                          onChange={toggleAll}
                          className="accent-cyan-500"
                          aria-label="Seleccionar todos"
                        />
                      </th>
                      <th className="px-3 py-2.5">Negocio</th>
                      <th className="px-3 py-2.5">Contacto</th>
                      <th className="px-3 py-2.5">Web</th>
                      <th className="px-3 py-2.5 text-center">Oportunidad</th>
                      <th className="px-3 py-2.5 text-right">Mapa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {shown.map((b) => (
                      <BusinessRows
                        key={b.id}
                        business={b}
                        selected={selected.has(b.id)}
                        expanded={expanded === b.id}
                        onToggle={() => toggleSelected(b.id)}
                        onExpand={() => setExpanded(expanded === b.id ? null : b.id)}
                        onOpen={() => void openFicha(b)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Tarjetas móvil */}
              <div className="md:hidden mt-3 space-y-3">
                {shown.map((b) => (
                  <div key={b.id} className="bg-card ring-1 ring-border rounded-2xl p-4">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selected.has(b.id)}
                        onChange={() => toggleSelected(b.id)}
                        className="accent-cyan-500 mt-1"
                        aria-label={`Seleccionar ${b.name}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-sm leading-tight">{b.name}</p>
                            <p className="text-[11px] text-muted-foreground">{b.category}</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {b.saved && <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30">Guardado</span>}
                              {b.audited && <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/30">Auditado</span>}
                              {b.isNew && <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground ring-1 ring-border">Nuevo</span>}
                            </div>
                          </div>
                          <span className={`text-xs font-bold px-2 py-1 rounded-lg ring-1 ${scoreClasses(b.score)}`}>
                            {b.score}
                          </span>
                        </div>
                        {b.address && <p className="text-xs text-muted-foreground mt-2">{b.address}</p>}
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {b.phone && (
                            <a href={`tel:${b.phone}`} className="text-xs text-cyan-400 flex items-center gap-1">
                              <Phone size={12} /> {b.phone}
                            </a>
                          )}
                          {b.email && (
                            <a href={`mailto:${b.email}`} className="text-xs text-cyan-400 flex items-center gap-1 max-w-[220px] truncate">
                              <Mail size={12} /> {b.email}
                            </a>
                          )}
                          {b.website ? (
                            <a href={b.website} target="_blank" rel="noopener" className="text-xs text-cyan-400 flex items-center gap-1 truncate">
                              <Globe size={12} /> {b.websiteKind === "own" ? "Web" : "Ficha externa"}
                            </a>
                          ) : (
                            <span className="text-xs text-amber-300 flex items-center gap-1" title="OpenStreetMap no registra web para este negocio; confírmalo antes de contactar">
                              <Globe size={12} /> Sin web (OSM)
                            </span>
                          )}
                          {b.websiteKind === "own" && (
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ring-1 ${qualityClasses(b.siteQuality)}`}>
                              {qualityLabel(b.siteQuality, b.siteGrade)}
                            </span>
                          )}
                        </div>
                        {b.contactName && (
                          <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                            <User size={11} /> {b.contactName}
                            {b.contactRole ? ` · ${b.contactRole}` : ""}
                          </p>
                        )}
                        <div className="flex items-center justify-between mt-3">
                          <button onClick={() => setExpanded(expanded === b.id ? null : b.id)} className="text-[11px] text-muted-foreground flex items-center gap-1">
                            {expanded === b.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />} Desglose
                          </button>
                          <div className="flex items-center gap-3">
                            <button onClick={() => void openFicha(b)} className="text-[11px] font-semibold text-cyan-400">Ficha</button>
                            <a href={b.mapsUrl} target="_blank" rel="noopener" className="text-[11px] text-muted-foreground flex items-center gap-1">
                              Ver mapa <ExternalLink size={11} />
                            </a>
                          </div>
                        </div>
                        {expanded === b.id && (
                          <ul className="mt-2 space-y-1">
                            {b.breakdown.map((d) => (
                              <li key={d.label} className="flex justify-between text-[11px] text-muted-foreground">
                                <span>{d.label}</span>
                                <span className={d.points >= 0 ? "text-emerald-400" : "text-red-400"}>
                                  {d.points > 0 ? "+" : ""}{d.points}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {visible < filtered.length && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => setVisible((v) => v + PAGE_SIZE)}
                    className="px-5 py-2.5 rounded-xl ring-1 ring-border text-sm font-semibold hover:bg-muted"
                  >
                    Mostrar más ({filtered.length - visible} restantes)
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Barra de selección */}
      {selected.size > 0 && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-3 rounded-2xl bg-surface-container-high ring-1 ring-border shadow-2xl">
          <span className="text-xs font-semibold">{selected.size} seleccionado(s)</span>
          <button
            onClick={() => void saveSelected()}
            className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 text-xs font-bold hover:bg-cyan-400 flex items-center gap-1.5"
          >
            <Check size={13} /> Guardar en Mis leads
          </button>
          <button onClick={() => setSelected(new Set())} className="text-xs text-muted-foreground hover:text-foreground">
            Limpiar
          </button>
        </div>
      )}

      {toast && (
        <div
          className={`fixed bottom-24 md:bottom-8 right-4 md:right-8 z-50 px-4 py-3 rounded-xl text-sm shadow-xl ring-1 ${
            toast.type === "success"
              ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
              : toast.type === "error"
              ? "bg-red-500/15 text-red-300 ring-red-500/30"
              : "bg-muted text-foreground ring-border"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default function RadarPage() {
  return (
    <Suspense fallback={<div className="px-6 py-10 text-sm text-muted-foreground">Cargando Radar…</div>}>
      <RadarPageContent />
    </Suspense>
  );
}

function BusinessRows({
  business,
  selected,
  expanded,
  onToggle,
  onExpand,
  onOpen,
}: {
  business: RadarBusiness;
  selected: boolean;
  expanded: boolean;
  onToggle: () => void;
  onExpand: () => void;
  onOpen: () => void;
}) {
  return (
    <>
      <tr className="hover:bg-muted/20 align-top">
        <td className="px-3 py-3">
          <input type="checkbox" checked={selected} onChange={onToggle} className="accent-cyan-500" aria-label={`Seleccionar ${business.name}`} />
        </td>
        <td className="px-3 py-3">
          <p className="font-semibold text-sm leading-tight">{business.name}</p>
          <p className="text-[11px] text-muted-foreground">{business.category}</p>
          {business.address && <p className="text-[11px] text-muted-foreground mt-0.5">{business.address}</p>}
          <div className="flex flex-wrap gap-1 mt-1">
            {business.saved && <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30">Guardado</span>}
            {business.audited && <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/30">Auditado</span>}
            {business.isNew && <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground ring-1 ring-border">Nuevo</span>}
          </div>
        </td>
        <td className="px-3 py-3">
          {business.phone ? (
            <a href={`tel:${business.phone}`} className="text-xs text-cyan-400 hover:underline flex items-center gap-1">
              <Phone size={12} /> {business.phone}
            </a>
          ) : (
            <span className="text-[11px] text-muted-foreground">Sin teléfono</span>
          )}
          {business.email && (
            <a
              href={`mailto:${business.email}`}
              className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 mt-1 max-w-[200px] truncate"
              title={`${business.email}${business.emailStatus ? ` · ${business.emailStatus}` : ""}`}
            >
              <Mail size={11} className="shrink-0" /> {business.email}
            </a>
          )}
          {business.contactName && (
            <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
              <User size={10} /> {business.contactName}
              {business.contactRole ? ` · ${business.contactRole}` : ""}
            </p>
          )}
        </td>
        <td className="px-3 py-3">
          {business.website ? (
            <a
              href={business.website}
              target="_blank"
              rel="noopener"
              className={`text-xs flex items-center gap-1 max-w-[220px] truncate ${
                business.websiteKind === "own" ? "text-cyan-400 hover:underline" : "text-amber-300 hover:underline"
              }`}
              title={business.website}
            >
              <Globe size={12} className="shrink-0" />
              {business.websiteKind === "own" ? business.website.replace(/^https?:\/\//, "") : "Ficha externa"}
            </a>
          ) : (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30" title="OpenStreetMap no registra web para este negocio; confírmalo antes de contactar">
              Sin web (OSM)
            </span>
          )}
          {business.websiteKind === "own" && (
            <span
              className={`mt-1 inline-flex text-[9px] font-bold px-2 py-0.5 rounded-full ring-1 ${qualityClasses(
                business.siteQuality
              )}`}
              title={
                business.siteSignals
                  ?.filter((signal) => signal.status === "fail")
                  .map((signal) => `${signal.label}: ${signal.evidence}`)
                  .join(" · ") || "Sin analizar"
              }
            >
              {qualityLabel(business.siteQuality, business.siteGrade)}
            </span>
          )}
        </td>
        <td className="px-3 py-3 text-center">
          <button
            onClick={onExpand}
            className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg ring-1 ${scoreClasses(business.score)}`}
            title="Ver desglose"
          >
            {business.score}
            {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
        </td>
        <td className="px-3 py-3 text-right">
          <div className="flex items-center justify-end gap-2">
            <button onClick={onOpen} className="text-[11px] font-semibold text-cyan-400 hover:underline">
              Ficha
            </button>
            <a href={business.mapsUrl} target="_blank" rel="noopener" className="inline-flex text-muted-foreground hover:text-foreground" title="Abrir en el mapa">
              <ExternalLink size={14} />
            </a>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-muted/10">
          <td />
          <td colSpan={5} className="px-3 pb-3">
            <ul className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1">
              {business.breakdown.map((d) => (
                <li key={d.label} className="flex justify-between text-[11px] text-muted-foreground">
                  <span>{d.label}</span>
                  <span className={d.points >= 0 ? "text-emerald-400" : "text-red-400"}>
                    {d.points > 0 ? "+" : ""}{d.points}
                  </span>
                </li>
              ))}
            </ul>
          </td>
        </tr>
      )}
    </>
  );
}

