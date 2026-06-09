"use client";

import { Bell, Check, X } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Notificacion {
    id: string;
    titulo: string;
    mensaje: string;
    enlace: string | null;
    leida: boolean;
    fechaCreacion: string;
}

export default function NotificationBell() {
    const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    async function fetchNotificaciones() {
        try {
            const res = await fetch("/api/notificaciones");
            if (res.ok) {
                const data = await res.json();
                setNotificaciones(data);
            }
        } catch (error) {
            console.error("Error fetching notificaciones:", error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchNotificaciones();
        // Polling every 1 minute
        const interval = setInterval(fetchNotificaciones, 60000);
        return () => clearInterval(interval);
    }, []);

    async function markAsRead(ids: string[]) {
        try {
            await fetch("/api/notificaciones", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids }),
            });
            setNotificaciones((prev) => prev.filter((n) => !ids.includes(n.id)));
        } catch (error) {
            console.error("Error marking as read:", error);
        }
    }

    const unreadCount = notificaciones.length;

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-lg text-text-secondary hover:bg-surface-bright hover:text-primary transition-colors"
            >
                <Bell size={16} />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full ai-pulse flex items-center justify-center">
                        <span className="absolute text-[8px] text-white font-bold opacity-0 hover:opacity-100">{unreadCount}</span>
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div
                        className="absolute right-0 top-full mt-2 w-80 z-50 overflow-hidden rounded-xl animate-scale-in"
                        style={{
                            background: "var(--surface-container-high)",
                            border: "1px solid var(--border-glass)",
                            boxShadow: "var(--shadow-lg)"
                        }}
                    >
                        <div className="flex items-center justify-between px-4 py-3 border-b border-border-glass bg-surface-container-low/40">
                            <h3 className="text-xs font-bold text-text-primary">Notificaciones</h3>
                            {unreadCount > 0 && (
                                <button
                                    onClick={() => markAsRead(notificaciones.map((n) => n.id))}
                                    className="text-[10px] text-primary hover:underline font-semibold"
                                >
                                    Marcar todas leídas
                                </button>
                            )}
                        </div>
                        <div className="max-h-64 overflow-y-auto custom-scrollbar">
                            {loading ? (
                                <p className="p-4 text-xs text-center text-text-secondary">Cargando...</p>
                            ) : unreadCount === 0 ? (
                                <p className="p-4 text-xs text-center text-text-secondary">No tienes notificaciones nuevas.</p>
                            ) : (
                                notificaciones.map((notif) => (
                                    <div key={notif.id} className="p-3 border-b border-border-glass last:border-0 hover:bg-surface-bright transition-colors group relative">
                                        <div className="flex gap-2">
                                            <div className="mt-0.5">
                                                <div className="w-2 h-2 bg-primary rounded-full mt-1"></div>
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs font-bold text-text-primary">{notif.titulo}</p>
                                                <p className="text-[10px] text-text-secondary mt-0.5 leading-snug">{notif.mensaje}</p>
                                                <div className="flex items-center justify-between mt-2">
                                                    <span className="text-[9px] text-text-secondary/60">
                                                        {new Date(notif.fechaCreacion).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    {notif.enlace && (
                                                        <Link
                                                            href={notif.enlace}
                                                            onClick={() => {
                                                                markAsRead([notif.id]);
                                                                setIsOpen(false);
                                                            }}
                                                            className="text-[10px] text-primary font-bold hover:underline"
                                                        >
                                                            Ver detalles
                                                        </Link>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => markAsRead([notif.id])}
                                                className="absolute top-2 right-2 p-1 text-text-secondary/50 hover:text-error opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Marcar como leída"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
