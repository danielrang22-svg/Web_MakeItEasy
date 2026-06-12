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
import { useTareasStore, Tarea } from "@/lib/state/tareasStore";
import TaskColumn from "./TaskColumn";
import TaskCard from "./TaskCard";

interface TaskBoardProps {
  onTaskClick: (task: Tarea) => void;
}

const COLUMNS = [
  { id: "BACKLOG", title: "Backlog" },
  { id: "PENDIENTE", title: "Pendiente" },
  { id: "EN_PROGRESO", title: "En Progreso" },
  { id: "REVISION", title: "Revisión" },
  { id: "QA", title: "QA" },
  { id: "COMPLETADO", title: "Completado" }
];

export default function TaskBoard({ onTaskClick }: TaskBoardProps) {
  const { tareas, moveTarea } = useTareasStore();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    })
  );

  const columnOnlyCollision: CollisionDetection = useCallback((args) => {
    const colKeys = new Set(COLUMNS.map((c) => c.id));
    const filteredDroppables = args.droppableContainers.filter(
      (container: DroppableContainer) => colKeys.has(String(container.id))
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

    const taskId = active.id as string;
    const targetState = over.id as string;

    const task = tareas.find((t) => t.id === taskId);
    if (!task) return;

    if (targetState !== task.estado) {
      moveTarea(taskId, targetState);
    }
  }

  const activeTask = activeId ? tareas.find((t) => t.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={columnOnlyCollision}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory sm:snap-none custom-scrollbar pb-4 px-1 h-[calc(100vh-280px)]">
        {COLUMNS.map((col) => {
          const columnTasks = tareas.filter(t => t.estado === col.id);
          return (
            <TaskColumn
              key={col.id}
              id={col.id}
              title={col.title}
              tasks={columnTasks}
              onTaskClick={onTaskClick}
            />
          );
        })}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <div className="w-72">
            <TaskCard task={activeTask} onClick={() => {}} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
