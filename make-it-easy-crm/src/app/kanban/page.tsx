"use client";

import { useEffect, useState } from "react";
import { useLeadsStore, getFilteredLeads } from "@/lib/state/leadsStore";
import { useCotizacionesStore } from "@/lib/state/cotizacionesStore";
import { Lead, Etapa, LeadCreateData, CotizacionCreateData, CotizacionUpdateData } from "@/lib/types";
import KanbanBoard from "@/components/kanban/KanbanBoard";
import LeadForm from "@/components/leads/LeadForm";
import { Modal, Toast } from "@/components/ui/SharedUI";
import { Search, Filter } from "lucide-react";
import { PIPELINE_STAGES } from "@/lib/constants";

export default function KanbanPage() {
    const store = useLeadsStore();
    const { loadLeads, searchQuery, setSearchQuery, updateLead, createLead } = store;
    const filteredLeads = getFilteredLeads(store);
    const [viewMode, setViewMode] = useState<"kanban" | "lista">("kanban");
    const [editingLead, setEditingLead] = useState<Lead | null>(null);
    const [creatingForStage, setCreatingForStage] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

    useEffect(() => {
        loadLeads();
    }, [loadLeads]);

    function handleCardClick(lead: Lead) {
        setEditingLead(lead);
    }

    const { createCotizacion } = useCotizacionesStore();

    async function handleUpdate(data: LeadCreateData, pendingCotizacion?: CotizacionCreateData | CotizacionUpdateData) {
        if (!editingLead) return;
        await updateLead(editingLead.id, data);
        if (pendingCotizacion) {
            createCotizacion({ ...(pendingCotizacion as CotizacionCreateData), leadId: editingLead.id });
        }
        setEditingLead(null);
        setToast({ message: "Lead actualizado", type: "success" });
    }

    function handleAddToStage(stageKey: string) {
        setCreatingForStage(stageKey);
    }

    async function handleCreate(data: LeadCreateData, pendingCotizacion?: CotizacionCreateData | CotizacionUpdateData) {
        const newLead = await createLead(data);
        if (pendingCotizacion && newLead) {
            createCotizacion({ ...(pendingCotizacion as CotizacionCreateData), leadId: newLead.id });
        }
        setCreatingForStage(null);
        const stageName = PIPELINE_STAGES.find((s) => s.key === creatingForStage)?.shortLabel || "columna";
        setToast({ message: `Lead creado en ${stageName}`, type: "success" });
    }

    const stageLabel = creatingForStage
        ? (PIPELINE_STAGES.find((s) => s.key === creatingForStage)?.shortLabel || "")
        : "";

    // Build a fake Lead to pre-fill the form with the stage
    const createInitial = creatingForStage
        ? {
            etapa: creatingForStage as Etapa,
        } as Lead
        : undefined;

    return (
        <div className="px-5 pb-32">
            {/* Search */}
            <div className="relative mt-2 mb-4">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                    type="text"
                    className="block w-full pl-10 pr-4 py-3 bg-card border-none rounded-2xl ring-1 ring-border focus:ring-2 focus:ring-mie-primary transition-all outline-none"
                    placeholder="Buscar en pipeline..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* View Tabs */}
            <div className="flex gap-2 mb-4">
                <div className="flex bg-muted p-1 rounded-xl">
                    <button onClick={() => setViewMode("kanban")} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${viewMode === "kanban" ? "bg-card shadow-sm text-mie-secondary" : "text-muted-foreground hover:text-foreground"}`}>Kanban</button>
                    <button onClick={() => setViewMode("lista")} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${viewMode === "lista" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Lista</button>
                </div>
            </div>

            {/* Kanban Board / List */}
            {viewMode === "kanban" ? (
                <KanbanBoard onCardClick={handleCardClick} onAddLead={handleAddToStage} />
            ) : (
                <div className="bg-card ring-1 ring-border rounded-2xl overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-muted/50 border-b border-border">
                            <tr>
                                <th className="px-4 py-3 font-bold text-muted-foreground">Oportunidad</th>
                                <th className="px-4 py-3 font-bold text-muted-foreground">Contacto</th>
                                <th className="px-4 py-3 font-bold text-muted-foreground">Empresa</th>
                                <th className="px-4 py-3 font-bold text-muted-foreground">Etapa</th>
                                <th className="px-4 py-3 font-bold text-muted-foreground text-right">Valor</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredLeads.map(lead => {
                                const stage = PIPELINE_STAGES.find(s => s.key === lead.etapa);
                                return (
                                    <tr key={lead.id} onClick={() => handleCardClick(lead)} className="hover:bg-muted/30 transition-colors cursor-pointer">
                                        <td className="px-4 py-3 font-bold text-mie-primary">{lead.titulo}</td>
                                        <td className="px-4 py-3 text-muted-foreground">{lead.nombreContacto}</td>
                                        <td className="px-4 py-3 text-muted-foreground">{lead.empresa || "-"}</td>
                                        <td className="px-4 py-3">
                                            <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase" style={{ backgroundColor: `${stage?.color}20`, color: stage?.color }}>
                                                {stage?.shortLabel}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium">${(lead.valorEstimado || 0).toLocaleString()}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Edit Modal */}
            <Modal isOpen={!!editingLead} onClose={() => setEditingLead(null)} title="Editar Lead">
                {editingLead && (
                    <LeadForm
                        initialData={editingLead}
                        onSubmit={(data, pendingCot) => handleUpdate(data, pendingCot)}
                        onCancel={() => setEditingLead(null)}
                    />
                )}
            </Modal>

            {/* Create Modal (from column + button) */}
            <Modal isOpen={!!creatingForStage} onClose={() => setCreatingForStage(null)} title={`Nueva Negociación · ${stageLabel}`}>
                {creatingForStage && (
                    <LeadForm
                        initialData={createInitial}
                        onSubmit={handleCreate}
                        onCancel={() => setCreatingForStage(null)}
                    />
                )}
            </Modal>

            {/* Toast */}
            {toast && (
                <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
            )}
        </div>
    );
}
