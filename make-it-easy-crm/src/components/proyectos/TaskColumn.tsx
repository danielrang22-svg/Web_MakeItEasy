import { useDroppable } from "@dnd-kit/core";
import { Tarea } from "@/lib/state/tareasStore";
import TaskCard from "./TaskCard";

interface TaskColumnProps {
  id: string;
  title: string;
  tasks: Tarea[];
  onTaskClick: (task: Tarea) => void;
}

export default function TaskColumn({ id, title, tasks, onTaskClick }: TaskColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { type: "Column" }
  });

  return (
    <div className="flex-none w-72 flex flex-col bg-muted/30 rounded-2xl p-3 border border-border h-full max-h-full">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="font-bold text-sm text-foreground">{title}</h3>
        <span className="text-[10px] bg-card text-muted-foreground px-2 py-0.5 rounded-full ring-1 ring-border font-semibold">
          {tasks.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 overflow-y-auto custom-scrollbar p-1 rounded-xl transition-colors min-h-[150px] ${
          isOver ? "bg-mie-primary/5 ring-1 ring-mie-primary/30" : ""
        }`}
      >
        {tasks.map(task => (
          <TaskCard key={task.id} task={task} onClick={onTaskClick} />
        ))}
      </div>
    </div>
  );
}
