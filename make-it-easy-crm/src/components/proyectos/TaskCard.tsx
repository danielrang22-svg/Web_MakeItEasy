import { useDraggable } from "@dnd-kit/core";
import { Tarea } from "@/lib/state/tareasStore";
import { Clock, MessageSquare, Tag, AlignLeft, Github, AlertCircle } from "lucide-react";

interface TaskCardProps {
  task: Tarea;
  onClick: (task: Tarea) => void;
}

const PRIORITIES = {
  0: { icon: null, label: "None", color: "text-muted-foreground" },
  1: { icon: "↓", label: "Low", color: "text-blue-500" },
  2: { icon: "−", label: "Medium", color: "text-amber-500" },
  3: { icon: "↑", label: "High", color: "text-orange-500" },
  4: { icon: <AlertCircle size={12}/>, label: "Urgent", color: "text-red-500" }
};

export default function TaskCard({ task, onClick }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { type: "Task", task },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  let etiquetas: string[] = [];
  try {
    if (task.etiquetas) etiquetas = JSON.parse(task.etiquetas);
  } catch(e) {}

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onClick(task)}
      className={`bg-card border ${isDragging ? 'border-mie-primary ring-2 ring-mie-primary/20 shadow-xl opacity-90 rotate-2' : 'border-border shadow-sm'} rounded-xl p-3 cursor-grab active:cursor-grabbing hover:border-mie-primary/50 transition-colors mb-2`}
    >
      <div className="flex justify-between items-start mb-2">
        <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${task.tipo === 'product' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : task.tipo === 'bug' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
          {task.tipo}
        </span>
        {task.prioridad > 0 && (
          <span className={`text-[10px] font-bold flex items-center gap-0.5 ${PRIORITIES[task.prioridad as keyof typeof PRIORITIES].color}`}>
            {PRIORITIES[task.prioridad as keyof typeof PRIORITIES].icon}
          </span>
        )}
      </div>

      <h4 className="font-bold text-sm leading-tight mb-1 text-foreground">
        {task.titulo}
      </h4>

      {task.milestone && (
        <p className="text-[10px] text-muted-foreground truncate mb-2">
          Hito: {task.milestone.nombre}
        </p>
      )}

      <div className="flex flex-wrap gap-1 mb-2">
        {etiquetas.slice(0,3).map(tag => (
          <span key={tag} className="text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-md">
            {tag}
          </span>
        ))}
        {etiquetas.length > 3 && <span className="text-[9px] text-muted-foreground">+{etiquetas.length - 3}</span>}
      </div>

      <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-2">
          {task.estimado && <span className="font-semibold bg-muted px-1.5 rounded">{task.estimado} pts</span>}
          {task.subtareas && task.subtareas.length > 0 && (
            <span className="flex items-center gap-0.5">
              <AlignLeft size={10} /> {task.subtareas.filter(s => s.estado === "COMPLETADO").length}/{task.subtareas.length}
            </span>
          )}
          {task.comentarios && task.comentarios.length > 0 && (
            <span className="flex items-center gap-0.5"><MessageSquare size={10} /> {task.comentarios.length}</span>
          )}
        </div>
        
        <div className="flex items-center gap-1.5">
          {task.githubBranch && <Github size={12} className="text-foreground opacity-70" />}
          {task.asignadoEmail && (
            <div className="w-5 h-5 rounded-full bg-mie-primary text-white flex items-center justify-center font-bold text-[8px]" title={task.asignadoEmail}>
              {task.asignadoEmail.substring(0,2).toUpperCase()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
