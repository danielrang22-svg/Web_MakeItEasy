"use client";

import { useState, useCallback } from "react";
import {
    DndContext,
    DragEndEvent,
    DragStartEvent,
    DragOverlay,
    PointerSensor,
    TouchSensor,
    MouseSensor,
    useSensor,
    useSensors,
    rectIntersection,
    type CollisionDetection,
    type DroppableContainer,
} from "@dnd-kit/core";
import { Lead, Etapa } from "@/lib/types";
import { PIPELINE_STAGES, formatCurrency, formatDate } from "@/lib/constants";
import {
    useLeadsStore,
    getFilteredLeads,
    getLeadsByStage,
    getStageValue,
} from "@/lib/state/leadsStore";
import KanbanColumn from "./KanbanColumn";
import { Building2 } from "lucide-react";

interface KanbanBoardProps {
    onCardClick: (lead: Lead) => void;
    onAddLead?: (stageKey: string) => void;
}

export default function KanbanBoard({ onCardClick, onAddLead }: KanbanBoardProps) {
    const { leads, searchQuery, filters, moveLeadToStage } = useLeadsStore();
    const filteredLeads = getFilteredLeads({
        leads,
        searchQuery,
        filters,
    } as any);
    const [activeId, setActiveId] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: { distance: 5 },
        }),
        useSensor(TouchSensor, {
            activationConstraint: { delay: 200, tolerance: 5 },
        })
    );

    // Custom collision: only consider column droppables (not cards)
    const columnOnlyCollision: CollisionDetection = useCallback((args) => {
        const stageKeys = new Set<string>(PIPELINE_STAGES.map((s) => s.key as string));
        const filteredDroppables = args.droppableContainers.filter(
            (container: DroppableContainer) => stageKeys.has(String(container.id))
        );
        return rectIntersection({
            ...args,
            droppableContainers: filteredDroppables,
        });
    }, []);

    function handleDragStart(event: DragStartEvent) {
        setActiveId(event.active.id as string);
    }

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const leadId = active.id as string;
        const targetStage = over.id as string;

        const draggedLead = filteredLeads.find((l) => l.id === leadId);
        if (!draggedLead) return;

        if (targetStage !== draggedLead.etapa) {
            moveLeadToStage(leadId, targetStage as Etapa);
        }
    }

    const activeLead = activeId
        ? filteredLeads.find((l) => l.id === activeId)
        : null;

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={columnOnlyCollision}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory sm:snap-none custom-scrollbar pb-4 px-1 min-h-[calc(100vh-280px)]">
                {PIPELINE_STAGES.map((stage) => {
                    const stageLeads = getLeadsByStage(
                        filteredLeads,
                        stage.key
                    );
                    const totalValue = getStageValue(
                        filteredLeads,
                        stage.key
                    );
                    return (
                        <KanbanColumn
                            key={stage.key}
                            stage={stage}
                            leads={stageLeads}
                            totalValue={totalValue}
                            onCardClick={onCardClick}
                            onAddLead={onAddLead}
                        />
                    );
                })}
            </div>

            {/* Drag overlay ghost */}
            <DragOverlay dropAnimation={null}>
                {activeLead ? (
                    <div className="bg-card rounded-2xl p-4 ring-2 ring-mie-primary shadow-2xl w-72 rotate-1 opacity-95">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-mie-secondary truncate mb-1">
                            {activeLead.titulo || "Sin título"}
                        </p>
                        <h4 className="font-bold text-base">
                            {activeLead.nombreContacto}
                        </h4>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Building2 size={12} />
                            {activeLead.empresa}
                        </p>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                            <span className="font-bold text-sm text-mie-primary">
                                {formatCurrency(activeLead.valorEstimado)}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                                {formatDate(activeLead.fechaCreacion)}
                            </span>
                        </div>
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}
