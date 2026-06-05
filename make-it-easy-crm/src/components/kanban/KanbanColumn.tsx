"use client";

import { useDroppable } from "@dnd-kit/core";
import { Lead } from "@/lib/types";
import { StageConfig, formatCurrency } from "@/lib/constants";
import KanbanCard from "./KanbanCard";
import { Plus } from "lucide-react";

interface KanbanColumnProps {
    stage: StageConfig;
    leads: Lead[];
    totalValue: number;
    onCardClick: (lead: Lead) => void;
    onAddLead?: (stageKey: string) => void;
}

export default function KanbanColumn({
    stage,
    leads,
    totalValue,
    onCardClick,
    onAddLead,
}: KanbanColumnProps) {
    const { setNodeRef, isOver } = useDroppable({
        id: stage.key,
        data: { type: "column", stage: stage.key },
    });

    return (
        <div
            ref={setNodeRef}
            className={`flex-shrink-0 w-[80vw] sm:w-72 snap-center flex flex-col rounded-2xl transition-all duration-200 ${isOver
                ? "bg-mie-primary/10 ring-2 ring-mie-primary/40 scale-[1.01]"
                : "bg-muted/50"
                }`}
        >
            {/* Column Header */}
            <div className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: stage.dotColor }}
                    />
                    <h3 className="font-bold text-sm">{stage.shortLabel}</h3>
                    <span className="px-2 py-0.5 bg-muted rounded-full text-xs font-medium text-muted-foreground">
                        {leads.length}
                    </span>
                </div>
                {onAddLead && (
                    <button
                        onClick={() => onAddLead(stage.key)}
                        className="w-7 h-7 rounded-lg bg-muted hover:bg-mie-primary/10 hover:text-mie-primary flex items-center justify-center text-muted-foreground transition-colors"
                        title={`Agregar a ${stage.shortLabel}`}
                    >
                        <Plus size={16} strokeWidth={2.5} />
                    </button>
                )}
            </div>

            {/* Value sum */}
            <div className="px-4 pb-2">
                <p className="text-xs font-semibold text-muted-foreground">
                    {formatCurrency(totalValue)}
                </p>
            </div>

            {/* Cards Area */}
            <div className="flex-1 px-3 pb-3 space-y-3 overflow-y-auto custom-scrollbar min-h-[120px]">
                {leads.map((lead) => (
                    <KanbanCard
                        key={lead.id}
                        lead={lead}
                        onClick={onCardClick}
                    />
                ))}
                {leads.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-20 gap-1 text-xs text-muted-foreground border-2 border-dashed border-border/50 rounded-xl">
                        <span>Arrastra aquí</span>
                        {onAddLead && (
                            <button
                                onClick={() => onAddLead(stage.key)}
                                className="text-mie-primary font-medium hover:underline flex items-center gap-0.5"
                            >
                                <Plus size={12} /> Negociación rápida
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
