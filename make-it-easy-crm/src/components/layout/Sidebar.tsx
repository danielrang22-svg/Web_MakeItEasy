"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
    Home, LayoutDashboard, BarChart3, Users, Building2,
    Briefcase, FileText, Package, FolderKanban, Factory,
    Settings, HelpCircle, Sparkles, Plus
} from "lucide-react";

const menuItems = [
    { href: "/",             icon: Home,            label: "Dashboard" },
    { href: "/leads",        icon: Briefcase,       label: "Leads" },
    { href: "/kanban",       icon: LayoutDashboard, label: "Pipeline" },
    { href: "/contactos",    icon: Users,           label: "Contactos" },
    { href: "/empresas",     icon: Building2,       label: "Empresas" },
    { href: "/cotizaciones", icon: FileText,        label: "Cotizaciones" },
    { href: "/productos",    icon: Package,         label: "Productos" },
    { href: "/proyectos",    icon: FolderKanban,    label: "Proyectos" },
    { href: "/proveedores",  icon: Factory,         label: "Proveedores" },
    { href: "/vendedores",   icon: Users,           label: "Comerciales" },
    { href: "/reportes",     icon: BarChart3,       label: "Reportes" },
];

export default function Sidebar() {
    const pathname = usePathname();
    const [user, setUser] = useState<{ nombre: string; role: string } | null>(null);

    useEffect(() => {
        const role = document.cookie.split("mie-role=")[1]?.split(";")[0];
        const token = document.cookie.split("mie-auth=")[1]?.split(";")[0];
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split(".")[1]));
                setUser({ nombre: payload.nombre, role: role || payload.role });
            } catch {
                if (role) setUser({ nombre: "Usuario", role });
            }
        } else if (role) {
            setUser({ nombre: "Usuario", role });
        }
    }, []);

    function isActive(href: string) {
        return href === "/"
            ? pathname === "/"
            : pathname === href || pathname.startsWith(href + "/");
    }

    const initials = user?.nombre
        ? user.nombre.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
        : "U";

    return (
        <aside
            className="fixed left-0 top-0 h-screen w-60 z-30 hidden md:flex flex-col py-6 px-4 bg-surface-dim border-r border-border-glass shadow-sm flex-shrink-0"
        >
            {/* ── Brand Logo & Header ── */}
            <div className="flex items-center gap-3 px-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(138,235,255,0.3)]">
                    <Sparkles size={18} className="text-bg-workspace" fill="currentColor" />
                </div>
                <div>
                    <h1 className="font-display text-base font-bold text-primary truncate leading-tight">Make It Easy</h1>
                    <p className="font-sans text-[10px] font-semibold text-text-secondary uppercase tracking-widest">Enterprise CRM</p>
                </div>
            </div>

            {/* ── CTA Button ── */}
            <div className="mb-6 px-1">
                {/* Custom event trigger if handled by ClientLayout */}
                <button
                    onClick={() => {
                        // Open the lead creation modal globally using custom event
                        const event = new CustomEvent("open-create-lead-modal");
                        window.dispatchEvent(event);
                    }}
                    className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold text-xs flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(138,235,255,0.2)]"
                >
                    <Plus size={15} strokeWidth={2.5} />
                    Nuevo Lead
                </button>
            </div>

            {/* ── Nav Links ── */}
            <nav className="flex-1 overflow-y-auto custom-scrollbar space-y-0.5 pr-1">
                {menuItems.map((item) => {
                    const active = isActive(item.href);
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                                active
                                    ? "text-primary font-bold bg-surface-bright/50 border-r-2 border-primary"
                                    : "text-on-surface-variant hover:bg-surface-bright hover:text-primary"
                            }`}
                        >
                            <Icon
                                size={16}
                                className="flex-shrink-0"
                                style={active ? { color: "var(--primary)" } : {}}
                            />
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* ── Bottom Section ── */}
            <div className="mt-auto pt-4 border-t border-border-glass space-y-1">
                <Link
                    href="/ajustes"
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                        isActive("/ajustes")
                            ? "text-primary font-bold bg-surface-bright/50 border-r-2 border-primary"
                            : "text-on-surface-variant hover:bg-surface-bright hover:text-primary"
                    }`}
                >
                    <Settings size={16} />
                    <span>Configuración</span>
                </Link>
                <a
                    href="#"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-on-surface-variant hover:bg-surface-bright hover:text-primary transition-all duration-200"
                >
                    <HelpCircle size={16} />
                    <span>Ayuda</span>
                </a>

                {/* Logged in User profile info */}
                <div className="mt-4 px-3 py-2.5 flex items-center gap-3 bg-surface-container-low/40 rounded-xl border border-border-glass">
                    <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                        style={{
                            background: "var(--gradient-primary)",
                            color: "var(--on-primary)",
                            boxShadow: "var(--glow-primary)"
                        }}
                    >
                        {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-text-primary truncate">
                            {user?.nombre || "Admin User"}
                        </p>
                        <p className="text-[9px] font-medium text-text-secondary uppercase tracking-wider truncate">
                            {user?.role === "admin" ? "Administrador" : (user?.role || "Usuario")}
                        </p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
