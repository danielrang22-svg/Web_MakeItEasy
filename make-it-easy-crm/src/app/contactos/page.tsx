"use client";

import { useEffect, useState } from "react";
import { useContactosStore, getFilteredContactos } from "@/lib/state/contactosStore";
import { useLeadsStore, getLeadsSummaryByContact } from "@/lib/state/leadsStore";
import { Contacto, ContactoCreateData, TipoInteraccion, Interaccion, Empresa } from "@/lib/types";
import { useEmpresasStore } from "@/lib/state/empresasStore";
import { formatCurrency } from "@/lib/constants";
import { Modal, Toast, ConfirmDialog } from "@/components/ui/SharedUI";
import {
    Search, Users, Plus, Pencil, Trash2,
    Phone, Mail, Building2, Tag, Briefcase,
    MessageCircle, PhoneCall, Mail as MailIcon, Users as MeetingIcon, FileText,
    ChevronDown, ChevronUp, Send, TrendingUp, CheckCircle, XCircle,
} from "lucide-react";

const INTERACTION_ICONS: Record<TipoInteraccion, React.ReactNode> = {
    llamada: <PhoneCall size={14} className="text-green-500" />,
    email: <MailIcon size={14} className="text-mie-primary" />,
    reunion: <MeetingIcon size={14} className="text-mie-secondary" />,
    nota: <FileText size={14} className="text-orange-500" />,
    whatsapp: <MessageCircle size={14} className="text-green-600" />,
};

