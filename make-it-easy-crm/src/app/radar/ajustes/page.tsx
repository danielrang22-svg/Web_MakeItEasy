"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Check, Save, Trash2 } from "lucide-react";
import RadarNav from "@/components/radar/RadarNav";
import { getSettings, radarRepository, saveSettings, type RadarSettings } from "@/lib/radar/repository";

interface AgentOption {
  id: string;
  nombre: string;
  activo: boolean;
  conexion: { proveedor: string; modelo: string } | null;
}

export default function RadarSettingsPage() {
  const [settings, setSettings] = useState<RadarSettings>({
    sellerName: "",
    whatISell: "páginas web, agentes de IA por WhatsApp y sistemas de citas",
    proposal: "soluciones sencillas que ahorran tiempo y captan más clientes",
    tone: "cercano",
    agentId: "",
  });
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [pagespeedConfigured, setPagespeedConfigured] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setSettings(getSettings());
    fetch("/api/radar/config")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setAgents(data.agents ?? []);
        setPagespeedConfigured(!!data.pagespeedConfigured);
      })
      .catch(() => undefined);
  }, []);

  function save() {
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function clearLocal() {
    if (!window.confirm("¿Borrar los análisis, fichas y ajustes guardados en este navegador?")) return;
    window.localStorage.removeItem("radar.leads.v1");
    window.localStorage.removeItem("radar.analyses.v1");
    window.localStorage.removeItem("radar.businesses.v1");
    window.localStorage.removeItem("radar.settings.v1");
    setSettings(getSettings());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function clearLeads() {
    if (!window.confirm("¿Borrar todos tus leads guardados en el servidor? No se puede deshacer.")) return;
    try {
      await radarRepository.clear();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron borrar los leads");
    }
  }

  return (
    <div className="px-4 md:px-6 pb-32">
      <div className="mt-4"><RadarNav /></div>

      <div className="mt-4">
        <h1 className="text-xl font-bold">Ajustes de Radar</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tu perfil de vendedor y la IA que redacta los mensajes.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card ring-1 ring-border rounded-2xl p-5 space-y-3">
          <h2 className="text-sm font-bold">Mi perfil de vendedor</h2>

          <div>
            <label className="text-[10px] uppercase font-bold text-muted-foreground">Nombre</label>
            <input
              value={settings.sellerName}
              onChange={(e) => setSettings((s) => ({ ...s, sellerName: e.target.value }))}
              placeholder="Daniel · Make it Easy"
              className="w-full mt-1 px-3 py-2 bg-muted rounded-xl text-sm ring-1 ring-border outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-muted-foreground">Qué vendo</label>
            <input
              value={settings.whatISell}
              onChange={(e) => setSettings((s) => ({ ...s, whatISell: e.target.value }))}
              className="w-full mt-1 px-3 py-2 bg-muted rounded-xl text-sm ring-1 ring-border outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-muted-foreground">Mi propuesta</label>
            <textarea
              value={settings.proposal}
              onChange={(e) => setSettings((s) => ({ ...s, proposal: e.target.value }))}
              rows={3}
              className="w-full mt-1 px-3 py-2 bg-muted rounded-xl text-sm ring-1 ring-border outline-none resize-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-muted-foreground">Tono por defecto</label>
            <select
              value={settings.tone}
              onChange={(e) => setSettings((s) => ({ ...s, tone: e.target.value as RadarSettings["tone"] }))}
              className="w-full mt-1 px-3 py-2 bg-muted rounded-xl text-sm ring-1 ring-border outline-none"
            >
              <option value="cercano">Cercano</option>
              <option value="directo">Directo</option>
              <option value="formal">Formal</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-muted-foreground">Agente de IA para Radar</label>
            <select
              value={settings.agentId}
              onChange={(e) => setSettings((s) => ({ ...s, agentId: e.target.value }))}
              className="w-full mt-1 px-3 py-2 bg-muted rounded-xl text-sm ring-1 ring-border outline-none"
            >
              <option value="">Usar el agente activo de propósito «Radar»</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre} · {a.conexion ? `${a.conexion.proveedor}/${a.conexion.modelo}` : "sin conexión"}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-muted-foreground mt-1">
              Si no aparece ninguno, crea un agente con propósito «Radar de clientes» en Ajustes → Agentes de IA.
            </p>
          </div>

          <button onClick={save} className="w-full py-2.5 rounded-xl bg-cyan-500 text-slate-950 text-sm font-bold hover:bg-cyan-400 flex items-center justify-center gap-2">
            {saved ? <Check size={15} /> : <Save size={15} />}
            {saved ? "Guardado" : "Guardar ajustes"}
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-card ring-1 ring-border rounded-2xl p-5">
            <h2 className="text-sm font-bold">Estado de las fuentes</h2>
            <ul className="mt-3 space-y-2 text-xs">
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5" />
                <div>
                  <p className="font-semibold">Búsqueda de negocios: OpenStreetMap</p>
                  <p className="text-muted-foreground">Gratis, sin clave ni tarjeta. Datos de contacto variables.</p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className={`w-2 h-2 rounded-full mt-1.5 ${pagespeedConfigured ? "bg-emerald-400" : "bg-amber-400"}`} />
                <div>
                  <p className="font-semibold">PageSpeed: {pagespeedConfigured ? "configurado" : "sin clave"}</p>
                  <p className="text-muted-foreground">
                    Es gratis, pero necesita una API key sin facturación. Añádela al .env del servidor como
                    <code className="mx-1 px-1 bg-muted rounded">PAGESPEED_API_KEY</code>.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 mt-1.5" />
                <div>
                  <p className="font-semibold">IA para análisis y mensajes</p>
                  <p className="text-muted-foreground">
                    Usa la conexión del agente elegido. Si el proveedor no tiene saldo, verás su error real.
                    Alternativas gratis: Gemini de AI Studio u OpenRouter con modelos gratuitos.
                  </p>
                </div>
              </li>
            </ul>
          </div>

          <div className="bg-card ring-1 ring-border rounded-2xl p-5">
            <h2 className="text-sm font-bold flex items-center gap-2"><AlertCircle size={14} className="text-amber-400" /> Datos de Radar</h2>
            <p className="text-xs text-muted-foreground mt-2">
              Tus leads se guardan en el servidor y solo los ve tu usuario. Los análisis, fichas y ajustes de vendedor
              se guardan en este navegador.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={clearLocal} className="px-3 py-2 rounded-lg bg-red-500/10 text-red-300 ring-1 ring-red-500/30 text-xs font-bold hover:bg-red-500/20 flex items-center gap-1.5">
                <Trash2 size={13} /> Borrar datos locales
              </button>
              <button onClick={() => void clearLeads()} className="px-3 py-2 rounded-lg bg-red-500/10 text-red-300 ring-1 ring-red-500/30 text-xs font-bold hover:bg-red-500/20 flex items-center gap-1.5">
                <Trash2 size={13} /> Borrar mis leads del servidor
              </button>
            </div>
            {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
