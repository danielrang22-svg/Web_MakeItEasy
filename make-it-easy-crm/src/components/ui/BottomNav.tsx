"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
    Home, LayoutDashboard, BarChart3, Settings, Plus,
    Users, Building2, Briefcase, X, FileText,
    FolderKanban, Factory, Package, Layers
} from "lucide-react";

interface BottomNavProps {
    onAddLead?: () => void;
}

export default function BottomNav({ onAddLead }: BottomNavProps) {
    const pathname = usePathname();
    const [showCrmMenu, setShowCrmMenu] = useState(false);

    const crmPaths = ["/leads", "/contactos", "/empresas", "/cotizaciones", "/productos", "/proyectos", "/proveedores", "/vendedores"];
    const isCrmActive = crmPaths.some(p => pathname === p || pathname.startsWith(p + "/"));

    const tabs = [
        { href: "/",        icon: Home,            label: "Inicio" },
        { href: "/kanban",  icon: LayoutDashboard, label: "Pipeline" },
        null, // FAB
        { href: "/reportes", icon: BarChart3, label: "Reportes" },
        { href: "/ajustes",  icon: Settings,  label: "Ajustes" },
    ];

    const crmMenuItems = [
        { href: "/leads",        icon: Briefcase,    label: "Leads",        color: "primary" },
        { href: "/contactos",    icon: Users,         label: "Contactos",    color: "secondary" },
        { href: "/empresas",     icon: Building2,     label: "Empresas",     color: "primary" },
        { href: "/cotizaciones", icon: FileText,      label: "Cotizaciones", color: "secondary" },
        { href: "/productos",    icon: Package,       label: "Productos",    color: "primary" },
        { href: "/proyectos",    icon: FolderKanban,  label: "Proyectos",    color: "tertiary" },
        { href: "/proveedores",  icon: Factory,       label: "Proveedores",  color: "primary" },
        { href: "/vendedores",   icon: Users,         label: "Comerciales",  color: "secondary" },
    ];

    const colorMap: Record<string, { bg: string; text: string }> = {
        primary:   { bg: "rgba(143,245,255,0.1)",  text: "var(--primary)" },
        secondary: { bg: "rgba(175,136,255,0.1)", text: "var(--secondary)" },
        tertiary:  { bg: "rgba(71,196,255,0.1)",   text: "var(--tertiary)" },
    };

    return (
        <>
            {/* CRM Sub-menu overlay */}
            {showCrmMenu && (
                <div className="fixed inset-0 z-40" onClick={() => setShowCrmMenu(false)}>
                    <div
                        className="absolute bottom-24 left-1/2 -translate-x-1/2 rounded-2xl p-2 animate-scale-in min-w-[220px]"
                        style={{
                            background: "var(--surface-container-high)",
                            border: "1px solid var(--outline-variant)",
                            boxShadow: "var(--shadow-lg)"
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Menu header */}
                        <div className="flex items-center justify-between px-3 py-2 mb-1">
                            <div className="flex items-center gap-2">
                                <Layers size={14} style={{ color: "var(--primary)" }} />
                                <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--primary)" }}>
                                    CRM
                                </span>
                            </div>
                            <button
                                onClick={() => setShowCrmMenu(false)}
                                className="p-1 rounded-lg"
                                style={{ color: "var(--on-surface-variant)" }}
                            >
                                <X size={14} />
                            </button>
                        </div>

                        <div
                            className="mb-2 mx-1"
                            style={{ height: "1px", background: "var(--outline-variant)" }}
                        />

                        {crmMenuItems.map(item => {
                            const active = pathname === item.href || pathname.startsWith(item.href + "/");
                            const Icon = item.icon;
                            const c = colorMap[item.color];
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setShowCrmMenu(false)}
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                                    style={active
                                        ? { background: c.bg, color: c.text }
                                        : { color: "var(--on-surface-variant)" }
                                    }
                                    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
                                    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = ""; }}
                                >
                                    <Icon size={16} />
                                    {item.label}
                                    {active && (
                                        <span
                                            className="ml-auto w-1.5 h-1.5 rounded-full"
                                            style={{ background: c.text }}
                                        />
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Bottom Nav bar */}
            <nav
                className="fixed bottom-0 w-full z-30 ios-blur"
                style={{
                    background: "rgba(10,14,22,0.9)",
                    borderTop: "1px solid var(--outline-variant)"
                }}
            >
                <div className="flex justify-around items-end max-w-lg mx-auto px-2 pt-2 pb-6">
                    {tabs.map((tab, i) => {
                        // FAB at center
                        if (tab === null) {
                            return (
                                <div key="fab" className="flex flex-col items-center relative -top-5">
                                    <button
                                        onClick={onAddLead}
                                        className="w-14 h-14 rounded-full flex items-center justify-center active:scale-95 transition-transform"
                                        style={{
                                            background: "var(--gradient-primary)",
                                            boxShadow: "var(--glow-primary), 0 4px 20px rgba(0,0,0,0.4), 0 0 0 4px var(--surface)",
                                            color: "var(--on-primary)"
                                        }}
                                    >
                                        <Plus size={26} strokeWidth={2.5} />
                                    </button>
                                    <span
                                        className="text-[9px] font-bold uppercase tracking-tight mt-1"
                                        style={{ color: "var(--primary)" }}
                                    >
                                        Nuevo
                                    </span>
                                </div>
                            );
                        }

                        const Icon = tab.icon;
                        const active = tab.href === "/"
                            ? pathname === "/"
                            : pathname === tab.href || pathname.startsWith(tab.href + "/");

                        return (
                            <Link
                                key={tab.href}
                                href={tab.href}
                                className="flex flex-col items-center gap-0.5 py-1 transition-colors min-w-[48px]"
                                style={{ color: active ? "var(--primary)" : "var(--on-surface-variant)" }}
                            >
                                <Icon size={21} />
                                <span className="text-[10px] font-medium">{tab.label}</span>
                                {active && (
                                    <span
                                        className="w-1 h-1 rounded-full"
                                        style={{ background: "var(--primary)" }}
                                    />
                                )}
                            </Link>
                        );
                    })}
                </div>

                {/* CRM floating pill */}
                <button
                    onClick={() => setShowCrmMenu(!showCrmMenu)}
                    className="absolute -top-5 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg transition-all"
                    style={isCrmActive
                        ? {
                            background: "var(--gradient-primary)",
                            color: "var(--on-primary)",
                            boxShadow: "var(--glow-primary)"
                          }
                        : {
                            background: "var(--surface-container-high)",
                            border: "1px solid var(--outline-variant)",
                            color: "var(--on-surface-variant)"
                          }
                    }
                >
                    <Layers size={13} />
                    CRM
                    {showCrmMenu && <X size={11} />}
                </button>
            </nav>
        </>
    );
}
