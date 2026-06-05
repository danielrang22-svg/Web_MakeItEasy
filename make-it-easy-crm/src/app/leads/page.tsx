"use client";

import { useEffect, useState } from "react";
import { useLeadsStore, getFilteredLeads, getTotalPipelineValue } from "@/lib/state/leadsStore";
import { Lead, LeadCreateData, Etapa } from "@/lib/types";
import { formatCurrency, PIPELINE_STAGES } from "@/lib/constants";
import LeadCard from "@/components/leads/LeadCard";
import LeadTable from "@/components/leads/LeadTable";
import LeadForm from "@/components/leads/LeadForm";
import { Modal, Toast, ConfirmDialog } from "@/components/ui/SharedUI";
import {
  Search, Filter, DollarSign, Calendar, Users, ChevronLeft, ChevronRight,
  LayoutGrid, List, Sparkles, TrendingUp, HelpCircle
} from "lucide-react";

const ITEMS_PER_PAGE = 20;

export default function LeadsPage() {
  const store = useLeadsStore();
  const {
    leads, searchQuery, filters, loadLeads, createLead, updateLead, deleteLead,
    setSearchQuery, setFilters, resetFilters
  } = store;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [deletingLead, setDeletingLead] = useState<Lead | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [page, setPage] = useState(0);
  const [showStageFilter, setShowStageFilter] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "table">("table");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const filteredLeads = getFilteredLeads({ leads, searchQuery, filters } as any);
  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / ITEMS_PER_PAGE));
  const paginatedLeads = filteredLeads.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);
  const totalValue = getTotalPipelineValue(leads);

  const aiQualifiedCount = leads.filter(l =>
    l.etapa === Etapa.GANADO || l.etapa === Etapa.NEGOCIACION || l.etapa === Etapa.PROPUESTA
  ).length;

  function handleCreate(data: LeadCreateData) {
    setIsSubmitting(true);
    setTimeout(() => {
      createLead(data);
      setIsSubmitting(false);
      setShowCreateModal(false);
      setToast({ message: "Lead creado exitosamente", type: "success" });
    }, 400);
  }

  function handleUpdate(data: LeadCreateData) {
    if (!editingLead) return;
    setIsSubmitting(true);
    setTimeout(() => {
      updateLead(editingLead.id, data);
      setIsSubmitting(false);
      setEditingLead(null);
      setToast({ message: "Lead actualizado exitosamente", type: "success" });
    }, 400);
  }

  function handleDelete() {
    if (!deletingLead) return;
    deleteLead(deletingLead.id);
    setDeletingLead(null);
    setToast({ message: "Lead eliminado", type: "info" });
  }

  function toggleStageFilter(etapa: Etapa) {
    const current = filters.etapas;
    if (current.includes(etapa)) {
      setFilters({ etapas: current.filter((e) => e !== etapa) });
    } else {
      setFilters({ etapas: [...current, etapa] });
    }
    setPage(0);
  }

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

      {/* ── Quick Stats / AI Overview Bento ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Stat 1 */}
        <div className="glass-panel rounded-xl p-6 relative overflow-hidden group border border-border-glass">
          <div className="absolute -right-10 -top-10 w-32 h-32 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-colors duration-500"></div>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Leads Activos</h3>
              <p className="text-3xl font-black text-text-primary mt-1 tracking-tight">{filteredLeads.length}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-surface-bright flex items-center justify-center border border-border-glass text-primary">
              <Users size={18} />
            </div>
          </div>
          <div className="flex items-center gap-1 text-tertiary">
            <TrendingUp size={14} />
            <span className="text-xs font-semibold">+12% vs semana anterior</span>
          </div>
        </div>

        {/* Stat 2 */}
        <div className="glass-panel rounded-xl p-6 relative overflow-hidden group border border-border-glass">
          <div className="absolute -right-10 -top-10 w-32 h-32 bg-secondary/10 rounded-full blur-2xl group-hover:bg-secondary/20 transition-colors duration-500"></div>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">AI Calificados</h3>
              <p className="text-3xl font-black text-text-primary mt-1 tracking-tight">{aiQualifiedCount}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-secondary-container/30 flex items-center justify-center border border-secondary/20 text-secondary ai-pulse">
              <Sparkles size={18} />
            </div>
          </div>
          <div className="flex items-center gap-2 text-text-secondary text-xs">
            <span>{leads.filter(l => l.etapa === Etapa.PROPUESTA).length} listos para cierre</span>
          </div>
        </div>

        {/* Stat 3 */}
        <div className="glass-panel rounded-xl p-6 relative overflow-hidden border border-border-glass">
          <div className="flex flex-col h-full justify-between">
            <h3 className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-2">Fuentes Principales</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#25D366]"></span>
                  <span className="text-xs text-text-primary font-medium">WhatsApp</span>
                </div>
                <span className="text-xs text-text-secondary">45%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E1306C]"></span>
                  <span className="text-xs text-text-primary font-medium">Instagram</span>
                </div>
                <span className="text-xs text-text-secondary">35%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                  <span className="text-xs text-text-primary font-medium">Web Form</span>
                </div>
                <span className="text-xs text-text-secondary">20%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filters & Table/Grid Section ── */}
      <div className="glass-panel rounded-xl border border-border-glass flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-border-glass/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input inside toolbar */}
            <div className="relative group min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                placeholder="Buscar leads..."
                className="bg-surface-dim border border-border-glass/60 rounded-full pl-9 pr-4 py-1.5 text-text-primary text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary w-full transition-all placeholder:text-text-secondary"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
              />
            </div>

            {/* Stage filter pill */}
            <button
              onClick={() => setShowStageFilter(!showStageFilter)}
              className={`px-3 py-1.5 rounded-full bg-surface-bright/60 border border-border-glass/80 text-xs font-semibold text-text-primary hover:border-primary transition-colors flex items-center gap-1.5 ${
                filters.etapas.length > 0 ? "border-primary text-primary" : ""
              }`}
            >
              <Filter size={11} />
              <span>Etapas {filters.etapas.length > 0 && `(${filters.etapas.length})`}</span>
            </button>

            {/* Value ranges pills */}
            <button
              onClick={() => {
                const isActive = filters.valorMax === 1000000 && filters.valorMin === null;
                setFilters(isActive ? { valorMin: null, valorMax: null } : { valorMin: null, valorMax: 1000000 });
                setPage(0);
              }}
              className={`px-3 py-1.5 rounded-full bg-surface-bright/60 border border-border-glass/80 text-xs font-semibold text-text-primary hover:border-primary transition-colors ${
                filters.valorMax === 1000000 && filters.valorMin === null ? "border-primary text-primary" : ""
              }`}
            >
              &lt; $1M
            </button>
            <button
              onClick={() => {
                const isActive = filters.valorMin === 1000000 && filters.valorMax === 5000000;
                setFilters(isActive ? { valorMin: null, valorMax: null } : { valorMin: 1000000, valorMax: 5000000 });
                setPage(0);
              }}
              className={`px-3 py-1.5 rounded-full bg-surface-bright/60 border border-border-glass/80 text-xs font-semibold text-text-primary hover:border-primary transition-colors ${
                filters.valorMin === 1000000 && filters.valorMax === 5000000 ? "border-primary text-primary" : ""
              }`}
            >
              $1M – $5M
            </button>
            <button
              onClick={() => {
                const isActive = filters.valorMin === 5000000 && filters.valorMax === null;
                setFilters(isActive ? { valorMin: null, valorMax: null } : { valorMin: 5000000, valorMax: null });
                setPage(0);
              }}
              className={`px-3 py-1.5 rounded-full bg-surface-bright/60 border border-border-glass/80 text-xs font-semibold text-text-primary hover:border-primary transition-colors ${
                filters.valorMin === 5000000 && filters.valorMax === null ? "border-primary text-primary" : ""
              }`}
            >
              &gt; $5M
            </button>

            {/* Clear filters */}
            {(filters.etapas.length > 0 || filters.valorMin !== null || filters.valorMax !== null || filters.fechaDesde !== null) && (
              <button
                onClick={() => { resetFilters(); setPage(0); }}
                className="text-xs font-semibold text-error hover:underline px-2"
              >
                Limpiar
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 self-end md:self-auto">
            {/* View togglers */}
            <div className="flex bg-surface-dim border border-border-glass rounded-lg p-0.5">
              <button
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-md transition-colors ${viewMode === "table" ? "bg-surface-bright text-primary" : "text-text-secondary hover:text-text-primary"}`}
                title="Vista tabla"
              >
                <List size={14} />
              </button>
              <button
                onClick={() => setViewMode("cards")}
                className={`p-1.5 rounded-md transition-colors ${viewMode === "cards" ? "bg-surface-bright text-primary" : "text-text-secondary hover:text-text-primary"}`}
                title="Vista tarjetas"
              >
                <LayoutGrid size={14} />
              </button>
            </div>

            {/* Add new Lead inside toolbar */}
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-primary-container to-primary text-on-primary-fixed rounded-lg text-xs font-bold hover:opacity-90 transition-opacity shadow-[0_0_15px_rgba(138,235,255,0.2)]"
            >
              + Nuevo
            </button>
          </div>
        </div>

        {/* Stage Filter Dropdown */}
        {showStageFilter && (
          <div className="p-4 bg-surface-dim/40 border-b border-border-glass/40 animate-scale-in">
            <div className="flex flex-wrap gap-2">
              {PIPELINE_STAGES.map((s) => (
                <button
                  key={s.key}
                  onClick={() => toggleStageFilter(s.key)}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-colors ${
                    filters.etapas.includes(s.key)
                      ? "bg-primary/20 border-primary text-primary"
                      : "bg-surface-bright/40 border-border-glass text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {s.shortLabel}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Content canvas */}
        <div className="p-2">
          {paginatedLeads.length === 0 ? (
            <div className="text-center py-16 text-text-secondary">
              <Users size={40} className="mx-auto mb-3 opacity-25" />
              <p className="font-semibold text-sm">No se encontraron leads</p>
              <p className="text-xs text-text-secondary mt-1">Ajusta los filtros o crea un nuevo prospecto</p>
            </div>
          ) : viewMode === "table" ? (
            <LeadTable
              leads={paginatedLeads}
              onEdit={setEditingLead}
              onDelete={setDeletingLead}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
              {paginatedLeads.map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  onEdit={setEditingLead}
                  onDelete={setDeletingLead}
                />
              ))}
            </div>
          )}
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-border-glass/40 flex items-center justify-between">
            <p className="text-xs text-text-secondary">
              Mostrando {page * ITEMS_PER_PAGE + 1} a {Math.min((page + 1) * ITEMS_PER_PAGE, filteredLeads.length)} de {filteredLeads.length} leads
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="p-1.5 rounded-lg bg-surface-bright/50 border border-border-glass/60 text-text-secondary hover:text-text-primary hover:bg-surface-bright disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  className={`w-7 h-7 rounded-lg text-xs font-semibold border flex items-center justify-center transition-all ${
                    i === page
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-transparent border-border-glass text-text-secondary hover:bg-surface-bright/50 hover:text-text-primary"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page === totalPages - 1}
                className="p-1.5 rounded-lg bg-surface-bright/50 border border-border-glass/60 text-text-secondary hover:text-text-primary hover:bg-surface-bright disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Nuevo Lead">
        <LeadForm onSubmit={handleCreate} onCancel={() => setShowCreateModal(false)} isSubmitting={isSubmitting} />
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editingLead} onClose={() => setEditingLead(null)} title="Editar Lead">
        {editingLead && (
          <LeadForm
            initialData={editingLead}
            onSubmit={handleUpdate}
            onCancel={() => setEditingLead(null)}
            isSubmitting={isSubmitting}
          />
        )}
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deletingLead}
        title="Eliminar Lead"
        message={`¿Estás seguro de eliminar el lead de ${deletingLead?.nombreContacto}? Esta acción no se puede deshacer.`}
        onConfirm={handleDelete}
        onCancel={() => setDeletingLead(null)}
      />

      {/* Toast */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
