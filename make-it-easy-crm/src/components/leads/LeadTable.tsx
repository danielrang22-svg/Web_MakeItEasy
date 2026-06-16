"use client";

import Link from "next/link";
import { Lead, Etapa } from "@/lib/types";
import { formatCurrency } from "@/lib/constants";
import { Pencil, Trash2, Bot, HelpCircle } from "lucide-react";

interface LeadTableProps {
  leads: Lead[];
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

function getLeadSource(id: string) {
  const code = id.charCodeAt(id.length - 1) || 0;
  if (code % 3 === 0) {
    return {
      label: "WhatsApp",
      icon: (
        <div className="w-6 h-6 rounded bg-[#25D366]/10 text-[#25D366] flex items-center justify-center flex-shrink-0">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.824z"></path></svg>
        </div>
      )
    };
  } else if (code % 3 === 1) {
    return {
      label: "Instagram",
      icon: (
        <div className="w-6 h-6 rounded bg-[#E1306C]/10 text-[#E1306C] flex items-center justify-center flex-shrink-0">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"></path></svg>
        </div>
      )
    };
  } else {
    return {
      label: "Web Form",
      icon: (
        <div className="w-6 h-6 rounded bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg>
        </div>
      )
    };
  }
}

export default function LeadTable({ leads, onEdit, onDelete }: LeadTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-surface-dim/50 border-b border-border-glass">
            <th className="py-3 px-4 w-10">
              <input
                type="checkbox"
                className="rounded border-border-glass bg-surface-dim text-primary focus:ring-primary focus:ring-offset-bg-workspace"
              />
            </th>
            <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-text-secondary">Lead</th>
            <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-text-secondary">Fuente</th>
            <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-text-secondary">Estado AI</th>
            <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-text-secondary">Probabilidad</th>
            <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-text-secondary">Último Contacto</th>
            <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-text-secondary text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-glass">
          {leads.map((lead) => {
            const ai = getAiState(lead.etapa);
            const source = getLeadSource(lead.id);
            const initials = lead.nombreContacto
              .split(" ")
              .map((w) => w[0])
              .slice(0, 2)
              .join("")
              .toUpperCase();

            return (
              <tr key={lead.id} className="hover:bg-surface-bright/30 transition-colors group">
                <td className="py-4 px-4">
                  <input
                    type="checkbox"
                    className="rounded border-border-glass bg-surface-dim text-primary focus:ring-primary focus:ring-offset-bg-workspace"
                  />
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center border`}
                      style={{
                        backgroundColor: `var(--${ai.dotColor === "bg-tertiary" ? "tertiary" : ai.dotColor === "bg-secondary" ? "secondary" : "outline-variant"}-container-low || rgba(22, 30, 44, 0.5))`,
                        borderColor: `var(--border-glass)`,
                        color: `var(--on-surface)`
                      }}
                    >
                      {initials}
                    </div>
                    <div>
                      <Link href={`/leads/${lead.id}`} className="font-semibold text-xs text-text-primary hover:text-primary transition-colors block">
                        {lead.nombreContacto}
                      </Link>
                      <span className="text-[10px] text-text-secondary block mt-0.5">{lead.email || lead.empresa}</span>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    {source.icon}
                    <span className="text-xs text-text-secondary">{source.label}</span>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${ai.badgeStyle}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${ai.dotColor} ${ai.pulse ? "ai-pulse" : ""}`}></span>
                    {ai.label}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold ${ai.dotColor === "bg-tertiary" ? "text-tertiary" : ai.dotColor === "bg-secondary" ? "text-secondary" : "text-text-secondary"}`}>
                      {ai.probability}%
                    </span>
                    <div className="w-16 h-1.5 bg-surface-dim rounded-full overflow-hidden border border-border-glass/30">
                      <div
                        className={`h-full rounded-full ${ai.dotColor === "bg-tertiary" ? "bg-tertiary" : ai.dotColor === "bg-secondary" ? "bg-secondary" : "bg-outline"}`}
                        style={{ width: `${ai.probability}%` }}
                      ></div>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <span className="text-xs text-text-secondary">
                    {new Date(lead.fechaActualizacion || lead.fechaCreacion).toLocaleDateString("es-ES", {
                      day: "numeric",
                      month: "short"
                    })}
                  </span>
                </td>
                <td className="py-4 px-4 text-right">
                  <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onEdit(lead)}
                      className="p-1.5 rounded text-text-secondary hover:text-primary hover:bg-surface-bright transition-colors"
                      title="Editar"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => onDelete(lead)}
                      className="p-1.5 rounded text-error hover:text-white hover:bg-error-container/40 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