export default function ContactosPage() {
    const store = useContactosStore();
    const { contactos, searchQuery, loadContactos, createContacto, updateContacto, deleteContacto, setSearchQuery, getInteractions, addInteraction } = store;
    const { empresas, loadEmpresas } = useEmpresasStore();
    const { leads, loadLeads } = useLeadsStore();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingContacto, setEditingContacto] = useState<Contacto | null>(null);
    const [deletingContacto, setDeletingContacto] = useState<Contacto | null>(null);
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [interactions, setInteractions] = useState<Interaccion[]>([]);
    const [newInteraction, setNewInteraction] = useState({ tipo: "nota" as TipoInteraccion, desc: "" });

    useEffect(() => { loadContactos(); loadEmpresas(); loadLeads(); }, [loadContactos, loadEmpresas, loadLeads]);

    const filteredContactos = getFilteredContactos(store);

    async function toggleExpand(id: string) {
        if (expandedId === id) {
            setExpandedId(null);
        } else {
            setExpandedId(id);
            setInteractions(await getInteractions(id));
        }
    }

    async function handleAddInteraction(contactoId: string) {
        if (!newInteraction.desc.trim()) return;
        await addInteraction(contactoId, newInteraction.tipo, newInteraction.desc);
        setInteractions(await getInteractions(contactoId));
        setNewInteraction({ tipo: "nota", desc: "" });
        setToast({ message: "Interacción registrada", type: "success" });
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const empresaId = fd.get("empresaId") as string;
        const empresa = empresas.find((em) => em.id === empresaId);
        const tagsRaw = (fd.get("tags") as string) || "";
        const data: ContactoCreateData = {
            nombre: fd.get("nombre") as string,
            cargo: fd.get("cargo") as string,
            empresaId,
            empresaNombre: empresa?.nombre || (fd.get("empresaNombre") as string) || "",
            telefono: fd.get("telefono") as string,
            telefono2: fd.get("telefono2") as string,
            email: fd.get("email") as string,
            email2: fd.get("email2") as string,
            notas: fd.get("notas") as string,
            tags: tagsRaw.split(",").map((t) => t.trim()).filter(Boolean),
        };
        if (editingContacto) {
            await updateContacto(editingContacto.id, data);
            setEditingContacto(null);
            setToast({ message: "Contacto actualizado", type: "success" });
        } else {
            await createContacto(data);
            setShowCreateModal(false);
            setToast({ message: "Contacto creado", type: "success" });
        }
    }

    async function handleDelete() {
        if (!deletingContacto) return;
        await deleteContacto(deletingContacto.id);
        setDeletingContacto(null);
        setToast({ message: "Contacto eliminado", type: "info" });
    }



    return (
        <div className="px-5 pb-32">
            <div className="mt-4 mb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Users size={24} className="text-mie-secondary" />
                        Contactos
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1">{filteredContactos.length} contactos</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="mie-gradient text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-1"
                >
                    <Plus size={16} /> Nuevo
                </button>
            </div>

            {/* Search */}
            <div className="relative mb-4">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                    type="text"
                    className="w-full pl-10 pr-4 py-3 bg-card rounded-2xl ring-1 ring-border focus:ring-2 focus:ring-mie-primary outline-none"
                    placeholder="Buscar nombre, empresa, cargo, tag..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Contact Cards */}
            <div className="space-y-3">
                {filteredContactos.map((contacto) => (
                    <div key={contacto.id} className="bg-card ring-1 ring-border rounded-2xl overflow-hidden">
                        <div className="p-4">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="w-10 h-10 rounded-full mie-gradient flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                        {contacto.nombre.charAt(0)}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-base truncate">{contacto.nombre}</h3>
                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Briefcase size={10} /> {contacto.cargo || "Sin cargo"}
                                            {contacto.empresaNombre && (
                                                <> · <Building2 size={10} /> {contacto.empresaNombre}</>
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Lead Value Summary */}
                            {(() => {
                                const summary = getLeadsSummaryByContact(leads, contacto.nombre);
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

                            {/* Quick contact */}
                            <div className="flex gap-2 mt-3">
                                {contacto.telefono && (
                                    <a href={`tel:${contacto.telefono}`} className="px-2 py-1 bg-muted rounded-lg text-xs flex items-center gap-1 hover:bg-muted/80">
                                        <Phone size={10} /> {contacto.telefono}
                                    </a>
                                )}
                                {contacto.email && (
                                    <a href={`mailto:${contacto.email}`} className="px-2 py-1 bg-muted rounded-lg text-xs flex items-center gap-1 hover:bg-muted/80 truncate">
                                        <Mail size={10} /> {contacto.email}
                                    </a>
                                )}
                            </div>

                            {/* Tags */}
                            {contacto.tags.length > 0 && (
                                <div className="flex gap-1 mt-2 flex-wrap">
                                    {contacto.tags.map((tag) => (
                                        <span key={tag} className="px-2 py-0.5 bg-mie-secondary/10 text-mie-secondary text-[10px] font-bold rounded-full uppercase">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex items-center justify-between mt-3">
                                <button
                                    onClick={() => toggleExpand(contacto.id)}
                                    className="text-xs font-medium text-mie-primary flex items-center gap-1"
                                >
                                    {expandedId === contacto.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                    Historial
                                </button>
                                <div className="flex gap-2">
                                    <button onClick={() => setEditingContacto(contacto)} className="px-2 py-1 text-xs text-muted-foreground hover:bg-muted rounded-lg">
                                        <Pencil size={12} className="inline mr-0.5" /> Editar
                                    </button>
                                    <button onClick={() => setDeletingContacto(contacto)} className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg">
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Expanded: Interaction History */}
                        {expandedId === contacto.id && (
                            <div className="border-t border-border px-4 py-3 bg-muted/30">
                                {/* Add interaction */}
                                <div className="flex gap-2 mb-3">
                                    <select
                                        value={newInteraction.tipo}
                                        onChange={(e) => setNewInteraction({ ...newInteraction, tipo: e.target.value as TipoInteraccion })}
                                        className="px-2 py-2 bg-card rounded-xl ring-1 ring-border text-xs outline-none"
                                    >
                                        <option value="nota">📝 Nota</option>
                                        <option value="llamada">📞 Llamada</option>
                                        <option value="email">📧 Email</option>
                                        <option value="reunion">👥 Reunión</option>
                                        <option value="whatsapp">💬 WhatsApp</option>
                                    </select>
                                    <input
                                        type="text"
                                        placeholder="Agregar interacción..."
                                        value={newInteraction.desc}
                                        onChange={(e) => setNewInteraction({ ...newInteraction, desc: e.target.value })}
                                        onKeyDown={(e) => e.key === "Enter" && handleAddInteraction(contacto.id)}
                                        className="flex-1 px-3 py-2 bg-card rounded-xl ring-1 ring-border text-xs outline-none focus:ring-mie-primary"
                                    />
                                    <button
                                        onClick={() => handleAddInteraction(contacto.id)}
                                        className="p-2 mie-gradient rounded-xl text-white"
                                    >
                                        <Send size={14} />
                                    </button>
                                </div>

                                {/* History list */}
                                {interactions.length === 0 ? (
                                    <p className="text-xs text-muted-foreground text-center py-2">Sin interacciones registradas</p>
                                ) : (
                                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                                        {interactions.map((inter) => (
                                            <div key={inter.id} className="flex items-start gap-2 text-xs">
                                                {INTERACTION_ICONS[inter.tipo]}
                                                <div className="flex-1 min-w-0">
                                                    <p>{inter.descripcion}</p>
                                                    <p className="text-muted-foreground mt-0.5">
                                                        {new Date(inter.fecha).toLocaleDateString("es-CO")} · {new Date(inter.fecha).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
                {filteredContactos.length === 0 && (
                    <div className="text-center py-16 text-muted-foreground">
                        <Users size={48} className="mx-auto mb-4 opacity-30" />
                        <p className="font-medium">No se encontraron contactos</p>
                    </div>
                )}
            </div>

            {/* Create Modal */}
            <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Nuevo Contacto">
                <FormContent
                    onSubmit={handleSubmit}
                    empresas={empresas}
                    onCancel={() => setShowCreateModal(false)}
                />
            </Modal>

            {/* Edit Modal */}
            <Modal isOpen={!!editingContacto} onClose={() => setEditingContacto(null)} title="Editar Contacto">
                {editingContacto && (
                    <FormContent
                        initial={editingContacto}
                        onSubmit={handleSubmit}
                        empresas={empresas}
                        onCancel={() => setEditingContacto(null)}
                    />
                )}
            </Modal>

            {/* Delete Confirm */}
            <ConfirmDialog
                isOpen={!!deletingContacto}
                title="Eliminar Contacto"
                message={`¿Eliminar "${deletingContacto?.nombre}"? Esta acción no se puede deshacer.`}
                onConfirm={handleDelete}
                onCancel={() => setDeletingContacto(null)}
            />

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}

interface FormContentProps {
    initial?: Contacto;
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
    empresas: Empresa[];
    onCancel: () => void;
}

const FormContent = ({ initial, onSubmit, empresas, onCancel }: FormContentProps) => (
    <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">Nombre *</label>
                <input name="nombre" required defaultValue={initial?.nombre} className="w-full mt-1 px-4 py-3 bg-muted rounded-2xl ring-1 ring-border focus:ring-2 focus:ring-mie-primary outline-none" />
            </div>
            <div>
                <label className="text-xs font-bold uppercase text-muted-foreground">Cargo</label>
                <input name="cargo" defaultValue={initial?.cargo} className="w-full mt-1 px-4 py-3 bg-muted rounded-2xl ring-1 ring-border focus:ring-2 focus:ring-mie-primary outline-none" />
            </div>
            <div>
                <label className="text-xs font-bold uppercase text-muted-foreground">Empresa</label>
                <select name="empresaId" defaultValue={initial?.empresaId || ""} className="w-full mt-1 px-4 py-3 bg-muted rounded-2xl ring-1 ring-border focus:ring-2 focus:ring-mie-primary outline-none">
                    <option value="">Sin empresa</option>
                    {empresas.map((em) => (
                        <option key={em.id} value={em.id}>{em.nombre}</option>
                    ))}
                </select>
                {!initial?.empresaId && (
                    <input name="empresaNombre" defaultValue={initial?.empresaNombre} placeholder="O escribir nombre" className="w-full mt-2 px-4 py-2 bg-muted rounded-xl ring-1 ring-border text-sm outline-none" />
                )}
            </div>
            <div>
                <label className="text-xs font-bold uppercase text-muted-foreground">Teléfono *</label>
                <input name="telefono" required defaultValue={initial?.telefono} className="w-full mt-1 px-4 py-3 bg-muted rounded-2xl ring-1 ring-border focus:ring-2 focus:ring-mie-primary outline-none" />
            </div>
            <div>
                <label className="text-xs font-bold uppercase text-muted-foreground">Teléfono 2</label>
                <input name="telefono2" defaultValue={initial?.telefono2} className="w-full mt-1 px-4 py-3 bg-muted rounded-2xl ring-1 ring-border focus:ring-2 focus:ring-mie-primary outline-none" />
            </div>
            <div>
                <label className="text-xs font-bold uppercase text-muted-foreground">Email *</label>
                <input name="email" type="email" required defaultValue={initial?.email} className="w-full mt-1 px-4 py-3 bg-muted rounded-2xl ring-1 ring-border focus:ring-2 focus:ring-mie-primary outline-none" />
            </div>
            <div>
                <label className="text-xs font-bold uppercase text-muted-foreground">Email 2</label>
                <input name="email2" type="email" defaultValue={initial?.email2} className="w-full mt-1 px-4 py-3 bg-muted rounded-2xl ring-1 ring-border focus:ring-2 focus:ring-mie-primary outline-none" />
            </div>
            <div className="col-span-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">Tags (separar con comas)</label>
                <input name="tags" defaultValue={initial?.tags?.join(", ")} placeholder="VIP, Dotación, EPP..." className="w-full mt-1 px-4 py-3 bg-muted rounded-2xl ring-1 ring-border focus:ring-2 focus:ring-mie-primary outline-none" />
            </div>
            <div className="col-span-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">Notas</label>
                <textarea name="notas" rows={2} defaultValue={initial?.notas} className="w-full mt-1 px-4 py-3 bg-muted rounded-2xl ring-1 ring-border focus:ring-2 focus:ring-mie-primary outline-none resize-none" />
            </div>
        </div>
        <div className="flex gap-3 pt-2">
            <button type="submit" className="flex-1 mie-gradient text-white font-bold py-4 rounded-2xl shadow-lg">
                {initial ? "Guardar Cambios" : "Crear Contacto"}
            </button>
            <button type="button" onClick={onCancel} className="px-6 py-4 rounded-2xl ring-1 ring-border font-medium">
                Cancelar
            </button>
        </div>
    </form>
);
