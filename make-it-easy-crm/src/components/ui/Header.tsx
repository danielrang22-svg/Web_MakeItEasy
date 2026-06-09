"use client";

import { Bell, Moon, Sun, LogOut, Settings, User, Shield, Search, Menu, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import NotificationBell from "./NotificationBell";

const ROUTE_LABELS: Record<string, string> = {
    "/":            "Dashboard",
    "/kanban":      "Pipeline · Kanban",
    "/leads":       "Gestión de Leads",
    "/contactos":   "Directorio de Contactos",
    "/empresas":    "Directorio de Empresas",
    "/cotizaciones":"Cotizaciones",
    "/productos":   "Catálogo de Servicios y Productos",
    "/proyectos":   "Monitoreo de Proyectos",
    "/proveedores": "Directorio de Aliados",
    "/vendedores":  "Gestión de Comerciales",
    "/reportes":    "Reportes y Analíticas",
    "/ajustes":     "Ajustes de Sistema",
};

const ROUTE_SUBTITLES: Record<string, string> = {
    "/":            "Rendimiento en tiempo real y métricas clave.",
    "/kanban":      "Gestión visual del pipeline de ventas.",
    "/leads":       "Supervisa y clasifica tus prospectos con inteligencia artificial.",
    "/contactos":   "Directorio unificado de contactos y clientes calificados.",
    "/empresas":    "Organizaciones y cuentas corporativas vinculadas.",
    "/cotizaciones":"Crea, edita y exporta propuestas de servicios automatizados.",
    "/productos":   "Servicios profesionales y catálogo de automatizaciones.",
    "/proyectos":   "Estado de implementaciones activas y monitoreo de flujos.",
    "/proveedores": "Directorio de aliados tecnológicos y SaaS integrados.",
    "/vendedores":  "Seguimiento y metas de comerciales de ventas.",
    "/reportes":    "Estadísticas avanzadas de captación, conversión y ganancias.",
    "/ajustes":     "Configuración del CRM, usuarios y credenciales de APIs.",
};

export default function Header() {
    const [isDark, setIsDark]   = useState(true);
    const [isOpen, setIsOpen]   = useState(false);
    const [user, setUser]       = useState<{ nombre: string; email: string; role: string } | null>(null);
    const [mounted, setMounted] = useState(false);
    const pathname              = usePathname();

    const pageTitle = Object.entries(ROUTE_LABELS).find(([k]) =>
        k === "/" ? pathname === "/" : pathname === k || pathname.startsWith(k + "/")
    )?.[1] ?? "CRM";

    const pageSubtitle = Object.entries(ROUTE_SUBTITLES).find(([k]) =>
        k === "/" ? pathname === "/" : pathname === k || pathname.startsWith(k + "/")
    )?.[1] ?? "Make It Easy · Intelligent Automation";

    useEffect(() => {
        setMounted(true);
        setIsDark(document.documentElement.classList.contains("dark"));
        const role  = document.cookie.split("mie-role=")[1]?.split(";")[0];
        const token = document.cookie.split("mie-auth=")[1]?.split(";")[0];
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split(".")[1]));
                setUser({ ...payload, role: role || payload.role });
            } catch {
                if (role) setUser({ nombre: "Usuario", email: "", role });
            }
        } else if (role) {
            setUser({ nombre: "Usuario", email: "", role });
        }
    }, []);

    function toggleDarkMode() {
        const next = !isDark;
        setIsDark(next);
        document.documentElement.classList.toggle("dark", next);
    }

    async function handleLogout() {
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.href = "/login";
    }

    const initials = user?.nombre
        ? user.nombre.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
        : "U";

    return (
        <>
            {/* ── Desktop Header ── */}
            <header className="hidden md:flex justify-between items-center h-20 px-8 sticky top-0 z-30 w-full bg-bg-workspace/80 backdrop-blur-md border-b border-border-glass">
                {/* Title and Subtitle */}
                <div>
                    <h2 className="font-display text-lg font-bold text-text-primary tracking-tight">
                        {pageTitle}
                    </h2>
                    <p className="font-sans text-xs text-text-secondary mt-0.5">
                        {pageSubtitle}
                    </p>
                </div>

                {/* Right side controls */}
                <div className="flex items-center gap-4">
                    {/* Search bar */}
                    <div className="relative group">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            className="bg-surface-dim border border-border-glass rounded-lg pl-9 pr-4 py-1.5 text-text-primary font-sans text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary w-52 transition-all placeholder:text-text-secondary"
                        />
                    </div>

                    {/* Notification bell with pulse glow */}
                    <NotificationBell />

                    {/* Dark/Light mode toggle */}
                    <button
                        onClick={toggleDarkMode}
                        className="p-2 rounded-lg text-text-secondary hover:bg-surface-bright hover:text-primary transition-colors"
                        title="Cambiar tema"
                    >
                        {isDark ? <Sun size={16} /> : <Moon size={16} />}
                    </button>

                    {/* User profile dropdown trigger */}
                    <div className="relative">
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shadow-md hover:opacity-90 transition-all flex-shrink-0"
                            style={{
                                background: "var(--gradient-primary)",
                                color: "var(--on-primary)",
                                boxShadow: "var(--glow-primary)"
                            }}
                        >
                            {mounted ? initials : "U"}
                        </button>

                        {/* Dropdown Menu */}
                        {isOpen && mounted && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                                <div
                                    className="absolute right-0 top-full mt-2 w-52 z-50 overflow-hidden rounded-xl animate-scale-in"
                                    style={{
                                        background: "var(--surface-container-high)",
                                        border: "1px solid var(--border-glass)",
                                        boxShadow: "var(--shadow-lg)"
                                    }}
                                >
                                    <div className="px-4 py-3 border-b border-border-glass bg-surface-container-low/40">
                                        <p className="text-xs font-bold text-text-primary truncate">{user?.nombre || "Usuario"}</p>
                                        <p className="text-[10px] text-text-secondary truncate mt-0.5">{user?.email || ""}</p>
                                    </div>
                                    <div className="py-1">
                                        {user?.role === "admin" && (
                                            <Link
                                                href="/ajustes/usuarios"
                                                onClick={() => setIsOpen(false)}
                                                className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                                            >
                                                <Shield size={13} />
                                                Control de Usuarios
                                            </Link>
                                        )}
                                        <Link
                                            href="/ajustes"
                                            onClick={() => setIsOpen(false)}
                                            className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-text-secondary hover:bg-surface-bright hover:text-text-primary transition-colors"
                                        >
                                            <Settings size={13} />
                                            Ajustes
                                        </Link>
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-error hover:bg-error/10 transition-colors"
                                        >
                                            <LogOut size={13} />
                                            Cerrar Sesión
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* ── Mobile Header ── */}
            <header className="md:hidden flex justify-between items-center h-16 px-5 sticky top-0 z-40 w-full bg-surface-dim/95 backdrop-blur-md border-b border-border-glass shadow-md">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-sm">
                        <Sparkles size={14} className="text-bg-workspace" fill="currentColor" />
                    </div>
                    <span className="font-display text-sm font-bold text-primary tracking-tight">Make It Easy</span>
                </div>
                <div className="flex items-center gap-3">
                    <button className="text-text-secondary hover:text-primary transition-all">
                        <Search size={16} />
                    </button>
                    <button className="text-text-secondary hover:text-primary transition-all">
                        <Menu size={18} />
                    </button>
                </div>
            </header>
        </>
    );
}
