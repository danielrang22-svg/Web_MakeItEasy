import { useState } from "react";
import { Modal } from "@/components/ui/SharedUI";
import { Tarea, useTareasStore } from "@/lib/state/tareasStore";
import { Trash2, Send, Clock, User, Tag, Github, Flag, MessageSquare } from "lucide-react";

interface TaskPanelProps {
  task: Tarea;
  onClose: () => void;
}

export default function TaskPanel({ task, onClose }: TaskPanelProps) {
  const { updateTarea, deleteTarea, milestones } = useTareasStore();
  
  const [titulo, setTitulo] = useState(task.titulo);
  const [descripcion, setDescripcion] = useState(task.descripcion || "");
  const [estado, setEstado] = useState(task.estado);
  const [prioridad, setPrioridad] = useState(task.prioridad.toString());
  const [tipo, setTipo] = useState(task.tipo);
  const [estimado, setEstimado] = useState(task.estimado?.toString() || "");
  const [githubBranch, setGithubBranch] = useState(task.githubBranch || "");
  const [milestoneId, setMilestoneId] = useState(task.milestoneId || "");
  const [asignadoEmail, setAsignadoEmail] = useState(task.asignadoEmail || "");
  
  const [comentario, setComentario] = useState("");
  const [localComments, setLocalComments] = useState<any[]>(task.comentarios || []);

  const handleSave = async () => {
    await updateTarea(task.id, {
      titulo,
      descripcion,
      estado: estado as any,
      prioridad: parseInt(prioridad),
      tipo: tipo as any,
      estimado: estimado ? parseInt(estimado) : null,
      githubBranch,
      milestoneId: milestoneId || null,
      asignadoEmail: asignadoEmail || null
    });
    onClose();
  };

  const handleDelete = async () => {
    if (confirm("¿Eliminar esta tarea permanentemente?")) {
      await deleteTarea(task.id);
      onClose();
    }
  };

  const handleComentar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comentario.trim()) return;
    
    const res = await fetch("/api/comentarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tareaId: task.id,
        cuerpo: comentario,
        autorNombre: "Admin Make It Easy",
        autorEmail: "admin@makeiteasycol.com"
      })
    });
    if (res.ok) {
      const nuevoComentario = await res.json();
      setLocalComments([...localComments, nuevoComentario]);
      setComentario("");
      // Idealmente, recargar tareas
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={`Editar Tarea`}>
      <div className="flex flex-col gap-4 max-h-[80vh] overflow-y-auto custom-scrollbar p-1">
        
        {/* Título */}
        <input 
          type="text" 
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          className="text-lg font-bold w-full bg-transparent border-b border-border focus:border-mie-primary outline-none py-2 text-foreground"
          placeholder="Título de la tarea..."
        />

        {/* Row de Propiedades */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-muted/30 p-3 rounded-xl border border-border">
          <div>
            <label className="text-[10px] text-muted-foreground font-bold uppercase block mb-1">Estado</label>
            <select value={estado} onChange={e => setEstado(e.target.value as any)} className="w-full text-xs p-1.5 rounded bg-card border border-border outline-none">
              <option value="BACKLOG">Backlog</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="EN_PROGRESO">En Progreso</option>
              <option value="REVISION">Revisión</option>
              <option value="QA">QA</option>
              <option value="COMPLETADO">Completado</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground font-bold uppercase block mb-1">Tipo</label>
            <select value={tipo} onChange={e => setTipo(e.target.value as any)} className="w-full text-xs p-1.5 rounded bg-card border border-border outline-none">
              <option value="product">Product (Historia)</option>
              <option value="development">Development (Técnica)</option>
              <option value="bug">Bug</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground font-bold uppercase block mb-1">Prioridad</label>
            <select value={prioridad} onChange={e => setPrioridad(e.target.value)} className="w-full text-xs p-1.5 rounded bg-card border border-border outline-none">
              <option value="0">Ninguna</option>
              <option value="1">Baja</option>
              <option value="2">Media</option>
              <option value="3">Alta</option>
              <option value="4">Urgente</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground font-bold uppercase block mb-1">Hito</label>
            <select value={milestoneId} onChange={e => setMilestoneId(e.target.value)} className="w-full text-xs p-1.5 rounded bg-card border border-border outline-none">
              <option value="">Sin Hito</option>
              {milestones.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] text-muted-foreground font-bold uppercase flex items-center gap-1 mb-1"><User size={10}/> Asignado (Email)</label>
            <input type="text" value={asignadoEmail} onChange={e => setAsignadoEmail(e.target.value)} placeholder="email@usuario.com" className="w-full text-xs p-1.5 rounded bg-card border border-border outline-none"/>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground font-bold uppercase flex items-center gap-1 mb-1"><Clock size={10}/> Estimado (pts)</label>
            <input type="number" value={estimado} onChange={e => setEstimado(e.target.value)} placeholder="e.g. 5" className="w-full text-xs p-1.5 rounded bg-card border border-border outline-none"/>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground font-bold uppercase flex items-center gap-1 mb-1"><Github size={10}/> Rama GitHub</label>
            <input type="text" value={githubBranch} onChange={e => setGithubBranch(e.target.value)} placeholder="feat/login" className="w-full text-xs p-1.5 rounded bg-card border border-border outline-none"/>
          </div>
        </div>

        {/* Descripción */}
        <div className="mt-2">
          <label className="text-xs font-bold text-foreground block mb-2">Descripción</label>
          <textarea 
            value={descripcion} 
            onChange={e => setDescripcion(e.target.value)}
            rows={5}
            className="w-full bg-card ring-1 ring-border rounded-xl p-3 text-sm focus:ring-2 focus:ring-mie-primary outline-none resize-none custom-scrollbar"
            placeholder="Describe los detalles de la tarea..."
          />
        </div>

        {/* Comentarios */}
        <div className="mt-4 border-t border-border pt-4">
          <h4 className="text-xs font-bold text-foreground mb-3 flex items-center gap-2"><MessageSquare size={14}/> Comentarios</h4>
          <div className="space-y-3 mb-4">
            {localComments.map(c => (
              <div key={c.id} className="bg-muted/30 p-3 rounded-xl border border-border">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-bold text-foreground">{c.autorNombre}</span>
                  <span className="text-[9px] text-muted-foreground">{new Date(c.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-xs text-foreground/80">{c.cuerpo}</p>
              </div>
            ))}
            {localComments.length === 0 && <p className="text-xs text-muted-foreground italic">No hay comentarios aún.</p>}
          </div>

          <form onSubmit={handleComentar} className="flex gap-2">
            <input 
              type="text" 
              value={comentario} 
              onChange={e => setComentario(e.target.value)} 
              placeholder="Añadir un comentario..." 
              className="flex-1 text-xs bg-card ring-1 ring-border rounded-xl px-3 py-2 outline-none focus:ring-mie-primary"
            />
            <button type="submit" disabled={!comentario.trim()} className="bg-mie-primary text-white p-2 rounded-xl hover:bg-mie-primary/90 disabled:opacity-50">
              <Send size={14}/>
            </button>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center mt-4 border-t border-border pt-4">
          <button onClick={handleDelete} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 p-2 rounded-lg text-xs font-bold flex items-center gap-1">
            <Trash2 size={14}/> Eliminar
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-muted-foreground bg-muted hover:bg-muted/80 rounded-xl">Cancelar</button>
            <button onClick={handleSave} className="px-4 py-2 text-xs font-bold text-white bg-mie-primary hover:bg-mie-primary/90 rounded-xl">Guardar Cambios</button>
          </div>
        </div>

      </div>
    </Modal>
  );
}
