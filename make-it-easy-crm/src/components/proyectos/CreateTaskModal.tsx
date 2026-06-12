import { useState } from "react";
import { Modal } from "@/components/ui/SharedUI";
import { useTareasStore } from "@/lib/state/tareasStore";

interface CreateTaskModalProps {
  proyectoId: string;
  onClose: () => void;
}

export default function CreateTaskModal({ proyectoId, onClose }: CreateTaskModalProps) {
  const { addTarea, milestones } = useTareasStore();
  
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [tipo, setTipo] = useState<"product"|"development"|"bug">("development");
  const [prioridad, setPrioridad] = useState("0");
  const [milestoneId, setMilestoneId] = useState("");
  const [estimado, setEstimado] = useState("");
  
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return;
    
    setLoading(true);
    try {
      await addTarea({
        proyectoId,
        parentId: null,
        milestoneId: milestoneId || null,
        titulo,
        descripcion: descripcion || null,
        tipo,
        estado: "BACKLOG",
        prioridad: parseInt(prioridad),
        asignadoEmail: null,
        estimado: estimado ? parseInt(estimado) : null,
        githubBranch: null,
        fechaLimite: null,
        etiquetas: null,
      });
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Crear Nueva Tarea">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="text-xs font-bold block mb-1">Título *</label>
          <input 
            type="text" 
            autoFocus
            required
            value={titulo}
            onChange={e => setTitulo(e.target.value)}
            className="w-full text-sm p-2 rounded-xl bg-card border border-border outline-none focus:ring-2 focus:ring-mie-primary"
            placeholder="Ej: Configurar base de datos"
          />
        </div>

        <div>
          <label className="text-xs font-bold block mb-1">Descripción</label>
          <textarea 
            value={descripcion}
            onChange={e => setDescripcion(e.target.value)}
            rows={3}
            className="w-full text-sm p-2 rounded-xl bg-card border border-border outline-none focus:ring-2 focus:ring-mie-primary resize-none custom-scrollbar"
            placeholder="Detalles de la tarea..."
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-muted-foreground font-bold uppercase block mb-1">Tipo</label>
            <select value={tipo} onChange={e => setTipo(e.target.value as any)} className="w-full text-xs p-2 rounded-lg bg-muted border border-border outline-none">
              <option value="development">Desarrollo (Técnica)</option>
              <option value="product">Producto (Historia)</option>
              <option value="bug">Bug</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground font-bold uppercase block mb-1">Prioridad</label>
            <select value={prioridad} onChange={e => setPrioridad(e.target.value)} className="w-full text-xs p-2 rounded-lg bg-muted border border-border outline-none">
              <option value="0">Ninguna</option>
              <option value="1">Baja</option>
              <option value="2">Media</option>
              <option value="3">Alta</option>
              <option value="4">Urgente</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-muted-foreground font-bold uppercase block mb-1">Hito</label>
            <select value={milestoneId} onChange={e => setMilestoneId(e.target.value)} className="w-full text-xs p-2 rounded-lg bg-muted border border-border outline-none">
              <option value="">Sin Hito</option>
              {milestones.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground font-bold uppercase block mb-1">Estimado (Puntos)</label>
            <input 
              type="number" 
              value={estimado}
              onChange={e => setEstimado(e.target.value)}
              className="w-full text-xs p-2 rounded-lg bg-muted border border-border outline-none"
              placeholder="e.g. 5"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button type="button" onClick={onClose} disabled={loading} className="px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-muted rounded-xl">
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="px-5 py-2 text-xs font-bold text-white bg-mie-primary hover:bg-mie-primary/90 rounded-xl">
            {loading ? "Creando..." : "Crear Tarea"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
