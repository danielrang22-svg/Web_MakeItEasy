"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Settings, Moon, Sun, Trash2, Download, Database, Palette, FileSpreadsheet, Users } from "lucide-react";
import { ConfirmDialog, Toast } from "@/components/ui/SharedUI";
import * as XLSX from "xlsx";
import { useLeadsStore } from "@/lib/state/leadsStore";

export default function AjustesPage() {
    const router = useRouter();
    const { leads, loadLeads } = useLeadsStore();
    const [isDark, setIsDark] = useState(true);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

    useEffect(() => {
        loadLeads();
    }, [loadLeads]);

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
                // flatten objects for excel export if needed, or rely on json_to_sheet
                const ws = XLSX.utils.json_to_sheet(items);
                XLSX.utils.book_append_sheet(wb, ws, key.charAt(0).toUpperCase() + key.slice(1));
            }
        }
        
        XLSX.writeFile(wb, `mie-crm-full-backup-${new Date().toISOString().slice(0, 10)}.xlsx`);
        setToast({ message: "Excel exportado exitosamente con todas las tablas", type: "success" });
    }

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
            </div>

            {/* Reset Confirm */}
            <ConfirmDialog
                isOpen={showResetConfirm}
                title="Peligro: Borrado Masivo"
                message="¿Estás seguro de purgar TODA la base de datos? Se destruirán las cotizaciones, proyectos y leads permanentemente. El administrador actual quedará intacto."
                onConfirm={handleResetData}
                onCancel={() => setShowResetConfirm(false)}
            />

            {/* Toast */}
            {toast && (
                <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
            )}
        </div>
    );
}
