"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLeadsStore } from "@/lib/state/leadsStore";
import { Lead, Etapa, Interaccion, LeadCreateData, LeadUpdateData, CotizacionCreateData, CotizacionUpdateData } from "@/lib/types";
import { getStageConfig, formatCurrency, formatDate } from "@/lib/constants";
import { Badge } from "@/components/ui/SharedUI";
import LeadForm from "@/components/leads/LeadForm";
import { ConfirmDialog, Toast, Modal } from "@/components/ui/SharedUI";
import { useCotizacionesStore } from "@/lib/state/cotizacionesStore";
import { CotizacionView } from "@/components/cotizaciones/CotizacionView";
import { Cotizacion } from "@/lib/types";
import {
    ArrowLeft,
    Building2,
    Phone,
    Mail,
    Calendar,
    DollarSign,
    Pencil,
    Trash2,
    FileText,
} from "lucide-react";

export default function LeadDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { leads, loadLeads, updateLead, deleteLead } = useLeadsStore();
    const [isEditing, setIsEditing] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { cotizaciones } = useCotizacionesStore();
    const [viewingCot, setViewingCot] = useState<Cotizacion | null>(null);

    useEffect(() => {
        loadLeads();
    }, [loadLeads]);

    const lead = leads.find((l) => l.id === params.id);

    if (!lead) {
        return (
            <div className="px-5 pb-32 text-center pt-20">
                <FileText size={48} className="mx-auto mb-4 text-muted-foreground opacity-30" />
                <p className="text-lg font-medium">Lead no encontrado</p>
                <button
                    onClick={() => router.push("/leads")}
                    className="mt-4 text-mie-blue font-medium text-sm"
                >
                    ← Volver a Leads
                </button>
            </div>
        );
    }

    const stage = getStageConfig(lead.etapa);

    async function handleUpdate(data: LeadUpdateData, pendingCot?: CotizacionCreateData | CotizacionUpdateData) {
        setIsSubmitting(true);
        await updateLead(lead!.id, data);
        if (pendingCot) {
            await useCotizacionesStore.getState().createCotizacion({
                ...(pendingCot as CotizacionCreateData),
                leadId: lead!.id
            });
        }
        setIsSubmitting(false);
        setIsEditing(false);
        setToast({ message: "Lead actualizado exitosamente", type: "success" });
    }

    function handleDelete() {
        deleteLead(lead!.id);
        setToast({ message: "Lead eliminado", type: "info" });
        setTimeout(() => router.push("/leads"), 500);
    }

    return (
        <div className="px-5 pb-32">
            {/* Back button */}
            <button
                onClick={() => router.back()}
                className="flex items-center gap-2 mt-4 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
                <ArrowLeft size={16} />
                Volver
            </button>

            {isEditing ? (
                /* Edit Mode */
                <div className="mt-4">
                    <h2 className="text-xl font-bold mb-4">Editar Lead</h2>
                    <LeadForm
                        initialData={lead}
                        onSubmit={handleUpdate}
                        onCancel={() => setIsEditing(false)}
                        isSubmitting={isSubmitting}
                    />
                </div>
            ) : (
                /* Detail View */
                <>
                    {/* Header */}
                    <div className="mt-4 flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                            {lead.titulo && (
                                <p className="text-xs font-bold uppercase tracking-wider text-mie-purple mb-1">
                                    {lead.titulo}
                                </p>
                            )}
                            <h2 className="text-2xl font-bold">{lead.nombreContacto}</h2>
                            <p className="text-muted-foreground flex items-center gap-1 mt-1">
                                <Building2 size={14} />
                                {lead.empresa}
                            </p>
                        </div>
                        <Badge colorClass={stage.color} textColorClass={stage.textColor}>
                            {stage.shortLabel}
                        </Badge>
                    </div>

                    {/* Value & Date */}
                    <div className="grid grid-cols-2 gap-4 mt-6">
                        <div className="p-4 bg-card ring-1 ring-border rounded-2xl">
                            <p className="text-[10px] text-muted-foreground font-bold uppercase">
                                Valor Estimado
                            </p>
                            <p className="text-xl font-bold mt-1 text-mie-blue">
                                {formatCurrency(lead.valorEstimado)}
                            </p>
                        </div>
                        <div className="p-4 bg-card ring-1 ring-border rounded-2xl">
                            <p className="text-[10px] text-muted-foreground font-bold uppercase">
                                Fecha Creación
                            </p>
                            <p className="text-lg font-mono mt-1">{formatDate(lead.fechaCreacion)}</p>
                        </div>
                    </div>

                    {/* Contact Info */}
                    <div className="mt-6 bg-card ring-1 ring-border rounded-2xl overflow-hidden">
                        <h3 className="px-5 pt-4 pb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Contacto
                        </h3>
                        {lead.telefono && (
                            <a
                                href={`tel:${lead.telefono}`}
                                className="flex items-center gap-3 px-5 py-3 hover:bg-muted/50 transition-colors"
                            >
                                <Phone size={16} className="text-mie-blue" />
                                <span className="text-sm">{lead.telefono}</span>
                            </a>
                        )}
                        {lead.email && (
                            <>
                                <div className="border-t border-border" />
                                <a
                                    href={`mailto:${lead.email}`}
                                    className="flex items-center gap-3 px-5 py-3 hover:bg-muted/50 transition-colors"
                                >
                                    <Mail size={16} className="text-mie-blue" />
                                    <span className="text-sm">{lead.email}</span>
                                </a>
                            </>
                        )}
                        {lead.origenLead && (
                            <>
                                <div className="border-t border-border" />
                                <div className="flex items-center gap-3 px-5 py-3">
                                    <Calendar size={16} className="text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">Origen: {lead.origenLead}</span>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Associated Quotations */}
                    {cotizaciones.filter(c => c.leadId === lead.id).length > 0 && (
                        <div className="mt-6">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 ml-2">
                                Cotizaciones
                            </h3>
                            <div className="space-y-3">
                                {cotizaciones.filter(c => c.leadId === lead.id).map(cot => {
                                    return (
                                        <button 
                                            key={cot.id}
                                            onClick={() => setViewingCot(cot)}
                                            className="w-full p-4 bg-card ring-1 ring-border rounded-2xl flex items-center justify-between hover:bg-muted/50 transition-colors text-left"
                                        >
                                            <div>
                                                <p className="font-bold text-mie-purple">{cot.codigo} {cot.version > 1 && `V${cot.version}`}</p>
                                                <p className="text-sm text-muted-foreground">{cot.fecha.split("T")[0]}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold">{formatCurrency(cot.totalProyectoCore, cot.moneda)}</p>
                                                <span className="text-[10px] font-bold uppercase bg-muted px-2 py-0.5 rounded-full mt-1 inline-block text-muted-foreground">
                                                    {cot.estado}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Notes */}
                    {lead.notas && (
                        <div className="mt-4 p-5 bg-card ring-1 ring-border rounded-2xl">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                                Notas
                            </h3>
                            <p className="text-sm whitespace-pre-wrap">{lead.notas}</p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 mt-6">
                        <button
                            onClick={() => setIsEditing(true)}
                            className="flex-1 mie-gradient text-white font-bold py-4 rounded-2xl shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2"
                        >
                            <Pencil size={16} />
                            Editar
                        </button>
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="px-6 py-4 rounded-2xl ring-1 ring-red-500/30 text-red-500 font-bold flex items-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </>
            )}

            {/* Delete confirm */}
            <ConfirmDialog
                isOpen={showDeleteConfirm}
                title="Eliminar Lead"
                message={`¿Estás seguro de eliminar el lead de ${lead.nombreContacto}? Esta acción no se puede deshacer.`}
                onConfirm={handleDelete}
                onCancel={() => setShowDeleteConfirm(false)}
            />

            <Modal wide isOpen={!!viewingCot} onClose={() => setViewingCot(null)} title={viewingCot ? `${viewingCot.codigo} ${viewingCot.version > 1 ? `V${viewingCot.version}` : ""} — Vista Interna` : ""}>
                {viewingCot && <CotizacionView cot={viewingCot} isClient={false} />}
            </Modal>

            {/* Toast */}
            {toast && (
                <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
            )}
        </div>
    );
}
