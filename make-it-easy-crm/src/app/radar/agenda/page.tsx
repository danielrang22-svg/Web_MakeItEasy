"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Check,
  Loader2,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Printer,
  Search,
} from "lucide-react";
import RadarNav from "@/components/radar/RadarNav";
import { getSettings, radarRepository } from "@/lib/radar/repository";
import { buildIntroMessage, mapsRouteUrl, printVisitSheet, whatsappUrl } from "@/lib/radar/outreach";
import { scoreClasses } from "@/lib/radar/score";
import type { RadarLead, RadarLeadStatus } from "@/lib/radar/types";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function RadarAgendaPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<RadarLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [seller, setSeller] = useState("");

  useEffect(() => {
    setSeller(getSettings().sellerName);
    let alive = true;
    radarRepository
      .load()
      .then((list) => {
        if (alive) setLeads(list);
      })
      .catch(() => undefined)
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const groups = useMemo(() => {
    const today = startOfToday().getTime();
    const endToday = today + 24 * 60 * 60 * 1000;

    const due = leads.filter((l) => {
      if (l.status === "CLIENTE" || l.status === "DESCARTADO") return false;
      if (!l.nextActionAt) return false;
      const t = new Date(l.nextActionAt).getTime();
      return t < endToday;
    });

    const pending = leads.filter(
      (l) =>
        l.status !== "CLIENTE" &&
        l.status !== "DESCARTADO" &&
        !l.nextActionAt
    );

    const visits = leads.filter(
      (l) =>
        (l.status === "ANALIZADO" || l.status === "CONTACTADO" || l.status === "RESPONDIO") &&
        !!l.business.address
    );

    return [
      { key: "due", title: "Para hoy o vencidas", hint: "Tienen una próxima acción marcada.", items: due },
      { key: "visits", title: "Para visitar", hint: "Negocios analizados o contactados con dirección.", items: visits },
      { key: "pending", title: "Sin próxima acción", hint: "Llevan tiempo esperando: ponles fecha.", items: pending },
    ];
  }, [leads]);

  async function updateLead(id: string, patch: Partial<Pick<RadarLead, "status" | "notes" | "nextActionAt">>) {
    setSaving(id);
    try {
      const next = await radarRepository.update(id, patch);
      setLeads(next);
    } finally {
      setSaving(null);
    }
  }

  function openFicha(lead: RadarLead, audit = false) {
    const suffix = audit ? "&audit=1" : "";
    router.push(`/radar/negocio?id=${encodeURIComponent(lead.businessId)}${suffix}`);
  }

  function openRoute(items: RadarLead[]) {
    const url = mapsRouteUrl(items.map((l) => l.business.address));
    if (url) window.open(url, "_blank", "noopener");
  }

  const visitItems = groups.find((g) => g.key === "visits")?.items ?? [];

  return (
    <div className="px-4 md:px-6 pb-32">
      <div className="mt-4"><RadarNav /></div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <CalendarDays size={20} className="text-cyan-400" /> Plan de trabajo
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            A quién llamar hoy, qué visitar y qué webs revisar. Ordenado por prioridad.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => visitItems.length && openRoute(visitItems)}
            disabled={visitItems.length === 0}
            className="px-3 py-2 rounded-lg bg-cyan-500 text-slate-950 text-xs font-bold hover:bg-cyan-400 disabled:opacity-40 flex items-center gap-1.5"
          >
            <Navigation size={13} /> Ruta de visitas ({visitItems.length})
          </button>
          <button
            onClick={() => visitItems.length && printVisitSheet(visitItems, seller)}
            disabled={visitItems.length === 0}
            className="px-3 py-2 rounded-lg bg-muted text-xs font-bold hover:bg-muted/70 disabled:opacity-40 flex items-center gap-1.5"
          >
            <Printer size={13} /> Hoja de visitas
          </button>
        </div>
      </div>

      {loading && (
        <div className="mt-6 text-center text-sm text-muted-foreground">
          <Loader2 size={18} className="animate-spin mx-auto mb-2" /> Cargando tus leads…
        </div>
      )}

      {!loading && leads.length === 0 && (
        <div className="mt-6 bg-card ring-1 ring-border rounded-2xl p-10 text-center">
          <Search size={24} className="mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm font-semibold">Todavía no hay leads</p>
          <p className="text-xs text-muted-foreground mt-1">
            Busca negocios y guárdalos para que aparezcan aquí con su plan de contacto.
          </p>
          <Link href="/radar" className="inline-flex mt-4 px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-bold">
            Ir a buscar
          </Link>
        </div>
      )}

      {!loading &&
        groups.map((group) => (
          <section key={group.key} className="mt-5">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-bold">{group.title}</h2>
              <span className="text-[10px] text-muted-foreground">{group.items.length}</span>
            </div>
            <p className="text-[11px] text-muted-foreground mb-2">{group.hint}</p>

            {group.items.length === 0 ? (
              <div className="bg-card ring-1 ring-border rounded-xl px-4 py-3 text-xs text-muted-foreground">
                Nada pendiente aquí.
              </div>
            ) : (
              <div className="space-y-2">
                {group.items.map((lead) => {
                  const wa = whatsappUrl(lead.business.phone, buildIntroMessage(lead.business, seller));
                  return (
                    <div key={lead.businessId} className="bg-card ring-1 ring-border rounded-xl p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold">{lead.business.name}</p>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ring-1 ${scoreClasses(lead.business.score)}`}>
                              {lead.business.score}
                            </span>
                            <span className="text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                              {lead.status}
                            </span>
                            {lead.nextActionAt && (
                              <span className="text-[10px] text-amber-300">
                                {new Date(lead.nextActionAt).toLocaleDateString("es-CO")}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-1">
                            {lead.business.category} · {lead.business.address || "sin dirección"}
                          </p>
                          {lead.notes && (
                            <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{lead.notes}</p>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {lead.business.phone && (
                            <a
                              href={`tel:${lead.business.phone}`}
                              className="px-2 py-1 rounded-lg bg-muted text-[11px] font-semibold hover:bg-muted/70 flex items-center gap-1"
                            >
                              <Phone size={11} /> Llamar
                            </a>
                          )}
                          {wa && (
                            <a
                              href={wa}
                              target="_blank"
                              rel="noopener"
                              className="px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30 text-[11px] font-semibold flex items-center gap-1"
                            >
                              <MessageCircle size={11} /> WhatsApp
                            </a>
                          )}
                          {lead.business.website && (
                            <button
                              onClick={() => openFicha(lead, true)}
                              className="px-2 py-1 rounded-lg bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/30 text-[11px] font-semibold flex items-center gap-1"
                            >
                              Revisar web
                            </button>
                          )}
                          <button
                            onClick={() => openFicha(lead)}
                            className="px-2 py-1 rounded-lg bg-muted text-[11px] font-semibold hover:bg-muted/70"
                          >
                            Ficha
                          </button>
                          {lead.business.address && (
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.business.address)}`}
                              target="_blank"
                              rel="noopener"
                              className="p-1 text-muted-foreground hover:text-foreground"
                              title="Abrir en el mapa"
                            >
                              <MapPin size={13} />
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-3 pt-2 border-t border-border">
                        <button
                          onClick={() => updateLead(lead.businessId, { status: "CONTACTADO" })}
                          disabled={saving === lead.businessId}
                          className="px-2 py-1 rounded-lg bg-muted text-[10px] font-semibold hover:bg-muted/70 disabled:opacity-40 flex items-center gap-1"
                        >
                          <Check size={11} /> Contactado
                        </button>
                        <button
                          onClick={() => updateLead(lead.businessId, { status: "REUNION" })}
                          disabled={saving === lead.businessId}
                          className="px-2 py-1 rounded-lg bg-muted text-[10px] font-semibold hover:bg-muted/70 disabled:opacity-40"
                        >
                          Visita hecha
                        </button>
                        <label className="text-[10px] text-muted-foreground ml-auto flex items-center gap-1">
                          Próxima acción
                          <input
                            type="date"
                            onChange={(e) =>
                              updateLead(lead.businessId, {
                                nextActionAt: e.target.value ? new Date(e.target.value).toISOString() : null,
                              })
                            }
                            className="px-1.5 py-1 bg-muted rounded text-[10px] ring-1 ring-border outline-none"
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        ))}
    </div>
  );
}
