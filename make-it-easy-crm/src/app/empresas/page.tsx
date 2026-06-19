"use client";

import { useEffect, useState } from "react";
import { useEmpresasStore, getFilteredEmpresas } from "@/lib/state/empresasStore";
import { useLeadsStore, getLeadsSummaryByEmpresa } from "@/lib/state/leadsStore";
import { Empresa, EmpresaCreateData } from "@/lib/types";
import { formatCurrency } from "@/lib/constants";
import { Modal, Toast, ConfirmDialog } from "@/components/ui/SharedUI";
import {
    Search, Building2, MapPin, Plus, Pencil, Trash2,
    Phone, Mail, Users, Briefcase, ChevronRight,
    TrendingUp, CheckCircle, XCircle,
} from "lucide-react";
import Link from "next/link";

export default function EmpresasPage() {
    const store = useEmpresasStore();
    const { empresas, searchQuery, loadEmpresas, createEmpresa, updateEmpresa, deleteEmpresa, setSearchQuery } = store;
    const { leads, loadLeads } = useLeadsStore();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingEmpresa, setEditingEmpresa] = useState<Empresa | null>(null);
    const [deletingEmpresa, setDeletingEmpresa] = useState<Empresa | null>(null);
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

    useEffect(() => { loadEmpresas(); loadLeads(); }, [loadEmpresas, loadLeads]);

    const filteredEmpresas = getFilteredEmpresas(store);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const data: EmpresaCreateData = {
            nombre: fd.get("nombre") as string,
            nit: fd.get("nit") as string,
            direccion: fd.get("direccion") as string,
            ciudad: fd.get("ciudad") as string,
            sector: fd.get("sector") as string,
            tamano: (fd.get("tamano") as Empresa["tamano"]) || "",
            telefono: fd.get("telefono") as string,
            email: fd.get("email") as string,
            notas: fd.get("notas") as string,
        };
        if (editingEmpresa) {
            await updateEmpresa(editingEmpresa.id, data);
            setEditingEmpresa(null);
            setToast({ message: "Empresa actualizada", type: "success" });
        } else {
            await createEmpresa(data);
            setShowCreateModal(false);
            setToast({ message: "Empresa creada", type: "success" });
        }
    }

    async function handleDelete() {
        if (!deletingEmpresa) return;
        await deleteEmpresa(deletingEmpresa.id);
        setDeletingEmpresa(null);
        setToast({ message: "Empresa eliminada", type: "info" });
    }



    return (
        <div className="px-5 pb-32">
            <div className="mt-4 mb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Building2 size={24} className="text-mie-primary" />
                        Empresas
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1">{filteredEmpresas.length} empresas</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="mie-gradient text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-1"
                >
                    <Plus size={16} /> Nueva
                </button>
            </div>

            {/* Search */}
            <div className="relative mb-4">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                    type="text"
                    className="w-full pl-10 pr-4 py-3 bg-card rounded-2xl ring-1 ring-border focus:ring-2 focus:ring-mie-primary outline-none"
                    placeholder="Buscar empresa, NIT, ciudad..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Empresa Cards */}
            <div className="space-y-3">
                {filteredEmpresas.map((empresa) => (
                    <div key={empresa.id} className="p-4 bg-card ring-1 ring-border rounded-2xl hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                            <div className="min-w-0 flex-1">
                                <h3 className="font-bold text-base">{empresa.nombre}</h3>
                                <p className="text-xs text-muted-foreground mt-0.5">NIT: {empresa.nit || "—"}</p>
                            </div>
                            {empresa.tamano && (
                                <span className="px-2 py-1 text-[10px] font-bold uppercase bg-blue-100 dark:bg-blue-900/30 text-mie-primary rounded-full">
                                    {empresa.tamano}
                                </span>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                            {empresa.ciudad && (
                                <span className="flex items-center gap-1"><MapPin size={12} /> {empresa.ciudad}</span>
                            )}
                            {empresa.sector && (
                                <span className="flex items-center gap-1"><Briefcase size={12} /> {empresa.sector}</span>
                            )}
                            {empresa.telefono && (
                                <span className="flex items-center gap-1"><Phone size={12} /> {empresa.telefono}</span>
                            )}
                        </div>
                        {/* Lead Value Summary */}
                        {(() => {
                            const summary = getLeadsSummaryByEmpresa(leads, empresa.nombre);
                            if (summary.totalHistorico === 0) return null;
                            return (
                                <div className="flex gap-2 mt-3 flex-wrap">
                                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-mie-primary text-xs font-bold rounded-lg flex items-center gap-1">
                                        <TrendingUp size={12} /> {formatCurrency(summary.activo)}
                                    </span>
                                    {summary.ganados > 0 && (
                                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 text-xs font-bold rounded-lg flex items-center gap-1">
                                            <CheckCircle size={12} /> {formatCurrency(summary.ganados)}
                                        </span>
                                    )}
                                    {summary.perdidos > 0 && (
                                        <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-500 text-xs font-bold rounded-lg flex items-center gap-1">
                                            <XCircle size={12} /> {formatCurrency(summary.perdidos)}
                                        </span>
                                    )}
                                    <span className="px-2 py-1 text-muted-foreground text-[10px] font-medium">
                                        {summary.leadsActivos.length} activo{summary.leadsActivos.length !== 1 ? 's' : ''}
                                    </span>
                                </div>
                            );
                        })()}
                        <div className="flex justify-end gap-2 mt-3">
                            <button
                                onClick={() => setEditingEmpresa(empresa)}
                                className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                            >
                                <Pencil size={12} className="inline mr-1" /> Editar
                            </button>
                            <button
                                onClick={() => setDeletingEmpresa(empresa)}
                                className="px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
                            >
                                <Trash2 size={12} className="inline mr-1" /> Eliminar
                            </button>
                        </div>
                    </div>
                ))}
                {filteredEmpresas.length === 0 && (
                    <div className="text-center py-16 text-muted-foreground">
                        <Building2 size={48} className="mx-auto mb-4 opacity-30" />
                        <p className="font-medium">No se encontraron empresas</p>
                    </div>
                )}
            </div>

            {/* Create Modal */}
            <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Nueva Empresa">
                <FormContent
                    onSubmit={handleSubmit}
                    onCancel={() => setShowCreateModal(false)}
                />
            </Modal>

            {/* Edit Modal */}
            <Modal isOpen={!!editingEmpresa} onClose={() => setEditingEmpresa(null)} title="Editar Empresa">
                {editingEmpresa && (
                    <FormContent
                        initial={editingEmpresa}
                        onSubmit={handleSubmit}
                        onCancel={() => setEditingEmpresa(null)}
                    />
                )}
            </Modal>

            {/* Delete Confirm */}
            <ConfirmDialog
                isOpen={!!deletingEmpresa}
                title="Eliminar Empresa"
                message={`¿Eliminar "${deletingEmpresa?.nombre}"? Esta acción no se puede deshacer.`}
                onConfirm={handleDelete}
                onCancel={() => setDeletingEmpresa(null)}
            />

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}

interface FormContentProps {
    initial?: Empresa;
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
    onCancel: () => void;
}

const FormContent = ({ initial, onSubmit, onCancel }: FormContentProps) => (
    <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">Nombre *</label>
                <input name="nombre" required defaultValue={initial?.nombre} className="w-full mt-1 px-4 py-3 bg-muted rounded-2xl ring-1 ring-border focus:ring-2 focus:ring-mie-primary outline-none" />
            </div>
            <div className="col-span-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">Número de Documento (NIT / CC) *</label>
                <input name="nit" required defaultValue={initial?.nit} className="w-full mt-1 px-4 py-3 bg-muted rounded-2xl ring-1 ring-border focus:ring-2 focus:ring-mie-primary outline-none" />
            </div>
            <div>
                <label className="text-xs font-bold uppercase text-muted-foreground">Ciudad</label>
                <input name="ciudad" defaultValue={initial?.ciudad} className="w-full mt-1 px-4 py-3 bg-muted rounded-2xl ring-1 ring-border focus:ring-2 focus:ring-mie-primary outline-none" />
            </div>
            <div>
                <label className="text-xs font-bold uppercase text-muted-foreground">Sector</label>
                <input name="sector" defaultValue={initial?.sector} className="w-full mt-1 px-4 py-3 bg-muted rounded-2xl ring-1 ring-border focus:ring-2 focus:ring-mie-primary outline-none" />
            </div>
            <div>
                <label className="text-xs font-bold uppercase text-muted-foreground">Tamaño</label>
                <select name="tamano" defaultValue={initial?.tamano || ""} className="w-full mt-1 px-4 py-3 bg-muted rounded-2xl ring-1 ring-border focus:ring-2 focus:ring-mie-primary outline-none">
                    <option value="">Sin definir</option>
                    <option value="pequeña">Pequeña</option>
                    <option value="mediana">Mediana</option>
                    <option value="grande">Grande</option>
                </select>
            </div>
            <div>
                <label className="text-xs font-bold uppercase text-muted-foreground">Teléfono</label>
                <input name="telefono" defaultValue={initial?.telefono} className="w-full mt-1 px-4 py-3 bg-muted rounded-2xl ring-1 ring-border focus:ring-2 focus:ring-mie-primary outline-none" />
            </div>
            <div className="col-span-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">Email</label>
                <input name="email" type="email" defaultValue={initial?.email} className="w-full mt-1 px-4 py-3 bg-muted rounded-2xl ring-1 ring-border focus:ring-2 focus:ring-mie-primary outline-none" />
            </div>
            <div className="col-span-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">Dirección</label>
                <input name="direccion" defaultValue={initial?.direccion} className="w-full mt-1 px-4 py-3 bg-muted rounded-2xl ring-1 ring-border focus:ring-2 focus:ring-mie-primary outline-none" />
            </div>
            <div className="col-span-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">Notas</label>
                <textarea name="notas" rows={2} defaultValue={initial?.notas} className="w-full mt-1 px-4 py-3 bg-muted rounded-2xl ring-1 ring-border focus:ring-2 focus:ring-mie-primary outline-none resize-none" />
            </div>
        </div>
        <div className="flex gap-3 pt-2">
            <button type="submit" className="flex-1 mie-gradient text-white font-bold py-4 rounded-2xl shadow-lg">
                {initial ? "Guardar Cambios" : "Crear Empresa"}
            </button>
            <button type="button" onClick={onCancel} className="px-6 py-4 rounded-2xl ring-1 ring-border font-medium">
                Cancelar
            </button>
        </div>
    </form>
);
