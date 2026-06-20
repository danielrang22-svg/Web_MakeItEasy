import { useState } from "react";
import { Modal } from "@/components/ui/SharedUI";
import { useTareasStore } from "@/lib/state/tareasStore";
import { Sparkles, Loader2, FileText, LayoutList, Trash2, Plus, ArrowLeft, Send } from "lucide-react";

interface AiTaskGeneratorProps {
  proyectoId: string;
  cotizacionId?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AiTaskGenerator({ proyectoId, cotizacionId, onClose, onSuccess }: AiTaskGeneratorProps) {
  const { tareas } = useTareasStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [mode, setMode] = useState<"auto" | "manual" | "import">("manual");
  const [descripcion, setDescripcion] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  // Preview state
  const [generatedData, setGeneratedData] = useState<{
    milestones: Array<{ idTemp: string; nombre: string; descripcion: string }>;
    tareas: Array<{
      titulo: string;
      descripcion?: string;
      tipo?: string;
      prioridad?: number;
      estimado?: number;
      milestoneIdTemp: string;
    }>;
  } | null>(null);

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
        headers = {};
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
      
      // Store in preview state instead of immediately inserting to DB
      if (data && data.milestones && data.tareas) {
        setGeneratedData(data);
      } else {
        throw new Error("Formato de respuesta de la IA inválido");
      }

    } catch (e: any) {
      console.error(e);
      setError(e.message || "Error al generar tareas");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMilestone = (idTemp: string, fields: any) => {
    if (!generatedData) return;
    setGeneratedData({
      ...generatedData,
      milestones: generatedData.milestones.map(m => m.idTemp === idTemp ? { ...m, ...fields } : m)
    });
  };

  const handleUpdateTask = (index: number, fields: any) => {
    if (!generatedData) return;
    const newTareas = [...generatedData.tareas];
    newTareas[index] = { ...newTareas[index], ...fields };
    setGeneratedData({ ...generatedData, tareas: newTareas });
  };

  const handleDeleteMilestone = (idTemp: string) => {
    if (!generatedData) return;
    setGeneratedData({
      milestones: generatedData.milestones.filter(m => m.idTemp !== idTemp),
      tareas: generatedData.tareas.filter(t => t.milestoneIdTemp !== idTemp)
    });
  };

  const handleDeleteTask = (index: number) => {
    if (!generatedData) return;
    setGeneratedData({
      ...generatedData,
      tareas: generatedData.tareas.filter((_, i) => i !== index)
    });
  };

  const handleAddTask = (milestoneIdTemp: string) => {
    if (!generatedData) return;
    const newTask = {
      titulo: "Nueva Tarea",
      descripcion: "Especifica aquí lo que incluye la tarea",
      tipo: "development",
      prioridad: 2,
      estimado: 3,
      milestoneIdTemp
    };
    setGeneratedData({
      ...generatedData,
      tareas: [...generatedData.tareas, newTask]
    });
  };

  const handleAddMilestone = () => {
    if (!generatedData) return;
    const newIdTemp = `m${Date.now()}`;
    const newM = {
      idTemp: newIdTemp,
      nombre: `Fase ${generatedData.milestones.length + 1}: Nueva Fase`,
      descripcion: "Objetivo de la fase"
    };
    setGeneratedData({
      milestones: [...generatedData.milestones, newM],
      tareas: generatedData.tareas
    });
  };

  const handlePublish = async () => {
    if (!generatedData) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tareas/publicar-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proyectoId,
          milestones: generatedData.milestones,
          tareas: generatedData.tareas
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al publicar el plan en GitHub");
      }

      onSuccess();
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Error al publicar tareas");
    } finally {
      setLoading(false);
    }
  };

  if (generatedData) {
    return (
      <Modal isOpen={true} onClose={onClose} title="Previsualizar Plan de Trabajo 📝">
        <div className="flex flex-col gap-4 max-h-[75vh] overflow-y-auto pr-1">
          <p className="text-xs text-muted-foreground">
            Ajusta los hitos y tareas sugeridas. Al confirmar, se creará el archivo <code className="bg-muted px-1.5 py-0.5 rounded font-mono font-bold text-mie-primary">PLAN_DE_TRABAJO.md</code> en GitHub y se sincronizará tu backlog local.
          </p>

          <div className="flex flex-col gap-4">
            {generatedData.milestones.map((m) => {
              const phaseTasks = generatedData.tareas.map((t, idx) => ({ ...t, idx })).filter(t => t.milestoneIdTemp === m.idTemp);
              
              return (
                <div key={m.idTemp} className="p-4 bg-muted/40 ring-1 ring-border rounded-xl flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 flex flex-col gap-1">
                      <input
                        type="text"
                        value={m.nombre}
                        onChange={(e) => handleUpdateMilestone(m.idTemp, { nombre: e.target.value })}
                        className="bg-transparent font-bold text-sm text-foreground focus:ring-1 focus:ring-mie-primary outline-none px-1 rounded w-full"
                        placeholder="Nombre de la Fase"
                      />
                      <input
                        type="text"
                        value={m.descripcion}
                        onChange={(e) => handleUpdateMilestone(m.idTemp, { descripcion: e.target.value })}
                        className="bg-transparent text-xs text-muted-foreground focus:ring-1 focus:ring-mie-primary outline-none px-1 rounded w-full"
                        placeholder="Objetivo de la fase"
                      />
                    </div>
                    <button 
                      onClick={() => handleDeleteMilestone(m.idTemp)} 
                      className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                      title="Eliminar Fase e Hito"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="flex flex-col gap-2 mt-1">
                    {phaseTasks.map((t) => (
                      <div key={t.idx} className="p-3 bg-card ring-1 ring-border rounded-xl flex flex-col gap-2 relative group">
                        <div className="flex items-center justify-between gap-2">
                          <input
                            type="text"
                            value={t.titulo}
                            onChange={(e) => handleUpdateTask(t.idx, { titulo: e.target.value })}
                            className="bg-transparent text-xs font-semibold text-foreground focus:ring-1 focus:ring-mie-primary outline-none px-1 rounded flex-1"
                            placeholder="Nombre de la tarea"
                          />
                          <button 
                            onClick={() => handleDeleteTask(t.idx)} 
                            className="text-muted-foreground hover:text-red-500 p-0.5 rounded transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={t.descripcion || ""}
                          onChange={(e) => handleUpdateTask(t.idx, { descripcion: e.target.value })}
                          className="bg-transparent text-[11px] text-muted-foreground focus:ring-1 focus:ring-mie-primary outline-none px-1 rounded w-full"
                          placeholder="Descripción detallada..."
                        />
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-muted-foreground">Puntos:</span>
                            <select
                              value={t.estimado || 3}
                              onChange={(e) => handleUpdateTask(t.idx, { estimado: parseInt(e.target.value) })}
                              className="bg-muted text-[10px] py-0.5 px-1.5 rounded outline-none text-foreground font-bold"
                            >
                              <option value="1">1</option>
                              <option value="2">2</option>
                              <option value="3">3</option>
                              <option value="5">5</option>
                              <option value="8">8</option>
                            </select>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-muted-foreground">Módulo:</span>
                            <select
                              value={t.tipo || "development"}
                              onChange={(e) => handleUpdateTask(t.idx, { tipo: e.target.value })}
                              className="bg-muted text-[10px] py-0.5 px-1.5 rounded outline-none text-foreground"
                            >
                              <option value="product">product (historia grande)</option>
                              <option value="development">development (técnica)</option>
                              <option value="bug">bug (error)</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => handleAddTask(m.idTemp)}
                      className="border border-dashed border-border hover:bg-muted/50 text-[11px] font-bold text-muted-foreground py-1.5 rounded-lg flex items-center justify-center gap-1 transition-colors mt-1"
                    >
                      <Plus size={12} /> Añadir Tarea
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={handleAddMilestone}
            className="border-2 border-dashed border-mie-primary/20 hover:border-mie-primary/40 hover:bg-mie-primary/5 text-xs font-bold text-mie-primary py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
          >
            <Plus size={14} /> Crear Nueva Fase / Hito
          </button>

          {error && <div className="text-xs text-red-500 bg-red-50 p-2 rounded-lg">{error}</div>}

          <div className="flex justify-between items-center gap-2 mt-4 pt-3 border-t border-border">
            <button
              onClick={() => setGeneratedData(null)}
              disabled={loading}
              className="px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-muted rounded-xl flex items-center gap-1.5"
            >
              <ArrowLeft size={14} /> Volver a Generar
            </button>
            <div className="flex gap-2">
              <button onClick={onClose} disabled={loading} className="px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-muted rounded-xl">
                Cerrar
              </button>
              <button 
                onClick={handlePublish} 
                disabled={loading} 
                className="px-5 py-2 text-xs font-bold text-white bg-mie-primary hover:bg-mie-primary/90 rounded-xl flex items-center gap-2"
              >
                {loading ? <><Loader2 size={14} className="animate-spin"/> Publicando...</> : <><Send size={14}/> Confirmar y Publicar en GitHub</>}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    );
  }

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
