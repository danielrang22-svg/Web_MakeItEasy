"use client";

import { useEffect, useState, useMemo } from "react";
import { useProyectosStore } from "@/lib/state/proyectosStore";
import { EstadoProyecto, Proyecto } from "@/lib/types";
import { Toast, ConfirmDialog } from "@/components/ui/SharedUI";
import {
    Search, FolderKanban, Trash2, Filter, X, ArrowRight,
    PlayCircle, CheckCircle, Package, Clock, ArrowUpDown, ChevronDown, Layers, Activity
} from "lucide-react";
import Link from "next/link";

type SortField = "fecha" | "cliente" | "progreso";
type SortDir = "asc" | "desc";

const ESTADO_PROYECTO_STYLES: Record<EstadoProyecto, { bg: string; text: string; icon: React.ReactNode }> = {
    [EstadoProyecto.DIAGNOSTICO]: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-600 dark:text-blue-400", icon: <PlayCircle size={14} /> },
    [EstadoProyecto.DISENO]: { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-600 dark:text-purple-400", icon: <Clock size={14} /> },
    [EstadoProyecto.IMPLEMENTACION]: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-600 dark:text-amber-400", icon: <Layers size={14} /> },
    [EstadoProyecto.SOPORTE]: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-600 dark:text-emerald-400", icon: <CheckCircle size={14} /> },
};

export default function ProyectosPage() {
    const store = useProyectosStore();
    const { proyectos, loadProyectos, loadOrdenes, loadCotizaciones, deleteProyecto, ordenes, getProyectoFinancials, getProjectProgress } = store;

    const [searchQuery, setSearchQuery] = useState("");
    const [filterEstado, setFilterEstado] = useState<EstadoProyecto | "">("");
    const [filterCliente, setFilterCliente] = useState("");
    const [viewMode, setViewMode] = useState<"kanban" | "tarjetas" | "lista">("tarjetas");
    const [sortField, setSortField] = useState<SortField>("fecha");
    const [sortDir, setSortDir] = useState<SortDir>("desc");
    const [showSortMenu, setShowSortMenu] = useState(false);
    const [viewContext, setViewContext] = useState<"activos" | "historial">("activos");
    const [deletingProyecto, setDeletingProyecto] = useState<Proyecto | null>(null);
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

    useEffect(() => {
        loadProyectos();
        loadOrdenes();
        loadCotizaciones();
    }, [loadProyectos, loadOrdenes, loadCotizaciones]);

    // Unique clients list
    const clientesUnicos = useMemo(() => {
        const set = new Set(proyectos.map(p => p.clienteNombre).filter(Boolean));
        return Array.from(set).sort();
    }, [proyectos]);

    // Apply filters + sort
    const filtered = useMemo(() => {
        let list = [...proyectos];
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            list = list.filter(p =>
                p.titulo.toLowerCase().includes(q) ||
                p.clienteNombre.toLowerCase().includes(q)
            );
        }
        
        if (viewContext === "activos") {
            list = list.filter(p => p.estado !== EstadoProyecto.SOPORTE);
        } else {
            list = list.filter(p => p.estado === EstadoProyecto.SOPORTE);
        }

        if (filterEstado) list = list.filter(p => p.estado === filterEstado);
        if (filterCliente) list = list.filter(p => p.clienteNombre === filterCliente);
        
        list.sort((a, b) => {
            let cmp = 0;
            if (sortField === "fecha") cmp = new Date(a.fechaCreacion).getTime() - new Date(b.fechaCreacion).getTime();
            else if (sortField === "cliente") cmp = a.clienteNombre.localeCompare(b.clienteNombre);
            else if (sortField === "progreso") cmp = getProjectProgress(a.id) - getProjectProgress(b.id);
            return sortDir === "asc" ? cmp : -cmp;
        });
        return list;
    }, [proyectos, searchQuery, filterEstado, filterCliente, sortField, sortDir, ordenes, viewContext]);

    const getFlowStats = (proyectoId: string) => {
        let activos = 0; let pausados = 0; let errores = 0;
        ordenes.filter(o => o.proyectoId === proyectoId).forEach(o => {
            if (o.estado === "ACTIVO") activos++;
            else if (o.estado === "PAUSADO") pausados++;
            else if (o.estado === "ERROR") errores++;
        });
        return { activos, pausados, errores };
    };

    const hasActiveFilters = filterEstado !== "" || filterCliente !== "";
    function clearFilters() { setFilterEstado(""); setFilterCliente(""); }

    const SORT_LABELS: Record<SortField, string> = { fecha: "Fecha", cliente: "Cliente", progreso: "Progreso" };
    function toggleSort(field: SortField) {
        if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
        else { setSortField(field); setSortDir("desc"); }
        setShowSortMenu(false);
    }

    async function handleDelete() {
        if (!deletingProyecto) return;
        await deleteProyecto(deletingProyecto.id);
        setDeletingProyecto(null);
        setToast({ message: "Proyecto eliminado", type: "info" });
    }

    return (
        <div className="px-5 pb-32" onClick={() => setShowSortMenu(false)}>
            <div className="mt-4 mb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <FolderKanban size={24} className="text-mie-primary" />
                        Proyectos
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1">{filtered.length} proyectos en esta vista</p>
                </div>
                
                <div className="flex bg-muted p-1 rounded-xl">
                    <button 
                        onClick={() => setViewContext("activos")} 
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewContext === "activos" ? "bg-card shadow-sm text-mie-primary" : "text-muted-foreground hover:text-foreground"}`}
                    >
                        Activos (Dev)
                    </button>
                    <button 
                        onClick={() => setViewContext("historial")} 
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewContext === "historial" ? "bg-card shadow-sm text-mie-secondary" : "text-muted-foreground hover:text-foreground"}`}
                    >
                        Soporte & Mantenimiento
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="relative mb-3">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                    type="text"
                    className="w-full pl-10 pr-4 py-3 bg-card rounded-2xl ring-1 ring-border focus:ring-2 focus:ring-mie-primary outline-none transition-all"
                    placeholder="Buscar por cliente o título de proyecto..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Filters Row */}
            <div className="flex gap-2 mb-6 flex-wrap items-center">
                {/* View Tabs */}
                <div className="flex bg-muted p-1 rounded-xl mr-2 shrink-0">
                    <button onClick={() => setViewMode("tarjetas")} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === "tarjetas" ? "bg-card shadow-sm text-mie-primary" : "text-muted-foreground hover:text-foreground"}`}>Tarjetas</button>
                    <button onClick={() => setViewMode("kanban")} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === "kanban" ? "bg-card shadow-sm text-mie-secondary" : "text-muted-foreground hover:text-foreground"}`}>Kanban</button>
                    <button onClick={() => setViewMode("lista")} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === "lista" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Lista</button>
                </div>
                
                <Filter size={14} className="text-muted-foreground shrink-0" />
                <select
                    value={filterEstado}
                    onChange={(e) => setFilterEstado(e.target.value as EstadoProyecto)}
                    className="px-3 py-1.5 bg-card rounded-xl ring-1 ring-border text-xs outline-none focus:ring-mie-primary min-w-[130px]"
                >
                    <option value="">Todos los estados</option>
                    {Object.values(EstadoProyecto).map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
                <select
                    value={filterCliente}
                    onChange={(e) => setFilterCliente(e.target.value)}
                    className="px-3 py-1.5 bg-card rounded-xl ring-1 ring-border text-xs outline-none focus:ring-mie-primary min-w-[130px]"
                >
                    <option value="">Todos los clientes</option>
                    {clientesUnicos.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <div className="relative ml-auto" onClick={e => e.stopPropagation()}>
                    <button
                        onClick={() => setShowSortMenu(s => !s)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-card rounded-xl ring-1 ring-border text-xs font-medium hover:ring-mie-primary transition-all"
                    >
                        <ArrowUpDown size={13} />
                        Ordenar: {SORT_LABELS[sortField]} ({sortDir === "asc" ? "↑" : "↓"})
                        <ChevronDown size={13} className={`transition-transform ${showSortMenu ? "rotate-180" : ""}`} />
                    </button>
                    {showSortMenu && (
                        <div className="absolute right-0 top-full mt-1 bg-card ring-1 ring-border rounded-xl shadow-xl z-50 overflow-hidden min-w-[170px]">
                            {(["fecha", "cliente", "progreso"] as SortField[]).map(field => (
                                <button
                                    key={field}
                                    onClick={() => toggleSort(field)}
                                    className={`w-full text-left px-4 py-2.5 text-xs font-medium flex items-center justify-between hover:bg-muted/60 transition-colors ${sortField === field ? "text-mie-primary" : ""}`}
                                >
                                    {SORT_LABELS[field]}
                                    {sortField === field && (
                                        <span className="text-[10px] font-bold text-mie-primary">
                                            {sortDir === "asc" ? "↑ ASC" : "↓ DESC"}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                {hasActiveFilters && (
                    <button onClick={clearFilters} className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg flex items-center gap-1">
                        <X size={12} /> Limpiar
                    </button>
                )}
            </div>

            {/* Project Views */}
            {viewMode === "tarjetas" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((proyecto) => {
                        const estilo = ESTADO_PROYECTO_STYLES[proyecto.estado];
                        const progreso = getProjectProgress(proyecto.id);
                        const financials = getProyectoFinancials(proyecto.id);
                        
                        return (
                            <div key={proyecto.id} className="p-5 bg-card ring-1 ring-border rounded-3xl hover:shadow-lg transition-all group flex flex-col h-full">
                                <div className="flex items-start justify-between mb-4">
                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${estilo?.bg} ${estilo?.text}`}>
                                        {estilo?.icon} {proyecto.estado}
                                    </span>
                                    <button onClick={() => setDeletingProyecto(proyecto)} className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                
                                <h3 className="font-bold text-lg mb-1 leading-tight line-clamp-2">{proyecto.titulo}</h3>
                                <p className="text-sm font-medium text-muted-foreground flex items-center gap-1 mb-4">
                                    <Package size={14} /> {proyecto.clienteNombre}
                                </p>
                                
                                <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                                    <div className="bg-muted/50 p-2 rounded-xl">
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Ingreso Total</p>
                                        <p className="font-bold">${financials.ingreso.toLocaleString()}</p>
                                    </div>
                                    <div className="bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded-xl text-emerald-600">
                                        <p className="text-[10px] uppercase font-bold opacity-80">Margen Estimado</p>
                                        <p className="font-bold">${financials.ganancia.toLocaleString()}</p>
                                    </div>
                                </div>
                                
                                { /* Resumen de Integraciones */ }
                                {(() => {
                                    const stats = getFlowStats(proyecto.id);
                                    return (
                                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase mb-4 opacity-80 justify-between px-1">
                                            <span className="text-emerald-500">⚡ ACTIVO: {stats.activos}</span>
                                            <span className="text-amber-500">⏸️ PAUSADO: {stats.pausados}</span>
                                            <span className="text-red-500">⚠️ ERROR: {stats.errores}</span>
                                        </div>
                                    );
                                })()}
                                
                                <div className="mt-auto pt-4 border-t border-border">
                                    <div className="flex justify-between items-center text-xs mb-2">
                                        <span className="font-medium text-muted-foreground">Progreso Fases</span>
                                        <span className="font-bold">{progreso}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden mb-4">
                                        <div 
                                            className="h-full bg-mie-primary rounded-full transition-all duration-500" 
                                            style={{ width: `${progreso}%` }}
                                        ></div>
                                    </div>
                                    
                                    <Link 
                                        href={`/proyectos/${proyecto.id}`}
                                        className="w-full py-2.5 bg-muted/50 hover:bg-mie-primary/10 text-mie-primary font-semibold rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
                                    >
                                        Monitorear Integraciones <ArrowRight size={16} />
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {viewMode === "lista" && (
                <div className="bg-card ring-1 ring-border rounded-2xl overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-muted/50 border-b border-border">
                            <tr>
                                <th className="px-4 py-3 font-bold text-muted-foreground">Proyecto</th>
                                <th className="px-4 py-3 font-bold text-muted-foreground">Cliente</th>
                                <th className="px-4 py-3 font-bold text-muted-foreground">Estado</th>
                                <th className="px-4 py-3 font-bold text-muted-foreground text-center">Progreso</th>
                                <th className="px-4 py-3 font-bold text-muted-foreground text-center">Flujos (Act/Pau/Err)</th>
                                <th className="px-4 py-3 font-bold text-muted-foreground text-right">Valor Core</th>
                                <th className="px-4 py-3 font-bold text-muted-foreground text-right">Margen Est.</th>
                                <th className="px-4 py-3 text-right"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filtered.map(proyecto => {
                                const estilo = ESTADO_PROYECTO_STYLES[proyecto.estado];
                                const progreso = getProjectProgress(proyecto.id);
                                const financials = getProyectoFinancials(proyecto.id);
                                
                                return (
                                    <tr key={proyecto.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-3 font-bold max-w-[200px] truncate" title={proyecto.titulo}>
                                            <Link href={`/proyectos/${proyecto.id}`} className="hover:text-mie-primary transition-colors">
                                                {proyecto.titulo}
                                            </Link>
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">{proyecto.clienteNombre}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase inline-flex items-center gap-1 ${estilo?.bg} ${estilo?.text}`}>
                                                {estilo?.icon} {proyecto.estado}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2 justify-center">
                                                <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                                                    <div className="h-full bg-mie-primary rounded-full" style={{ width: `${progreso}%` }}></div>
                                                </div>
                                                <span className="text-[10px] font-bold w-6">{progreso}%</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            {(() => {
                                                const stats = getFlowStats(proyecto.id);
                                                return (
                                                    <div className="flex justify-center gap-2 text-[10px] font-bold">
                                                        <span className="text-emerald-500">{stats.activos}</span>/
                                                        <span className="text-amber-500">{stats.pausados}</span>/
                                                        <span className="text-red-500">{stats.errores}</span>
                                                    </div>
                                                )
                                            })()}
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium">${financials.ingreso.toLocaleString()}</td>
                                        <td className="px-4 py-3 text-right font-bold text-emerald-600">${financials.ganancia.toLocaleString()}</td>
                                        <td className="px-4 py-3 text-right">
                                            <button onClick={() => setDeletingProyecto(proyecto)} className="p-1.5 text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {viewMode === "kanban" && (
                <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
                   {Object.values(EstadoProyecto).filter(e => viewContext === "activos" ? e !== EstadoProyecto.SOPORTE : e === EstadoProyecto.SOPORTE).map(estado => {
                       const cols = filtered.filter(p => p.estado === estado);
                       const estilo = ESTADO_PROYECTO_STYLES[estado];
                       return (
                           <div key={estado} className="min-w-[320px] max-w-[320px] bg-muted/20 rounded-3xl p-3 snap-start ring-1 ring-border/50 flex flex-col h-[calc(100vh-280px)]">
                               <h3 className="font-bold text-sm mb-3 uppercase flex items-center justify-between px-1">
                                   <span className={`flex items-center gap-1.5 ${estilo?.text}`}>
                                       {estilo?.icon} {estado}
                                   </span>
                                   <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded-full text-xs">{cols.length}</span>
                               </h3>
                               <div className="space-y-3 overflow-y-auto custom-scrollbar pr-1 flex-1 pb-4">
                                   {cols.map(proyecto => {
                                       const progreso = getProjectProgress(proyecto.id);
                                       const financials = getProyectoFinancials(proyecto.id);
                                       return (
                                           <Link key={proyecto.id} href={`/proyectos/${proyecto.id}`} className="block p-4 bg-card ring-1 ring-border rounded-2xl hover:shadow-md transition-shadow group">
                                               <div className="flex justify-between items-start mb-2">
                                                   <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                                                       <Package size={10} /> {proyecto.clienteNombre}
                                                   </span>
                                                   <button onClick={(e) => { e.preventDefault(); setDeletingProyecto(proyecto); }} className="text-red-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                       <Trash2 size={12} />
                                                   </button>
                                               </div>
                                               <h4 className="font-bold text-sm leading-tight mb-3">{proyecto.titulo}</h4>
                                               <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground mb-2">
                                                    <span>${financials.ingreso.toLocaleString()}</span>
                                                    <span className="text-emerald-600">+${financials.ganancia.toLocaleString()}</span>
                                               </div>
                                               
                                                {(() => {
                                                    const stats = getFlowStats(proyecto.id);
                                                    return (
                                                        <div className="flex items-center gap-2 text-[9px] font-bold uppercase mb-3 opacity-80 justify-start">
                                                            <span className="text-emerald-500">⚡ {stats.activos}</span>
                                                            <span className="text-amber-500">⏸️ {stats.pausados}</span>
                                                            <span className="text-red-500">⚠️ {stats.errores}</span>
                                                        </div>
                                                    );
                                                })()}

                                               <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                                   <div className="h-full bg-mie-primary rounded-full" style={{ width: `${progreso}%` }}></div>
                                               </div>
                                           </Link>
                                       );
                                   })}
                                   {cols.length === 0 && (
                                       <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-2xl h-32 flex items-center justify-center">
                                           <p className="text-xs font-medium">Arrastra aquí o vacio</p>
                                       </div>
                                   )}
                               </div>
                           </div>
                       )
                   })}
                </div>
            )}
            
            {filtered.length === 0 && (
                <div className="text-center py-20 text-muted-foreground">
                    <FolderKanban size={48} className="mx-auto mb-4 opacity-20" />
                    <h3 className="text-lg font-bold mb-1 text-foreground">No hay proyectos</h3>
                    <p className="text-sm">Genera un proyecto desde una cotización aprobada.</p>
                </div>
            )}

            <ConfirmDialog 
                isOpen={!!deletingProyecto} 
                title="Eliminar Proyecto" 
                message={`¿Eliminarás el proyecto "${deletingProyecto?.titulo}" y todos sus flujos de automatización integrados? Esta acción no se puede deshacer.`} 
                onConfirm={handleDelete} 
                onCancel={() => setDeletingProyecto(null)} 
            />
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
