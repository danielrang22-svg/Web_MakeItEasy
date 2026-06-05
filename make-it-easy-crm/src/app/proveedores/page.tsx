"use client";

import { useEffect, useMemo, useState } from "react";
import { useProveedoresStore } from "@/lib/state/proveedoresStore";
import { Proveedor } from "@/lib/types";
import { Search, Wrench, Plus, Pencil, Trash2, Mail, Phone, Building2 } from "lucide-react";
import { Modal, Toast, ConfirmDialog } from "@/components/ui/SharedUI";

export default function ProveedoresPage() {
    const { proveedores, loadProveedores, createProveedor, updateProveedor, deleteProveedor } = useProveedoresStore();
    
    const [searchQuery, setSearchQuery] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [editingProv, setEditingProv] = useState<Proveedor | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [toast, setToast] = useState<{message: string, type: "success"|"error"|"info"} | null>(null);

    useEffect(() => {
        loadProveedores();
    }, [loadProveedores]);

    const filtered = useMemo(() => {
        let list = [...proveedores];

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            list = list.filter(p => 
                p.nombre.toLowerCase().includes(q) || 
                p.especialidad.toLowerCase().includes(q) || 
                p.nit.includes(q)
            );
        }

        return list;
    }, [proveedores, searchQuery]);

    async function handleSaveProv(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const data = Object.fromEntries(fd.entries()) as any;
        
        if (editingProv) {
            const res = await updateProveedor(editingProv.id, data);
            if ("error" in res) setToast({ message: res.error, type: "error" });
            else { setToast({ message: "Proveedor / Aliado actualizado", type: "success" }); setShowForm(false); }
        } else {
            const res = await createProveedor(data);
            if ("error" in res) setToast({ message: res.error, type: "error" });
            else { setToast({ message: "Proveedor / Aliado registrado", type: "success" }); setShowForm(false); }
        }
    }

    async function handleConfirmDelete() {
        if (!deletingId) return;
        const res = await deleteProveedor(deletingId);
        if (res?.error) setToast({ message: res.error, type: "error" });
        else setToast({ message: "Registro eliminado correctamente", type: "info" });
        setDeletingId(null);
    }

    const inputCls = "w-full px-4 py-2.5 bg-surface-dim border border-border-glass rounded-xl text-text-primary text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-text-secondary";
    const labelCls = "text-[10px] font-bold uppercase tracking-wider text-text-secondary ml-1 mb-1.5 block";

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <style>{`
                .glass-panel {
                    background: rgba(22, 30, 44, 0.6) !important;
                    backdrop-filter: blur(12px) !important;
                    -webkit-backdrop-filter: blur(12px) !important;
                    border: 1px solid rgba(255, 255, 255, 0.1) !important;
                    color: #FFFFFF !important;
                }
            `}</style>
            
            {/* Header section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="font-display text-2xl md:text-3xl font-bold text-text-primary tracking-tight flex items-center gap-2">
                        <Wrench size={22} className="text-primary" />
                        Directorio de Aliados y SaaS
                    </h2>
                    <p className="font-sans text-xs text-text-secondary mt-1">
                        {filtered.length} aliados registrados para integraciones y soporte
                    </p>
                </div>
                <button
                    onClick={() => { setEditingProv(null); setShowForm(true); }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-primary-container to-primary text-on-primary-fixed rounded-lg text-xs font-bold hover:opacity-90 transition-opacity shadow-[0_0_15px_rgba(138,235,255,0.2)]"
                >
                    <Plus size={14} strokeWidth={2.5} />
                    Nuevo Registro
                </button>
            </div>

            {/* Search Input bar */}
            <div className="relative group max-w-md">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within:text-primary transition-colors" />
                <input 
                    type="text" 
                    className="bg-surface-dim border border-border-glass/60 rounded-full pl-9 pr-4 py-1.5 text-text-primary text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary w-full transition-all placeholder:text-text-secondary" 
                    placeholder="Buscar por nombre, NIT o especialidad (ej: OpenAI, Twilio)..." 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)} 
                />
            </div>

            {/* Directory Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filtered.map(prov => {
                    const initials = prov.nombre
                        .split(" ")
                        .map(w => w[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase();

                    return (
                        <div key={prov.id} className="glass-panel rounded-xl p-5 border border-border-glass transition-all duration-300 hover:-translate-y-1 hover:bg-surface-bright/20 relative group flex flex-col justify-between">
                            {/* Inline hover actions */}
                            <div className="absolute top-4 right-4 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    title="Editar"
                                    onClick={() => { setEditingProv(prov); setShowForm(true); }}
                                    className="p-1.5 rounded bg-surface-dim hover:bg-surface-bright border border-border-glass text-text-secondary hover:text-primary transition-colors"
                                >
                                    <Pencil size={13} />
                                </button>
                                <button
                                    title="Eliminar"
                                    onClick={() => setDeletingId(prov.id)}
                                    className="p-1.5 rounded bg-surface-dim hover:bg-error-container/40 border border-border-glass text-error hover:text-white transition-colors"
                                >
                                    <Trash2 size={13} />
                                </button>
                            </div>

                            <div>
                                <div className="flex items-start gap-3 mb-4">
                                    <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                                        {initials}
                                    </div>
                                    <div className="min-w-0 pr-12">
                                        <h3 className="font-semibold text-sm text-text-primary truncate">
                                            {prov.nombre}
                                        </h3>
                                        <p className="text-[10px] text-text-secondary mt-0.5 truncate">
                                            {(prov.especialidad && prov.especialidad !== "") ? prov.especialidad : "Servicio / SaaS"} {prov.nit && `· NIT: ${prov.nit}`}
                                        </p>
                                    </div>
                                </div>

                                {prov.notas ? (
                                    <p className="text-xs text-text-secondary bg-surface-dim/40 border border-border-glass/40 p-3 rounded-lg mb-4 line-clamp-3">
                                        {prov.notas}
                                    </p>
                                ) : null}
                            </div>

                            <div className="flex flex-col gap-1.5 text-[10px] font-medium text-text-secondary border-t border-border-glass/40 pt-3">
                                {prov.telefono && <span className="flex items-center gap-1.5"><Phone size={11} className="text-text-secondary" /> {prov.telefono}</span>}
                                {prov.email && <span className="flex items-center gap-1.5"><Mail size={11} className="text-text-secondary" /> {prov.email}</span>}
                            </div>
                        </div>
                    );
                })}
            </div>

            {filtered.length === 0 && (
                <div className="text-center py-20 text-text-secondary">
                    <Building2 size={40} className="mx-auto mb-3 opacity-20" />
                    <h3 className="font-semibold text-sm text-text-primary">Directorio Vacío</h3>
                    <p className="text-xs text-text-secondary mt-1">Agrega tu primer aliado tecnológico o SaaS al directorio.</p>
                </div>
            )}

            {/* Form modal */}
            <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editingProv ? "Editar Registro" : "Registrar Aliado / SaaS"}>
                <form onSubmit={handleSaveProv} className="space-y-4">
                    <div>
                        <label className={labelCls}>Nombre Comercial *</label>
                        <input name="nombre" type="text" required defaultValue={editingProv?.nombre || ""} className={inputCls} placeholder="Ej: Twilio Inc." />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelCls}>Identificador / NIT</label>
                            <input name="nit" type="text" defaultValue={editingProv?.nit || ""} className={inputCls} placeholder="NIT o ID..." />
                        </div>
                        <div>
                            <label className={labelCls}>Especialidad / SaaS</label>
                            <input name="especialidad" type="text" placeholder="Ej: SMS Gateway, AI APIs" defaultValue={editingProv?.especialidad || ""} className={inputCls} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelCls}>Teléfono</label>
                            <input name="telefono" type="tel" defaultValue={editingProv?.telefono || ""} className={inputCls} placeholder="Teléfono..." />
                        </div>
                        <div>
                            <label className={labelCls}>Correo de Contacto</label>
                            <input name="email" type="email" defaultValue={editingProv?.email || ""} className={inputCls} placeholder="correo@empresa.com" />
                        </div>
                    </div>
                    <div>
                        <label className={labelCls}>Notas / Descripción</label>
                        <textarea name="notas" rows={3} defaultValue={editingProv?.notas || ""} className={`${inputCls} resize-none`} placeholder="Detalles de la integración o planes..." />
                    </div>
                    <div className="pt-4 flex gap-3">
                        <button type="submit" className="flex-1 py-2.5 bg-gradient-to-r from-primary-container to-primary text-on-primary-fixed rounded-xl font-bold hover:opacity-95 transition-opacity shadow-[0_0_15px_rgba(138,235,255,0.2)] text-xs">Guardar</button>
                        <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 bg-surface-dim border border-border-glass text-text-secondary hover:text-text-primary hover:bg-surface-bright rounded-xl font-bold text-xs transition-colors">Cancelar</button>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog isOpen={!!deletingId} title="Eliminar Registro" message="¿Estás seguro de eliminar este aliado tecnológico? Esta acción no se puede deshacer." onConfirm={handleConfirmDelete} onCancel={() => setDeletingId(null)} />
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
