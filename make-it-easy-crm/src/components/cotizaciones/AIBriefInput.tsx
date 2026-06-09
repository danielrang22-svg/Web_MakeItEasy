"use client";

import React, { useState } from "react";
import { Sparkles, Loader2, AlertCircle, Lightbulb, RotateCcw, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";

export interface AiProposal {
  tituloPropuesta: string;
  empresaNombre: string;
  contactoNombre: string;
  desafioNegocio: string;
  prerrequisitos: { titulo: string; descripcion: string }[];
  arquitectura: { componente: string; funcion: string }[];
  fases: { nombre: string; objetivo: string; detalles: string; precio: number }[];
  checklistInicio: string[];
  moneda: string;
  feeMensual: number;
  moduloOpcionalFee: number;
  feeMensualIncluye: string;
}

interface AIBriefInputProps {
  leadData?: {
    empresa?: string;
    sector?: string;
    numEmpleados?: string;
    procesoAAutomatizar?: string;
    planInteres?: string;
    valorEstimado?: number;
  } | null;
  onProposalGenerated: (proposal: AiProposal) => void;
  onSkip: () => void;
}

const BRIEF_EXAMPLES = [
  "Cliente: Dulce Agonía — pastelería artesanal en Bogotá. Problema: reciben pedidos por WhatsApp manualmente y se pierden muchos. Quieren chatbot automático, catálogo online y pagos en línea. 5 empleados. Presupuesto aprox $4.000.000 COP.",
  "Cliente: Ferretería El Tornillo — Medellín. Necesitan automatizar cotizaciones por WhatsApp y sincronizar inventario con su tienda física. 12 empleados. Sin presupuesto definido.",
  "Cliente: Clínica Dental Sonrisas — Bogotá. Requieren agendamiento automático de citas por WhatsApp, recordatorios y CRM de pacientes. 3 consultorios, 6 empleados.",
];

export default function AIBriefInput({ leadData, onProposalGenerated, onSkip }: AIBriefInputProps) {
  const [step, setStep] = useState<"brief" | "loading" | "corrections" | "done">("brief");
  const [brief, setBrief] = useState("");
  const [correcciones, setCorrecciones] = useState("");
  const [currentProposal, setCurrentProposal] = useState<AiProposal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showExample, setShowExample] = useState(false);
  const [tokensUsed, setTokensUsed] = useState(0);
  const [iteraciones, setIteraciones] = useState(0);
  const [moneda, setMoneda] = useState("COP");

  function formatPrice(amount: number, currency = "COP") {
    const symbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : "$";
    const suffix = currency === "COP" ? " COP" : ` ${currency}`;
    return `${symbol}${amount.toLocaleString("es-CO")}${suffix}`;
  }

  async function callAI(isCorrectionMode = false) {
    setStep("loading");
    setError(null);

    try {
      const res = await fetch("/api/cotizaciones/generar-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief: brief,
          correcciones: isCorrectionMode ? correcciones : undefined,
          propuestaAnterior: isCorrectionMode ? currentProposal : undefined,
          leadData: leadData || undefined,
          moneda: isCorrectionMode ? currentProposal?.moneda : moneda,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Error al contactar con la IA");
      }

      setCurrentProposal(data.propuesta as AiProposal);
      setTokensUsed(data.tokensUsed ?? 0);
      setIteraciones(prev => prev + 1);
      setCorrecciones("");
      setStep("corrections");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setError(msg);
      setStep(isCorrectionMode ? "corrections" : "brief");
    }
  }

  function handleAccept() {
    if (currentProposal) {
      onProposalGenerated(currentProposal);
      setStep("done");
    }
  }

  function loadExample() {
    const idx = Math.floor(Math.random() * BRIEF_EXAMPLES.length);
    setBrief(BRIEF_EXAMPLES[idx]);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-violet-500/10 to-cyan-500/10 border border-violet-500/20 rounded-2xl">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shrink-0">
          <Sparkles size={20} className="text-white" />
        </div>
        <div>
          <h3 className="font-bold text-sm">Agente IA — Generador de Propuestas</h3>
          <p className="text-xs text-muted-foreground">Describe el cliente y su necesidad. La IA creará la estructura completa de la propuesta.</p>
        </div>
      </div>

      {/* Lead data chip (if linked lead) */}
      {leadData?.empresa && (
        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/30 rounded-xl text-xs">
          <CheckCircle2 size={14} className="text-green-600 shrink-0" />
          <span className="text-green-700 dark:text-green-400">
            <strong>Lead vinculado:</strong> {leadData.empresa}
            {leadData.sector && ` · ${leadData.sector}`}
            {leadData.procesoAAutomatizar && ` · ${leadData.procesoAAutomatizar}`}
          </span>
        </div>
      )}

      {/* STEP: BRIEF INPUT */}
      {(step === "brief") && (
        <div className="space-y-4">
          <div>
            <div className="mb-4">
              <label className="text-xs font-bold uppercase text-muted-foreground mb-1.5 block">Moneda de Cotización</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "COP", label: "Pesos (COP)" },
                  { value: "USD", label: "Dólares (USD)" },
                  { value: "EUR", label: "Euros (EUR)" },
                ].map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMoneda(m.value)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                      moneda === m.value
                        ? "bg-violet-600/10 border-violet-500 text-violet-500 shadow-sm shadow-violet-500/5"
                        : "bg-muted/40 border-border text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase text-muted-foreground">Brief del Cliente</label>
              <button
                type="button"
                onClick={() => setShowExample(v => !v)}
                className="text-xs text-violet-500 hover:text-violet-600 flex items-center gap-1"
              >
                <Lightbulb size={12} />
                {showExample ? "Ocultar" : "Ver ejemplo"}
                {showExample ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            </div>

            {showExample && (
              <div className="mb-3 p-3 bg-muted/60 rounded-xl text-xs text-muted-foreground space-y-1 border border-border">
                <p className="font-semibold text-foreground mb-1">¿Qué incluir en el brief?</p>
                <p>• <strong>Nombre y tipo de negocio</strong> (empresa, ciudad, sector)</p>
                <p>• <strong>El problema principal</strong> que quieren resolver</p>
                <p>• <strong>Tamaño del equipo</strong> (# empleados, sucursales)</p>
                <p>• <strong>Presupuesto aproximado</strong> (si lo mencionó)</p>
                <p>• <strong>Herramientas actuales</strong> o plataformas que usan</p>
                <button
                  type="button"
                  onClick={loadExample}
                  className="mt-2 text-violet-500 hover:text-violet-600 font-semibold"
                >
                  → Cargar ejemplo aleatorio
                </button>
              </div>
            )}

            <textarea
              value={brief}
              onChange={e => setBrief(e.target.value)}
              rows={6}
              className="w-full px-3 py-3 bg-muted rounded-xl ring-1 ring-border focus:ring-2 focus:ring-violet-500 outline-none text-sm resize-none text-foreground"
              placeholder="Ej: Cliente: Dulce Agonía — pastelería en Bogotá. Reciben pedidos por WhatsApp y se les pierden. Quieren automatizar respuestas, tener catálogo y pagos en línea. Presupuesto $4M COP, 5 empleados..."
            />
            <p className="text-[11px] text-muted-foreground mt-1 ml-1">
              {brief.length} caracteres · (Mínimo 5 caracteres para activar la generación con IA).
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-xl text-xs text-red-600">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => callAI(false)}
              disabled={brief.trim().length < 5}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-violet-600 to-cyan-600 text-white disabled:text-white/60 font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-all shadow-lg shadow-violet-500/20"
            >
              <Sparkles size={16} />
              Generar Propuesta con IA ({moneda})
            </button>
            <button
              type="button"
              onClick={onSkip}
              className="px-4 py-3.5 rounded-xl ring-1 ring-border text-sm font-medium text-muted-foreground hover:bg-muted transition-all"
            >
              Llenar manual
            </button>
          </div>
        </div>
      )}

      {/* STEP: LOADING */}
      {step === "loading" && (
        <div className="py-12 flex flex-col items-center gap-4 text-center">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
              <Sparkles size={28} className="text-white animate-pulse" />
            </div>
            <Loader2 size={20} className="absolute -top-2 -right-2 animate-spin text-violet-400" />
          </div>
          <div>
            <p className="font-bold text-sm">El agente está analizando el brief...</p>
            <p className="text-xs text-muted-foreground mt-1">
              {iteraciones === 0
                ? `Generando propuesta comercial en ${moneda === "COP" ? "Pesos Colombianos" : moneda === "USD" ? "Dólares (USD)" : "Euros (EUR)"}...`
                : "Aplicando tus correcciones a la propuesta..."}
            </p>
          </div>
          <div className="flex gap-1.5 mt-2">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-violet-400 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* STEP: CORRECTIONS / PREVIEW */}
      {step === "corrections" && currentProposal && (
        <div className="space-y-4">
          {/* Preview of generated proposal */}
          <div className="p-4 bg-muted/40 border border-border rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-green-500" />
                <span className="text-xs font-bold text-green-600">Propuesta generada — Iteración {iteraciones}</span>
              </div>
              <span className="text-[11px] text-muted-foreground">{tokensUsed} tokens</span>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <span className="font-bold text-muted-foreground uppercase text-[10px]">Título</span>
                <p className="font-semibold mt-0.5">{currentProposal.tituloPropuesta}</p>
              </div>
              <div>
                <span className="font-bold text-muted-foreground uppercase text-[10px]">Cliente</span>
                <p className="mt-0.5">{currentProposal.empresaNombre || "—"}</p>
              </div>
              <div>
                <span className="font-bold text-muted-foreground uppercase text-[10px]">Desafío</span>
                <p className="mt-0.5 text-muted-foreground whitespace-pre-wrap">{currentProposal.desafioNegocio}</p>
              </div>
              <div className="flex gap-4 pt-1">
                <div>
                  <span className="font-bold text-muted-foreground uppercase text-[10px]">Fases</span>
                  <p className="font-semibold mt-0.5">{currentProposal.fases?.length || 0} fases</p>
                </div>
                <div>
                  <span className="font-bold text-muted-foreground uppercase text-[10px]">Total Estimado</span>
                  <p className="font-bold mt-0.5 text-violet-600">
                    {formatPrice(currentProposal.fases?.reduce((s, f) => s + (f.precio || 0), 0) || 0, currentProposal.moneda)}
                  </p>
                </div>
                <div>
                  <span className="font-bold text-muted-foreground uppercase text-[10px]">Fee Mensual</span>
                  <p className="font-bold mt-0.5 text-cyan-600">
                    {formatPrice(currentProposal.feeMensual || 0, currentProposal.moneda)}/mes
                  </p>
                </div>
              </div>
              <div>
                <span className="font-bold text-muted-foreground uppercase text-[10px] block mb-1">Estructura Detallada (Fases y Componentes)</span>
                <div className="space-y-2.5 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                  {currentProposal.fases?.map((f, i) => (
                    <div key={i} className="p-2 bg-muted/60 border border-border rounded-lg">
                      <div className="flex justify-between font-bold text-[11px] text-foreground">
                        <span>{f.nombre}</span>
                        <span className="text-violet-500">{formatPrice(f.precio || 0, currentProposal.moneda)}</span>
                      </div>
                      {f.objetivo && <p className="text-[10px] text-muted-foreground mt-0.5"><strong>Obj:</strong> {f.objetivo}</p>}
                      {f.detalles && <p className="text-[10px] text-muted-foreground mt-0.5"><strong>Entregables:</strong> {f.detalles}</p>}
                    </div>
                  ))}
                  <div className="flex gap-2.5 flex-wrap pt-1">
                    {currentProposal.arquitectura?.map((a, i) => (
                      <div key={i} className="px-2 py-1 bg-violet-100 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 rounded-md text-[10px]">
                        <strong>{a.componente}:</strong> {a.funcion}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Corrections textarea */}
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground mb-1.5 flex items-center gap-1.5 ml-1">
              <RotateCcw size={12} />
              ¿Algo que corregir? (opcional)
            </label>
            <textarea
              value={correcciones}
              onChange={e => setCorrecciones(e.target.value)}
              rows={3}
              className="w-full px-3 py-3 bg-muted rounded-xl ring-1 ring-border focus:ring-2 focus:ring-violet-500 outline-none text-sm resize-none text-foreground"
              placeholder="Ej: Elimina la fase 2 y agrega una de redes sociales. Cambia el precio de la fase 1 a $3.000.000. El cliente se llama Juan García..."
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-xl text-xs text-red-600">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleAccept}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-green-500/20"
            >
              <CheckCircle2 size={16} />
              Aceptar y Editar Propuesta
            </button>
            {correcciones.trim().length > 10 && (
              <button
                type="button"
                onClick={() => callAI(true)}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-bold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-violet-500/20"
              >
                <RotateCcw size={16} />
                Aplicar Correcciones
              </button>
            )}
          </div>

          <p className="text-[11px] text-center text-muted-foreground">
            Al aceptar, el formulario se pre-llenará con los datos generados. Podrás ajustar precios y detalles manualmente.
          </p>
        </div>
      )}
    </div>
  );
}
