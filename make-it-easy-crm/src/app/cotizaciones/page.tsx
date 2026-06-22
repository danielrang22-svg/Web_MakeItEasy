"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useCotizacionesStore, getFilteredCotizaciones } from "@/lib/state/cotizacionesStore";
import { useLeadsStore } from "@/lib/state/leadsStore";
import { useEmpresasStore } from "@/lib/state/empresasStore";
import { useContactosStore } from "@/lib/state/contactosStore";
import { exportCotizacionClientePDF } from "@/lib/utils/exportPDF";
import { Cotizacion, Etapa, EstadoCotizacion, CotizacionCreateData, CotizacionUpdateData } from "@/lib/types";
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
    const [userRole, setUserRole] = useState<string>("");

    useEffect(() => {
        const role = document.cookie.split("mie-role=")[1]?.split(";")[0] || "";
        setUserRole(role);
    }, []);

    // Initializing Project Modal
    const [initProjectCot, setInitProjectCot] = useState<Cotizacion | null>(null);
    const [createGithubRepo, setCreateGithubRepo] = useState(true);
    const [githubRepoVisibility, setGithubRepoVisibility] = useState<"private" | "public">("private");
    const [githubMode, setGithubMode] = useState<"create" | "link">("create");
    const [existingGithubRepo, setExistingGithubRepo] = useState("");
    const [isInitializing, setIsInitializing] = useState(false);

    // Contract generation state
    const [contractModalCot, setContractModalCot] = useState<Cotizacion | null>(null);
    const [contractTrm, setContractTrm] = useState("1");
    const [contractPago, setContractPago] = useState("50% de anticipo para iniciar el desarrollo y 50% contra entrega final y puesta en marcha.");
    const [generatedContractUrl, setGeneratedContractUrl] = useState<string | null>(null);
    const [isGeneratingContract, setIsGeneratingContract] = useState(false);
    const [copiedContract, setCopiedContract] = useState(false);

    function openGenerateContract(cot: Cotizacion) {
        setContractModalCot(cot);
        setContractTrm(cot.moneda === "USD" ? "4000" : "1");
        setContractPago("50% de anticipo para iniciar el desarrollo y 50% contra entrega final y puesta en marcha.");
        setGeneratedContractUrl(null);
        setCopiedContract(false);
    }

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
        if (newEstado === EstadoCotizacion.APROBADA_CLIENTE) {
            openGenerateContract(cot);
            return;
        }
        await updateCotizacion(cot.id, { estado: newEstado });
        setToast({ message: `Estado cambiado a: ${newEstado}`, type: "success" });
    }

    async function handleGenerateContractSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!contractModalCot) return;
        setIsGeneratingContract(true);
        try {
            const res = await fetch("/api/contratos", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    cotizacionId: contractModalCot.id,
                    trmAplicada: parseFloat(contractTrm) || 1.0,
                    condicionesPago: contractPago,
                }),
            });

            if (res.ok) {
                const contrato = await res.json();
                const publicLink = `${window.location.origin}/contrato/${contrato.id}`;
                setGeneratedContractUrl(publicLink);
                // Auto-update quote status to APROBADA_CLIENTE
                await updateCotizacion(contractModalCot.id, { estado: EstadoCotizacion.APROBADA_CLIENTE });
                setToast({ message: "Contrato generado con éxito", type: "success" });
            } else {
                const err = await res.json().catch(() => ({}));
                setToast({ message: err.error || "Error al generar contrato", type: "error" });
            }
        } catch (error) {
            console.error(error);
            setToast({ message: "Error de red al generar contrato", type: "error" });
        } finally {
            setIsGeneratingContract(false);
        }
    }

    function copyContractLink() {
        if (!generatedContractUrl) return;
        navigator.clipboard.writeText(generatedContractUrl);
        setCopiedContract(true);
        setTimeout(() => setCopiedContract(false), 2000);
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
        setGithubMode("create");
        setExistingGithubRepo("");
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
                if (githubMode === "link") {
                    if (!existingGithubRepo.trim()) {
                        throw new Error("Por favor, ingresa el nombre o link del repositorio de GitHub");
                    }

                    // Extract owner/repo
                    let repoFullName = existingGithubRepo.trim();
                    const urlMatch = repoFullName.match(/github\.com\/([^\/]+)\/([^\/\s#?.]+)/i);
                    const sshMatch = repoFullName.match(/github\.com:([^\/]+)\/([^\/\s#?.]+)/i);
                    if (urlMatch) {
                        repoFullName = `${urlMatch[1]}/${urlMatch[2]}`;
                    } else if (sshMatch) {
                        repoFullName = `${sshMatch[1]}/${sshMatch[2]}`;
                    }

                    setToast({ message: "Vinculando repositorio en GitHub y configurando webhooks...", type: "info" });

                    const repoRes = await fetch("/api/github/repos", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            action: "link",
                            fullName: repoFullName
                        })
                    });

                    if (repoRes.ok) {
                        const repoData = await repoRes.json();
                        if (repoData.full_name) {
                            // Link project to repo
                            await fetch(`/api/proyectos/${proyecto.id}`, {
                                method: "PUT",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ githubRepo: repoData.full_name })
                            });

                            successMessage = "Proyecto y repositorio de GitHub vinculados exitosamente";

                            // Trigger auto-sync plan
                            setToast({ message: "Sincronizando plan de trabajo desde GitHub...", type: "info" });
                            const syncRes = await fetch(`/api/proyectos/${proyecto.id}/sync-plan`, {
                                method: "POST"
                            });

                            if (syncRes.ok) {
                                const syncData = await syncRes.json();
                                successMessage = `Proyecto y repositorio vinculados. Sincronizado: ${syncData.milestonesCreated || 0} hitos y ${syncData.tasksCreated || 0} tareas creadas.`;
                            } else {
                                const syncErr = await syncRes.json().catch(() => ({}));
                                console.error("Sync plan error:", syncErr);
                                setToast({ message: "Proyecto vinculado, pero no se encontró o falló el PLAN_DE_TRABAJO.md en el repositorio. Podrás sincronizarlo luego.", type: "error" });
                            }
                        }
                    } else {
                        const err = await repoRes.json().catch(() => ({}));
                        console.error("Github Link Error", err);
                        throw new Error(err.error || "Falló la vinculación del repositorio en GitHub");
                    }
                } else {
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
            }

            setToast({ message: successMessage, type: "success" });
            setTimeout(() => {
                router.push(`/proyectos/${proyecto.id}`);
            }, 1000);
        } catch (error: any) {
            console.error(error);
            setToast({ message: error.message || "Error al generar proyecto", type: "error" });
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
                                                    {Object.values(EstadoCotizacion)
                                                        .filter(e => e !== cot.estado)
                                                        .filter(e => {
                                                             if (userRole === "comercial" && e === EstadoCotizacion.APROBADA_TECNICAMENTE) {
                                                                return false;
                                                            }
                                                            return true;
                                                        })
                                                        .map(estado => {
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
                                {cot.estado === EstadoCotizacion.APROBADA_CLIENTE && !proyectos.find(p => p.cotizacionId === cot.id) && userRole !== "comercial" ? (
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
                                <button 
                                    onClick={() => openGenerateContract(cot)} 
                                    className="px-2 py-1 text-xs text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/10 rounded-lg flex items-center gap-1 font-semibold"
                                >
                                    <FileText size={12} /> Generar Contrato
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
                                await updateCotizacion(editingCot.id, dataWithLead as CotizacionUpdateData);
                                setToast({ message: "Propuesta actualizada", type: "success" });
                            } else {
                                await createCotizacion(dataWithLead as CotizacionCreateData);
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
                                    <p className="font-bold text-sm flex items-center gap-2"><Github size={16}/> Integración con GitHub</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">Asociar un repositorio para gestionar el código y sincronizar el plan de trabajo.</p>
                                </div>
                            </label>

                            {createGithubRepo && (
                                <div className="mt-4 pt-4 border-t border-border space-y-4 animate-fade-in">
                                    {/* Tabs */}
                                    <div className="flex border-b border-border text-xs mb-3">
                                        <button
                                            type="button"
                                            onClick={() => setGithubMode("create")}
                                            className={`flex-1 pb-2 font-bold border-b-2 text-center transition-all ${githubMode === "create" ? "border-mie-primary text-mie-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                                            disabled={isInitializing}
                                        >
                                            Crear Repositorio Nuevo
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setGithubMode("link")}
                                            className={`flex-1 pb-2 font-bold border-b-2 text-center transition-all ${githubMode === "link" ? "border-mie-primary text-mie-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                                            disabled={isInitializing}
                                        >
                                            Vincular Existente
                                        </button>
                                    </div>

                                    {githubMode === "create" ? (
                                        <div className="space-y-3">
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
                                    ) : (
                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">Link o nombre del repositorio</label>
                                                <input 
                                                    type="text" 
                                                    required
                                                    className="w-full px-3 py-2 bg-background rounded-lg border border-border outline-none text-xs text-foreground focus:ring-2 focus:ring-mie-primary" 
                                                    placeholder="Ej: danielrang22-svg/Web_MakeItEasy o URL completa"
                                                    value={existingGithubRepo}
                                                    onChange={(e) => setExistingGithubRepo(e.target.value)}
                                                    disabled={isInitializing}
                                                />
                                                <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
                                                    El repositorio debe contener un archivo <strong>PLAN_DE_TRABAJO.md</strong> en la raíz o dentro de <strong>_BLUEPRINT/</strong> para importar automáticamente las fases y tareas.
                                                </p>
                                            </div>
                                        </div>
                                    )}
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
                                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Procesando...</>
                                ) : "Confirmar e Iniciar"}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* Generar Contrato Modal */}
            <Modal isOpen={!!contractModalCot} onClose={() => !isGeneratingContract && setContractModalCot(null)} title="📄 Generar Contrato y Condiciones de Pago">
                {contractModalCot && (
                    <form onSubmit={handleGenerateContractSubmit} className="space-y-4 text-sm text-white">
                        {!generatedContractUrl ? (
                            <>
                                <div className="p-4 bg-muted/30 border border-border rounded-2xl space-y-2">
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Propuesta Comercial</p>
                                    <p className="text-sm font-black text-foreground">{contractModalCot.codigo} — {contractModalCot.empresaNombre}</p>
                                    <p className="text-xs text-mie-secondary font-medium">{contractModalCot.tituloPropuesta}</p>
                                    <div className="flex gap-4 pt-1.5 text-xs font-semibold text-muted-foreground">
                                        <span>Total: <strong className="text-white">{formatCurrency(contractModalCot.totalProyectoCore, contractModalCot.moneda)}</strong></span>
                                        <span>Mensual soporte: <strong className="text-white">{formatCurrency(contractModalCot.feeMensual, contractModalCot.moneda)}</strong></span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">Moneda Cotizada</label>
                                        <input 
                                            type="text" 
                                            readOnly 
                                            className="w-full px-3 py-2.5 bg-background rounded-xl border border-border outline-none text-xs text-muted-foreground opacity-70"
                                            value={contractModalCot.moneda}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">
                                            {contractModalCot.moneda === "USD" ? "TRM de Conversión (COP) *" : "TRM (No aplica)"}
                                        </label>
                                        <input 
                                            type="number" 
                                            step="0.01"
                                            required
                                            disabled={contractModalCot.moneda !== "USD"}
                                            className="w-full px-3 py-2.5 bg-[#1C2638] text-white border border-border rounded-xl outline-none text-xs focus:ring-2 focus:ring-mie-primary disabled:opacity-50"
                                            placeholder="Ej: 4000.00"
                                            value={contractTrm}
                                            onChange={(e) => setContractTrm(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold uppercase text-muted-foreground">Condiciones de Pago *</label>
                                    <textarea 
                                        required
                                        rows={4}
                                        className="w-full px-3 py-2.5 bg-[#1C2638] text-white border border-border rounded-xl outline-none text-xs focus:ring-2 focus:ring-mie-primary"
                                        placeholder="Ej: 50% de anticipo para iniciar el desarrollo y 50% contra entrega final y puesta en marcha."
                                        value={contractPago}
                                        onChange={(e) => setContractPago(e.target.value)}
                                    />
                                    <p className="text-[10px] text-muted-foreground leading-normal">
                                        Estas condiciones y la TRM se incorporarán automáticamente en la sección de facturación y cláusulas del contrato estándar de Make It Easy.
                                    </p>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button 
                                        type="button"
                                        onClick={() => setContractModalCot(null)}
                                        className="flex-1 bg-muted hover:bg-muted/80 text-foreground font-bold py-3 rounded-xl transition-colors text-xs"
                                        disabled={isGeneratingContract}
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        type="submit"
                                        className="flex-1 bg-mie-primary hover:bg-mie-primary/90 text-white font-bold py-3 rounded-xl shadow-lg transition-colors flex justify-center items-center gap-2 text-xs"
                                        disabled={isGeneratingContract}
                                    >
                                        {isGeneratingContract ? (
                                            <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Generando...</>
                                        ) : (
                                            <>Crear Contrato</>
                                        )}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-6 space-y-4 animate-fade-in text-white">
                                <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-sm">
                                    <span style={{ fontSize: "32px" }}>✅</span>
                                </div>
                                <div className="space-y-1">
                                    <p className="font-bold text-base text-foreground">¡Contrato Generado con Éxito!</p>
                                    <p className="text-xs text-muted-foreground">La cotización ha cambiado de estado a <strong>Aceptada Cliente</strong>.</p>
                                </div>

                                <div className="p-4 bg-muted/40 border border-border rounded-2xl text-left space-y-2 mt-4">
                                    <label className="block text-xs font-bold uppercase text-muted-foreground">Enlace público de firma para el cliente:</label>
                                    <div className="flex gap-2">
                                        <input 
                                            type="text" 
                                            readOnly 
                                            className="flex-1 px-3 py-2 bg-background border border-border rounded-xl text-xs outline-none text-muted-foreground"
                                            value={generatedContractUrl} 
                                        />
                                        <button 
                                            type="button"
                                            onClick={copyContractLink}
                                            className="px-3 bg-mie-secondary text-white font-bold rounded-xl text-xs hover:bg-mie-secondary/90 transition-all flex items-center gap-1.5"
                                        >
                                            {copiedContract ? "Copiado!" : "Copiar"}
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-border">
                                    <button 
                                        type="button"
                                        onClick={() => setContractModalCot(null)}
                                        className="bg-mie-primary hover:bg-mie-primary/90 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition-colors shadow-md"
                                    >
                                        Finalizar y Cerrar
                                    </button>
                                </div>
                            </div>
                        )}
                    </form>
                )}
            </Modal>
        </div>
    );
}
