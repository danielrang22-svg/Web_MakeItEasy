"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  Globe,
  Loader2,
  MapPin,
  Phone,
  Search,
  Users,
} from "lucide-react";
import { RADAR_CATEGORIES } from "@/lib/radar/categories";
import { radarRepository } from "@/lib/radar/repository";
import { scoreClasses } from "@/lib/radar/score";
import type { RadarBusiness, RadarSearchResult } from "@/lib/radar/types";

const PAGE_SIZE = 20;

export default function RadarPage() {
  const [zona, setZona] = useState("");
  const [nicho, setNicho] = useState("talleres");
  const [keyword, setKeyword] = useState("");
  const [libre, setLibre] = useState(false);

  const [onlyNoWebsite, setOnlyNoWebsite] = useState(false);
  const [onlyWithPhone, setOnlyWithPhone] = useState(false);
  const [hideUnnamed, setHideUnnamed] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<RadarSearchResult | null>(null);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  useEffect(() => {
    setSavedCount(radarRepository.list().length);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    if (!zona.trim()) {
      setError("Escribe una zona: ciudad, barrio o código postal.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    setSelected(new Set());
    setVisible(PAGE_SIZE);

    try {
      const res = await fetch("/api/radar/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zona: zona.trim(),
          nicho: libre ? "" : nicho,
          keyword: libre ? keyword.trim() : "",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo completar la búsqueda");
      setResult(data as RadarSearchResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error buscando negocios");
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const items = result?.businesses ?? [];
    return items.filter((b) => {
      if (onlyNoWebsite && b.websiteKind === "own") return false;
      if (onlyWithPhone && !b.phone) return false;
      if (hideUnnamed && b.name === "(sin nombre)") return false;
      return true;
    });
  }, [result, onlyNoWebsite, onlyWithPhone, hideUnnamed]);

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

  function saveSelected() {
    const businesses = filtered.filter((b) => selected.has(b.id));
    if (businesses.length === 0) return;
    const leads = radarRepository.upsert(businesses);
    setSavedCount(leads.length);
    setSelected(new Set());
    setToast({
      message: `${businesses.length} negocio(s) guardados en Mis leads`,
      type: "success",
    });
  }

  function exportCsv() {
    if (filtered.length === 0) return;
    const rows = [
      ["Nombre", "Categoria", "Direccion", "Telefono", "Web", "Tipo de web", "Puntuacion", "Mapa"],
      ...filtered.map((b) => [
        b.name,
        b.category,
        b.address,
        b.phone,
        b.website,
        b.websiteKind,
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
      <div className="mt-4 mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Search size={22} className="text-cyan-400" />
            Radar de Clientes
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Encuentra negocios locales, detecta quién no tiene web propia y prepara el primer contacto.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30 font-semibold">
            Gratis · OpenStreetMap
          </span>
          <span className="px-2.5 py-1 rounded-full bg-muted text-muted-foreground ring-1 ring-border flex items-center gap-1">
            <Users size={12} /> {savedCount} en Mis leads
          </span>
        </div>
      </div>

      {/* Buscador */}
      <form onSubmit={handleSearch} className="bg-card ring-1 ring-border rounded-2xl p-4 md:p-5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">
              Zona
            </label>
            <div className="relative">
              <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={zona}
                onChange={(e) => setZona(e.target.value)}
                placeholder="Dos Hermanas, Sevilla · 41701 · Triana"
                className="w-full pl-9 pr-3 py-2.5 bg-muted rounded-xl ring-1 ring-border focus:ring-2 focus:ring-cyan-500 outline-none text-sm"
              />
            </div>
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
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={onlyNoWebsite} onChange={(e) => setOnlyNoWebsite(e.target.checked)} className="accent-cyan-500" />
            Solo sin web registrada
          </label>
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={onlyWithPhone} onChange={(e) => setOnlyWithPhone(e.target.checked)} className="accent-cyan-500" />
            Solo con teléfono
          </label>
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={hideUnnamed} onChange={(e) => setHideUnnamed(e.target.checked)} className="accent-cyan-500" />
            Ocultar fichas sin nombre
          </label>
          {filtered.length > 0 && (
            <button
              type="button"
              onClick={exportCsv}
              className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              <Download size={13} /> Exportar CSV
            </button>
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

      {loading && (
        <div className="mt-4 bg-card ring-1 ring-border rounded-2xl p-8 text-center text-sm text-muted-foreground">
          <Loader2 size={22} className="animate-spin mx-auto mb-3 text-cyan-400" />
          Consultando OpenStreetMap… el servidor público puede tardar hasta 40 segundos. Después queda en caché 6 horas.
        </div>
      )}

      {!loading && result && (
        <>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-muted-foreground">
              <span className="text-foreground font-semibold">{filtered.length}</span> negocios en{" "}
              <span className="text-foreground">{result.zone.displayName}</span>
              {result.cached && <span className="ml-2 px-2 py-0.5 rounded bg-muted text-[10px]">caché</span>}
            </div>
            <div className="text-[10px] text-muted-foreground max-w-xl text-right">{result.warnings[0]}</div>
          </div>

          {filtered.length === 0 && (
            <div className="mt-4 bg-card ring-1 ring-border rounded-2xl p-10 text-center">
              <Search size={26} className="mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-semibold">Sin resultados con esos filtros</p>
              <p className="text-xs text-muted-foreground mt-1">
                Prueba a quitar filtros, ampliar la zona o usar otra categoría.
              </p>
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
                          </div>
                          <span className={`text-xs font-bold px-2 py-1 rounded-lg ring-1 ${scoreClasses(b.score)}`}>
                            {b.score}
                          </span>
                        </div>
                        {b.address && <p className="text-xs text-muted-foreground mt-2">{b.address}</p>}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {b.phone && (
                            <a href={`tel:${b.phone}`} className="text-xs text-cyan-400 flex items-center gap-1">
                              <Phone size={12} /> {b.phone}
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
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <button onClick={() => setExpanded(expanded === b.id ? null : b.id)} className="text-[11px] text-muted-foreground flex items-center gap-1">
                            {expanded === b.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />} Desglose
                          </button>
                          <a href={b.mapsUrl} target="_blank" rel="noopener" className="text-[11px] text-muted-foreground flex items-center gap-1">
                            Ver mapa <ExternalLink size={11} />
                          </a>
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
            onClick={saveSelected}
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

function BusinessRows({
  business,
  selected,
  expanded,
  onToggle,
  onExpand,
}: {
  business: RadarBusiness;
  selected: boolean;
  expanded: boolean;
  onToggle: () => void;
  onExpand: () => void;
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
        </td>
        <td className="px-3 py-3">
          {business.phone ? (
            <a href={`tel:${business.phone}`} className="text-xs text-cyan-400 hover:underline flex items-center gap-1">
              <Phone size={12} /> {business.phone}
            </a>
          ) : (
            <span className="text-[11px] text-muted-foreground">Sin teléfono</span>
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
          <a href={business.mapsUrl} target="_blank" rel="noopener" className="inline-flex text-muted-foreground hover:text-foreground" title="Abrir en el mapa">
            <ExternalLink size={14} />
          </a>
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
