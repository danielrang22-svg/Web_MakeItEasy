import { useState, useEffect } from "react";
import { useBitacoraStore } from "@/lib/state/bitacoraStore";
import { Loader2, Send, PlusCircle, Info, CheckCircle, AlertTriangle } from "lucide-react";

interface BitacoraPanelProps {
  proyectoId: string;
}

export default function BitacoraPanel({ proyectoId }: BitacoraPanelProps) {
  const { entradas, loading, fetchEntradas, addEntrada } = useBitacoraStore();
  const [nuevaEntrada, setNuevaEntrada] = useState("");
  const [tipo, setTipo] = useState("NOTA");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchEntradas(proyectoId);
  }, [proyectoId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaEntrada.trim()) return;

    setSubmitting(true);
    await addEntrada(proyectoId, "Admin Make It Easy", "admin@makeiteasycol.com", nuevaEntrada, tipo);
    setNuevaEntrada("");
    setSubmitting(false);
  };

  const getIcon = (tipoEntrada: string) => {
    switch (tipoEntrada) {
      case "NOTA": return <Info size={16} className="text-blue-500" />;
      case "ACTUALIZACION": return <CheckCircle size={16} className="text-green-500" />;
      case "DECISION": return <AlertTriangle size={16} className="text-orange-500" />;
      default: return <Info size={16} className="text-blue-500" />;
    }
  };

  const getColor = (tipoEntrada: string) => {
    switch (tipoEntrada) {
      case "NOTA": return "bg-blue-500/10 border-blue-500/20";
      case "ACTUALIZACION": return "bg-green-500/10 border-green-500/20";
      case "DECISION": return "bg-orange-500/10 border-orange-500/20";
      default: return "bg-blue-500/10 border-blue-500/20";
    }
  };

  return (
    <div className="flex flex-col h-full bg-card ring-1 ring-border rounded-2xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-foreground">Bitácora del Proyecto</h2>
          <p className="text-[10px] text-muted-foreground mt-0.5">Registro de decisiones, notas y actualizaciones diarias.</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col gap-4">
        {loading && entradas.length === 0 ? (
          <div className="flex justify-center py-8">
            <Loader2 size={24} className="animate-spin text-muted-foreground" />
          </div>
        ) : entradas.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <PlusCircle size={32} className="mx-auto mb-3 opacity-20" />
            <p className="text-xs">No hay entradas en la bitácora aún.</p>
            <p className="text-[10px] mt-1 opacity-70">Añade la primera nota para mantener el historial del proyecto.</p>
          </div>
        ) : (
          entradas.map(entrada => (
            <div key={entrada.id} className={`p-4 rounded-xl border flex gap-3 ${getColor(entrada.tipo)}`}>
              <div className="mt-0.5">{getIcon(entrada.tipo)}</div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-foreground uppercase tracking-wider">{entrada.tipo}</span>
                    <span className="text-[10px] text-muted-foreground">• {entrada.autorNombre}</span>
                  </div>
                  <span className="text-[9px] text-muted-foreground">{new Date(entrada.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-sm text-foreground/90 whitespace-pre-wrap">{entrada.entrada}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-border bg-muted/10">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <select 
            value={tipo} 
            onChange={e => setTipo(e.target.value)}
            className="bg-card ring-1 ring-border rounded-xl px-3 text-xs outline-none focus:ring-mie-primary"
          >
            <option value="NOTA">Nota</option>
            <option value="ACTUALIZACION">Actualización</option>
            <option value="DECISION">Decisión</option>
          </select>
          <input 
            type="text" 
            value={nuevaEntrada} 
            onChange={e => setNuevaEntrada(e.target.value)} 
            placeholder="Añadir a la bitácora..." 
            className="flex-1 bg-card ring-1 ring-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-mie-primary transition-all"
            disabled={submitting}
          />
          <button 
            type="submit" 
            disabled={!nuevaEntrada.trim() || submitting} 
            className="bg-mie-primary text-[#0e0e0e] px-4 rounded-xl hover:bg-mie-primary/90 disabled:opacity-50 transition-colors font-bold flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </form>
      </div>
    </div>
  );
}
