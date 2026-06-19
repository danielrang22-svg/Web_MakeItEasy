"use client";

import React, { useState, useEffect } from "react";
import { Etapa, Lead, LeadCreateData, CotizacionCreateData, CotizacionUpdateData } from "@/lib/types";
import { PIPELINE_STAGES, LEAD_ORIGINS, formatCurrency } from "@/lib/constants";
import { useContactosStore } from "@/lib/state/contactosStore";
import { useEmpresasStore } from "@/lib/state/empresasStore";
import { useCotizacionesStore } from "@/lib/state/cotizacionesStore";
import {
    User,
    Building2,
    DollarSign,
    Phone,
    Mail,
    FileText,
    Globe,
    ChevronDown,
    Plus,
    Activity,
    Layers,
    ListTodo
} from "lucide-react";
import QuotationForm from "../cotizaciones/QuotationForm";
import AIBriefInput, { AiProposal } from "../cotizaciones/AIBriefInput";
import { Modal } from "../ui/SharedUI";
import { SearchableSelect } from "../ui/SearchableSelect";

interface LeadFormProps {
    initialData?: Lead;
    onSubmit: (data: LeadCreateData, pendingCotizacion?: CotizacionCreateData | CotizacionUpdateData) => void;
    onCancel: () => void;
    isSubmitting?: boolean;
}

