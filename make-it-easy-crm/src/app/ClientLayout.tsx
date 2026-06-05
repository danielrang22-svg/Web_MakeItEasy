"use client";

import { useState, useEffect } from "react";
import Header from "@/components/ui/Header";
import BottomNav from "@/components/ui/BottomNav";
import Sidebar from "@/components/layout/Sidebar";
import LeadForm from "@/components/leads/LeadForm";
import { Modal, Toast } from "@/components/ui/SharedUI";
import { useLeadsStore } from "@/lib/state/leadsStore";
import { useEmpresasStore } from "@/lib/state/empresasStore";
import { useContactosStore } from "@/lib/state/contactosStore";
import { useCotizacionesStore } from "@/lib/state/cotizacionesStore";
import { useProyectosStore } from "@/lib/state/proyectosStore";
import { LeadCreateData } from "@/lib/types";
import { usePathname } from "next/navigation";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    const { createLead, undo, lastUndoMessage, clearUndoMessage, error: leadsError, clearError: clearLeadsError } = useLeadsStore();
    const { error: empresasError, clearError: clearEmpresasError } = useEmpresasStore();
    const { error: contactosError, clearError: clearContactosError } = useContactosStore();
    const { error: cotizacionesError, clearError: clearCotizacionesError } = useCotizacionesStore();
    const { error: proyectosError, clearError: clearProyectosError } = useProyectosStore();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
    const pathname = usePathname();
    const isLogin = pathname === "/login";

    // Listen to sidebar create lead trigger
    useEffect(() => {
        const handleOpen = () => setShowCreateModal(true);
        window.addEventListener("open-create-lead-modal", handleOpen);
        return () => window.removeEventListener("open-create-lead-modal", handleOpen);
    }, []);

    // Show store errors as toasts
    useEffect(() => {
        const storeError = leadsError || empresasError || contactosError || cotizacionesError || proyectosError;
        if (storeError) {
            setToast({ message: storeError, type: "error" });
            clearLeadsError();
            clearEmpresasError();
            clearContactosError();
            clearCotizacionesError();
            clearProyectosError();
        }
    }, [leadsError, empresasError, contactosError, cotizacionesError, proyectosError]);

    // ── Global Ctrl+Z listener ──
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
                // Don't intercept if user is typing in an input/textarea
                const tag = (e.target as HTMLElement)?.tagName;
                if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

                e.preventDefault();
                const success = undo();
                if (!success) {
                    setToast({ message: "No hay acciones para deshacer", type: "info" });
                }
            }
        }
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [undo]);

    // Show undo toast
    useEffect(() => {
        if (lastUndoMessage) {
            setToast({ message: lastUndoMessage, type: "success" });
            clearUndoMessage();
        }
    }, [lastUndoMessage, clearUndoMessage]);

    async function handleCreate(data: LeadCreateData, pendingCot?: import("@/lib/types").CotizacionCreateData) {
        const newLead = await createLead(data);
        if (newLead && newLead.id && pendingCot) {
            await useCotizacionesStore.getState().createCotizacion({
                ...pendingCot,
                leadId: newLead.id
            });
        }
        setShowCreateModal(false);
        setToast({ message: "Lead creado exitosamente", type: "success" });
    }

    // If it's the login page, just render the children without the CRM shell
    if (isLogin) {
        return <main className="min-h-screen bg-[#0e0e0e] text-white flex items-center justify-center relative overflow-hidden">{children}</main>;
    }

    return (
        <div className="flex h-screen overflow-hidden text-text-primary" style={{ backgroundColor: "#0B111B", color: "#FFFFFF" }}>
            <Sidebar />
            
            <div className="flex-1 md:ml-60 flex flex-col min-w-0 h-screen overflow-hidden">
                <Header />
                
                <main className="flex-1 overflow-y-auto bg-grid-pattern p-6 pb-32" style={{ backgroundColor: "#0B111B" }}>
                    {children}
                </main>
            </div>

            <div className="md:hidden">
                <BottomNav onAddLead={() => setShowCreateModal(true)} />
            </div>

            {/* Global Create Modal (from BottomNav FAB) */}
            <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Nuevo Lead">
                <LeadForm onSubmit={handleCreate} onCancel={() => setShowCreateModal(false)} />
            </Modal>

            {/* Global Toast */}
            {toast && (
                <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
            )}
        </div>
    );
}
