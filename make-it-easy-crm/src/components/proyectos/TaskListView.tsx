import { useState, useMemo } from "react";
import { Tarea } from "@/lib/state/tareasStore";
import { Search, Filter, MessageSquare, Clock, Github, Flag } from "lucide-react";
import TaskPanel from "./TaskPanel";

interface TaskListViewProps {
  tareas: Tarea[];
}

export default function TaskListView({ tareas }: TaskListViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("TODOS");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("TODOS");
  const [selectedTask, setSelectedTask] = useState<Tarea | null>(null);

  // Extract unique assignees for filter
  const assignees = useMemo(() => {
    const list = tareas.map(t => t.asignadoEmail).filter(Boolean) as string[];
    return Array.from(new Set(list));
  }, [tareas]);

  // Filter tasks
  const filteredTareas = useMemo(() => {
    return tareas.filter(t => {
      const matchesSearch = t.titulo.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (t.descripcion && t.descripcion.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === "TODOS" || t.estado === statusFilter;
      const matchesAssignee = assigneeFilter === "TODOS" || t.asignadoEmail === assigneeFilter;
      
      return matchesSearch && matchesStatus && matchesAssignee;
    });
  }, [tareas, searchTerm, statusFilter, assigneeFilter]);

  const getPriorityColor = (p: number) => {
    if (p === 4) return "text-red-500";
    if (p === 3) return "text-orange-500";
    if (p === 2) return "text-blue-500";
    return "text-muted-foreground";
  };

  const getStatusBadge = (estado: string) => {
    const map: Record<string, string> = {
      BACKLOG: "bg-gray-500/10 text-gray-400",
      PENDIENTE: "bg-yellow-500/10 text-yellow-500",
      EN_PROGRESO: "bg-blue-500/10 text-blue-500",
      REVISION: "bg-purple-500/10 text-purple-500",
      QA: "bg-orange-500/10 text-orange-500",
      COMPLETADO: "bg-green-500/10 text-green-500",
    };
    return map[estado] || "bg-muted text-foreground";
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center mb-4 px-1">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Buscar tareas..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-card ring-1 ring-border rounded-xl pl-9 pr-4 py-2 text-xs outline-none focus:ring-mie-primary transition-all"
          />
        </div>
        
        <div className="flex items-center gap-2 bg-card ring-1 ring-border rounded-xl px-3 py-1.5">
          <Filter size={14} className="text-muted-foreground"/>
          <select 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-transparent text-xs outline-none text-foreground cursor-pointer"
          >
            <option value="TODOS">Todos los estados</option>
            <option value="BACKLOG">Backlog</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="EN_PROGRESO">En Progreso</option>
            <option value="REVISION">Revisión</option>
            <option value="QA">QA</option>
            <option value="COMPLETADO">Completado</option>
          </select>
        </div>

        <div className="flex items-center gap-2 bg-card ring-1 ring-border rounded-xl px-3 py-1.5">
          <select 
            value={assigneeFilter} 
            onChange={e => setAssigneeFilter(e.target.value)}
            className="bg-transparent text-xs outline-none text-foreground cursor-pointer"
          >
            <option value="TODOS">Cualquier responsable</option>
            {assignees.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto custom-scrollbar bg-card ring-1 ring-border rounded-xl">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead className="bg-muted/30 sticky top-0 z-10 backdrop-blur-md">
            <tr>
              <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border">Título</th>
              <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border">Estado</th>
              <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border">Prioridad</th>
              <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border">Responsable</th>
              <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border">Estimado</th>
              <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border">GitHub</th>
            </tr>
          </thead>
          <tbody>
            {filteredTareas.map(task => (
              <tr 
                key={task.id} 
                onClick={() => setSelectedTask(task)}
                className="border-b border-border hover:bg-muted/20 cursor-pointer transition-colors group"
              >
                <td className="px-4 py-3">
                  <p className="text-sm font-semibold text-foreground group-hover:text-mie-primary transition-colors">{task.titulo}</p>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase bg-muted text-muted-foreground mr-2">{task.tipo}</span>
                  {task.comentarios && task.comentarios.length > 0 && (
                    <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1"><MessageSquare size={10}/> {task.comentarios.length}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${getStatusBadge(task.estado)}`}>
                    {task.estado.replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Flag size={14} className={getPriorityColor(task.prioridad)} />
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {task.asignadoEmail || "-"}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {task.estimado ? <span className="flex items-center gap-1"><Clock size={12}/> {task.estimado} pts</span> : "-"}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {task.githubBranch ? (
                    <div className="flex items-center gap-1 text-mie-primary">
                      <Github size={12}/> {task.githubPrNumber ? `#${task.githubPrNumber}` : "Rama"}
                    </div>
                  ) : "-"}
                </td>
              </tr>
            ))}
            {filteredTareas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No se encontraron tareas con estos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedTask && (
        <TaskPanel task={selectedTask} onClose={() => setSelectedTask(null)} />
      )}
    </div>
  );
}
