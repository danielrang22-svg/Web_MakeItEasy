"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useCotizacionesStore, getFilteredCotizaciones } from "@/lib/state/cotizacionesStore";
import { useLeadsStore } from "@/lib/state/leadsStore";
import { useEmpresasStore } from "@/lib/state/empresasStore";
import { useContactosStore } from "@/lib/state/contactosStore";
import { exportCotizacionClientePDF } from "@/lib/utils/exportPDF";
import { Cotizacion, CotizacionCreateData, EstadoCotizacion } from "@/lib/types";
import { formatCurrency } from "@/lib/constants";
import { Modal, Toast, ConfirmDialog } from "@/components/ui/SharedUI";
import { useRouter } from "next/navigation";
import { useProyectosStore } from "@/lib/state/proyectosStore";
import ImportQuoteModal from "@/components/cotizaciones/ImportQuoteModal";
import {
    Search, FileText, Plus, Pencil, Trash2, Eye, Download,
    Building2, User, DollarSign, Cpu, CheckCircle, Clock, Filter, X, ArrowRight, Archive, Sparkles,
    ChevronDown, Send, Users, Link2, UploadCloud, Github
} from "lucide-react";
import { CotizacionView } from "@/components/cotizaciones/CotizacionView";
import AIBriefInput, { AiProposal } from "@/components/cotizaciones/AIBriefInput";
import QuotationForm from "@/components/cotizaciones/QuotationForm";

