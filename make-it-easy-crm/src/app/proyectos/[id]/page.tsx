"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useProyectosStore } from "@/lib/state/proyectosStore";
import { useTareasStore, Tarea } from "@/lib/state/tareasStore";
import { EstadoProyecto, Proyecto, AutomationFlow } from "@/lib/types";
import { formatCurrency } from "@/lib/constants";
import { Modal, Toast } from "@/components/ui/SharedUI";
import {
    ArrowLeft, Clock, CalendarDays, Eye, CheckCircle,
    Archive, DollarSign, Ban, Activity, Cpu, Layers, Play, Pause, AlertCircle, Plus, Trash2, Edit2, Wrench,
    LayoutList, Github, Sparkles, BookOpen, List, Kanban, TrendingUp
} from "lucide-react";
import Link from "next/link";

// Components
import TaskBoard from "@/components/proyectos/TaskBoard";
import TaskPanel from "@/components/proyectos/TaskPanel";
import CreateTaskModal from "@/components/proyectos/CreateTaskModal";
import AiTaskGenerator from "@/components/proyectos/AiTaskGenerator";
import GitHubPanel from "@/components/proyectos/GitHubPanel";
import MilestonesView from "@/components/proyectos/MilestonesView";
import TaskListView from "@/components/proyectos/TaskListView";
import BitacoraPanel from "@/components/proyectos/BitacoraPanel";
import GastosPanel from "@/components/proyectos/GastosPanel";
import IngresosPanel from "@/components/proyectos/IngresosPanel";
import { useGastosStore } from "@/lib/state/gastosStore";

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
    
    const { loadTareas, loadMilestones, tareas } = useTareasStore();

    const [proyecto, setProyecto] = useState<Proyecto | null>(null);
    const [flows, setFlows] = useState<AutomationFlow[]>([]);
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // View tabs
    const [activeTab, setActiveTab] = useState<"tasks" | "flows" | "github" | "bitacora" | "finanzas">("tasks");
    const [taskViewMode, setTaskViewMode] = useState<"board" | "list">("board");

    // Gastos store
    const { fetchGastos, gastos } = useGastosStore();

    // Tasks Modals
    const [showCreateTask, setShowCreateTask] = useState(false);
    const [showAiTask, setShowAiTask] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Tarea | null>(null);

    // Flow Modals
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
        loadTareas(id);
        loadMilestones(id);
        fetchGastos(id);
    }, [id, loadProyectos, loadOrdenes, loadCotizaciones, loadTareas, loadMilestones, fetchGastos]);

    const projectGastos = gastos.filter(g => g.proyectoId === id);
    const totalCostos = projectGastos.reduce((sum, g) => sum + g.monto, 0);

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
    const cotizacion = cotizaciones.find(c => c.id === proyecto.cotizacionId);
    const financials = getProyectoFinancials(proyecto.id);
    
    // Overall progress now considering tasks as well as basic stages
    const tasksProgress = tareas.length > 0 ? Math.round((tareas.filter(t => t.estado === "COMPLETADO").length / tareas.length) * 100) : getProjectProgress(proyecto.id);
    
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

    const handleGithubChange = async (repo: string) => {
        try {
            await updateProyecto(proyecto.id, { githubRepo: repo || null });
            setToast({ message: "Repositorio GitHub actualizado", type: "success" });
        } catch (e) {
            setToast({ message: "Error al guardar repositorio", type: "error" });
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
            setToast({ message: "Notas actualizadas", type: "success" });
        } catch (e) {
            setToast({ message: "Error al guardar notas", type: "error" });
        }
    };

    const openCreateFlow = () => {
        setIsEditingFlow(false);
        setSelectedFlowId(null);
        setFlowForm({ nombre: "", tipo: "WhatsApp AI Agent", estado: "PAUSADO", ejecuciones24h: 0, tasaExito: 100.0, tiempoPromedio: 0.0, notas: "" });
        setShowFlowModal(true);
    };

    const openEditFlow = (flow: AutomationFlow) => {
        setIsEditingFlow(true);
        setSelectedFlowId(flow.id);
        setFlowForm({ nombre: flow.nombre, tipo: flow.tipo, estado: flow.estado, ejecuciones24h: flow.ejecuciones24h, tasaExito: flow.tasaExito, tiempoPromedio: flow.tiempoPromedio, notas: flow.notas });
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
                    setToast({ message: "Flujo actualizado", type: "success" });
                    setShowFlowModal(false);
                    loadOrdenes();
                }
            } else {
                const res = await fetch("/api/flows", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ...flowForm, proyectoId: proyecto.id })
                });
                if (res.ok) {
                    setToast({ message: "Flujo creado", type: "success" });
                    setShowFlowModal(false);
                    loadOrdenes();
                }
            }
        } catch {
            setToast({ message: "Error de red", type: "error" });
        }
    };

    const handleDeleteFlow = async (flowId: string) => {
        if (!confirm("¿Estás seguro de eliminar este flujo?")) return;
        try {
            const res = await fetch(`/api/flows/${flowId}`, { method: "DELETE" });
            if (res.ok) {
                setToast({ message: "Flujo eliminado", type: "info" });
                loadOrdenes();
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
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Progreso General</p>
                        <div className="flex items-end gap-2">
                            <p className="text-2xl font-black text-mie-blue">{tasksProgress}%</p>
                            <p className="text-xs text-muted-foreground mb-1">({tareas.filter(t=>t.estado==="COMPLETADO").length}/{tareas.length} Tareas)</p>
                        </div>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mt-3">
                        <div className="h-full bg-mie-blue rounded-full transition-all duration-500" style={{ width: `${tasksProgress}%` }}></div>
                    </div>
                </div>

                {/* Integration Flows Summary */}
                <div className="p-4 bg-card ring-1 ring-border rounded-2xl flex flex-col justify-between shadow-sm">
                    <div>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Flujos (Automations)</p>
                        <div className="flex gap-3 mt-1">
                            <div className="text-center flex-1 py-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 rounded-lg">
                                <span className="text-sm font-bold block">{flows.filter(f => f.estado === "ACTIVO").length}</span>
                                <span className="text-[9px] uppercase font-bold opacity-80">Activos</span>
                            </div>
                            <div className="text-center flex-1 py-1 bg-amber-50 dark:bg-amber-950/20 text-amber-600 rounded-lg">
                                <span className="text-sm font-bold block">{flows.filter(f => f.estado === "PAUSADO").length}</span>
                                <span className="text-[9px] uppercase font-bold opacity-80">Pausa</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* GitHub Card */}
                <div className="p-4 bg-card ring-1 ring-border rounded-2xl flex flex-col justify-between shadow-sm text-sm">
                    <div>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                            <Github size={12} /> GitHub Repo (owner/repo)
                        </p>
                        <input 
                            type="text" 
                            className="bg-transparent border-none text-xs font-semibold text-foreground w-full focus:ring-0 outline-none p-0"
                            value={proyecto.githubRepo || ""}
                            onChange={(e) => setProyecto({...proyecto, githubRepo: e.target.value})}
                            onBlur={(e) => handleGithubChange(e.target.value)}
                            placeholder="danielrang22-svg/Web_MakeItEasy"
                        />
                    </div>
                    <div className="mt-2 border-t border-border/50 pt-2">
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Herramientas</p>
                        <input 
                            type="text" 
                            className="bg-transparent border-none text-xs font-semibold text-mie-purple w-full focus:ring-0 outline-none p-0"
                            value={proyecto.herramientasUsadas || ""}
                            onChange={(e) => setProyecto({...proyecto, herramientasUsadas: e.target.value})}
                            onBlur={(e) => handleToolsChange(e.target.value)}
                            placeholder="n8n, Make, OpenAI..."
                        />
                    </div>
                </div>

                {/* Commercial Summary Card (Now ROI metrics) */}
                <div className="p-4 bg-card ring-1 ring-border rounded-2xl flex flex-col justify-center shadow-sm">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Ingresos vs Costos</p>
                    <div className="flex justify-between items-end mb-1">
                        <span className="text-xs font-bold text-muted-foreground">Ingreso:</span>
                        <span className="text-sm font-black text-foreground">{formatCurrency(financials.ingreso, cotizacion?.moneda || "COP")}</span>
                    </div>
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-xs font-bold text-muted-foreground">Costos:</span>
                        <span className="text-sm font-black text-rose-500">-{formatCurrency(totalCostos)}</span>
                    </div>
                    <div className="flex justify-between items-end border-t border-border pt-1">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Rentabilidad Bruta</span>
                        <span className="text-lg font-black text-emerald-600 flex items-center gap-1">
                            <TrendingUp size={14} /> {formatCurrency(financials.ingreso - totalCostos, cotizacion?.moneda || "COP")}
                        </span>
                    </div>
                </div>
            </div>

            {/* TAB SELECTOR */}
            <div className="flex gap-4 border-b border-border mb-6">
                <button 
                    onClick={() => setActiveTab("tasks")}
                    className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === "tasks" ? "border-mie-primary text-mie-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                >
                    <LayoutList size={16}/> Tablero de Tareas
                </button>
                <button 
                    onClick={() => setActiveTab("flows")}
                    className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === "flows" ? "border-mie-primary text-mie-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                >
                    <Activity size={16}/> Integraciones n8n
                </button>
                <button 
                    onClick={() => setActiveTab("github")}
                    className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === "github" ? "border-mie-primary text-mie-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                >
                    <Github size={16}/> GitHub Webhooks
                </button>
                <button 
                    onClick={() => setActiveTab("bitacora")}
                    className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === "bitacora" ? "border-mie-primary text-mie-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                >
                    <BookOpen size={16}/> Bitácora
                </button>
                <button 
                    onClick={() => setActiveTab("finanzas")}
                    className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === "finanzas" ? "border-mie-primary text-mie-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                >
                    <DollarSign size={16}/> Finanzas
                </button>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                
                {/* Left Area (Takes up 3 columns) */}
                <div className="lg:col-span-3 space-y-6">
                    
                    {activeTab === "tasks" && (
                        <div className="bg-card ring-1 ring-border rounded-3xl p-6 shadow-sm min-h-[500px]">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-lg font-bold flex items-center gap-2">
                                        <LayoutList size={20} className="text-mie-primary" />
                                        Tablero de Tareas
                                    </h2>
                                    <p className="text-xs text-muted-foreground mt-0.5">Gestión de tareas, bugs y requerimientos del proyecto</p>
                                </div>
                                <div className="flex gap-2 items-center">
                                    <div className="flex bg-muted/50 p-1 rounded-xl mr-2">
                                        <button 
                                            onClick={() => setTaskViewMode("board")}
                                            className={`p-1.5 rounded-lg transition-colors ${taskViewMode === "board" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                                        >
                                            <Kanban size={14} />
                                        </button>
                                        <button 
                                            onClick={() => setTaskViewMode("list")}
                                            className={`p-1.5 rounded-lg transition-colors ${taskViewMode === "list" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                                        >
                                            <List size={14} />
                                        </button>
                                    </div>
                                    <button 
                                        onClick={() => setShowAiTask(true)}
                                        className="bg-mie-purple/10 hover:bg-mie-purple/20 text-mie-purple px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                                    >
                                        <Sparkles size={14} /> IA Generador
                                    </button>
                                    <button 
                                        onClick={() => setShowCreateTask(true)}
                                        className="bg-mie-primary text-white hover:bg-mie-primary/90 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                                    >
                                        <Plus size={14} /> Nueva Tarea
                                    </button>
                                </div>
                            </div>
                            
                            {taskViewMode === "board" ? (
                                <TaskBoard onTaskClick={(t) => setSelectedTask(t)} />
                            ) : (
                                <div className="h-[500px]">
                                    <TaskListView tareas={tareas} />
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "flows" && (
                        <div className="bg-card ring-1 ring-border rounded-3xl p-6 shadow-sm min-h-[500px]">
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
                                                <div className="flex items-center gap-4 pt-1 text-[11px] text-muted-foreground">
                                                    <span>Ejecuciones (24h): <strong className="text-foreground">{flow.ejecuciones24h}</strong></span>
                                                    <span>Tasa Éxito: <strong className={flow.tasaExito < 98 ? "text-amber-500" : "text-emerald-500"}>{flow.tasaExito}%</strong></span>
                                                    <span>Tiempo prom: <strong className="text-foreground">{flow.tiempoPromedio}s</strong></span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                                                <button onClick={() => toggleFlowStatus(flow)} className={`p-2 rounded-xl border border-border hover:bg-muted transition-colors ${isAct ? "text-amber-500" : "text-emerald-600"}`}>
                                                    {isAct ? <Pause size={14} /> : <Play size={14} />}
                                                </button>
                                                <button onClick={() => openEditFlow(flow)} className="p-2 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                                                    <Edit2 size={14} />
                                                </button>
                                                <button onClick={() => handleDeleteFlow(flow.id)} className="p-2 rounded-xl border border-border hover:bg-rose-50 dark:hover:bg-rose-950/20 text-red-500 transition-colors">
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
                    )}

                    {activeTab === "github" && (
                        <div className="bg-card ring-1 ring-border rounded-3xl p-6 shadow-sm min-h-[500px]">
                            <div className="mb-4">
                                <h2 className="text-lg font-bold flex items-center gap-2">
                                    <Github size={20} className="text-foreground" />
                                    Conexión GitHub
                                </h2>
                                <p className="text-xs text-muted-foreground mt-0.5">Control de versiones, PRs y commits para este proyecto</p>
                            </div>
                            <div className="h-[400px]">
                                <GitHubPanel githubRepo={proyecto.githubRepo || null} />
                            </div>
                        </div>
                    )}

                    {activeTab === "bitacora" && (
                        <div className="bg-card ring-1 ring-border rounded-3xl p-6 shadow-sm min-h-[500px]">
                            <BitacoraPanel proyectoId={proyecto.id} />
                        </div>
                    )}

                    {activeTab === "finanzas" && (
                        <div className="space-y-6">
                            <div className="bg-card ring-1 ring-border rounded-3xl p-6 shadow-sm">
                                <IngresosPanel proyectoId={proyecto.id} monedaBase={cotizacion?.moneda || "COP"} />
                            </div>
                            <div className="bg-card ring-1 ring-border rounded-3xl p-6 shadow-sm">
                                <GastosPanel proyectoId={proyecto.id} />
                            </div>
                        </div>
                    )}

                </div>

                {/* Right Side (1 column) */}
                <div className="space-y-6">
                    {/* Milestones Panel */}
                    <div className="h-[300px]">
                        <MilestonesView proyectoId={proyecto.id} />
                    </div>

                    {/* Notes Panel */}
                    <div className="bg-card ring-1 ring-border rounded-3xl p-6 shadow-sm">
                        <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><Cpu size={16} className="text-mie-purple" /> Notas Técnicas</h3>
                        <textarea
                            className="w-full p-4 bg-muted/30 border border-border rounded-2xl focus:ring-2 focus:ring-mie-purple outline-none resize-none text-xs text-foreground"
                            placeholder="Enlace a repositorios, credenciales de staging..."
                            rows={6}
                            value={proyecto.notas || ""}
                            onChange={(e) => setProyecto({...proyecto, notas: e.target.value})}
                            onBlur={(e) => handleNotesChange(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Modals */}
            {showCreateTask && (
                <CreateTaskModal 
                    proyectoId={proyecto.id} 
                    onClose={() => setShowCreateTask(false)} 
                />
            )}
            
            {showAiTask && (
                <AiTaskGenerator 
                    proyectoId={proyecto.id} 
                    cotizacionId={proyecto.cotizacionId}
                    onClose={() => setShowAiTask(false)}
                    onSuccess={() => {
                        setShowAiTask(false);
                        setToast({ message: "Tareas generadas con éxito", type: "success" });
                        loadTareas(proyecto.id);
                    }}
                />
            )}

            {selectedTask && (
                <TaskPanel 
                    task={selectedTask} 
                    onClose={() => setSelectedTask(null)} 
                />
            )}

            <Modal isOpen={showFlowModal} onClose={() => setShowFlowModal(false)} title={isEditingFlow ? "Editar Integración" : "Agregar Integración"}>
                <form onSubmit={handleFlowSubmit} className="space-y-4 text-sm">
                    <div>
                        <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">Nombre del Flujo *</label>
                        <input type="text" required className="w-full px-3 py-2.5 bg-muted rounded-xl ring-1 ring-border focus:ring-2 focus:ring-mie-blue outline-none" value={flowForm.nombre} onChange={(e) => setFlowForm(prev => ({ ...prev, nombre: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">Tipo</label>
                            <select className="w-full px-3 py-2.5 bg-muted rounded-xl ring-1 ring-border outline-none" value={flowForm.tipo} onChange={(e) => setFlowForm(prev => ({ ...prev, tipo: e.target.value }))}>
                                <option value="WhatsApp AI Agent">WhatsApp AI Agent</option>
                                <option value="CRM Sync">CRM Sync</option>
                                <option value="Invoicing Bot">Invoicing Bot</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">Estado</label>
                            <select className="w-full px-3 py-2.5 bg-muted rounded-xl ring-1 ring-border outline-none" value={flowForm.estado} onChange={(e) => setFlowForm(prev => ({ ...prev, estado: e.target.value as any }))}>
                                <option value="ACTIVO">ACTIVO</option>
                                <option value="PAUSADO">PAUSADO</option>
                                <option value="ERROR">ERROR</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex gap-3 pt-3">
                        <button type="submit" className="flex-1 bg-mie-blue text-white font-bold py-3 rounded-xl">{isEditingFlow ? "Guardar" : "Crear"}</button>
                    </div>
                </form>
            </Modal>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
