import { useState } from "react";
import { Modal } from "@/components/ui/SharedUI";
import { useTareasStore } from "@/lib/state/tareasStore";
import { Sparkles, Loader2, FileText, LayoutList } from "lucide-react";

interface AiTaskGeneratorProps {
  proyectoId: string;
  cotizacionId?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AiTaskGenerator({ proyectoId, cotizacionId, onClose, onSuccess }: AiTaskGeneratorProps) {
  const { tareas, addTarea, addMilestone } = useTareasStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [mode, setMode] = useState<"auto" | "manual" | "import">("manual");
  const [descripcion, setDescripcion] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      let endpoint = "/api/tareas/generar-ai";
      let body: any = null;
      let headers: Record<string, string> = { "Content-Type": "application/json" };

      if (mode === "auto") {
        body = JSON.stringify({ cotizacionId });
      } else if (mode === "manual") {
        if (!descripcion.trim()) {
          setError("Describe lo que necesitas");
          setLoading(false);
          return;
        }
        body = JSON.stringify({ descripcionUsuario: descripcion, tareasActuales: tareas });
      } else if (mode === "import") {
        if (files.length === 0) {
          setError("Sube al menos un archivo");
          setLoading(false);
          return;
        }
        endpoint = "/api/tareas/importar";
        const formData = new FormData();
        files.forEach(f => formData.append("files", f));
        body = formData;
        headers = {}; // browser sets multipart/form-data automatically
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body
      });

      if (!res.ok) {
        throw new Error("Error en la respuesta de la IA");
      }

      const data = await res.json();
      
      // Procesar milestones y tareas generadas
      const milestoneMap = new Map<string, string>(); // tempId -> realId
      
      if (data.milestones && Array.isArray(data.milestones)) {
        for (const m of data.milestones) {
          const newM = await addMilestone({ proyectoId, nombre: m.nombre, descripcion: m.descripcion });
          milestoneMap.set(m.idTemp, newM.id);
        }
      }

      if (data.tareas && Array.isArray(data.tareas)) {
        for (const t of data.tareas) {
          const mId = t.milestoneIdTemp ? milestoneMap.get(t.milestoneIdTemp) : null;
          await addTarea({
            proyectoId,
            parentId: null,
            milestoneId: mId || null,
            titulo: t.titulo,
            descripcion: t.descripcion || null,
            tipo: t.tipo || "development",
            estado: "BACKLOG",
            prioridad: t.prioridad || 0,
            asignadoEmail: null,
            estimado: t.estimado || null,
            githubBranch: null,
            fechaLimite: null,
            etiquetas: t.etiquetas ? JSON.stringify(t.etiquetas) : null,
          });
        }
      }

      onSuccess();
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Error al generar tareas");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Generar Tareas con IA ✨">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">La IA analizará el contexto para generar Milestones y Tareas estructuradas en tu Backlog.</p>
        
        <div className="flex gap-2 p-1 bg-muted/50 rounded-xl">
          <button 
            onClick={() => setMode("manual")} 
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1 ${mode === "manual" ? "bg-card shadow text-mie-primary" : "text-muted-foreground hover:bg-muted"}`}
          >
            <Sparkles size={14}/> Describir
          </button>
          {cotizacionId && (
            <button 
              onClick={() => setMode("auto")} 
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1 ${mode === "auto" ? "bg-card shadow text-mie-primary" : "text-muted-foreground hover:bg-muted"}`}
            >
              <LayoutList size={14}/> Desde Cotización
            </button>
          )}
          <button 
            onClick={() => setMode("import")} 
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1 ${mode === "import" ? "bg-card shadow text-mie-primary" : "text-muted-foreground hover:bg-muted"}`}
          >
            <FileText size={14}/> Importar Doc
          </button>
        </div>

        {mode === "manual" && (
          <div>
            <textarea
              className="w-full bg-card ring-1 ring-border rounded-xl p-3 text-sm focus:ring-2 focus:ring-mie-primary outline-none min-h-[120px] resize-none"
              placeholder="Ej: Necesito tareas para crear un módulo de login con Stripe y webhooks para la empresa X..."
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              disabled={loading}
            />
          </div>
        )}

        {mode === "auto" && (
          <div className="p-6 text-center bg-card ring-1 ring-border border-dashed rounded-xl">
            <LayoutList size={32} className="mx-auto mb-2 text-mie-primary opacity-50"/>
            <p className="text-sm font-semibold">Generación Inteligente</p>
            <p className="text-xs text-muted-foreground mt-1">Extraeremos las fases, entregables y requisitos técnicos de la cotización aprobada.</p>
          </div>
        )}

        {mode === "import" && (
          <div className="p-4 bg-card ring-1 ring-border border-dashed rounded-xl relative hover:bg-muted/30 transition-colors">
            <input 
              type="file" 
              multiple 
              accept=".pdf,.doc,.docx,.txt"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={e => {
                if (e.target.files) {
                  setFiles(Array.from(e.target.files));
                }
              }}
              disabled={loading}
            />
            <div className="text-center">
              <FileText size={24} className="mx-auto mb-2 text-mie-primary"/>
              <p className="text-sm font-semibold">Sube briefs, minutas o requerimientos</p>
              <p className="text-xs text-muted-foreground mt-1">PDF, Word, TXT</p>
              {files.length > 0 && (
                <div className="mt-3 text-xs bg-mie-primary/10 text-mie-primary font-bold py-1 px-2 rounded-lg inline-block">
                  {files.length} archivo(s) seleccionado(s)
                </div>
              )}
            </div>
          </div>
        )}

        {error && <div className="text-xs text-red-500 bg-red-50 p-2 rounded-lg">{error}</div>}

        <div className="flex justify-end gap-2 mt-2">
          <button onClick={onClose} disabled={loading} className="px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-muted rounded-xl">
            Cancelar
          </button>
          <button 
            onClick={handleGenerate} 
            disabled={loading} 
            className="px-5 py-2 text-xs font-bold text-white bg-mie-primary hover:bg-mie-primary/90 rounded-xl flex items-center gap-2"
          >
            {loading ? <><Loader2 size={14} className="animate-spin"/> Analizando...</> : <><Sparkles size={14}/> Generar Tareas</>}
          </button>
        </div>
      </div>
    </Modal>
  );
}
