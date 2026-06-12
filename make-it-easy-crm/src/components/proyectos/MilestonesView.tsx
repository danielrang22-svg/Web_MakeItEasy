import { useState } from "react";
import { Milestone, useTareasStore } from "@/lib/state/tareasStore";
import { CalendarDays, Flag, CheckCircle, Circle } from "lucide-react";

interface MilestonesViewProps {
  proyectoId: string;
}

export default function MilestonesView({ proyectoId }: MilestonesViewProps) {
  const { milestones, addMilestone, updateMilestone } = useTareasStore();
  const [isCreating, setIsCreating] = useState(false);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fechaObjetivo, setFechaObjetivo] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    await addMilestone({ proyectoId, nombre, descripcion: descripcion || null, fechaObjetivo: fechaObjetivo || null });
    setIsCreating(false);
    setNombre("");
    setDescripcion("");
    setFechaObjetivo("");
  };

  const toggleCompletado = async (m: Milestone) => {
    await updateMilestone(m.id, { completado: !m.completado });
  };

  return (
    <div className="bg-card ring-1 ring-border rounded-2xl p-4 shadow-sm h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-sm flex items-center gap-2"><Flag size={16} className="text-mie-primary"/> Hitos (Milestones)</h3>
        <button 
          onClick={() => setIsCreating(!isCreating)}
          className="text-xs bg-muted text-foreground px-3 py-1.5 rounded-lg hover:bg-muted/80 font-bold"
        >
          {isCreating ? "Cancelar" : "+ Nuevo Hito"}
        </button>
      </div>

      {isCreating && (
        <form onSubmit={handleCreate} className="bg-muted/30 border border-border p-3 rounded-xl mb-4 flex flex-col gap-2">
          <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre del hito..." className="text-xs p-2 rounded-lg bg-card border border-border outline-none" required autoFocus/>
          <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Descripción..." className="text-xs p-2 rounded-lg bg-card border border-border outline-none resize-none" rows={2}/>
          <div className="flex items-center gap-2">
            <input type="date" value={fechaObjetivo} onChange={e => setFechaObjetivo(e.target.value)} className="text-xs p-2 rounded-lg bg-card border border-border outline-none flex-1"/>
            <button type="submit" className="bg-mie-primary text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-mie-primary/90">Guardar</button>
          </div>
        </form>
      )}

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
        {milestones.length === 0 && !isCreating ? (
          <div className="text-center text-xs text-muted-foreground py-8">
            No hay hitos definidos.
          </div>
        ) : (
          milestones.map(m => (
            <div key={m.id} className={`p-3 border rounded-xl flex items-start gap-3 transition-colors ${m.completado ? 'bg-muted/10 border-border opacity-60' : 'bg-card border-border hover:border-mie-primary/50'}`}>
              <button onClick={() => toggleCompletado(m)} className="mt-0.5 text-muted-foreground hover:text-mie-primary transition-colors">
                {m.completado ? <CheckCircle size={16} className="text-green-500"/> : <Circle size={16}/>}
              </button>
              <div className="flex-1 min-w-0">
                <h4 className={`text-sm font-bold truncate ${m.completado ? 'line-through' : ''}`}>{m.nombre}</h4>
                {m.descripcion && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{m.descripcion}</p>}
                {m.fechaObjetivo && (
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1.5 font-semibold">
                    <CalendarDays size={10}/> {new Date(m.fechaObjetivo).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