const ESTADO_STYLES: Record<EstadoCotizacion, { bg: string; text: string; dot: string; icon: React.ReactNode; label: string }> = {
    [EstadoCotizacion.BORRADOR]: { bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-600 dark:text-gray-400", dot: "#9ca3af", icon: <Clock size={12} />, label: "Borrador" },
    [EstadoCotizacion.REVISION_TECNICA]: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-600", dot: "#f59e0b", icon: <Eye size={12} />, label: "Revisión Técnica" },
    [EstadoCotizacion.APROBADA_TECNICAMENTE]: { bg: "bg-teal-100 dark:bg-teal-900/30", text: "text-teal-600", dot: "#14b8a6", icon: <CheckCircle size={12} />, label: "Aprobada Tec." },
    [EstadoCotizacion.ENVIADA_CLIENTE]:  { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-mie-primary", dot: "#3b82f6", icon: <Send size={12} />, label: "Enviada" },
    [EstadoCotizacion.APROBADA_CLIENTE]: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-600", dot: "#22c55e", icon: <CheckCircle size={12} />, label: "Aprobada Cliente" },
    [EstadoCotizacion.RECHAZADA_CLIENTE]:{ bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-500", dot: "#ef4444", icon: <XCircleIcon size={12} />, label: "Rechazada Cliente" },
};

function XCircleIcon({ size }: { size: number }) {
    return (
        <span style={{ fontSize: `${size}px` }}>❌</span>
    );
}

export default function CotizacionesPage() {
    const router = useRouter();
    const store = useCotizacionesStore();
    const { cotizaciones, loadCotizaciones, createCotizacion, updateCotizacion, deleteCotizacion, setSearchQuery, searchQuery } = store;
    const { leads, loadLeads } = useLeadsStore();
    const { empresas, loadEmpresas } = useEmpresasStore();
    const { contactos, loadContactos } = useContactosStore();
    const { generarDesdeCotizacion, loadProyectos, loadOrdenes, proyectos } = useProyectosStore();

    const [showForm, setShowForm] = useState(false);
    const [showAiBrief, setShowAiBrief] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const [aiPrefilledData, setAiPrefilledData] = useState<AiProposal | null>(null);
    const [linkedLeadId, setLinkedLeadId] = useState<string | null>(null);
    const [editingCot, setEditingCot] = useState<Cotizacion | null>(null);
    const [viewingCot, setViewingCot] = useState<Cotizacion | null>(null);
    const [clientView, setClientView] = useState(false);
    const [deletingCot, setDeletingCot] = useState<Cotizacion | null>(null);
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
    const [filterEmpresa, setFilterEmpresa] = useState("");
    const [filterContacto, setFilterContacto] = useState("");
    const [filterEstado, setFilterEstado] = useState("");
    const [activeTab, setActiveTab] = useState<"activas" | "historial">("activas");
    const [quickStateMenu, setQuickStateMenu] = useState<string | null>(null); // cotizacion id with open menu
    const quickStateRef = useRef<HTMLDivElement>(null);

    // Initializing Project Modal
    const [initProjectCot, setInitProjectCot] = useState<Cotizacion | null>(null);
    const [createGithubRepo, setCreateGithubRepo] = useState(true);
    const [githubRepoVisibility, setGithubRepoVisibility] = useState<"private" | "public">("private");
    const [isInitializing, setIsInitializing] = useState(false);

    useEffect(() => { 
        loadCotizaciones(); 
        loadLeads(); 
        loadEmpresas(); 
        loadContactos(); 
        loadProyectos();
        loadOrdenes();
    }, [loadCotizaciones, loadLeads, loadEmpresas, loadContactos, loadProyectos, loadOrdenes]);

    // Close quick state menu when clicking outside
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (quickStateRef.current && !quickStateRef.current.contains(e.target as Node)) {
                setQuickStateMenu(null);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const uniqueEmpresas = [...new Set(cotizaciones.map((c) => c.empresaNombre))].filter(Boolean).sort();
    const uniqueContactos = [...new Set(cotizaciones.map((c) => c.contactoNombre))].filter(Boolean).sort();

    let filtered = getFilteredCotizaciones(store);
    
    if (activeTab === "activas") {
        filtered = filtered.filter(c => c.estado !== EstadoCotizacion.APROBADA_CLIENTE && c.estado !== EstadoCotizacion.RECHAZADA_CLIENTE);
    } else {
        filtered = filtered.filter(c => c.estado === EstadoCotizacion.APROBADA_CLIENTE || c.estado === EstadoCotizacion.RECHAZADA_CLIENTE);
    }

    if (filterEmpresa) filtered = filtered.filter((c) => c.empresaNombre === filterEmpresa);
    if (filterContacto) filtered = filtered.filter((c) => c.contactoNombre === filterContacto);
    if (filterEstado) filtered = filtered.filter((c) => c.estado === filterEstado);

    const hasActiveFilters = filterEmpresa || filterContacto || filterEstado;
    function clearFilters() { setFilterEmpresa(""); setFilterContacto(""); setFilterEstado(""); }

    async function handleDelete() {
        if (!deletingCot) return;
        await deleteCotizacion(deletingCot.id);
        setDeletingCot(null);
        setToast({ message: "Cotización eliminada", type: "info" });
    }

    function openCreate() {
        setEditingCot(null);
        setAiPrefilledData(null);
        setLinkedLeadId(null);
        setShowAiBrief(true);
    }

    function openEdit(cot: Cotizacion) {
        setEditingCot(cot);
        setAiPrefilledData(null);
        setShowForm(true);
    }

    function handleAiProposalGenerated(proposal: AiProposal) {
        setAiPrefilledData(proposal);
        setShowAiBrief(false);
        setShowForm(true);
    }

    async function handleQuickStateChange(cot: Cotizacion, newEstado: EstadoCotizacion) {
        setQuickStateMenu(null);
        await updateCotizacion(cot.id, { estado: newEstado });
        setToast({ message: `Estado cambiado a: ${newEstado}`, type: "success" });
    }

    function openView(cot: Cotizacion, isClient: boolean) {
        setViewingCot(cot);
        setClientView(isClient);
    }

    function handleExportPDF(cot: Cotizacion) {
        try {
            exportCotizacionClientePDF(cot);
            setToast({ message: "PDF listo — usa Ctrl+P para guardar", type: "success" });
        } catch (err) {
            console.error("PDF export error:", err);
            setToast({ message: "Error al generar PDF", type: "error" });
        }
    }

    function openInitProject(cot: Cotizacion) {
        setInitProjectCot(cot);
        setCreateGithubRepo(true);
        setGithubRepoVisibility("private");
    }

    async function handleInitProjectConfirmed(e: React.FormEvent) {
        e.preventDefault();
        if (!initProjectCot) return;
        setIsInitializing(true);

        try {
            const proyecto = await generarDesdeCotizacion(initProjectCot);
            if (!proyecto) throw new Error("No se pudo generar el proyecto base");
            
            await updateCotizacion(initProjectCot.id, { estado: EstadoCotizacion.APROBADA_CLIENTE });
            
            let successMessage = "Proyecto generado exitosamente";

            if (createGithubRepo) {
                setToast({ message: "Creando repositorio en GitHub y configurando webhooks...", type: "info" });
                
                // Safe name parsing: mie-company-name
                const safeName = `mie-${initProjectCot.empresaNombre.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
                
                const repoRes = await fetch("/api/github/repos", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        nombre: safeName,
                        descripcion: `CRM Generated: ${initProjectCot.tituloPropuesta}`,
                        privado: githubRepoVisibility === "private"
                    })
                });

                if (repoRes.ok) {
                    const repoData = await repoRes.json();
                    if (repoData.full_name) {
                        await fetch(`/api/proyectos/${proyecto.id}`, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ githubRepo: repoData.full_name })
                        });
                        successMessage = "Proyecto y repositorio de GitHub creados exitosamente";
                        if (!repoData.webhook_configured) {
                            successMessage = "Repo creado, pero falló la configuración del Webhook.";
                        }
                    }
                } else {
                    const err = await repoRes.json();
                    console.error("Github Error", err);
                    setToast({ message: "Proyecto creado, pero falló la creación del repo en GitHub", type: "error" });
                }
            }

            setToast({ message: successMessage, type: "success" });
            setTimeout(() => {
                router.push(`/proyectos/${proyecto.id}`);
            }, 1000);
        } catch (error) {
            console.error(error);
            setToast({ message: "Error al generar proyecto", type: "error" });
        } finally {
            setIsInitializing(false);
            setInitProjectCot(null);
        }
    }

    return (
        <div className="px-5 pb-32">
            <div className="mt-4 mb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <FileText size={24} className="text-mie-secondary" />
                        Propuestas Comerciales
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1">{filtered.length} propuestas registradas</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setShowImport(true)} className="bg-card text-foreground px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 shadow-sm ring-1 ring-border hover:bg-surface-bright transition-all">
                        <UploadCloud size={16} /> Importar Cotización
                    </button>
                    <button onClick={openCreate} className="mie-gradient text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all">
                        <Sparkles size={16} /> Nueva con IA
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-muted p-1 rounded-2xl mb-4 w-fit shadow-sm">
                <button 
                    onClick={() => setActiveTab("activas")}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeTab === "activas" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                    <FileText size={14} /> En Negociación / Borrador
                </button>
                <button 
                    onClick={() => setActiveTab("historial")}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeTab === "historial" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                    <Archive size={14} /> Ganadas (Proyectos Activos)
                </button>
            </div>

            {/* Search */}
            <div className="relative mb-3">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                    type="text"
                    className="w-full pl-10 pr-4 py-3 bg-card rounded-2xl ring-1 ring-border focus:ring-2 focus:ring-mie-primary outline-none"
                    placeholder="Buscar por código, cliente o contacto..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-4 flex-wrap items-center">
                <Filter size={14} className="text-muted-foreground" />
                <select
                    value={filterEmpresa}
                    onChange={(e) => setFilterEmpresa(e.target.value)}
                    className="px-3 py-1.5 bg-card rounded-xl ring-1 ring-border text-xs outline-none focus:ring-mie-primary"
                >
                    <option value="">Todas las empresas</option>
                    {uniqueEmpresas.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
                <select
                    value={filterContacto}
                    onChange={(e) => setFilterContacto(e.target.value)}
                    className="px-3 py-1.5 bg-card rounded-xl ring-1 ring-border text-xs outline-none focus:ring-mie-primary"
                >
                    <option value="">Todos los contactos</option>
                    {uniqueContactos.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <select
                    value={filterEstado}
                    onChange={(e) => setFilterEstado(e.target.value)}
                    className="px-3 py-1.5 bg-card rounded-xl ring-1 ring-border text-xs outline-none focus:ring-mie-primary"
                >
                    <option value="">Todos los estados</option>
                    {Object.values(EstadoCotizacion).map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
                {hasActiveFilters && (
                    <button onClick={clearFilters} className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg flex items-center gap-1">
                        <X size={12} /> Limpiar
                    </button>
                )}
            </div>

            {/* Cotización Cards */}
            <div className="space-y-3">
                {filtered.map((cot) => {
                    const estilo = ESTADO_STYLES[cot.estado] || ESTADO_STYLES[EstadoCotizacion.BORRADOR];
                    let numFases = 0;
                    try {
                        if (cot.fasesJson) numFases = JSON.parse(cot.fasesJson).length;
                    } catch {}

                    return (
                        <div key={cot.id} className="p-4 bg-card ring-1 ring-border rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="font-bold text-base">
                                            {cot.codigo} {cot.version > 1 && <span className="text-mie-secondary ml-1">V{cot.version}</span>}
                                        </h3>
                                        {/* Quick State Badge with Dropdown */}
                                        <div className="relative" ref={quickStateMenu === cot.id ? quickStateRef : undefined}>
                                            <button
                                                onClick={() => setQuickStateMenu(quickStateMenu === cot.id ? null : cot.id)}
                                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity ${estilo.bg} ${estilo.text}`}
                                            >
                                                {estilo.icon} {estilo.label ?? cot.estado}
                                                <ChevronDown size={10} className="ml-0.5" />
                                            </button>
                                            {quickStateMenu === cot.id && (
                                                <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-20 min-w-[160px] overflow-hidden">
                                                    {Object.values(EstadoCotizacion).filter(e => e !== cot.estado).map(estado => {
                                                        const s = ESTADO_STYLES[estado];
                                                        return (
                                                            <button
                                                                key={estado}
                                                                onClick={() => handleQuickStateChange(cot, estado)}
                                                                className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold hover:bg-muted transition-colors text-left ${s.text}`}
                                                            >
                                                                {s.icon} {s.label ?? estado}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                        <Building2 size={10} /> {cot.empresaNombre}
                                        <span className="mx-1">·</span>
                                        <User size={10} /> {cot.contactoNombre}
                                    </p>
                                    <p className="text-xs font-semibold text-mie-secondary mt-1.5 truncate max-w-md">
                                        {cot.tituloPropuesta}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black">{formatCurrency(cot.totalProyectoCore, cot.moneda)}</p>
                                    <p className="text-[10px] text-emerald-600 font-bold">+{formatCurrency(cot.feeMensual, cot.moneda)}/mes support</p>
                                </div>
                            </div>

                            {/* Value summary */}
                            <div className="flex gap-2 mt-3 flex-wrap text-xs font-medium">
                                <span className="px-2 py-1 bg-muted text-muted-foreground rounded-lg">{numFases} Fases de Desarrollo</span>
                                <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/10 text-mie-primary rounded-lg">Outbound Opcional: {formatCurrency(cot.moduloOpcionalFee, cot.moneda)}</span>
                                <span className="text-muted-foreground py-1 ml-auto">{cot.fecha.split("T")[0]}</span>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 mt-3 flex-wrap items-center border-t border-border/50 pt-3">
                                {cot.estado === EstadoCotizacion.APROBADA_CLIENTE && !proyectos.find(p => p.cotizacionId === cot.id) ? (
                                    <button 
                                        onClick={() => openInitProject(cot)} 
                                        className="px-3 py-1.5 text-xs text-white bg-mie-secondary hover:bg-mie-secondary/90 rounded-lg flex items-center gap-1 font-bold shadow-sm shadow-mie-secondary/20 transition-all mr-2"
                                        title="Generar proyecto con flujos de automatización"
                                    >
                                        <Cpu size={14} /> 🚀 Iniciar Proyecto <ArrowRight size={14} />
                                    </button>
                                ) : (() => {
                                    const existingProject = proyectos.find(p => p.cotizacionId === cot.id);
                                    if (existingProject) {
                                        return (
                                            <button 
                                                onClick={() => router.push(`/proyectos/${existingProject.id}`)}
                                                className="px-3 py-1.5 text-xs text-white bg-green-600 hover:bg-green-700 rounded-lg flex items-center gap-1 font-bold shadow-sm transition-all mr-2"
                                                title="Ver proyecto existente"
                                            >
                                                <CheckCircle size={14} /> Monitorear Proyecto <ArrowRight size={14} />
                                            </button>
                                        );
                                    }
                                    return null;
                                })()}
                                
                                <button onClick={() => openView(cot, false)} className="px-2 py-1 text-xs text-muted-foreground hover:bg-muted rounded-lg flex items-center gap-1">
                                    <Eye size={12} /> Vista Interna
                                </button>
                                <button onClick={() => openView(cot, true)} className="px-2 py-1 text-xs text-mie-primary hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded-lg flex items-center gap-1">
                                    <Users size={12} /> Vista Cliente
                                </button>
                                <button onClick={() => handleExportPDF(cot)} className="px-2 py-1 text-xs text-mie-secondary hover:bg-mie-secondary/10 rounded-lg flex items-center gap-1">
                                    <Download size={12} /> Exportar PDF
                                </button>
                                <button onClick={() => openEdit(cot)} className="px-2 py-1 text-xs text-muted-foreground hover:bg-muted rounded-lg flex items-center gap-1">
                                    <Pencil size={12} /> Editar
                                </button>
                                <button onClick={() => setDeletingCot(cot)} className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg flex items-center gap-1 ml-auto">
                                    <Trash2 size={12} /> Eliminar
                                </button>
                            </div>
                        </div>
                    );
                })}
                {filtered.length === 0 && (
                    <div className="text-center py-16 text-muted-foreground bg-card ring-1 ring-border rounded-3xl">
                        <FileText size={48} className="mx-auto mb-4 opacity-20" />
                        <p className="font-semibold text-xs">No hay propuestas comerciales registradas</p>
                    </div>
                )}
            </div>

            {/* AI BRIEF MODAL — with lead selector */}
            <Modal isOpen={showAiBrief} onClose={() => setShowAiBrief(false)} title="✨ Nueva Propuesta con Agente IA">
                <div className="p-1 max-h-[85vh] overflow-y-auto custom-scrollbar space-y-3">
                    {/* Lead selector */}
                    <div className="p-3 bg-muted/40 rounded-xl border border-border">
                        <label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5 mb-2">
                            <Link2 size={11} /> Vincular a Lead (opcional)
                        </label>
                        <select
                            value={linkedLeadId || ""}
                            onChange={e => setLinkedLeadId(e.target.value || null)}
                            className="w-full px-3 py-2 bg-card rounded-xl ring-1 ring-border text-xs outline-none focus:ring-mie-primary"
                        >
                            <option value="">— Sin vincular a lead —</option>
                            {leads.map(l => (
                                <option key={l.id} value={l.id}>
                                    {l.empresa} — {l.nombreContacto} {l.planInteres ? `(${l.planInteres})` : ""}
                                </option>
                            ))}
                        </select>
                    </div>
                    <AIBriefInput
                        leadData={linkedLeadId ? (() => {
                            const lead = leads.find(l => l.id === linkedLeadId);
                            return lead ? {
                                empresa: lead.empresa,
                                sector: lead.sector || undefined,
                                numEmpleados: lead.numEmpleados || undefined,
                                procesoAAutomatizar: lead.procesoAAutomatizar || undefined,
                                planInteres: lead.planInteres || undefined,
                                valorEstimado: lead.valorEstimado,
                            } : null;
                        })() : null}
                        onProposalGenerated={handleAiProposalGenerated}
                        onSkip={() => { setShowAiBrief(false); setShowForm(true); }}
                    />
                </div>
            </Modal>

            {/* IMPORT MODAL */}
            <ImportQuoteModal
                isOpen={showImport}
                onClose={() => setShowImport(false)}
                empresas={empresas.map(e => e.nombre)}
                contactos={contactos.map(c => ({ nombre: c.nombre, empresa: c.empresaNombre || "" }))}
                onImportSuccess={(data) => {
                    setShowImport(false);
                    setAiPrefilledData(data);
                    
                    if (data.empresaNombre) {
                        const matchedLead = leads.find(l => l.empresa.toLowerCase() === data.empresaNombre.toLowerCase());
                        if (matchedLead) {
                            setLinkedLeadId(matchedLead.id);
                        } else {
                            setLinkedLeadId(null);
                        }
                    } else {
                        setLinkedLeadId(null);
                    }
                    
                    setEditingCot(null);
                    setShowForm(true);
                }}
            />

            {/* CREATE / EDIT FORM MODAL */}
            <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editingCot ? `Editar Propuesta ${editingCot.codigo} V${editingCot.version}` : "Crear Propuesta Comercial"}>
                <div className="p-1 max-h-[85vh] overflow-y-auto custom-scrollbar">
                    <QuotationForm
                        initial={editingCot}
                        aiPrefilled={aiPrefilledData}
                        allCotizaciones={cotizaciones}
                        empresas={empresas.map((e) => e.nombre)}
                        contactos={contactos.map((c) => ({ nombre: c.nombre, empresa: c.empresaNombre || "" }))}
                        onSubmit={async (data) => {
                            const dataWithLead = { ...data, leadId: linkedLeadId || data.leadId || "" };
                            if (editingCot) {
                                await updateCotizacion(editingCot.id, dataWithLead);
                                setToast({ message: "Propuesta actualizada", type: "success" });
                            } else {
                                await createCotizacion(dataWithLead);
                                setToast({ message: "Propuesta creada", type: "success" });
                            }
                            setShowForm(false);
                            setAiPrefilledData(null);
                            setLinkedLeadId(null);
                        }}
                        onCancel={() => { setShowForm(false); setAiPrefilledData(null); setLinkedLeadId(null); }}
                    />
                </div>
            </Modal>

            {/* VIEW MODAL */}
            <Modal wide isOpen={!!viewingCot} onClose={() => setViewingCot(null)} title={viewingCot ? `${viewingCot.codigo} ${viewingCot.version > 1 ? `V${viewingCot.version}` : ""} — ${clientView ? "Vista Cliente" : "Vista Interna"}` : ""}>
                {viewingCot && (
                    <div className="p-1 max-h-[80vh] overflow-y-auto custom-scrollbar">
                        {/* View mode switcher */}
                        <div className="flex gap-1 mb-4 bg-muted p-1 rounded-xl w-fit">
                            <button
                                onClick={() => setClientView(false)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${ !clientView ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                            >
                                <Eye size={12} /> Interna
                            </button>
                            <button
                                onClick={() => setClientView(true)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${ clientView ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                            >
                                <Users size={12} /> Vista Cliente
                            </button>
                            <button
                                onClick={() => handleExportPDF(viewingCot)}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 text-mie-secondary hover:bg-mie-secondary/10"
                            >
                                <Download size={12} /> Exportar PDF
                            </button>
                        </div>
                        <CotizacionView cot={viewingCot} isClient={clientView} />
                    </div>
                )}
            </Modal>

            <ConfirmDialog isOpen={!!deletingCot} title="Eliminar Propuesta" message={`¿Estás seguro de eliminar permanentemente la propuesta "${deletingCot?.codigo}"?`} onConfirm={handleDelete} onCancel={() => setDeletingCot(null)} />
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* Init Project Modal */}
            <Modal isOpen={!!initProjectCot} onClose={() => !isInitializing && setInitProjectCot(null)} title="🚀 Inicializar Proyecto">
                {initProjectCot && (
                    <form onSubmit={handleInitProjectConfirmed} className="space-y-4">
                        <div className="bg-muted/50 p-4 rounded-xl border border-border">
                            <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Cliente / Proyecto</p>
                            <p className="text-sm font-bold text-foreground">{initProjectCot.empresaNombre}</p>
                        </div>
                        
                        <div className="bg-muted p-4 rounded-xl border border-border mt-4">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    className="w-5 h-5 rounded border-border text-mie-primary focus:ring-mie-primary"
                                    checked={createGithubRepo}
                                    onChange={(e) => setCreateGithubRepo(e.target.checked)}
                                    disabled={isInitializing}
                                />
                                <div>
                                    <p className="font-bold text-sm flex items-center gap-2"><Github size={16}/> Crear repositorio en GitHub</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">Automáticamente crea el repositorio y le asocia los webhooks de Make It Easy.</p>
                                </div>
                            </label>

                            {createGithubRepo && (
                                <div className="mt-4 pt-4 border-t border-border space-y-3">
                                    <div>
                                        <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">Nombre propuesto</label>
                                        <input 
                                            type="text" 
                                            readOnly 
                                            className="w-full px-3 py-2 bg-background rounded-lg border border-border outline-none text-xs text-muted-foreground opacity-70" 
                                            value={`mie-${initProjectCot.empresaNombre.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">Visibilidad</label>
                                        <select 
                                            className="w-full px-3 py-2 bg-background rounded-lg border border-border outline-none text-sm font-medium"
                                            value={githubRepoVisibility}
                                            onChange={(e) => setGithubRepoVisibility(e.target.value as "private" | "public")}
                                            disabled={isInitializing}
                                        >
                                            <option value="private">🔒 Privado (Solo tú e invitados)</option>
                                            <option value="public">🌐 Público (Cualquiera en internet)</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button 
                                type="button" 
                                onClick={() => setInitProjectCot(null)}
                                className="flex-1 bg-muted hover:bg-muted/80 text-foreground font-bold py-3 rounded-xl transition-colors"
                                disabled={isInitializing}
                            >
                                Cancelar
                            </button>
                            <button 
                                type="submit" 
                                className="flex-1 bg-mie-primary hover:bg-mie-primary/90 text-white font-bold py-3 rounded-xl shadow-lg transition-colors flex justify-center items-center gap-2"
                                disabled={isInitializing}
                            >
                                {isInitializing ? (
                                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Creando...</>
                                ) : "Confirmar e Iniciar"}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
}
