"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, ExternalLink, Loader2, Search, Trash2, Upload } from "lucide-react";
import RadarNav from "@/components/radar/RadarNav";
import { LEAD_STATUSES, radarRepository, saveBusinessSnapshot } from "@/lib/radar/repository";
import { scoreClasses } from "@/lib/radar/score";
import type { RadarLead, RadarLeadStatus } from "@/lib/radar/types";
export default function RadarLeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<RadarLead[]>([]);
  const [status, setStatus] = useState<string>("TODOS");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"table" | "board">("table");
  const [importing, setImporting] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    radarRepository
      .load()
      .then((list) => {
        if (alive) setLeads(list);
      })
      .catch((err) => {
        if (alive) setToast(err instanceof Error ? err.message : "No se pudieron cargar los leads");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (status !== "TODOS" && l.status !== status) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        return (
          l.business.name.toLowerCase().includes(q) ||
          l.business.category.toLowerCase().includes(q) ||
          l.business.address.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [leads, status, query]);

  async function setLeadStatus(id: string, next: RadarLeadStatus) {
    try {
      setLeads(await radarRepository.update(id, { status: next }));
    } catch (err) {
      setToast(err instanceof Error ? err.message : "No se pudo actualizar el estado");
    }
  }

  async function remove(id: string) {
    if (!window.confirm("¿Eliminar este lead de Mis leads?")) return;
    try {
      setLeads(await radarRepository.remove(id));
    } catch (err) {
      setToast(err instanceof Error ? err.message : "No se pudo eliminar el lead");
    }
  }

  function openFicha(lead: RadarLead) {
    saveBusinessSnapshot(lead.business);
    router.push(`/radar/negocio?id=${encodeURIComponent(lead.businessId)}`);
  }

  async function importLead(lead: RadarLead) {
    setImporting(lead.businessId);
    try {
      const res = await fetch("/api/radar/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business: lead.business }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error importando");
      setToast(data.duplicated ? "Ese negocio ya estaba en el CRM" : "Lead creado en el CRM");
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Error importando");
    } finally {
      setImporting(null);
    }
  }

  function exportCsv() {
    const rows = [
      ["Nombre", "Categoria", "Direccion", "Telefono", "Web", "Score", "Estado", "Notas", "Proxima accion"],
      ...filtered.map((l) => [
        l.business.name,
        l.business.category,
        l.business.address,
        l.business.phone,
        l.business.website,
        String(l.business.score),
        l.status,
        l.notes,
        l.nextActionAt ?? "",
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `radar-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="px-4 md:px-6 pb-32">
      <div className="mt-4"><RadarNav /></div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold">Mis leads</h1>
        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{leads.length}</span>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setView(view === "table" ? "board" : "table")} className="px-3 py-1.5 rounded-lg bg-muted text-xs font-semibold hover:bg-muted/70">
            {view === "table" ? "Ver tablero" : "Ver tabla"}
          </button>
          <button onClick={exportCsv} className="px-3 py-1.5 rounded-lg bg-muted text-xs font-semibold hover:bg-muted/70 flex items-center gap-1">
            <Download size={13} /> CSV
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, nicho o zona…"
            className="w-full pl-9 pr-3 py-2 bg-muted rounded-xl text-xs ring-1 ring-border outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-3 py-2 bg-muted rounded-xl text-xs ring-1 ring-border outline-none">
          <option value="TODOS">Todos los estados</option>
          {LEAD_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {loading && (
        <div className="mt-6 bg-card ring-1 ring-border rounded-2xl p-10 text-center text-sm text-muted-foreground">
          <Loader2 size={18} className="animate-spin mx-auto mb-2" />
          Cargando leads…
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="mt-6 bg-card ring-1 ring-border rounded-2xl p-10 text-center text-sm text-muted-foreground">
          No hay leads guardados todavía. Guarda negocios desde la búsqueda o pulsa «Ficha».
        </div>
      )}

      {filtered.length > 0 && view === "table" && (
        <div className="mt-4 bg-card ring-1 ring-border rounded-2xl overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5">Negocio</th>
                <th className="px-3 py-2.5">Contacto</th>
                <th className="px-3 py-2.5">Score</th>
                <th className="px-3 py-2.5">Estado</th>
                <th className="px-3 py-2.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((l) => (
                <tr key={l.businessId} className="hover:bg-muted/20">
                  <td className="px-3 py-3">
                    <p className="text-sm font-semibold">{l.business.name}</p>
                    <p className="text-[11px] text-muted-foreground">{l.business.category} · {l.business.address || "sin dirección"}</p>
                  </td>
                  <td className="px-3 py-3 text-[11px] text-muted-foreground">
                    {l.business.phone ? <a href={`tel:${l.business.phone}`} className="text-cyan-400">{l.business.phone}</a> : "—"}
                    {l.business.website && (
                      <a href={l.business.website} target="_blank" rel="noopener" className="block text-cyan-400 truncate max-w-[180px]">
                        {l.business.website.replace(/^https?:\/\//, "")}
                      </a>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`text-xs font-bold px-2 py-1 rounded-lg ring-1 ${scoreClasses(l.business.score)}`}>{l.business.score}</span>
                  </td>
                  <td className="px-3 py-3">
                    <select value={l.status} onChange={(e) => void setLeadStatus(l.businessId, e.target.value as RadarLeadStatus)} className="px-2 py-1 bg-muted rounded-lg text-[11px] ring-1 ring-border outline-none">
                      {LEAD_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openFicha(l)} className="text-[11px] text-cyan-400 font-semibold">Ficha</button>
                      <button onClick={() => importLead(l)} disabled={importing === l.businessId} className="text-[11px] text-muted-foreground hover:text-foreground" title="Enviar al CRM">
                        {importing === l.businessId ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                      </button>
                      <button onClick={() => void remove(l.businessId)} className="text-red-400" title="Eliminar">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length > 0 && view === "board" && (
        <div className="mt-4 flex gap-3 overflow-x-auto pb-3">
          {LEAD_STATUSES.map((s) => {
            const items = filtered.filter((l) => l.status === s.value);
            return (
              <div key={s.value} className="w-64 shrink-0 bg-card ring-1 ring-border rounded-2xl">
                <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{s.label}</p>
                  <span className="text-[10px] text-muted-foreground">{items.length}</span>
                </div>
                <div className="p-2 space-y-2 min-h-[80px]">
                  {items.map((l) => (
                    <div key={l.businessId} className="bg-muted/40 rounded-xl p-2.5">
                      <p className="text-xs font-semibold leading-tight">{l.business.name}</p>
                      <p className="text-[10px] text-muted-foreground">{l.business.category}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ring-1 ${scoreClasses(l.business.score)}`}>{l.business.score}</span>
                        <div className="flex gap-2">
                          <button onClick={() => openFicha(l)} className="text-[10px] text-cyan-400">Ficha</button>
                          <a href={l.business.mapsUrl} target="_blank" rel="noopener" className="text-muted-foreground"><ExternalLink size={11} /></a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-24 md:bottom-8 right-4 md:right-8 z-50 px-4 py-3 rounded-xl text-sm shadow-xl bg-muted ring-1 ring-border">
          {toast}
        </div>
      )}
    </div>
  );
}
