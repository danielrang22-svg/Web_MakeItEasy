"use client";

import { useDraggable } from "@dnd-kit/core";
import { Lead } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/constants";
import { Building2, GripVertical } from "lucide-react";

interface KanbanCardProps {
    lead: Lead;
    onClick: (lead: Lead) => void;
}

export default function KanbanCard({ lead, onClick }: KanbanCardProps) {
    const { attributes, listeners, setNodeRef, transform, isDragging } =
        useDraggable({
            id: lead.id,
            data: { type: "card", lead },
        });

    const style = transform
        ? {
            transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
            zIndex: 50,
            opacity: 0.9,
        }
        : undefined;

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`bg-card rounded-2xl p-4 ring-1 shadow-sm hover:shadow-md transition-shadow group ${isDragging
                    ? "ring-mie-primary shadow-xl"
                    : "ring-border"
                }`}
        >
            {/* Drag Handle + Title */}
            <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-mie-secondary truncate mr-2">
                    {lead.titulo || "Sin título"}
                </span>
                <div
                    {...listeners}
                    {...attributes}
                    className="p-1.5 rounded-lg bg-muted/50 hover:bg-muted cursor-grab active:cursor-grabbing transition-colors flex-shrink-0"
                    title="Arrastrar"
                >
                    <GripVertical size={14} className="text-muted-foreground" />
                </div>
            </div>

            {/* Content — clickable to open detail */}
            <div
                className="cursor-pointer"
                onClick={() => onClick(lead)}
            >
                <div className="min-w-0 mb-2">
                    <h4 className="font-bold text-base truncate">
                        {lead.nombreContacto}
                    </h4>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Building2 size={12} />
                        <span className="truncate">{lead.empresa}</span>
                    </p>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                    <span className="font-bold text-sm text-mie-primary">
                        {formatCurrency(lead.valorEstimado)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                        {formatDate(lead.fechaCreacion)}
                    </span>
                </div>
            </div>
        </div>
    );
}
