"use client";

import Link from "next/link";
import { Lead, Etapa } from "@/lib/types";
import { getStageConfig, formatCurrency } from "@/lib/constants";
import { Phone, Mail, Pencil, Trash2, Building2, ExternalLink } from "lucide-react";

interface LeadCardProps {
  lead: Lead;
  onEdit: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
}

function getAiState(etapa: Etapa) {
  switch (etapa) {
    case Etapa.GANADO:
    case Etapa.ACEPTADO:
    case Etapa.PROPUESTA:
      return {
        label: "Calificado",
        dotColor: "bg-tertiary",
        badgeStyle: "bg-tertiary/10 border-tertiary/20 text-tertiary",
        pulse: false,
        probability: 92
      };
    case Etapa.CONTACTADO:
      return {
        label: "Contactando",
        dotColor: "bg-secondary",
        badgeStyle: "bg-secondary/10 border-secondary/20 text-secondary",
        pulse: true,
        probability: 65
      };
    case Etapa.NUEVO:
      return {
        label: "Follow-up",
        dotColor: "bg-outline",
        badgeStyle: "bg-outline/20 border-outline/30 text-text-secondary",
        pulse: false,
        probability: 30
      };
    default:
      return {
        label: "Perdido",
        dotColor: "bg-error",
        badgeStyle: "bg-error/10 border-error/20 text-error",
        pulse: false,
        probability: 10
      };
  }
}

export default function LeadCard({ lead, onEdit, onDelete }: LeadCardProps) {
  const stage = getStageConfig(lead.etapa);
  const ai = getAiState(lead.etapa);

  return (
    <div className="glass-panel rounded-xl p-5 relative overflow-hidden group border border-border-glass transition-all duration-300 hover:-translate-y-1 hover:bg-surface-bright/20">
      {/* Background glow blob */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl -mr-6 -mt-6 transition-transform group-hover:scale-110"></div>

      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <Link href={`/leads/${lead.id}`} className="min-w-0 flex-1">
          {lead.titulo && (
            <p className="text-[9px] font-bold uppercase tracking-wider text-primary mb-1 truncate">
              {lead.titulo}
            </p>
          )}
          <h3 className="font-semibold text-base text-text-primary truncate group-hover:text-primary transition-colors">
            {lead.nombreContacto}
          </h3>
          <p className="text-xs text-text-secondary flex items-center gap-1 mt-0.5">
            <Building2 size={12} className="text-text-secondary" />
            <span className="truncate">{lead.empresa}</span>
          </p>
        </Link>
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold border ${ai.badgeStyle} flex-shrink-0`}>
          <span className={`w-1.5 h-1.5 rounded-full ${ai.dotColor} ${ai.pulse ? "ai-pulse" : ""}`}></span>
          {ai.label}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 py-3 border-y border-border-glass/40">
        <div>
          <p className="text-[9px] text-text-secondary font-bold uppercase tracking-wider">
            Valor Estimado
          </p>
          <p className="font-bold text-sm text-text-primary mt-0.5">{formatCurrency(lead.valorEstimado)}</p>
        </div>
        <div>
          <p className="text-[9px] text-text-secondary font-bold uppercase tracking-wider">Probabilidad</p>
          <p className="font-semibold text-sm mt-0.5 text-text-primary">{ai.probability}%</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mt-4">
        <div className="flex gap-2">
          {lead.telefono && (
            <a
              href={`tel:${lead.telefono}`}
              className="w-8 h-8 rounded-lg bg-surface-dim border border-border-glass/60 flex items-center justify-center text-text-secondary hover:text-primary hover:bg-surface-bright transition-colors"
              title="Llamar"
            >
              <Phone size={13} />
            </a>
          )}
          {lead.email && (
            <a
              href={`mailto:${lead.email}`}
              className="w-8 h-8 rounded-lg bg-surface-dim border border-border-glass/60 flex items-center justify-center text-text-secondary hover:text-primary hover:bg-surface-bright transition-colors"
              title="Enviar correo"
            >
              <Mail size={13} />
            </a>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/leads/${lead.id}`}
            className="px-2.5 py-1.5 text-xs font-bold text-primary hover:bg-primary/10 rounded-lg transition-colors flex items-center gap-1"
          >
            <ExternalLink size={12} />
            Ver
          </Link>
          <button
            onClick={() => onEdit(lead)}
            className="px-2.5 py-1.5 text-xs font-bold text-text-secondary hover:text-text-primary hover:bg-surface-bright rounded-lg transition-colors"
          >
            Editar
          </button>
          <button
            onClick={() => onDelete(lead)}
            className="p-1.5 text-error hover:bg-error-container/20 rounded-lg transition-colors"
            title="Eliminar"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
