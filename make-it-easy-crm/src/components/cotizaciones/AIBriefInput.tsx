"use client";

import React, { useState } from "react";
import { Sparkles, Loader2, AlertCircle, Lightbulb, RotateCcw, CheckCircle2, ChevronDown, ChevronUp, Upload, X, FileText, FileAudio, ArrowRight, FileDown } from "lucide-react";
import { exportCotizacionClientePDF } from "@/lib/utils/exportPDF";

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
  estado?: string;
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
  type Step = "input_context" | "loading_brief" | "review_brief" | "loading_quotation" | "review_quotation" | "done";
  const [step, setStep] = useState<Step>("input_context");
  
  // Fase 1: Contexto
  const [notasContexto, setNotasContexto] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [moneda, setMoneda] = useState("COP");
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  // Fase 2: Brief
  const [brief, setBrief] = useState("");
  const [correccionesBrief, setCorreccionesBrief] = useState("");
  
  // Fase 3: Cotización
  const [currentProposal, setCurrentProposal] = useState<AiProposal | null>(null);
  const [correccionesCotizacion, setCorreccionesCotizacion] = useState("");
  
  const [error, setError] = useState<string | null>(null);
  const [showExample, setShowExample] = useState(false);
  const [tokensUsed, setTokensUsed] = useState(0);
  const [iteraciones, setIteraciones] = useState(0);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeFile(index: number) {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  }

  // ---- GENERACIÓN Y REGENERACIÓN DE BRIEF ----
  async function handleGenerateBrief() {
    if (selectedFiles.length === 0 && notasContexto.trim().length === 0) {
      setError("Debes subir archivos o escribir notas para generar un brief.");
      return;
    }

    setStep("loading_brief");
    setError(null);

    try {
      const formData = new FormData();
      selectedFiles.forEach(file => formData.append("files", file));
      if (notasContexto) formData.append("notasContexto", notasContexto);

      const res = await fetch("/api/cotizaciones/procesar-archivo", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Error al procesar archivos");

      setBrief(data.text);
      setStep("review_brief");
    } catch (err: any) {
      setError(err.message || "Error al generar el brief.");
      setStep("input_context");
    }
  }

  async function handleRegenerateBrief() {
    if (!correccionesBrief.trim()) return;

    setStep("loading_brief");
    setError(null);

    try {
      const formData = new FormData();
      formData.append("briefAnterior", brief);
      formData.append("correcciones", correccionesBrief);

      const res = await fetch("/api/cotizaciones/procesar-archivo", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Error al corregir el brief");

      setBrief(data.text);
      setCorreccionesBrief("");
      setStep("review_brief");
    } catch (err: any) {
      setError(err.message || "Error al aplicar correcciones al brief.");
      setStep("review_brief");
    }
  }

  // ---- GENERACIÓN Y REGENERACIÓN DE COTIZACIÓN ----
  async function handleGenerateQuotation(isCorrectionMode = false) {
    setStep("loading_quotation");
    setError(null);

    try {
      const res = await fetch("/api/cotizaciones/generar-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief: brief,
          correcciones: isCorrectionMode ? correccionesCotizacion : undefined,
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
      if (isCorrectionMode) setIteraciones(prev => prev + 1);
      setCorreccionesCotizacion("");
      setStep("review_quotation");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setError(msg);
      setStep(isCorrectionMode ? "review_quotation" : "review_brief");
    }
  }

  function handleAcceptQuotation() {
    if (currentProposal) {
      onProposalGenerated(currentProposal);
      setStep("done");
    }
  }

  function loadExample() {
    const idx = Math.floor(Math.random() * BRIEF_EXAMPLES.length);
    setNotasContexto(BRIEF_EXAMPLES[idx]);
  }

  function formatPrice(amount: number, currency = "COP") {
    const symbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : "$";
    const suffix = currency === "COP" ? " COP" : ` ${currency}`;
    return `${symbol}${amount.toLocaleString("es-CO")}${suffix}`;
  }

  function handleExportPDF() {
    if (!currentProposal) return;
    // Creamos un objeto dummy que cumpla con Cotizacion para el exportador
    const dummyCotizacion = {
      codigo: "PREVIEW-IA",
      version: 1,
      fecha: new Date().toISOString(),
      empresaNombre: currentProposal.empresaNombre || "Empresa Cliente",
      contactoNombre: currentProposal.contactoNombre || "Cliente",
      vendedor: "Make it easy",
      validez: "30 días a partir de la fecha de presentación",
      estado: "BORRADOR",
      moneda: currentProposal.moneda || "USD",
      desafioNegocio: currentProposal.desafioNegocio || "",
      prerrequisitos: JSON.stringify(currentProposal.prerrequisitos || []),
      arquitecturaJson: JSON.stringify(currentProposal.arquitectura || []),
      fasesJson: JSON.stringify(currentProposal.fases || []),
      checklistInicio: JSON.stringify(currentProposal.checklistInicio || []),
      totalProyectoCore: currentProposal.fases?.reduce((acc, f) => acc + (f.precio || 0), 0) || 0,
      feeMensual: currentProposal.feeMensual || 0,
      feeMensualIncluye: currentProposal.feeMensualIncluye || "",
      moduloOpcionalFee: currentProposal.moduloOpcionalFee || 0,
      observaciones: "",
      createdAt: new Date(),
      updatedAt: new Date()
    } as any;
    
    exportCotizacionClientePDF(dummyCotizacion);
  }

  return (
    <div className="space-y-5">
      {/* Header General */}
      <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-violet-500/10 to-cyan-500/10 border border-violet-500/20 rounded-2xl">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shrink-0">
          <Sparkles size={20} className="text-white" />
        </div>
        <div>
          <h3 className="font-bold text-sm">Asistente IA de Cotizaciones (Paso a Paso)</h3>
          <p className="text-xs text-muted-foreground">Sigue los pasos para estructurar el brief y generar la propuesta comercial perfecta.</p>
        </div>
      </div>

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

      {/* FASE 1: CONTEXTO */}
      {step === "input_context" && (
        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div>
            <div className="mb-4">
              <label className="text-xs font-bold uppercase text-muted-foreground mb-1.5 block">1. Moneda de Cotización</label>
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

            <label className="text-xs font-bold uppercase text-muted-foreground mb-1.5 block mt-4">2. Recopilar Contexto del Cliente</label>
            <p className="text-xs text-muted-foreground mb-3">Sube notas de voz de WhatsApp, PDFs de requerimientos o simplemente escribe lo que recuerdas del cliente.</p>
            
            <div className="p-4 bg-muted/30 border border-border rounded-xl space-y-3 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-foreground">Archivos Adjuntos</span>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileSelect} 
                  className="hidden" 
                  multiple
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors text-xs font-semibold border border-border"
                >
                  <Upload size={14} />
                  Adjuntar Archivos
                </button>
              </div>

              {selectedFiles.length > 0 && (
                <div className="flex flex-col gap-2 mt-2">
                  {selectedFiles.map((f, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-background border border-border rounded-lg text-xs">
                      <div className="flex items-center gap-2 overflow-hidden">
                        {f.type.startsWith("audio") ? <FileAudio size={14} className="text-violet-500 shrink-0" /> : <FileText size={14} className="text-cyan-500 shrink-0" />}
                        <span className="truncate max-w-[200px] text-muted-foreground">{f.name}</span>
                      </div>
                      <button onClick={() => removeFile(i)} className="text-red-400 hover:text-red-500 p-1">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <textarea
                value={notasContexto}
                onChange={e => setNotasContexto(e.target.value)}
                rows={4}
                className="w-full px-3 py-3 bg-muted rounded-xl ring-1 ring-border focus:ring-2 focus:ring-violet-500 outline-none text-sm resize-none text-foreground"
                placeholder="Escribe aquí notas adicionales... Ej: 'El cliente me dijo por llamada que solo tiene 2 millones y usa Excel'"
              />
              <button
                type="button"
                onClick={loadExample}
                className="absolute bottom-3 right-3 text-xs text-violet-500 hover:text-violet-600 font-semibold"
              >
                Cargar ejemplo aleatorio
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-xl text-xs text-red-600">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleGenerateBrief}
            disabled={selectedFiles.length === 0 && notasContexto.trim().length === 0}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-violet-500/10 hover:bg-violet-500/20 text-violet-600 border border-violet-500/20 font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles size={16} />
            Generar Brief con IA a partir de este contexto
          </button>
          
          <div className="text-center">
            <button
              type="button"
              onClick={onSkip}
              className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
            >
              Omitir IA y llenar la cotización manualmente
            </button>
          </div>
        </div>
      )}

      {/* FASE 2: LOADING BRIEF */}
      {step === "loading_brief" && (
        <div className="py-12 flex flex-col items-center gap-4 text-center animate-in fade-in zoom-in-95">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
              <FileText size={28} className="text-white animate-pulse" />
            </div>
            <Loader2 size={20} className="absolute -top-2 -right-2 animate-spin text-violet-400" />
          </div>
          <div>
            <p className="font-bold text-sm">Transcribiendo y analizando el contexto...</p>
            <p className="text-xs text-muted-foreground mt-1">La IA está estructurando el Brief de Negocio.</p>
          </div>
        </div>
      )}

      {/* FASE 3: REVIEW BRIEF */}
      {step === "review_brief" && (
        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <label className="text-xs font-bold uppercase text-violet-500 flex items-center gap-2">
            <CheckCircle2 size={16} /> Brief Estructurado
          </label>
          <textarea
            value={brief}
            onChange={e => setBrief(e.target.value)}
            rows={8}
            className="w-full px-4 py-3 bg-white dark:bg-black rounded-xl ring-2 ring-violet-500/20 focus:ring-violet-500 outline-none text-sm resize-y text-foreground leading-relaxed shadow-inner"
          />

          <div className="p-3 bg-muted rounded-xl space-y-2 border border-border">
            <label className="text-xs font-bold uppercase text-muted-foreground ml-1">¿Necesitas que la IA ajuste el Brief?</label>
            <div className="flex flex-col gap-2">
              <textarea
                value={correccionesBrief}
                onChange={e => setCorreccionesBrief(e.target.value)}
                placeholder="Ej: Hazlo más enfocado en ventas, no olvides el CRM..."
                rows={3}
                className="w-full px-3 py-2 text-sm bg-background rounded-lg border border-border focus:ring-2 focus:ring-violet-500 outline-none resize-y"
              />
              <button
                type="button"
                onClick={handleRegenerateBrief}
                disabled={!correccionesBrief.trim()}
                className="w-full px-3 py-2.5 bg-violet-100 hover:bg-violet-200 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
              >
                Regenerar Brief
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-xl text-xs text-red-600">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => handleGenerateQuotation(false)}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-bold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-violet-500/20"
            >
              Aprobar y Generar Cotización IA <ArrowRight size={16} />
            </button>
            <button
              type="button"
              onClick={onSkip} // Esto va a saltar y guardar el brief manual
              className="px-4 py-3.5 rounded-xl ring-1 ring-border text-sm font-medium text-muted-foreground hover:bg-muted transition-all"
            >
              Llenar Cotización Manual
            </button>
          </div>
        </div>
      )}

      {/* FASE 4: LOADING QUOTATION */}
      {step === "loading_quotation" && (
        <div className="py-12 flex flex-col items-center gap-4 text-center animate-in fade-in zoom-in-95">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
              <Sparkles size={28} className="text-white animate-pulse" />
            </div>
            <Loader2 size={20} className="absolute -top-2 -right-2 animate-spin text-violet-400" />
          </div>
          <div>
            <p className="font-bold text-sm">El agente está construyendo la arquitectura...</p>
            <p className="text-xs text-muted-foreground mt-1">
              {iteraciones === 0
                ? `Calculando precios y fases en ${moneda === "COP" ? "Pesos Colombianos" : moneda === "USD" ? "Dólares (USD)" : "Euros (EUR)"}...`
                : "Aplicando tus correcciones a la cotización final..."}
            </p>
          </div>
        </div>
      )}

      {/* FASE 5: REVIEW QUOTATION */}
      {step === "review_quotation" && currentProposal && (
        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="p-4 bg-muted/40 border border-border rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-green-500" />
                <span className="text-xs font-bold text-green-600">Propuesta Lista — Iteración {iteraciones}</span>
              </div>
              <span className="text-[11px] text-muted-foreground">{tokensUsed} tokens</span>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <span className="font-bold text-muted-foreground uppercase text-[10px]">Título</span>
                <p className="font-semibold mt-0.5">{currentProposal.tituloPropuesta}</p>
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
              <div className="space-y-4">
                {/* Desafío */}
                <div>
                  <span className="font-bold text-muted-foreground uppercase text-[10px] block mb-1">El Desafío de Negocio</span>
                  <p className="text-[11px] text-foreground leading-relaxed">{currentProposal.desafioNegocio}</p>
                </div>

                {/* Prerrequisitos */}
                {currentProposal.prerrequisitos && currentProposal.prerrequisitos.length > 0 && (
                  <div>
                    <span className="font-bold text-muted-foreground uppercase text-[10px] block mb-1">Prerrequisitos de Viabilidad</span>
                    <div className="space-y-1.5">
                      {currentProposal.prerrequisitos.map((p, i) => (
                        <div key={i} className="text-[11px]">
                          <strong className="text-violet-600">{p.titulo}:</strong> <span className="text-muted-foreground">{p.descripcion}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fases y Arquitectura (Original) */}
                <div>
                  <span className="font-bold text-muted-foreground uppercase text-[10px] block mb-1">Fases de Implementación</span>
                  <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                    {currentProposal.fases?.map((f, i) => (
                      <div key={i} className="p-2 bg-muted/60 border border-border rounded-lg">
                        <div className="flex justify-between font-bold text-[11px] text-foreground">
                          <span>{f.nombre}</span>
                          <span className="text-violet-500">{formatPrice(f.precio || 0, currentProposal.moneda)}</span>
                        </div>
                        {f.objetivo && <p className="text-[10px] text-muted-foreground mt-0.5"><strong>Obj:</strong> {f.objetivo}</p>}
                        {f.detalles && <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{f.detalles}</p>}
                      </div>
                    ))}
                    <div className="flex gap-2.5 flex-wrap pt-1">
                      {currentProposal.arquitectura?.map((a, i) => (
                        <div key={i} className="px-2 py-1 bg-violet-100 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 rounded-md text-[10px]">
                          <strong>{a.componente}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Checklist */}
                {currentProposal.checklistInicio && currentProposal.checklistInicio.length > 0 && (
                  <div>
                    <span className="font-bold text-muted-foreground uppercase text-[10px] block mb-1">Checklist de Inicio</span>
                    <ul className="text-[11px] space-y-1 list-disc pl-4 text-muted-foreground">
                      {currentProposal.checklistInicio.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground mb-1.5 flex items-center gap-1.5 ml-1">
              <RotateCcw size={12} />
              ¿Algo que corregir en la cotización?
            </label>
            <textarea
              value={correccionesCotizacion}
              onChange={e => setCorreccionesCotizacion(e.target.value)}
              rows={3}
              className="w-full px-3 py-3 bg-muted rounded-xl ring-1 ring-border focus:ring-2 focus:ring-violet-500 outline-none text-sm resize-y text-foreground custom-scrollbar"
              placeholder="Ej: Baja el precio de la fase 1 a la mitad..."
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
              onClick={handleAcceptQuotation}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-green-500/20"
            >
              <CheckCircle2 size={16} />
              Aceptar Propuesta
            </button>
            <button
              type="button"
              onClick={handleExportPDF}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-white dark:bg-black text-foreground border border-border font-bold rounded-xl hover:bg-muted transition-all shadow-sm"
            >
              <FileDown size={16} className="text-violet-500" />
              Exportar a PDF
            </button>
            {correccionesCotizacion.trim().length > 0 && (
              <button
                type="button"
                onClick={() => handleGenerateQuotation(true)}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-bold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-violet-500/20"
              >
                <RotateCcw size={16} />
                Aplicar Correcciones
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