export default function LeadForm({
    initialData,
    onSubmit,
    onCancel,
    isSubmitting = false,
}: LeadFormProps) {
    const { contactos, loadContactos, createContacto } = useContactosStore();
    const { empresas, loadEmpresas, createEmpresa } = useEmpresasStore();
    const { cotizaciones, loadCotizaciones } = useCotizacionesStore();

    useEffect(() => {
        loadContactos();
        loadEmpresas();
        loadCotizaciones();
    }, [loadContactos, loadEmpresas, loadCotizaciones]);

    const [form, setForm] = useState({
        titulo: initialData?.titulo ?? "",
        nombreContacto: initialData?.nombreContacto ?? "",
        empresa: initialData?.empresa ?? "",
        valorEstimado: initialData?.valorEstimado ?? 0,
        telefono: initialData?.telefono ?? "",
        email: initialData?.email ?? "",
        notas: initialData?.notas ?? "",
        etapa: initialData?.etapa ?? Etapa.NUEVO,
        origenLead: initialData?.origenLead ?? "",
        
        // Custom Make It Easy fields
        sector: initialData?.sector ?? "",
        numEmpleados: initialData?.numEmpleados ?? "",
        procesoAAutomatizar: initialData?.procesoAAutomatizar ?? "",
        planInteres: initialData?.planInteres ?? "",
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showCotModal, setShowCotModal] = useState(false);
    const [showAiBrief, setShowAiBrief] = useState(false);
    const [aiPrefilledData, setAiPrefilledData] = useState<AiProposal | null>(null);
    const [pendingCot, setPendingCot] = useState<CotizacionCreateData | CotizacionUpdateData | null>(null);

    // Build contact items for dropdown
    const contactItems = contactos.map((c) => ({
        id: c.id,
        label: c.nombre,
        sub: c.empresaNombre || c.cargo,
        telefono: c.telefono,
        email: c.email,
        empresaNombre: c.empresaNombre,
    }));

    // Build empresa items for dropdown
    const empresaItems = empresas.map((e) => ({
        id: e.id,
        label: e.nombre,
        sub: e.sector ? `${e.sector} · ${e.ciudad}` : e.ciudad,
    }));

    function validate(): boolean {
        const errs: Record<string, string> = {};
        if (!form.nombreContacto.trim()) errs.nombreContacto = "Nombre requerido";
        if (!form.empresa.trim()) errs.empresa = "Empresa requerida";
        if (!form.telefono.trim() && !form.email.trim())
            errs.telefono = "Teléfono o email requerido";
        if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
            errs.email = "Email inválido";
        if (form.telefono && form.telefono.replace(/\D/g, "").length < 7)
            errs.telefono = "Teléfono debe tener al menos 7 dígitos";
        setErrors(errs);
        return Object.keys(errs).length === 0;
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!validate()) return;
        
        // Auto-create missing contact/empresa if they typed it but didn't click create
        const contactExists = contactos.some(c => c.nombre.toLowerCase() === form.nombreContacto.trim().toLowerCase());
        if (!contactExists && form.nombreContacto.trim()) {
            await handleCreateContact(form.nombreContacto.trim());
        }
        
        const empresaExists = empresas.some(em => em.nombre.toLowerCase() === form.empresa.trim().toLowerCase());
        if (!empresaExists && form.empresa.trim()) {
            await handleCreateEmpresa(form.empresa.trim());
        }

        onSubmit(form as unknown as LeadCreateData, pendingCot || undefined);
    }

    function handleChange(field: string, value: string | number) {
        setForm((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => {
                const next = { ...prev };
                delete next[field];
                return next;
            });
        }
    }

    function handleContactSelect(name: string, item?: any) {
        handleChange("nombreContacto", name);
        if (item) {
            // Auto-fill from contact data
            const contact = contactos.find((c) => c.id === item.id);
            if (contact) {
                if (contact.empresaNombre) handleChange("empresa", contact.empresaNombre);
                if (contact.telefono && !form.telefono) handleChange("telefono", contact.telefono);
                if (contact.email && !form.email) handleChange("email", contact.email);
            }
        }
    }

    function handleCreateContact(name: string) {
        createContacto({
            nombre: name,
            cargo: "",
            empresaId: "",
            empresaNombre: form.empresa || "",
            telefono: form.telefono || "",
            telefono2: "",
            email: form.email || "",
            email2: "",
            notas: "",
            tags: [],
        });
    }

    function handleCreateEmpresa(name: string) {
        createEmpresa({
            nombre: name,
            nit: "",
            direccion: "",
            ciudad: "",
            sector: form.sector || "",
            tamano: "",
            telefono: form.telefono || "",
            email: form.email || "",
            notas: "",
        });
    }

    const inputClass = (field: string) =>
        `w-full pl-12 pr-4 py-4 bg-card border rounded-2xl focus:ring-2 focus:ring-mie-secondary transition-all outline-none text-foreground ${errors[field] ? "border-red-500 ring-1 ring-red-500" : "border-border"}`;

    const handleOpenCotDialog = () => {
        if (pendingCot) {
            // Already has a cotizacion drafted, open directly to edit
            setShowCotModal(true);
        } else {
            // New cotizacion, open AI Brief first
            setAiPrefilledData(null);
            setShowAiBrief(true);
        }
    };

    const handleAiProposalGenerated = (proposal: AiProposal) => {
        setAiPrefilledData(proposal);
        setShowAiBrief(false);
        setShowCotModal(true);
    };

    const handleCotSubmit = (cotData: CotizacionCreateData | CotizacionUpdateData) => {
        setPendingCot(cotData);
        // Set the estimated value of the lead to the total core project implementation cost
        handleChange("valorEstimado", cotData.totalProyectoCore || 0);
        setShowCotModal(false);
        setAiPrefilledData(null);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            {/* Título */}
            <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 ml-1">
                    Título / Referencia Cotización
                </label>
                <div className="relative">
                    <FileText size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        className="w-full pl-12 pr-4 py-4 bg-card border border-border rounded-2xl focus:ring-2 focus:ring-mie-secondary transition-all outline-none text-foreground"
                        placeholder="Ej: Propuesta Ecosistema Dulce Agonía"
                        value={form.titulo}
                        onChange={(e) => handleChange("titulo", e.target.value)}
                    />
                </div>
            </div>

            {/* Contacto - Searchable dropdown */}
            <SearchableSelect
                label="Contacto *"
                icon={User}
                items={contactItems}
                value={form.nombreContacto}
                onChange={handleContactSelect}
                onCreateNew={handleCreateContact}
                placeholder="Buscar contacto o crear nuevo..."
                error={errors.nombreContacto}
            />

            {/* Empresa - Searchable dropdown */}
            <SearchableSelect
                label="Empresa *"
                icon={Building2}
                items={empresaItems}
                value={form.empresa}
                onChange={(val) => handleChange("empresa", val)}
                onCreateNew={handleCreateEmpresa}
                placeholder="Buscar empresa o crear nueva..."
                error={errors.empresa}
            />

            {/* Valor + Etapa row */}
            <div className="grid grid-cols-2 gap-4">
                <div className="col-span-1">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 ml-1">
                        Valor Propuesta Core (COP/USD)
                    </label>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <DollarSign size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-mie-secondary" />
                            <input
                                type="text"
                                readOnly
                                className={`${inputClass("valorEstimado")} bg-muted/30 cursor-default font-bold text-mie-secondary pl-12 text-sm`}
                                placeholder="Generar..."
                                value={form.valorEstimado ? formatCurrency(form.valorEstimado, pendingCot?.moneda || "COP") : ""}
                            />
                        </div>
                        <button
                            type="button"
                            onClick={handleOpenCotDialog}
                            className="bg-mie-primary/10 text-mie-primary p-4 rounded-2xl border border-mie-primary/20 hover:bg-mie-primary/20 transition-all flex items-center justify-center shrink-0"
                            title={form.valorEstimado ? "Editar Propuesta" : "Crear Propuesta"}
                        >
                            <Plus size={20} />
                        </button>
                    </div>
                </div>
                <div className="col-span-1">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 ml-1">
                        Etapa *
                    </label>
                    <div className="relative">
                        <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        <select
                            className="w-full px-4 py-4 bg-card border border-border rounded-2xl focus:ring-2 focus:ring-mie-secondary transition-all outline-none appearance-none text-foreground"
                            value={form.etapa}
                            onChange={(e) => handleChange("etapa", e.target.value)}
                        >
                            {PIPELINE_STAGES.map((s) => (
                                <option key={s.key} value={s.key}>
                                    {s.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Teléfono */}
            <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 ml-1">
                    Teléfono
                </label>
                <div className="relative">
                    <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="tel"
                        className={inputClass("telefono")}
                        placeholder="+57 300 000 0000"
                        value={form.telefono}
                        onChange={(e) => handleChange("telefono", e.target.value)}
                    />
                </div>
                {errors.telefono && <p className="text-red-500 text-xs mt-1 ml-1">{errors.telefono}</p>}
            </div>

            {/* Email */}
            <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 ml-1">
                    Email
                </label>
                <div className="relative">
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="email"
                        className={inputClass("email")}
                        placeholder="email@ejemplo.com"
                        value={form.email}
                        onChange={(e) => handleChange("email", e.target.value)}
                    />
                </div>
                {errors.email && <p className="text-red-500 text-xs mt-1 ml-1">{errors.email}</p>}
            </div>

            {/* Custom Make It Easy Info */}
            <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
                {/* Sector */}
                <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 ml-1">
                        Sector
                    </label>
                    <div className="relative">
                        <Activity size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            className="w-full pl-12 pr-4 py-4 bg-card border border-border rounded-2xl focus:ring-2 focus:ring-mie-secondary transition-all outline-none text-foreground"
                            placeholder="Ej: Retail, Alimentos"
                            value={form.sector}
                            onChange={(e) => handleChange("sector", e.target.value)}
                        />
                    </div>
                </div>
                {/* Tamaño Empleados */}
                <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 ml-1">
                        Empleados
                    </label>
                    <div className="relative">
                        <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        <select
                            className="w-full px-4 py-4 bg-card border border-border rounded-2xl focus:ring-2 focus:ring-mie-secondary transition-all outline-none appearance-none text-foreground"
                            value={form.numEmpleados}
                            onChange={(e) => handleChange("numEmpleados", e.target.value)}
                        >
                            <option value="">Seleccionar</option>
                            <option value="1-10">1 - 10 empleados</option>
                            <option value="11-50">11 - 50 empleados</option>
                            <option value="51-200">51 - 200 empleados</option>
                            <option value="200+">Más de 200 empleados</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {/* Plan Interés */}
                <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 ml-1">
                        Plan de Interés
                    </label>
                    <div className="relative">
                        <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        <select
                            className="w-full px-4 py-4 bg-card border border-border rounded-2xl focus:ring-2 focus:ring-mie-secondary transition-all outline-none appearance-none text-foreground"
                            value={form.planInteres}
                            onChange={(e) => handleChange("planInteres", e.target.value)}
                        >
                            <option value="">Seleccionar</option>
                            <option value="Start">Start (Básico)</option>
                            <option value="Growth">Growth (Crecimiento)</option>
                            <option value="Enterprise">Enterprise (A medida)</option>
                        </select>
                    </div>
                </div>
                {/* Origen */}
                <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 ml-1">
                        Origen del Lead
                    </label>
                    <div className="relative">
                        <Globe size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        <select
                            className="w-full pl-12 pr-10 py-4 bg-card border border-border rounded-2xl focus:ring-2 focus:ring-mie-secondary transition-all outline-none appearance-none text-foreground"
                            value={form.origenLead}
                            onChange={(e) => handleChange("origenLead", e.target.value)}
                        >
                            <option value="">Seleccionar</option>
                            {LEAD_ORIGINS.map((o) => (
                                <option key={o} value={o}>
                                    {o}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Proceso a automatizar */}
            <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 ml-1">
                    Proceso a automatizar
                </label>
                <div className="relative">
                    <ListTodo size={18} className="absolute left-4 top-6 text-muted-foreground" />
                    <textarea
                        className="w-full pl-12 pr-4 py-4 bg-card border border-border rounded-2xl focus:ring-2 focus:ring-mie-secondary transition-all outline-none resize-none text-foreground"
                        placeholder="Describa el flujo o proceso que el cliente requiere automatizar..."
                        rows={2}
                        value={form.procesoAAutomatizar}
                        onChange={(e) => handleChange("procesoAAutomatizar", e.target.value)}
                    />
                </div>
            </div>

            {/* Notas */}
            <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 ml-1">
                    Notas Generales
                </label>
                <div className="relative">
                    <textarea
                        className="w-full p-4 bg-card border border-border rounded-2xl focus:ring-2 focus:ring-mie-secondary transition-all outline-none resize-none text-foreground"
                        placeholder="Detalles adicionales sobre el lead..."
                        rows={3}
                        value={form.notas}
                        onChange={(e) => handleChange("notas", e.target.value)}
                    />
                </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 pt-2">
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full mie-gradient text-white font-bold py-4 rounded-2xl shadow-lg shadow-purple-500/20 active:scale-[0.98] transition-transform disabled:opacity-50"
                >
                    {isSubmitting ? "Guardando..." : initialData ? "Guardar Cambios" : "Crear Lead"}
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="w-full py-3 text-muted-foreground font-medium rounded-2xl border border-border hover:bg-muted transition-colors"
                >
                    Cancelar
                </button>
            </div>

            <Modal isOpen={showAiBrief} onClose={() => setShowAiBrief(false)} title="✨ Generar Propuesta Comercial con IA" zIndex={60}>
                <div className="p-1 max-h-[85vh] overflow-y-auto custom-scrollbar">
                    <AIBriefInput
                        leadData={{
                            empresa: form.empresa || undefined,
                            sector: form.sector || undefined,
                            numEmpleados: form.numEmpleados || undefined,
                            procesoAAutomatizar: form.procesoAAutomatizar || undefined,
                            planInteres: form.planInteres || undefined,
                        }}
                        onProposalGenerated={handleAiProposalGenerated}
                        onSkip={() => { setShowAiBrief(false); setShowCotModal(true); }}
                    />
                </div>
            </Modal>

            <Modal isOpen={showCotModal} onClose={() => setShowCotModal(false)} title="Generar Propuesta Comercial para el Lead" zIndex={60}>
                <div className="p-1 max-h-[85vh] overflow-y-auto custom-scrollbar">
                    <QuotationForm
                        initial={pendingCot ? { ...pendingCot, id: "temp", version: 1, fechaCreacion: "", fechaActualizacion: "" } as any : null}
                        aiPrefilled={aiPrefilledData}
                        allCotizaciones={cotizaciones}
                        empresas={empresas.map(e => e.nombre)}
                        contactos={contactos.map(c => ({ nombre: c.nombre, empresa: c.empresaNombre || "" }))}
                        onSubmit={handleCotSubmit}
                        onCancel={() => setShowCotModal(false)}
                        isInsideLeadForm={true}
                    />
                </div>
            </Modal>
        </form>
    );
}
