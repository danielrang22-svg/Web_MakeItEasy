"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Settings, Moon, Sun, Trash2, Download, Database, FileSpreadsheet, Users, Sparkles, Plus, Eye, EyeOff, Check, X, Pencil, Zap, AlertCircle } from "lucide-react";
import { ConfirmDialog, Toast, Modal } from "@/components/ui/SharedUI";
import * as XLSX from "xlsx";
import { useLeadsStore } from "@/lib/state/leadsStore";

export default function AjustesPage() {
    const router = useRouter();
    const { leads, loadLeads } = useLeadsStore();
    const [isDark, setIsDark] = useState(true);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

    // ── AI Connection state ──────────────────────────────────────────
    type AiConnectionRow = {
        id: string; nombre: string; proveedor: string; modelo: string;
        apiKey: string; baseUrl?: string | null;
        fechaCreacion: string;
    };
    // ── Agent state ──────────────────────────────────────────
    type AgentRow = {
        id: string; nombre: string; descripcion?: string | null; systemPrompt: string;
        activo: boolean; connectionId: string;
        conexion?: AiConnectionRow | null;
        fechaCreacion: string;
    };

    const PROVEEDORES = [
        { value: "openai",    label: "OpenAI",          models: ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"] },
        { value: "deepseek",  label: "DeepSeek",        models: ["deepseek-chat", "deepseek-reasoner"] },
        { value: "gemini",    label: "Google Gemini",   models: ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"] },
        { value: "anthropic", label: "Anthropic Claude",models: ["claude-3-5-haiku-20241022", "claude-sonnet-4-5"] },
    ];
    const PROVEEDOR_COLORS: Record<string, string> = {
        openai:    "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300",
        deepseek:  "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300",
        gemini:    "bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300",
        anthropic: "bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300",
    };

    const [aiConfigs, setAiConfigs] = useState<AiConnectionRow[]>([]);
    const [showAiForm, setShowAiForm] = useState(false);
    const [editingAi, setEditingAi] = useState<AiConnectionRow | null>(null);
    const [deletingAi, setDeletingAi] = useState<AiConnectionRow | null>(null);
    const [showApiKey, setShowApiKey] = useState(false);
    const [aiForm, setAiForm] = useState({ nombre: "", proveedor: "openai", modelo: "gpt-4o-mini", apiKey: "", baseUrl: "" });
    const [aiLoading, setAiLoading] = useState(false);

    // Agents state
    const [agents, setAgents] = useState<AgentRow[]>([]);
    const [showAgentForm, setShowAgentForm] = useState(false);
    const [editingAgent, setEditingAgent] = useState<AgentRow | null>(null);
    const [deletingAgent, setDeletingAgent] = useState<AgentRow | null>(null);
    const [agentForm, setAgentForm] = useState({ nombre: "", descripcion: "", systemPrompt: "", connectionId: "", activo: false });
    const [agentLoading, setAgentLoading] = useState(false);
    // ─────────────────────────────────────────────────────────────

    useEffect(() => {
        loadLeads();
        loadAiConfigs();
        loadAgents();
    }, [loadLeads]);

    async function loadAiConfigs() {
        try {
            const res = await fetch("/api/admin/ai-config");
            if (res.ok) setAiConfigs(await res.json());
        } catch {}
    }

    async function loadAgents() {
        try {
            const res = await fetch("/api/admin/agentes");
            if (res.ok) setAgents(await res.json());
        } catch {}
    }

    function toggleDarkMode() {
        const html = document.documentElement;
        if (html.classList.contains("dark")) {
            html.classList.remove("dark");
            setIsDark(false);
        } else {
            html.classList.add("dark");
            setIsDark(true);
        }
    }

    async function handleResetData() {
        try {
            const res = await fetch("/api/admin/reset", { method: "DELETE" });
            if (res.status === 401) {
                setToast({ message: "Acceso denegado. Solo administradores pueden purgar data.", type: "error" });
                setShowResetConfirm(false);
                return;
            }
            if (!res.ok) throw new Error("API reset error");
            setShowResetConfirm(false);
            setToast({ message: "Base de Datos Purgada. Conservando Usuarios.", type: "info" });
            setTimeout(() => window.location.reload(), 1500);
        } catch (e) {
            setToast({ message: "Error reseteando datos", type: "error" });
        }
    }

    async function fetchAllData() {
        const endpoints = ["leads", "cotizaciones", "proyectos", "ordenes", "productos", "contactos", "empresas", "proveedores"];
        const data: any = {};
        for (const ep of endpoints) {
            try {
                const res = await fetch(`/api/${ep}`);
                if (res.ok) data[ep] = await res.json();
            } catch (e) {
                console.error(`Error fetching ${ep}`, e);
            }
        }
        return data;
    }

    async function handleExportJSON() {
        setToast({ message: "Recopilando datos...", type: "info" });
        const data = await fetchAllData();
        if (Object.keys(data).length === 0) {
            setToast({ message: "No hay datos para exportar", type: "error" });
            return;
        }
        const str = JSON.stringify(data, null, 2);
        const blob = new Blob([str], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `mie-crm-full-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setToast({ message: "JSON exportado desde BD completa", type: "success" });
    }

    async function handleExportExcel() {
        setToast({ message: "Recopilando datos...", type: "info" });
        const data = await fetchAllData();
        if (Object.keys(data).length === 0) {
            setToast({ message: "No hay datos en BD", type: "error" });
            return;
        }
        
        const wb = XLSX.utils.book_new();
        
        for (const [key, items] of Object.entries(data)) {
            if (Array.isArray(items) && items.length > 0) {
                const ws = XLSX.utils.json_to_sheet(items);
                XLSX.utils.book_append_sheet(wb, ws, key.charAt(0).toUpperCase() + key.slice(1));
            }
        }
        
        XLSX.writeFile(wb, `mie-crm-full-backup-${new Date().toISOString().slice(0, 10)}.xlsx`);
        setToast({ message: "Excel exportado exitosamente con todas las tablas", type: "success" });
    }

    async function handleSaveAiConfig() {
        setAiLoading(true);
        try {
            if (editingAi) {
                const res = await fetch(`/api/admin/ai-config/${editingAi.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(aiForm),
                });
                if (!res.ok) throw new Error("Error al actualizar");
                setToast({ message: "Conexión actualizada", type: "success" });
            } else {
                const res = await fetch("/api/admin/ai-config", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(aiForm),
                });
                if (!res.ok) throw new Error("Error al crear");
                setToast({ message: "Conexión de IA creada", type: "success" });
            }
            setShowAiForm(false);
            setEditingAi(null);
            loadAiConfigs();
            loadAgents(); // Reload agents to get updated connection details
        } catch {
            setToast({ message: "Error guardando conexión", type: "error" });
        } finally {
            setAiLoading(false);
        }
    }

    async function handleDeleteAiConfig() {
        if (!deletingAi) return;
        try {
            await fetch(`/api/admin/ai-config/${deletingAi.id}`, { method: "DELETE" });
            setDeletingAi(null);
            loadAiConfigs();
            loadAgents(); // Reload agents as deleting connection affects them
            setToast({ message: "Conexión eliminada", type: "info" });
        } catch {
            setToast({ message: "Error al eliminar conexión", type: "error" });
        }
    }

    function openCreateAi() {
        setEditingAi(null);
        setAiForm({ nombre: "", proveedor: "openai", modelo: "gpt-4o-mini", apiKey: "", baseUrl: "" });
        setShowAiForm(true);
    }

    function openEditAi(c: AiConnectionRow) {
        setEditingAi(c);
        setAiForm({ nombre: c.nombre, proveedor: c.proveedor, modelo: c.modelo, apiKey: "", baseUrl: c.baseUrl || "" });
        setShowAiForm(true);
    }

    async function handleSaveAgent() {
        setAgentLoading(true);
        try {
            if (editingAgent) {
                const res = await fetch(`/api/admin/agentes/${editingAgent.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(agentForm),
                });
                if (!res.ok) throw new Error("Error al actualizar");
                setToast({ message: "Agente actualizado", type: "success" });
            } else {
                const res = await fetch("/api/admin/agentes", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(agentForm),
                });
                if (!res.ok) throw new Error("Error al crear");
                setToast({ message: "Agente de IA creado", type: "success" });
            }
            setShowAgentForm(false);
            setEditingAgent(null);
            loadAgents();
        } catch {
            setToast({ message: "Error guardando agente", type: "error" });
        } finally {
            setAgentLoading(false);
        }
    }

    async function handleActivateAgent(id: string) {
        try {
            const res = await fetch(`/api/admin/agentes/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ activo: true }),
            });
            if (!res.ok) throw new Error("Error al activar");
            loadAgents();
            setToast({ message: "Agente activado como principal", type: "success" });
        } catch {
            setToast({ message: "Error al activar agente", type: "error" });
        }
    }

    async function handleDeleteAgent() {
        if (!deletingAgent) return;
        try {
            await fetch(`/api/admin/agentes/${deletingAgent.id}`, { method: "DELETE" });
            setDeletingAgent(null);
            loadAgents();
            setToast({ message: "Agente de IA eliminado", type: "info" });
        } catch {
            setToast({ message: "Error al eliminar agente", type: "error" });
        }
    }

    function openCreateAgent() {
        setEditingAgent(null);
        const defaultConn = aiConfigs.length > 0 ? aiConfigs[0].id : "";
        setAgentForm({ nombre: "", descripcion: "", systemPrompt: "", connectionId: defaultConn, activo: false });
        setShowAgentForm(true);
    }

    function openEditAgent(a: AgentRow) {
        setEditingAgent(a);
        setAgentForm({
            nombre: a.nombre,
            descripcion: a.descripcion || "",
            systemPrompt: a.systemPrompt,
            connectionId: a.connectionId,
            activo: a.activo
        });
        setShowAgentForm(true);
    }

    const selectedProveedor = PROVEEDORES.find(p => p.value === aiForm.proveedor);

    return (
        <div className="px-5 pb-32">
            <div className="mt-4 mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Settings size={24} className="text-mie-secondary" />
                    Ajustes
                </h2>
                <p className="text-muted-foreground text-sm mt-1">
                    Configuración de la aplicación
                </p>
            </div>

            {/* Settings Groups */}
            <div className="space-y-4">
                {/* Appearance */}
                <div className="bg-card ring-1 ring-border rounded-2xl overflow-hidden">
                    <h3 className="px-5 pt-4 pb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Apariencia
                    </h3>
                    <button
                        onClick={toggleDarkMode}
                        className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/50 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                                {isDark ? <Moon size={18} /> : <Sun size={18} />}
                            </div>
                            <div className="text-left">
                                <p className="font-medium text-sm">Modo Oscuro</p>
                                <p className="text-xs text-muted-foreground">
                                    {isDark ? "Activado" : "Desactivado"}
                                </p>
                            </div>
                        </div>
                        <div
                            className={`w-12 h-7 rounded-full p-1 transition-colors ${isDark ? "bg-mie-primary" : "bg-muted"
                                }`}
                        >
                            <div
                                className={`w-5 h-5 rounded-full bg-white transition-transform ${isDark ? "translate-x-5" : "translate-x-0"
                                    }`}
                            />
                        </div>
                    </button>
                </div>

                {/* Personal */}
                <div className="bg-card ring-1 ring-border rounded-2xl overflow-hidden">
                    <h3 className="px-5 pt-4 pb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Personal y Accesos
                    </h3>
                    <button
                        onClick={() => router.push("/ajustes/usuarios")}
                        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/50 transition-colors"
                    >
                        <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <Users size={18} className="text-mie-primary" />
                        </div>
                        <div className="text-left">
                            <p className="font-medium text-sm">Gestión de Personal</p>
                            <p className="text-xs text-muted-foreground">
                                Administrar perfiles de equipo y niveles de acceso
                            </p>
                        </div>
                    </button>
                </div>

                {/* Data */}
                <div className="bg-card ring-1 ring-border rounded-2xl overflow-hidden">
                    <h3 className="px-5 pt-4 pb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Datos
                    </h3>
                    <button
                        onClick={handleExportJSON}
                        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/50 transition-colors"
                    >
                        <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <Download size={18} className="text-green-600 dark:text-green-400" />
                        </div>
                        <div className="text-left">
                            <p className="font-medium text-sm">Copia de Seguridad RAW</p>
                            <p className="text-xs text-muted-foreground">
                                Descargar backup JSON de toda la base de datos
                            </p>
                        </div>
                    </button>
                    <div className="border-t border-border" />
                    <button
                        onClick={handleExportExcel}
                        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/50 transition-colors"
                    >
                        <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                            <FileSpreadsheet size={18} className="text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="text-left">
                            <p className="font-medium text-sm">Exportar a Excel Completo</p>
                            <p className="text-xs text-muted-foreground">
                                Descargar archivo .xlsx con todas las tablas
                            </p>
                        </div>
                    </button>
                    <div className="border-t border-border" />
                    <button
                        onClick={() => setShowResetConfirm(true)}
                        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                    >
                        <div className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                            <Trash2 size={18} className="text-red-600 dark:text-red-400" />
                        </div>
                        <div className="text-left">
                            <p className="font-medium text-sm text-red-600 dark:text-red-400">
                                Purgar Base de Datos
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Borrar todos los leads, cotizaciones e históricos (Conservando Personal)
                            </p>
                        </div>
                    </button>
                </div>

                {/* Info */}
                <div className="bg-card ring-1 ring-border rounded-2xl overflow-hidden">
                    <h3 className="px-5 pt-4 pb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Información
                    </h3>
                    <div className="px-5 py-4 space-y-3">
                        <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Versión</span>
                            <span className="text-sm font-medium">1.0.0 MVP</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Almacenamiento</span>
                            <span className="text-sm font-bold flex items-center gap-1 text-mie-primary">
                                <Database size={12} /> SQLite / Base de Datos
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Framework</span>
                            <span className="text-sm font-medium">Next.js + Tailwind</span>
                        </div>
                    </div>
                </div>

                {/* ── Conexiones de API ── */}
                <div className="bg-card ring-1 ring-border rounded-2xl overflow-hidden">
                    <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <Database size={12} className="text-cyan-500" /> Conexiones de API
                            </h3>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Credenciales y modelos para servicios de IA (OpenAI, DeepSeek, Gemini, Claude).</p>
                        </div>
                        <button
                            onClick={openCreateAi}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-xs font-bold rounded-xl shadow-sm hover:opacity-90 transition-all"
                        >
                            <Plus size={12} /> Nueva Conexión
                        </button>
                    </div>

                    {aiConfigs.length === 0 && (
                        <div className="px-5 pb-5 flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-xl mx-5 mb-4 text-xs">
                            <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                            <div className="text-amber-700 dark:text-amber-400">
                                <strong>No hay conexiones configuradas.</strong> Agrega credenciales de API para que los agentes puedan realizar tareas.
                            </div>
                        </div>
                    )}

                    <div className="divide-y divide-border">
                        {aiConfigs.map((config) => (
                            <div key={config.id} className="px-5 py-4 flex items-center gap-3 hover:bg-muted/30 transition-colors">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-semibold text-sm">{config.nombre}</span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PROVEEDOR_COLORS[config.proveedor] ?? "bg-gray-100 text-gray-600"}`}>
                                            {config.proveedor.toUpperCase()}
                                        </span>
                                        <span className="text-xs text-muted-foreground font-mono">{config.modelo}</span>
                                        <span className="text-xs text-muted-foreground font-mono">{config.apiKey}</span>
                                        {config.baseUrl && (
                                            <span className="text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground font-mono truncate max-w-[150px]" title={config.baseUrl}>
                                                URL: {config.baseUrl}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                        onClick={() => openEditAi(config)}
                                        title="Editar"
                                        className="p-1.5 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                                    >
                                        <Pencil size={14} />
                                    </button>
                                    <button
                                        onClick={() => setDeletingAi(config)}
                                        title="Eliminar"
                                        className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Agentes de IA ── */}
                <div className="bg-card ring-1 ring-border rounded-2xl overflow-hidden">
                    <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <Sparkles size={12} className="text-violet-500" /> Agentes de IA
                            </h3>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Define las instrucciones, prompts y asocia la conexión de API que usará cada agente.</p>
                        </div>
                        <button
                            onClick={openCreateAgent}
                            disabled={aiConfigs.length === 0}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-violet-600 to-cyan-600 text-white text-xs font-bold rounded-xl shadow-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                            title={aiConfigs.length === 0 ? "Primero crea una Conexión de API" : "Nuevo Agente"}
                        >
                            <Plus size={12} /> Nuevo Agente
                        </button>
                    </div>

                    {agents.length === 0 && (
                        <div className="px-5 pb-5 flex items-start gap-3 p-3 bg-violet-50/50 dark:bg-violet-900/5 border border-violet-200 dark:border-violet-800/30 rounded-xl mx-5 mb-4 text-xs">
                            <AlertCircle size={14} className="text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" />
                            <div className="text-violet-700 dark:text-violet-400">
                                <strong>No hay agentes configurados.</strong> Crea un agente de IA, configúrale un prompt de sistema, y asócialo a una conexión de API activa.
                            </div>
                        </div>
                    )}

                    <div className="divide-y divide-border">
                        {agents.map((agent) => (
                            <div key={agent.id} className={`px-5 py-4 flex items-center gap-3 ${agent.activo ? "bg-violet-50/50 dark:bg-violet-900/5" : ""}`}>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-semibold text-sm">{agent.nombre}</span>
                                        {agent.activo && (
                                            <span className="flex items-center gap-1 px-2 py-0.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-[10px] font-bold rounded-full uppercase">
                                                <Zap size={9} /> Activo
                                            </span>
                                        )}
                                    </div>
                                    {agent.descripcion && (
                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{agent.descripcion}</p>
                                    )}
                                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                                        <span className="text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground font-mono">
                                            Conexión: {agent.conexion?.nombre || "Ninguna (Eliminada)"} ({agent.conexion?.proveedor?.toUpperCase()} - {agent.conexion?.modelo})
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    {!agent.activo && (
                                        <button
                                            onClick={() => handleActivateAgent(agent.id)}
                                            title="Activar este agente"
                                            className="p-1.5 text-violet-600 hover:bg-violet-100 dark:hover:bg-violet-900/20 rounded-lg transition-colors"
                                        >
                                            <Check size={14} />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => openEditAgent(agent)}
                                        title="Editar"
                                        className="p-1.5 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                                    >
                                        <Pencil size={14} />
                                    </button>
                                    <button
                                        onClick={() => setDeletingAgent(agent)}
                                        title="Eliminar"
                                        className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── AI Connection Modal ── */}
            <Modal isOpen={showAiForm} onClose={() => setShowAiForm(false)} title={editingAi ? "Editar Conexión de API" : "Nueva Conexión de API"}>
                <div className="p-1 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                            <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Nombre de la Conexión *</label>
                            <input
                                value={aiForm.nombre}
                                onChange={e => setAiForm(f => ({ ...f, nombre: e.target.value }))}
                                placeholder="Ej: OpenAI Principal, DeepSeek Pro..."
                                className="w-full px-3 py-2.5 bg-muted rounded-xl ring-1 ring-border focus:ring-2 focus:ring-violet-500 outline-none text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Proveedor *</label>
                            <select
                                value={aiForm.proveedor}
                                onChange={e => {
                                    const prov = PROVEEDORES.find(p => p.value === e.target.value);
                                    setAiForm(f => ({ ...f, proveedor: e.target.value, modelo: prov?.models[0] ?? "" }));
                                }}
                                className="w-full px-3 py-2.5 bg-muted rounded-xl ring-1 ring-border focus:ring-2 focus:ring-violet-500 outline-none text-sm"
                            >
                                {PROVEEDORES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Modelo *</label>
                            <select
                                value={aiForm.modelo}
                                onChange={e => setAiForm(f => ({ ...f, modelo: e.target.value }))}
                                className="w-full px-3 py-2.5 bg-muted rounded-xl ring-1 ring-border focus:ring-2 focus:ring-violet-500 outline-none text-sm"
                            >
                                {selectedProveedor?.models.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">
                                API Key {editingAi && <span className="text-muted-foreground normal-case">(dejar vacío para no cambiar)</span>}
                            </label>
                            <div className="relative">
                                <input
                                    type={showApiKey ? "text" : "password"}
                                    value={aiForm.apiKey}
                                    onChange={e => setAiForm(f => ({ ...f, apiKey: e.target.value }))}
                                    placeholder={editingAi ? "•••••••••••••• (sin cambios)" : "sk-... o tu API key"}
                                    className="w-full px-3 py-2.5 pr-10 bg-muted rounded-xl ring-1 ring-border focus:ring-2 focus:ring-violet-500 outline-none text-sm font-mono"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowApiKey(v => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>
                        {(aiForm.proveedor === "deepseek" || aiForm.proveedor === "gemini") && (
                            <div className="col-span-2">
                                <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Base URL (opcional)</label>
                                <input
                                    value={aiForm.baseUrl}
                                    onChange={e => setAiForm(f => ({ ...f, baseUrl: e.target.value }))}
                                    placeholder={aiForm.proveedor === "deepseek" ? "https://api.deepseek.com" : "https://generativelanguage.googleapis.com/v1beta/openai/"}
                                    className="w-full px-3 py-2.5 bg-muted rounded-xl ring-1 ring-border focus:ring-2 focus:ring-violet-500 outline-none text-sm font-mono"
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={handleSaveAiConfig}
                            disabled={aiLoading || !aiForm.nombre || !aiForm.proveedor || !aiForm.modelo || (!editingAi && !aiForm.apiKey)}
                            className="flex-1 py-3 bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-bold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-all"
                        >
                            {aiLoading ? "Guardando..." : editingAi ? "Guardar Cambios" : "Crear Conexión"}
                        </button>
                        <button onClick={() => setShowAiForm(false)} className="px-5 py-3 rounded-xl ring-1 ring-border font-bold text-muted-foreground hover:bg-muted transition-all">
                            Cancelar
                        </button>
                    </div>
                </div>
            </Modal>

            {/* ── AI Agent Modal ── */}
            <Modal isOpen={showAgentForm} onClose={() => setShowAgentForm(false)} title={editingAgent ? "Editar Agente de IA" : "Nuevo Agente de IA"}>
                <div className="p-1 space-y-4">
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Nombre del Agente *</label>
                            <input
                                value={agentForm.nombre}
                                onChange={e => setAgentForm(f => ({ ...f, nombre: e.target.value }))}
                                placeholder="Ej: Agente de Cotizaciones, Asistente de Email..."
                                className="w-full px-3 py-2.5 bg-muted rounded-xl ring-1 ring-border focus:ring-2 focus:ring-violet-500 outline-none text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Descripción (opcional)</label>
                            <input
                                value={agentForm.descripcion}
                                onChange={e => setAgentForm(f => ({ ...f, descripcion: e.target.value }))}
                                placeholder="Ej: Agente entrenado para cotizar productos de imprenta..."
                                className="w-full px-3 py-2.5 bg-muted rounded-xl ring-1 ring-border focus:ring-2 focus:ring-violet-500 outline-none text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Conexión de API Asociada *</label>
                            <select
                                value={agentForm.connectionId}
                                onChange={e => setAgentForm(f => ({ ...f, connectionId: e.target.value }))}
                                className="w-full px-3 py-2.5 bg-muted rounded-xl ring-1 ring-border focus:ring-2 focus:ring-violet-500 outline-none text-sm"
                            >
                                <option value="" disabled>Selecciona una conexión...</option>
                                {aiConfigs.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.nombre} ({c.proveedor.toUpperCase()} - {c.modelo})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Prompt del Sistema (Instrucciones) *</label>
                            <textarea
                                value={agentForm.systemPrompt}
                                onChange={e => setAgentForm(f => ({ ...f, systemPrompt: e.target.value }))}
                                placeholder="Escribe aquí las instrucciones de comportamiento, reglas de negocio y restricciones del agente..."
                                rows={6}
                                className="w-full px-3 py-2.5 bg-muted rounded-xl ring-1 ring-border focus:ring-2 focus:ring-violet-500 outline-none text-xs resize-none text-foreground font-mono"
                            />
                        </div>
                        <div className="flex items-center gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setAgentForm(f => ({ ...f, activo: !f.activo }))}
                                className={`w-12 h-7 rounded-full p-1 transition-colors ${agentForm.activo ? "bg-violet-600" : "bg-muted"}`}
                            >
                                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${agentForm.activo ? "translate-x-5" : "translate-x-0"}`} />
                            </button>
                            <label className="text-sm font-medium">Activar como principal</label>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={handleSaveAgent}
                            disabled={agentLoading || !agentForm.nombre || !agentForm.systemPrompt || !agentForm.connectionId}
                            className="flex-1 py-3 bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-bold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-all"
                        >
                            {agentLoading ? "Guardando..." : editingAgent ? "Guardar Cambios" : "Crear Agente"}
                        </button>
                        <button onClick={() => setShowAgentForm(false)} className="px-5 py-3 rounded-xl ring-1 ring-border font-bold text-muted-foreground hover:bg-muted transition-all">
                            Cancelar
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Reset Confirm */}
            <ConfirmDialog
                isOpen={showResetConfirm}
                title="Peligro: Borrado Masivo"
                message="¿Estás seguro de purgar TODA la base de datos? Se destruirán las cotizaciones, proyectos y leads permanentemente. El administrador actual quedará intacto."
                onConfirm={handleResetData}
                onCancel={() => setShowResetConfirm(false)}
            />

            {/* Delete AI Config Confirm */}
            <ConfirmDialog
                isOpen={!!deletingAi}
                title="Eliminar Conexión de API"
                message={`¿Eliminar "${deletingAi?.nombre}"? Todos los agentes que usen esta conexión dejarán de funcionar.`}
                onConfirm={handleDeleteAiConfig}
                onCancel={() => setDeletingAi(null)}
            />

            {/* Delete Agent Confirm */}
            <ConfirmDialog
                isOpen={!!deletingAgent}
                title="Eliminar Agente de IA"
                message={`¿Eliminar al agente "${deletingAgent?.nombre}"? Esta acción no se puede deshacer.`}
                onConfirm={handleDeleteAgent}
                onCancel={() => setDeletingAgent(null)}
            />

            {/* Toast */}
            {toast && (
                <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
            )}
        </div>
    );
}

