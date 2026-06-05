"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useProyectosStore } from "@/lib/state/proyectosStore";
import { EstadoProyecto, Proyecto, AutomationFlow } from "@/lib/types";
import { formatCurrency } from "@/lib/constants";
import { Modal, Toast } from "@/components/ui/SharedUI";
import {
    ArrowLeft, Clock, CalendarDays, Eye, CheckCircle,
    Archive, DollarSign, Ban, Activity, Cpu, Layers, Play, Pause, AlertCircle, Plus, Trash2, Edit2, Wrench
} from "lucide-react";
import Link from "next/link";

const ESTADO_PROYECTO_STYLES: Record<EstadoProyecto, { bg: string; text: string; label: string }> = {
    [EstadoProyecto.DIAGNOSTICO]: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-600 dark:text-blue-400", label: "DIAGNÓSTICO" },
    [EstadoProyecto.DISENO]: { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-600 dark:text-purple-400", label: "DISEÑO" },
    [EstadoProyecto.IMPLEMENTACION]: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-600 dark:text-amber-400", label: "IMPLEMENTACIÓN" },
    [EstadoProyecto.SOPORTE]: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-600 dark:text-emerald-400", label: "SOPORTE (Mantenimiento)" },
};

export default function ProyectoDetallePage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const resolvedParams = use(params);
    const id = resolvedParams.id;
    
    const store = useProyectosStore();
    const { proyectos, ordenes, loadProyectos, loadOrdenes, loadCotizaciones, updateProyecto, getProyectoFinancials, getProjectProgress, cotizaciones } = store;
    
    const [proyecto, setProyecto] = useState<Proyecto | null>(null);
    const [flows, setFlows] = useState<AutomationFlow[]>([]);
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Modals & form state
    const [showFlowModal, setShowFlowModal] = useState(false);
    const [isEditingFlow, setIsEditingFlow] = useState(false);
    const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null);
    const [flowForm, setFlowForm] = useState({
        nombre: "",
        tipo: "WhatsApp AI Agent",
        estado: "PAUSADO" as "ACTIVO" | "PAUSADO" | "ERROR",
        ejecuciones24h: 0,
        tasaExito: 100.0,
        tiempoPromedio: 0.0,
        notas: ""
    });

    useEffect(() => {
        loadProyectos();
        loadOrdenes();
        loadCotizaciones();
    }, [loadProyectos, loadOrdenes, loadCotizaciones]);

    useEffect(() => {
        if (proyectos.length > 0) {
            const found = proyectos.find(p => p.id === id);
            if (found) {
                setProyecto(found);
                setFlows(ordenes.filter(o => o.proyectoId === id));
            } else {
                router.push("/proyectos");
            }
        }
    }, [id, proyectos, ordenes, router]);

    if (!proyecto) {
        return <div className="p-8 text-center text-muted-foreground">Cargando proyecto...</div>;
    }

    const estilo = ESTADO_PROYECTO_STYLES[proyecto.estado];
    const financials = getProyectoFinancials(proyecto.id);
    const progressPercent = getProjectProgress(proyecto.id);

    // Find associated quotation
    const cotizacion = cotizaciones.find(c => c.id === proyecto.cotizacionId);
    let checklistItems: string[] = [];
    if (cotizacion?.checklistInicio) {
        try {
            checklistItems = JSON.parse(cotizacion.checklistInicio);
        } catch (e) {
            console.error("Error parsing checklist", e);
        }
    }

    const handleStatusChange = async (newStatus: EstadoProyecto) => {
        setIsSaving(true);
        try {
            await updateProyecto(proyecto.id, { estado: newStatus });
            setToast({ message: `Estado actualizado a ${newStatus}`, type: "success" });
        } catch (e) {
            setToast({ message: "Error al actualizar estado", type: "error" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleToolsChange = async (tools: string) => {
        try {
            await updateProyecto(proyecto.id, { herramientasUsadas: tools });
            setToast({ message: "Herramientas actualizadas", type: "success" });
        } catch (e) {
            setToast({ message: "Error al guardar herramientas", type: "error" });
        }
    };

    const handleNotesChange = async (notes: string) => {
        try {
            await updateProyecto(proyecto.id, { notas: notes });
            setToast({ message: "Notas guardadas", type: "success" });
        } catch (e) {
            setToast({ message: "Error al guardar notas", type: "error" });
        }
    };

    // Flow handlers
    const openCreateFlow = () => {
        setIsEditingFlow(false);
        setSelectedFlowId(null);
        setFlowForm({
            nombre: "",
            tipo: "WhatsApp AI Agent",
            estado: "PAUSADO",
            ejecuciones24h: 0,
            tasaExito: 100.0,
            tiempoPromedio: 0.0,
            notes: ""
        } as any);
        setShowFlowModal(true);
    };

    const openEditFlow = (flow: AutomationFlow) => {
        setIsEditingFlow(true);
        setSelectedFlowId(flow.id);
        setFlowForm({
            nombre: flow.nombre,
            tipo: flow.tipo,
            estado: flow.estado,
            ejecuciones24h: flow.ejecuciones24h,
            tasaExito: flow.tasaExito,
            tiempoPromedio: flow.tiempoPromedio,
            notas: flow.notas
        });
        setShowFlowModal(true);
    };

    const toggleFlowStatus = async (flow: AutomationFlow) => {
        const nextEstado = flow.estado === "ACTIVO" ? "PAUSADO" : "ACTIVO";
        try {
            const res = await fetch(`/api/flows/${flow.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ estado: nextEstado })
            });
            if (res.ok) {
                setToast({ message: `Flujo ${flow.nombre} ${nextEstado === "ACTIVO" ? "Activado ⚡" : "Pausado ⏸️"}`, type: "success" });
                loadOrdenes();
            } else {
                setToast({ message: "Error al alternar estado del flujo", type: "error" });
            }
        } catch {
            setToast({ message: "Error de conexión", type: "error" });
        }
    };

    const handleFlowSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (isEditingFlow && selectedFlowId) {
                const res = await fetch(`/api/flows/${selectedFlowId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(flowForm)
                });
                if (res.ok) {
                    setToast({ message: "Flujo de automatización actualizado", type: "success" });
                    setShowFlowModal(false);
                    loadOrdenes();
                } else {
                    setToast({ message: "Error al actualizar flujo", type: "error" });
                }
            } else {
                const res = await fetch("/api/flows", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ...flowForm, proyectoId: proyecto.id })
                });
                if (res.ok) {
                    setToast({ message: "Flujo de automatización creado", type: "success" });
                    setShowFlowModal(false);
                    loadOrdenes();
                } else {
                    setToast({ message: "Error al crear flujo", type: "error" });
                }
            }
        } catch {
            setToast({ message: "Error de red", type: "error" });
        }
    };

    const handleDeleteFlow = async (flowId: string) => {
        if (!confirm("¿Estás seguro de eliminar este flujo de automatización?")) return;
        try {
            const res = await fetch(`/api/flows/${flowId}`, {
                method: "DELETE"
            });
            if (res.ok) {
                setToast({ message: "Flujo eliminado", type: "info" });
                loadOrdenes();
            } else {
                setToast({ message: "Error al eliminar flujo", type: "error" });
            }
        } catch {
            setToast({ message: "Error de red", type: "error" });
        }
    };

    return (
        <div className="px-5 pb-32">
            <div className="mt-4 mb-6">
                <Link 
                    href="/proyectos" 
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors w-fit"
                >
                    <ArrowLeft size={16} /> Volver a Proyectos
                </Link>
                
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold mb-1 font-display">{proyecto.titulo}</h1>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <Cpu size={14} className="text-mie-blue" /> Client: {proyecto.clienteNombre}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <label className="text-xs font-bold text-muted-foreground uppercase">Estado:</label>
                        <select 
                            value={proyecto.estado} 
                            onChange={(e) => handleStatusChange(e.target.value as EstadoProyecto)}
                            disabled={isSaving}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider outline-none border border-border bg-card cursor-pointer transition-colors ${estilo?.text}`}
                        >
                            {Object.values(EstadoProyecto).map(opt => (
                                <option key={opt} value={opt}>{ESTADO_PROYECTO_STYLES[opt]?.label || opt}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Metrics Dashboard Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Progress Card */}
                <div className="p-4 bg-card ring-1 ring-border rounded-2xl flex flex-col justify-between shadow-sm">
                    <div>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Fases de Implementación</p>
                        <div className="flex items-end gap-2">
                            <p className="text-2xl font-black text-mie-blue">{progressPercent}%</p>
                            <p className="text-xs text-muted-foreground mb-1">({proyecto.estado})</p>
                        </div>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mt-3">
                        <div className="h-full bg-mie-blue rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
                    </div>
                </div>

                {/* Integration Flows Summary */}
                <div className="p-4 bg-card ring-1 ring-border rounded-2xl flex flex-col justify-between shadow-sm">
                    <div>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Flujos de Integración</p>
                        <div className="flex gap-3 mt-1">
                            <div className="text-center flex-1 py-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 rounded-lg">
                                <span className="text-sm font-bold block">{flows.filter(f => f.estado === "ACTIVO").length}</span>
                                <span className="text-[9px] uppercase font-bold opacity-80">Activos</span>
                            </div>
                            <div className="text-center flex-1 py-1 bg-amber-50 dark:bg-amber-950/20 text-amber-600 rounded-lg">
                                <span className="text-sm font-bold block">{flows.filter(f => f.estado === "PAUSADO").length}</span>
                                <span className="text-[9px] uppercase font-bold opacity-80">Pausa</span>
                            </div>
                            <div className="text-center flex-1 py-1 bg-red-50 dark:bg-red-950/20 text-red-600 rounded-lg">
                                <span className="text-sm font-bold block">{flows.filter(f => f.estado === "ERROR").length}</span>
                                <span className="text-[9px] uppercase font-bold opacity-80">Error</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dates Card */}
                <div className="p-4 bg-card ring-1 ring-border rounded-2xl flex flex-col justify-between shadow-sm text-sm">
                    <div>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                            <CalendarDays size={12} /> FECHA INICIO
                        </p>
                        <p className="font-bold text-foreground">{proyecto.fechaInicio.split("T")[0]}</p>
                    </div>
                    <div className="mt-2 border-t border-border/50 pt-2">
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Herramientas</p>
                        <input 
                            type="text" 
                            className="bg-transparent border-none text-xs font-semibold text-mie-purple w-full focus:ring-0 outline-none p-0"
                            value={proyecto.herramientasUsadas || ""}
                            onChange={(e) => handleToolsChange(e.target.value)}
                            placeholder="n8n, Make, OpenAI..."
                        />
                    </div>
                </div>

                {/* Commercial Summary Card */}
                <div className="p-4 bg-card ring-1 ring-border rounded-2xl flex flex-col justify-center shadow-sm">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Inversión Core / Mensual</p>
                    <p className="text-lg font-black text-foreground">{formatCurrency(financials.ingreso, cotizacion?.moneda || "COP")}</p>
                    <p className="text-xs text-emerald-600 font-bold mt-1">+{formatCurrency(cotizacion?.feeMensual || 0, cotizacion?.moneda || "COP")}/mes support</p>
                </div>
            </div>

            {/* Flows & Checklist Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Dashboard Section */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-card ring-1 ring-border rounded-3xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-lg font-bold flex items-center gap-2">
                                    <Activity size={20} className="text-mie-blue" />
                                    Orquestador de Integraciones
                                </h2>
                                <p className="text-xs text-muted-foreground mt-0.5">Monitoreo de agentes y sincronizadores n8n/Make en producción</p>
                            </div>
                            <button 
                                onClick={openCreateFlow}
                                className="bg-mie-blue/10 hover:bg-mie-blue/20 text-mie-blue px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 border border-mie-blue/10 transition-colors"
                            >
                                <Plus size={14} /> Nuevo Flujo
                            </button>
                        </div>

                        {/* Flows List */}
                        <div className="space-y-4">
                            {flows.map((flow) => {
                                const isAct = flow.estado === "ACTIVO";
                                const isErr = flow.estado === "ERROR";
                                return (
                                    <div key={flow.id} className="p-4 border border-border rounded-2xl bg-card hover:border-mie-blue/30 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative group">
                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-bold text-sm text-foreground">{flow.nombre}</span>
                                                <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-semibold">{flow.tipo}</span>
                                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase flex items-center gap-1 ${
                                                    isAct ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20' : 
                                                    isErr ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/20' : 'bg-amber-50 text-amber-600 dark:bg-amber-950/20'
                                                }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${isAct ? 'bg-emerald-500 animate-pulse' : isErr ? 'bg-rose-500 animate-ping' : 'bg-amber-500'}`}></span>
                                                    {flow.estado}
                                                </span>
                                            </div>
                                            {flow.notas && <p className="text-xs text-muted-foreground">{flow.notas}</p>}
                                            
                                            {/* Runtime metrics */}
                                            <div className="flex items-center gap-4 pt-1 text-[11px] text-muted-foreground">
                                                <span>Ejecuciones (24h): <strong className="text-foreground">{flow.ejecuciones24h}</strong></span>
                                                <span>Tasa Éxito: <strong className={flow.tasaExito < 98 ? "text-amber-500" : "text-emerald-500"}>{flow.tasaExito}%</strong></span>
                                                <span>Tiempo prom: <strong className="text-foreground">{flow.tiempoPromedio}s</strong></span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                                            <button 
                                                onClick={() => toggleFlowStatus(flow)}
                                                className={`p-2 rounded-xl border border-border hover:bg-muted transition-colors ${isAct ? "text-amber-500" : "text-emerald-600"}`}
                                                title={isAct ? "Pausar Integración" : "Activar Integración"}
                                            >
                                                {isAct ? <Pause size={14} /> : <Play size={14} />}
                                            </button>
                                            <button 
                                                onClick={() => openEditFlow(flow)}
                                                className="p-2 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                                title="Editar Parámetros"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteFlow(flow.id)}
                                                className="p-2 rounded-xl border border-border hover:bg-rose-50 dark:hover:bg-rose-950/20 text-red-500 transition-colors"
                                                title="Eliminar Flujo"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}

                            {flows.length === 0 && (
                                <div className="text-center py-10 bg-muted/10 border border-dashed border-border rounded-2xl">
                                    <Wrench size={32} className="mx-auto mb-2 text-muted-foreground opacity-30" />
                                    <p className="text-muted-foreground text-xs font-semibold">No se han registrado flujos de integración.</p>
                                    <button onClick={openCreateFlow} className="mt-2 text-xs font-bold text-mie-blue hover:underline">
                                        Crear primer flujo ahora
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Project Notes Section */}
                    <div className="bg-card ring-1 ring-border rounded-3xl p-6 shadow-sm">
                        <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><Cpu size={16} className="text-mie-purple" /> Notas y Documentación Técnica</h3>
                        <textarea
                            className="w-full p-4 bg-muted/30 border border-border rounded-2xl focus:ring-2 focus:ring-mie-purple outline-none resize-none text-xs text-foreground"
                            placeholder="Enlace a repositorios, credenciales de staging, variables de entorno..."
                            rows={6}
                            defaultValue={proyecto.notas || ""}
                            onBlur={(e) => handleNotesChange(e.target.value)}
                        />
                        <p className="text-[10px] text-muted-foreground mt-2 text-right">Se guarda automáticamente al hacer click fuera del cuadro de texto</p>
                    </div>
                </div>

                {/* Right Side: Kickoff Checklist & Info */}
                <div className="space-y-6">
                    {/* Checklist panel */}
                    <div className="bg-card ring-1 ring-border rounded-3xl p-6 shadow-sm">
                        <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
                            <CheckCircle size={16} className="text-mie-purple" />
                            Kickoff & Prerrequisitos
                        </h3>
                        {checklistItems.length > 0 ? (
                            <ul className="space-y-3">
                                {checklistItems.map((item, idx) => (
                                    <li key={idx} className="flex items-start gap-2.5 text-xs text-foreground leading-relaxed">
                                        <input 
                                            type="checkbox" 
                                            className="mt-0.5 rounded border-border text-mie-purple focus:ring-mie-purple" 
                                        />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="text-center py-6 bg-muted/20 rounded-xl text-xs text-muted-foreground">
                                No se configuró checklist en la propuesta de este proyecto.
                            </div>
                        )}
                    </div>

                    {/* System specs / proposal info */}
                    {cotizacion && (
                        <div className="bg-muted/10 border border-border rounded-3xl p-6 space-y-4">
                            <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Resumen de Propuesta Asociada</h3>
                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Propuesta Código:</span>
                                    <span className="font-bold text-foreground">{cotizacion.codigo}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Validez Propuesta:</span>
                                    <span className="font-bold text-foreground">{cotizacion.validez}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Responsable Comercial:</span>
                                    <span className="font-bold text-foreground">{cotizacion.vendedor}</span>
                                </div>
                            </div>
                            <div className="border-t border-border/50 pt-3">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">El Desafío de Negocio:</span>
                                <p className="text-[11px] text-muted-foreground line-clamp-4 leading-relaxed italic">{cotizacion.desafioNegocio}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Flow Create/Edit Modal */}
            <Modal isOpen={showFlowModal} onClose={() => setShowFlowModal(false)} title={isEditingFlow ? "Editar Integración / Flow" : "Agregar Nueva Integración"}>
                <form onSubmit={handleFlowSubmit} className="space-y-4 text-sm">
                    <div>
                        <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">Nombre del Flujo *</label>
                        <input
                            type="text"
                            required
                            className="w-full px-3 py-2.5 bg-muted rounded-xl ring-1 ring-border focus:ring-2 focus:ring-mie-blue outline-none"
                            placeholder="Ej: Sincronización Stripe a CRM"
                            value={flowForm.nombre}
                            onChange={(e) => setFlowForm(prev => ({ ...prev, nombre: e.target.value }))}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">Tipo de Integración</label>
                            <select
                                className="w-full px-3 py-2.5 bg-muted rounded-xl ring-1 ring-border focus:ring-2 focus:ring-mie-blue outline-none"
                                value={flowForm.tipo}
                                onChange={(e) => setFlowForm(prev => ({ ...prev, tipo: e.target.value }))}
                            >
                                <option value="WhatsApp AI Agent">WhatsApp AI Agent</option>
                                <option value="CRM Sync">CRM Sync</option>
                                <option value="Invoicing Bot">Invoicing Bot</option>
                                <option value="Web Catalogo Sync">Web Catalogo Sync</option>
                                <option value="Custom API Hook">Custom API Hook</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">Estado Operacional</label>
                            <select
                                className="w-full px-3 py-2.5 bg-muted rounded-xl ring-1 ring-border focus:ring-2 focus:ring-mie-blue outline-none"
                                value={flowForm.estado}
                                onChange={(e) => setFlowForm(prev => ({ ...prev, estado: e.target.value as any }))}
                            >
                                <option value="ACTIVO">ACTIVO (En ejecución)</option>
                                <option value="PAUSADO">PAUSADO (Detenido)</option>
                                <option value="ERROR">ERROR (Falla de Ejecución)</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">Ejecuciones (24h)</label>
                            <input
                                type="number"
                                className="w-full px-3 py-2.5 bg-muted rounded-xl ring-1 ring-border focus:ring-2 focus:ring-mie-blue outline-none"
                                value={flowForm.ejecuciones24h}
                                onChange={(e) => setFlowForm(prev => ({ ...prev, ejecuciones24h: Number(e.target.value) }))}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">Tasa Éxito %</label>
                            <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                className="w-full px-3 py-2.5 bg-muted rounded-xl ring-1 ring-border focus:ring-2 focus:ring-mie-blue outline-none"
                                value={flowForm.tasaExito}
                                onChange={(e) => setFlowForm(prev => ({ ...prev, tasaExito: Number(e.target.value) }))}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">Tiempo Promedio</label>
                            <input
                                type="number"
                                step="0.1"
                                className="w-full px-3 py-2.5 bg-muted rounded-xl ring-1 ring-border focus:ring-2 focus:ring-mie-blue outline-none"
                                value={flowForm.tiempoPromedio}
                                onChange={(e) => setFlowForm(prev => ({ ...prev, tiempoPromedio: Number(e.target.value) }))}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">Notas de la Integración</label>
                        <textarea
                            className="w-full px-3 py-2.5 bg-muted rounded-xl ring-1 ring-border focus:ring-2 focus:ring-mie-blue outline-none resize-none"
                            rows={3}
                            placeholder="Describa qué automatiza este flujo..."
                            value={flowForm.notas}
                            onChange={(e) => setFlowForm(prev => ({ ...prev, notas: e.target.value }))}
                        />
                    </div>

                    <div className="flex gap-3 pt-3">
                        <button
                            type="submit"
                            className="flex-1 bg-mie-blue hover:bg-mie-blue/90 text-white font-bold py-3 rounded-xl shadow-md transition-all active:scale-[0.98]"
                        >
                            {isEditingFlow ? "Guardar Cambios" : "Crear Flujo"}
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowFlowModal(false)}
                            className="px-6 py-3 rounded-xl ring-1 ring-border font-bold text-muted-foreground hover:bg-muted transition-all active:scale-[0.98]"
                        >
                            Cancelar
                        </button>
                    </div>
                </form>
            </Modal>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
