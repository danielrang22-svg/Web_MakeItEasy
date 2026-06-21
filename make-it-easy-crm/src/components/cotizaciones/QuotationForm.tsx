"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Plus, Trash2, DollarSign, Calendar, FileText, CheckCircle, Info, Server, HelpCircle, Layers, Sparkles, Lightbulb, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Cotizacion, EstadoCotizacion, CotizacionCreateData, CotizacionUpdateData } from "@/lib/types";
import { getNextCodigo } from "@/lib/cotizacionesCalc";
import { formatCurrency } from "@/lib/constants";
import { AiProposal } from "@/components/cotizaciones/AIBriefInput";

interface QuotationFormProps {
    initial?: Cotizacion | null;
    aiPrefilled?: AiProposal | null;
    allCotizaciones: Cotizacion[];
    empresas: string[];
    contactos: { nombre: string; empresa: string }[];
    onSubmit: (data: CotizacionCreateData | CotizacionUpdateData) => void;
    onCancel: () => void;
    title?: string;
    isInsideLeadForm?: boolean;
}

export default function QuotationForm({
    initial,
    aiPrefilled,
    allCotizaciones,
    empresas,
    contactos,
    onSubmit,
    onCancel,
    title,
    isInsideLeadForm = false
}: QuotationFormProps) {
    // Current Active Tab
    const [activeTab, setActiveTab] = useState<"info" | "challenge" | "architecture" | "phases" | "checklist">("info");

    // AI Adjust States
    const [showAiAdjust, setShowAiAdjust] = useState(false);
    const [aiAdjustPrompt, setAiAdjustPrompt] = useState("");
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);

    // Example Toggles
    const [showExampleDesafio, setShowExampleDesafio] = useState(false);
    const [showExampleArch, setShowExampleArch] = useState(false);
    const [showExamplePhases, setShowExamplePhases] = useState(false);
    const [showExamplePrereq, setShowExamplePrereq] = useState(false);
    const [showExampleFee, setShowExampleFee] = useState(false);
    const [showExampleChecklist, setShowExampleChecklist] = useState(false);

    // Form fields
    const [codigo, setCodigo] = useState(initial?.codigo || getNextCodigo(allCotizaciones));
    const [fecha, setFecha] = useState(initial?.fecha.split("T")[0] || new Date().toISOString().split("T")[0]);
    const [empresaNombre, setEmpresaNombre] = useState(initial?.empresaNombre || "");
    const [contactoNombre, setContactoNombre] = useState(initial?.contactoNombre || "");
    const [vendedor, setVendedor] = useState(initial?.vendedor || "Daniel Rangel");
    const [estado, setEstado] = useState(initial?.estado || EstadoCotizacion.BORRADOR);
    const [validez, setValidez] = useState(initial?.validez || "30 días");
    const [moneda, setMoneda] = useState(initial?.moneda || "COP");
    const [observaciones, setObservaciones] = useState(initial?.observaciones || "");
    
    // Rich Proposal Fields (with default values matching DOCX example)
    const [tituloPropuesta, setTituloPropuesta] = useState(initial?.tituloPropuesta || "");
    const [desafioNegocio, setDesafioNegocio] = useState(initial?.desafioNegocio || "");

    // Prereqs JSON State
    const defaultPrereqs = [{ titulo: "", descripcion: "" }];
    const [prerrequisitos, setPrerrequisitos] = useState<{ titulo: string; descripcion: string }[]>(() => {
        if (initial?.prerrequisitos) {
            try { return JSON.parse(initial.prerrequisitos); } catch (e) { return defaultPrereqs; }
        }
        return defaultPrereqs;
    });

    // Architecture JSON State
    const defaultArch = [{ componente: "", funcion: "" }];
    const [arquitectura, setArquitectura] = useState<{ componente: string; funcion: string }[]>(() => {
        if (initial?.arquitecturaJson) {
            try { return JSON.parse(initial.arquitecturaJson); } catch (e) { return defaultArch; }
        }
        return defaultArch;
    });

    // Phases JSON State
    const defaultPhases = [{ nombre: "", objetivo: "", detalles: "", precio: 0 }];
    const [fases, setFases] = useState<{ nombre: string; objetivo: string; detalles: string; precio: number }[]>(() => {
        if (initial?.fasesJson) {
            try { return JSON.parse(initial.fasesJson); } catch (e) { return defaultPhases; }
        }
        return defaultPhases;
    });

    // Kickoff checklist
    const defaultChecklist = [""];
    const [checklist, setChecklist] = useState<string[]>(() => {
        if (initial?.checklistInicio) {
            try { return JSON.parse(initial.checklistInicio); } catch (e) { return defaultChecklist; }
        }
        return defaultChecklist;
    });

    // Monthly Fee Details
    const [feeMensual, setFeeMensual] = useState<number>(initial?.feeMensual || 0);
    const [moduloOpcionalFee, setModuloOpcionalFee] = useState<number>(initial?.moduloOpcionalFee || 0);
    const [feeMensualIncluye, setFeeMensualIncluye] = useState<string>(initial?.feeMensualIncluye || "");

    const loadExampleData = () => {
        setTituloPropuesta("Propuesta Comercial: Ecosistema Digital Omnicanal");
        setDesafioNegocio("Dulce Agonía se prepara para ejecutar una fuerte inversión en pauta publicitaria, lo que generará un volumen masivo de prospectos y pedidos a través de múltiples canales simultáneos (Web, WhatsApp, Amazon, Uber Eats, DoorDash). Sin una arquitectura tecnológica centralizada, este flujo provocará un colapso operativo: chats sin respuesta, inventarios fragmentados, pedidos duplicados y pérdida de ingresos. Para resolver esto, Make it easy construirá un ecosistema 100% propio y omnicanal. Este sistema automatizará el ciclo de vida completo del cliente, desde la visualización del anuncio hasta el despacho en Dallas y su respectiva contabilización.");
        setPrerrequisitos([
            { titulo: "Normativa TABC Texas (Legal)", descripcion: "Dulce Agonía debe contar con la habilitación como distribuidor y permisos de venta directa al consumidor para operar legalmente. Sin estas licencias, el sistema no podrá procesar ingresos." },
            { titulo: "Cuentas Comerciales Aprobadas", descripcion: "Se requiere estatus de vendedor aprobado en Amazon, Uber Eats y DoorDash. La integración técnica de estas APIs será gestionada por Make it easy." },
            { titulo: "WhatsApp Business API", descripcion: "Es indispensable proveer una línea oficial activa y autorizar a Make it easy para la configuración del motor de IA." }
        ]);
        setArquitectura([
            { componente: "Frontend Web", funcion: "Catálogo interactivo, carrito de compras, checkout seguro y widget de chat." },
            { componente: "Base de Datos", funcion: "Repositorio cifrado para la gestión en tiempo real de clientes, inventario y pedidos." },
            { componente: "Orquestador Central", funcion: "Motor lógico que sincroniza la Web, WhatsApp, plataformas de delivery (Amazon, Uber Eats, DoorDash), CRM y contabilidad." },
            { componente: "Motor de IA", funcion: "Agente conversacional que califica leads, resuelve consultas y procesa opciones de pago 24/7." },
            { componente: "Pasarela de Pagos", funcion: "Procesamiento en USD vía Stripe, incluyendo enlaces de pago seguros integrados al chat." },
            { componente: "Infraestructura", funcion: "Cloud privado con redundancia, monitoreo continuo, backups automáticos y certificados SSL." }
        ]);
        setFases([
            { nombre: "Fase 1: Piso Mínimo Operativo", objetivo: "Capturar y procesar demanda antes de encender la pauta.", detalles: "Compra Web B2C con Stripe checkout, Agente de IA Omnicanal en WhatsApp y Web, CRM propio con pipelines.", precio: 1000 },
            { nombre: "Fase 2: Control Operativo Omnicanal", objetivo: "Unificar la logística y evitar quiebres o duplicidades de stock.", detalles: "Integración Amazon/Uber Eats/DoorDash APIs, Inventario unificado Dallas en tiempo real, Order Management para bodega.", precio: 1000 },
            { nombre: "Fase 3: Inteligencia del Negocio", objetivo: "Medición exacta del retorno de inversión y desempeño de ventas.", detalles: "Módulo contable con categorización, Dashboard BI de ROI integrado con Meta Ads API.", precio: 1000 }
        ]);
        setChecklist([
            "Licencia TABC Texas confirmada",
            "Permisos de venta al consumidor en Texas",
            "Sitio web desarrollado y listo para integración",
            "Línea oficial de WhatsApp Business lista",
            "Cuentas de vendedor aprobadas (Amazon, Uber Eats, DoorDash)",
            "Business Account de Meta Ads activa"
        ]);
        setFeeMensual(500);
        setModuloOpcionalFee(500);
        setFeeMensualIncluye("Infraestructura (hosting privado, SSL, backups), Soporte Técnico (hasta 10h/mes), Monitoreo y APIs (alertas 24/7 y gestión completa de Meta Ads, Amazon, WhatsApp, Stripe).");
    };

    // Calculate core project total
    const totalProyectoCore = useMemo(() => {
        return fases.reduce((acc, curr) => acc + (Number(curr.precio) || 0), 0);
    }, [fases]);

    // Apply AI prefilled data when available
    useEffect(() => {
        if (!aiPrefilled) return;
        setTituloPropuesta(aiPrefilled.tituloPropuesta || "");
        setDesafioNegocio(aiPrefilled.desafioNegocio || "");
        setEmpresaNombre(aiPrefilled.empresaNombre || "");
        setContactoNombre(aiPrefilled.contactoNombre || "");
        setMoneda(aiPrefilled.moneda || "COP");
        if (aiPrefilled.estado) setEstado(aiPrefilled.estado as EstadoCotizacion);
        if (aiPrefilled.prerrequisitos?.length) setPrerrequisitos(aiPrefilled.prerrequisitos);
        if (aiPrefilled.arquitectura?.length) setArquitectura(aiPrefilled.arquitectura);
        if (aiPrefilled.fases?.length) setFases(aiPrefilled.fases);
        if (aiPrefilled.checklistInicio?.length) setChecklist(aiPrefilled.checklistInicio);
        if (aiPrefilled.feeMensual) setFeeMensual(aiPrefilled.feeMensual);
        if (aiPrefilled.moduloOpcionalFee) setModuloOpcionalFee(aiPrefilled.moduloOpcionalFee);
        if (aiPrefilled.feeMensualIncluye) setFeeMensualIncluye(aiPrefilled.feeMensualIncluye);
        // Jump to challenge tab so user sees AI content first
        setActiveTab("challenge");
    }, [aiPrefilled]);

    // Helpers to add/remove rows
    const addPrereq = () => setPrerrequisitos(prev => [...prev, { titulo: "", descripcion: "" }]);
    const removePrereq = (idx: number) => setPrerrequisitos(prev => prev.filter((_, i) => i !== idx));
    const updatePrereq = (idx: number, field: "titulo" | "descripcion", val: string) => {
        setPrerrequisitos(prev => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item));
    };

    const addArch = () => setArquitectura(prev => [...prev, { componente: "", funcion: "" }]);
    const removeArch = (idx: number) => setArquitectura(prev => prev.filter((_, i) => i !== idx));
    const updateArch = (idx: number, field: "componente" | "funcion", val: string) => {
        setArquitectura(prev => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item));
    };

    const addPhase = () => setFases(prev => [...prev, { nombre: `Fase ${prev.length + 1}: `, objetivo: "", detalles: "", precio: 0 }]);
    const removePhase = (idx: number) => setFases(prev => prev.filter((_, i) => i !== idx));
    const updatePhase = (idx: number, field: "nombre" | "objetivo" | "detalles" | "precio", val: any) => {
        setFases(prev => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item));
    };

    const addChecklist = () => setChecklist(prev => [...prev, ""]);
    const removeChecklist = (idx: number) => setChecklist(prev => prev.filter((_, i) => i !== idx));
    const updateChecklist = (idx: number, val: string) => {
        setChecklist(prev => prev.map((item, i) => i === idx ? val : item));
    };

    async function handleAiAdjust() {
        if (!aiAdjustPrompt.trim()) return;
        setIsGeneratingAi(true);
        try {
            const currentProposalState: AiProposal = {
                tituloPropuesta,
                desafioNegocio,
                empresaNombre,
                contactoNombre,
                moneda,
                estado,
                prerrequisitos: prerrequisitos.filter(p => p.titulo.trim()),
                arquitectura: arquitectura.filter(a => a.componente.trim()),
                fases: fases.filter(f => f.nombre.trim()),
                checklistInicio: checklist.filter(c => c.trim()),
                feeMensual,
                moduloOpcionalFee,
                feeMensualIncluye,
            };

            const res = await fetch("/api/cotizaciones/generar-ai", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    brief: "",
                    correcciones: aiAdjustPrompt,
                    propuestaAnterior: currentProposalState,
                    moneda
                }),
            });

            const data = await res.json();
            if (!res.ok || data.error) throw new Error(data.error || "Error al contactar con la IA");

            const aiRes = data.propuesta as AiProposal;

            if (aiRes.tituloPropuesta) setTituloPropuesta(aiRes.tituloPropuesta);
            if (aiRes.desafioNegocio) setDesafioNegocio(aiRes.desafioNegocio);
            if (aiRes.prerrequisitos?.length) setPrerrequisitos(aiRes.prerrequisitos);
            if (aiRes.arquitectura?.length) setArquitectura(aiRes.arquitectura);
            if (aiRes.fases?.length) setFases(aiRes.fases);
            if (aiRes.checklistInicio?.length) setChecklist(aiRes.checklistInicio);
            if (aiRes.feeMensual !== undefined) setFeeMensual(aiRes.feeMensual);
            if (aiRes.moduloOpcionalFee !== undefined) setModuloOpcionalFee(aiRes.moduloOpcionalFee);
            if (aiRes.feeMensualIncluye) setFeeMensualIncluye(aiRes.feeMensualIncluye);

            setAiAdjustPrompt("");
            setShowAiAdjust(false);
            setActiveTab("challenge");
        } catch (err: any) {
            console.error(err);
            alert("Error al aplicar cambios con IA: " + err.message);
        } finally {
            setIsGeneratingAi(false);
        }
    }

    async function handleSubmit(e?: React.FormEvent) {
        e?.preventDefault();

        const data: CotizacionUpdateData | CotizacionCreateData = {
            codigo,
            fecha: new Date(fecha).toISOString(),
            leadId: initial?.leadId || "",
            empresaNombre: empresaNombre || "Sin Empresa",
            contactoNombre: contactoNombre || "Sin Contacto",
            vendedor: vendedor || "Daniel Rangel",
            estado,
            validez,
            moneda,
            observaciones,
            
            // Rich proposal details stringified for DB storage
            tituloPropuesta,
            desafioNegocio,
            prerrequisitos: JSON.stringify(prerrequisitos.filter(p => p.titulo.trim())),
            arquitecturaJson: JSON.stringify(arquitectura.filter(a => a.componente.trim())),
            fasesJson: JSON.stringify(fases.filter(f => f.nombre.trim())),
            checklistInicio: JSON.stringify(checklist.filter(c => c.trim())),
            
            // Financials
            totalProyectoCore,
            moduloOpcionalFee,
            feeMensual,
            feeMensualIncluye,
            ...(initial ? { version: (initial.version || 1) + 1 } : {})
        };
        onSubmit(data);
    }

    const inputCls = "w-full px-3 py-3 bg-muted rounded-xl ring-1 ring-border focus:ring-2 focus:ring-mie-primary outline-none text-sm text-foreground";
    const labelCls = "text-xs font-bold uppercase text-muted-foreground ml-1 mb-1.5 block";
    
    return (
        <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar">
            <div className="flex items-center justify-between mb-4">
                {title && <h3 className="font-bold text-lg text-primary font-display">{title}</h3>}
                {initial && (
                    <button
                        type="button"
                        onClick={() => setShowAiAdjust(v => !v)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 rounded-lg text-xs font-bold transition-colors hover:bg-violet-200 dark:hover:bg-violet-900/50"
                    >
                        <Sparkles size={14} />
                        Ajustar con IA
                    </button>
                )}
            </div>

            {initial && showAiAdjust && (
                <div className="mb-4 p-4 bg-violet-50 dark:bg-violet-900/10 border border-violet-200 dark:border-violet-800/30 rounded-xl space-y-3 animate-fade-in">
                    <label className="text-xs font-bold uppercase text-violet-600 flex items-center gap-1.5">
                        <Sparkles size={14} /> ¿Qué deseas modificar en la propuesta?
                    </label>
                    <textarea 
                        value={aiAdjustPrompt}
                        onChange={(e) => setAiAdjustPrompt(e.target.value)}
                        placeholder="Ej: Quítale la fase 1, baja el fee mensual a la mitad y enfócalo a empresas de salud..."
                        className="w-full px-3 py-2 text-sm bg-background rounded-lg border border-violet-200 focus:ring-2 focus:ring-violet-500 outline-none resize-y"
                        rows={3}
                    />
                    <div className="flex justify-end gap-2">
                        <button 
                            type="button" 
                            onClick={() => setShowAiAdjust(false)}
                            className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground font-medium"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="button"
                            onClick={handleAiAdjust}
                            disabled={!aiAdjustPrompt.trim() || isGeneratingAi}
                            className="px-4 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                            {isGeneratingAi ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                            Aplicar Cambios con IA
                        </button>
                    </div>
                </div>
            )}

            {/* AI prefilled banner */}
            {aiPrefilled && (
                <div className="flex items-center gap-2 px-3 py-2 bg-violet-50 dark:bg-violet-900/10 border border-violet-200 dark:border-violet-800/30 rounded-xl text-xs">
                    <Sparkles size={14} className="text-violet-600 shrink-0" />
                    <span className="text-violet-700 dark:text-violet-300">
                        <strong>Propuesta generada por IA</strong> — Revisa y ajusta los campos y precios antes de guardar.
                    </span>
                </div>
            )}

            {/* Persistent Top Settings Bar (Estado & Moneda) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/40 ring-1 ring-border rounded-2xl mb-2">
                <div>
                    <label className={labelCls}>Estado de la Propuesta</label>
                    <select value={estado} onChange={(e) => setEstado(e.target.value as EstadoCotizacion)} className={inputCls}>
                        {Object.values(EstadoCotizacion).map((e) => <option key={e} value={e}>{e}</option>)}
                    </select>
                </div>
                <div>
                    <label className={labelCls}>Moneda de Cotización</label>
                    <select value={moneda} onChange={(e) => setMoneda(e.target.value)} className={inputCls}>
                        <option value="COP">Pesos Colombianos (COP)</option>
                        <option value="USD">Dólares Americanos (USD)</option>
                    </select>
                </div>
            </div>

            {/* TAB Navigation Header */}
            <div className="flex border-b border-border text-sm overflow-x-auto custom-scrollbar whitespace-nowrap">
                <button
                    type="button"
                    onClick={() => setActiveTab("info")}
                    className={`px-4 py-2 font-semibold border-b-2 transition-all ${activeTab === "info" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                >
                    1. Info Básica
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab("challenge")}
                    className={`px-4 py-2 font-semibold border-b-2 transition-all ${activeTab === "challenge" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                >
                    2. Desafío & Prerrequisitos
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab("architecture")}
                    className={`px-4 py-2 font-semibold border-b-2 transition-all ${activeTab === "architecture" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                >
                    3. Arquitectura
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab("phases")}
                    className={`px-4 py-2 font-semibold border-b-2 transition-all ${activeTab === "phases" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                >
                    4. Fases e Inversión
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab("checklist")}
                    className={`px-4 py-2 font-semibold border-b-2 transition-all ${activeTab === "checklist" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                >
                    5. Checklist & Cierre
                </button>
            </div>

            {/* TAB 1: BASIC INFO */}
            {activeTab === "info" && (
                <div className="space-y-4 animate-fade-in">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Código Propuesta</label>
                            <input value={codigo} onChange={(e) => setCodigo(e.target.value)} required className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Fecha Presentación</label>
                            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required className={inputCls} />
                        </div>
                        <div className={isInsideLeadForm ? "hidden" : ""}>
                            <label className={labelCls}>Empresa del Cliente *</label>
                            <input list="emp-list-prop" value={empresaNombre} onChange={(e) => setEmpresaNombre(e.target.value)} required={!isInsideLeadForm} className={inputCls} placeholder="Ej: Dulce Agonía" />
                            <datalist id="emp-list-prop">
                                {empresas.map((e) => <option key={e} value={e} />)}
                            </datalist>
                        </div>
                        <div className={isInsideLeadForm ? "hidden" : ""}>
                            <label className={labelCls}>Contacto Cliente *</label>
                            <input list="cont-list-prop" value={contactoNombre} onChange={(e) => {
                                setContactoNombre(e.target.value);
                                const match = contactos.find((c) => c.nombre === e.target.value);
                                if (match && match.empresa) setEmpresaNombre(match.empresa);
                            }} required={!isInsideLeadForm} className={inputCls} placeholder="Nombre contacto..." />
                            <datalist id="cont-list-prop">
                                {contactos.map((c) => <option key={c.nombre} value={c.nombre}>{c.empresa}</option>)}
                            </datalist>
                        </div>
                        <div>
                            <label className={labelCls}>Vendedor Responsable</label>
                            <input value={vendedor} onChange={(e) => setVendedor(e.target.value)} className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Validez Propuesta</label>
                            <input value={validez} onChange={(e) => setValidez(e.target.value)} className={inputCls} placeholder="Ej: 30 días" />
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: CHALLENGE & PREREQUISITES */}
            {activeTab === "challenge" && (
                <div className="space-y-4 animate-fade-in">
                    <div>
                        <label className={labelCls}>Título de la Propuesta</label>
                        <input value={tituloPropuesta} onChange={(e) => setTituloPropuesta(e.target.value)} required className={inputCls} placeholder="Ej: Propuesta Comercial: Ecosistema Digital Omnicanal" />
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className={labelCls}>1. El Desafío de Negocio</label>
                            <button
                                type="button"
                                onClick={() => setShowExampleDesafio(v => !v)}
                                className="text-xs text-violet-500 hover:text-violet-600 flex items-center gap-1"
                            >
                                <Lightbulb size={12} />
                                {showExampleDesafio ? "Ocultar" : "Ver ejemplo"}
                                {showExampleDesafio ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            </button>
                        </div>
                        {showExampleDesafio && (
                            <div className="mb-3 p-3 bg-muted/60 rounded-xl text-[11px] text-muted-foreground border border-border">
                                <p className="font-semibold text-foreground mb-1">Ejemplo de redacción (Caso: Dulce Agonía):</p>
                                <p className="italic">"Dulce Agonía se prepara para ejecutar una fuerte inversión en pauta publicitaria, lo que generará un volumen masivo de prospectos y pedidos a través de múltiples canales simultáneos (Web, WhatsApp, Amazon, Uber Eats, DoorDash). Sin una arquitectura tecnológica centralizada, este flujo provocará un colapso operativo: chats sin respuesta, inventarios fragmentados, pedidos duplicados y pérdida de ingresos. Para resolver esto, Make it easy construirá un ecosistema 100% propio y omnicanal. Este sistema automatizará el ciclo de vida completo del cliente, desde la visualización del anuncio hasta el despacho en Dallas y su respectiva contabilización."</p>
                            </div>
                        )}
                        <textarea
                            value={desafioNegocio}
                            onChange={(e) => setDesafioNegocio(e.target.value)}
                            rows={8}
                            className={`${inputCls} resize-none`}
                            placeholder="Describa el desafío operativo y la solución general..."
                        />
                    </div>
                    <div className="border-t border-border pt-4">
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-xs font-bold uppercase text-muted-foreground ml-1">2. Prerrequisitos de Viabilidad</label>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowExamplePrereq(v => !v)}
                                    className="text-xs text-violet-500 hover:text-violet-600 flex items-center gap-1"
                                >
                                    <Lightbulb size={12} />
                                    {showExamplePrereq ? "Ocultar" : "Ver ejemplo"}
                                    {showExamplePrereq ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                </button>
                                <button type="button" onClick={addPrereq} className="text-[11px] text-primary bg-primary/10 border border-primary/20 px-2 py-1 rounded-md hover:bg-primary/20 flex items-center gap-1 transition-all">
                                    <Plus size={12} /> Agregar
                                </button>
                            </div>
                        </div>
                        {showExamplePrereq && (
                            <div className="mb-3 p-3 bg-muted/60 rounded-xl text-[11px] text-muted-foreground border border-border">
                                <p className="font-semibold text-foreground mb-1">Ejemplos de Prerrequisitos:</p>
                                <ul className="list-disc pl-4 space-y-1">
                                    <li><strong>Normativa TABC Texas (Legal):</strong> Dulce Agonía debe contar con la habilitación como distribuidor y permisos de venta directa al consumidor para operar legalmente.</li>
                                    <li><strong>WhatsApp Business API:</strong> Es indispensable proveer una línea oficial activa y autorizar a Make it easy para la configuración del motor de IA.</li>
                                </ul>
                            </div>
                        )}
                        <div className="space-y-3">
                            {prerrequisitos.map((pre, idx) => (
                                <div key={idx} className="flex gap-2 items-start bg-card/40 border border-border/50 p-3 rounded-xl relative">
                                    <div className="flex-1 space-y-2">
                                        <input
                                            value={pre.titulo}
                                            onChange={(e) => updatePrereq(idx, "titulo", e.target.value)}
                                            placeholder="Título del Prerrequisito (ej: Permiso Legal)"
                                            className={`${inputCls} py-2 text-xs`}
                                        />
                                        <textarea
                                            value={pre.descripcion}
                                            onChange={(e) => updatePrereq(idx, "descripcion", e.target.value)}
                                            placeholder="Detalle del prerrequisito..."
                                            rows={2}
                                            className={`${inputCls} py-2 text-xs resize-none`}
                                        />
                                    </div>
                                    <button type="button" onClick={() => removePrereq(idx)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 p-1.5 rounded-lg transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 3: ARCHITECTURE */}
            {activeTab === "architecture" && (
                <div className="space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase text-muted-foreground ml-1">3. Arquitectura del Ecosistema</label>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setShowExampleArch(v => !v)}
                                className="text-xs text-violet-500 hover:text-violet-600 flex items-center gap-1"
                            >
                                <Lightbulb size={12} />
                                {showExampleArch ? "Ocultar" : "Ver ejemplo"}
                                {showExampleArch ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            </button>
                            <button type="button" onClick={addArch} className="text-[11px] text-primary bg-primary/10 border border-primary/20 px-2 py-1 rounded-md hover:bg-primary/20 flex items-center gap-1 transition-all">
                                <Plus size={12} /> Agregar Componente
                            </button>
                        </div>
                    </div>
                    {showExampleArch && (
                        <div className="mb-2 p-3 bg-muted/60 rounded-xl text-[11px] text-muted-foreground border border-border">
                            <p className="font-semibold text-foreground mb-1">Ejemplos de Componentes:</p>
                            <ul className="list-disc pl-4 space-y-1">
                                <li><strong>Frontend Web:</strong> Catálogo interactivo, carrito de compras, checkout seguro y widget de chat.</li>
                                <li><strong>Motor de IA:</strong> Agente conversacional que califica leads, resuelve consultas y procesa opciones de pago 24/7.</li>
                                <li><strong>Orquestador Central:</strong> Motor lógico que sincroniza la Web, WhatsApp, plataformas de delivery (Amazon, Uber Eats, DoorDash), CRM y contabilidad.</li>
                            </ul>
                        </div>
                    )}
                    <div className="space-y-3">
                        {arquitectura.map((arc, idx) => (
                            <div key={idx} className="flex gap-2 items-start bg-card/40 border border-border/50 p-3 rounded-xl">
                                <div className="flex-1 grid grid-cols-3 gap-2">
                                    <div className="col-span-1">
                                        <input
                                            value={arc.componente}
                                            onChange={(e) => updateArch(idx, "componente", e.target.value)}
                                            placeholder="Componente (ej: Frontend)"
                                            className={`${inputCls} py-2 text-xs`}
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <input
                                            value={arc.funcion}
                                            onChange={(e) => updateArch(idx, "funcion", e.target.value)}
                                            placeholder="Función en el sistema..."
                                            className={`${inputCls} py-2 text-xs`}
                                        />
                                    </div>
                                </div>
                                <button type="button" onClick={() => removeArch(idx)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 p-1.5 rounded-lg transition-colors">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB 4: PHASES AND INVERSIONS */}
            {activeTab === "phases" && (
                <div className="space-y-5 animate-fade-in">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase text-muted-foreground ml-1">4. Fases de Implementación</label>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setShowExamplePhases(v => !v)}
                                className="text-xs text-violet-500 hover:text-violet-600 flex items-center gap-1"
                            >
                                <Lightbulb size={12} />
                                {showExamplePhases ? "Ocultar" : "Ver ejemplo"}
                                {showExamplePhases ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            </button>
                            <button type="button" onClick={addPhase} className="text-[11px] text-primary bg-primary/10 border border-primary/20 px-2 py-1 rounded-md hover:bg-primary/20 flex items-center gap-1 transition-all">
                                <Plus size={12} /> Agregar Fase
                            </button>
                        </div>
                    </div>
                    {showExamplePhases && (
                        <div className="mb-2 p-3 bg-muted/60 rounded-xl text-[11px] text-muted-foreground border border-border">
                            <p className="font-semibold text-foreground mb-1">Ejemplo de Fases:</p>
                            <ul className="list-disc pl-4 space-y-1">
                                <li><strong>Fase 1: Piso Mínimo Operativo</strong> - Capturar y procesar demanda antes de encender la pauta. (Compra Web B2C con Stripe checkout, Agente de IA Omnicanal en WhatsApp y Web, CRM propio con pipelines.)</li>
                                <li><strong>Fase 2: Control Operativo Omnicanal</strong> - Unificar la logística y evitar quiebres o duplicidades de stock. (Integración Amazon/Uber Eats/DoorDash APIs, Inventario unificado Dallas en tiempo real, Order Management para bodega.)</li>
                            </ul>
                        </div>
                    )}
                    <div className="space-y-4">
                        {fases.map((fas, idx) => (
                            <div key={idx} className="bg-card/40 border border-border/50 p-4 rounded-xl space-y-3 relative group">
                                <div className="absolute left-0 top-0 w-1 h-full bg-primary rounded-l-xl"></div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-primary uppercase">Fase {idx + 1}</span>
                                    <button type="button" onClick={() => removePhase(idx)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 p-1 rounded-full">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                <div className="grid grid-cols-4 gap-2">
                                    <div className="col-span-3">
                                        <input
                                            value={fas.nombre}
                                            onChange={(e) => updatePhase(idx, "nombre", e.target.value)}
                                            placeholder="Nombre de la fase"
                                            className={`${inputCls} py-2 text-xs font-semibold`}
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <input
                                            type="number"
                                            value={fas.precio || ""}
                                            onChange={(e) => updatePhase(idx, "precio", Number(e.target.value))}
                                            placeholder="Precio"
                                            className={`${inputCls} py-2 text-xs text-right font-bold text-primary`}
                                        />
                                    </div>
                                    <div className="col-span-4">
                                        <input
                                            value={fas.objetivo}
                                            onChange={(e) => updatePhase(idx, "objetivo", e.target.value)}
                                            placeholder="Objetivo principal..."
                                            className={`${inputCls} py-2 text-xs`}
                                        />
                                    </div>
                                    <div className="col-span-4">
                                        <textarea
                                            value={fas.detalles}
                                            onChange={(e) => updatePhase(idx, "detalles", e.target.value)}
                                            placeholder="Funcionalidades (separadas por comas o líneas)..."
                                            rows={2}
                                            className={`${inputCls} py-2 text-xs resize-none`}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Summary and recurring fees */}
                    <div className="border-t border-border pt-4 space-y-4">
                        <label className="text-xs font-bold uppercase text-muted-foreground ml-1">5. Resumen Comercial & Fees</label>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}>Módulo Opcional (Outbound) Fee</label>
                                <div className="relative">
                                    <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                    <input type="number" value={moduloOpcionalFee} onChange={(e) => setModuloOpcionalFee(Number(e.target.value))} className={`${inputCls} pl-8`} />
                                </div>
                            </div>
                            <div>
                                <label className={labelCls}>Fee Mensual de Mantenimiento</label>
                                <div className="relative">
                                    <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                    <input type="number" value={feeMensual} onChange={(e) => setFeeMensual(Number(e.target.value))} className={`${inputCls} pl-8`} />
                                </div>
                            </div>
                            <div className="col-span-2">
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className={labelCls}>¿Qué incluye el Fee Mensual?</label>
                                    <button
                                        type="button"
                                        onClick={() => setShowExampleFee(v => !v)}
                                        className="text-xs text-violet-500 hover:text-violet-600 flex items-center gap-1"
                                    >
                                        <Lightbulb size={12} />
                                        {showExampleFee ? "Ocultar" : "Ver ejemplo"}
                                        {showExampleFee ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                    </button>
                                </div>
                                {showExampleFee && (
                                    <div className="mb-3 p-3 bg-muted/60 rounded-xl text-[11px] text-muted-foreground border border-border">
                                        <p className="font-semibold text-foreground mb-1">Ejemplo de redacción:</p>
                                        <p className="italic">"Infraestructura (hosting privado, SSL, backups), Soporte Técnico (hasta 10h/mes), Monitoreo y APIs (alertas 24/7 y gestión completa de Meta Ads, Amazon, WhatsApp, Stripe)."</p>
                                    </div>
                                )}
                                <textarea
                                    value={feeMensualIncluye}
                                    onChange={(e) => setFeeMensualIncluye(e.target.value)}
                                    rows={3}
                                    className={`${inputCls} resize-none`}
                                    placeholder="Infraestructura, soporte, APIs..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Financial Box */}
                    <div className="bg-muted/40 ring-1 ring-border rounded-2xl p-5 space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground font-medium">Proyecto Core Total ({moneda}):</span>
                            <span className="text-primary font-bold text-lg">{formatCurrency(totalProyectoCore, moneda)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground font-medium">Opcional Outbound Total ({moneda}):</span>
                            <span className="font-bold">{formatCurrency(moduloOpcionalFee, moneda)}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 mt-2 border-t border-border/50">
                            <span className="text-muted-foreground font-medium">Operación Recurrente Mensual ({moneda}/mes):</span>
                            <span className="text-mie-secondary font-black text-lg">{formatCurrency(feeMensual, moneda)}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 5: CHECKLIST & CLOSING */}
            {activeTab === "checklist" && (
                <div className="space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold uppercase text-muted-foreground ml-1">6. Checklist de Inicio para el Cliente</label>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setShowExampleChecklist(v => !v)}
                                className="text-xs text-violet-500 hover:text-violet-600 flex items-center gap-1"
                            >
                                <Lightbulb size={12} />
                                {showExampleChecklist ? "Ocultar" : "Ver ejemplo"}
                                {showExampleChecklist ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            </button>
                            <button type="button" onClick={addChecklist} className="text-[11px] text-primary bg-primary/10 border border-primary/20 px-2 py-1 rounded-md hover:bg-primary/20 flex items-center gap-1 transition-all">
                                <Plus size={12} /> Agregar Paso
                            </button>
                        </div>
                    </div>
                    {showExampleChecklist && (
                        <div className="mb-3 p-3 bg-muted/60 rounded-xl text-[11px] text-muted-foreground border border-border">
                            <p className="font-semibold text-foreground mb-1">Ejemplos de Checklist:</p>
                            <ul className="list-disc pl-4 space-y-1">
                                <li>Licencia TABC Texas confirmada</li>
                                <li>Línea oficial de WhatsApp Business lista</li>
                                <li>Cuentas de vendedor aprobadas (Amazon, Uber Eats, DoorDash)</li>
                                <li>Business Account de Meta Ads activa</li>
                            </ul>
                        </div>
                    )}
                    <div className="space-y-2">
                        {checklist.map((chk, idx) => (
                            <div key={idx} className="flex gap-2 items-center">
                                <CheckCircle size={16} className="text-primary shrink-0" />
                                <input
                                    value={chk}
                                    onChange={(e) => updateChecklist(idx, e.target.value)}
                                    placeholder="Acción / Cuenta que debe entregar el cliente..."
                                    className={`${inputCls} py-2 text-xs`}
                                />
                                <button type="button" onClick={() => removeChecklist(idx)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 p-1.5 rounded-lg transition-colors">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="border-t border-border pt-4">
                        <label className={labelCls}>Observaciones Adicionales</label>
                        <textarea
                            value={observaciones}
                            onChange={(e) => setObservaciones(e.target.value)}
                            rows={3}
                            className={`${inputCls} resize-none`}
                            placeholder="Notas de entrega o aclaraciones finales..."
                        />
                    </div>
                </div>
            )}

            {/* bottom actions - non-sticky when inside LeadForm to prevent overlapping */}
            <div className={`flex gap-3 pt-4 pb-2 bg-background/80 backdrop-blur-md ${isInsideLeadForm ? "relative" : "sticky bottom-0 -mx-1 px-1"}`}>
                <button
                    type="button"
                    onClick={handleSubmit}
                    className="flex-1 mie-gradient text-white font-bold py-4 rounded-2xl shadow-xl hover:shadow-purple-500/25 active:scale-[0.98] transition-all duration-200"
                >
                    {initial ? "Guardar Cambios" : "Guardar Propuesta"}
                </button>
                <button type="button" onClick={onCancel} className="px-8 py-4 rounded-2xl ring-1 ring-border font-bold text-muted-foreground hover:bg-muted transition-all active:scale-[0.98]">
                    Cancelar
                </button>
            </div>
        </div>
    );
}
