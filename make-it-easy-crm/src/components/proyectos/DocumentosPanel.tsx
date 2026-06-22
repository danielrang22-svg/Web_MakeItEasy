import { useEffect, useState } from "react";
import { Contrato } from "@/lib/types";
import { formatCurrency } from "@/lib/constants";
import { FileText, Clipboard, ExternalLink, ShieldCheck, Clock, Check, Loader2, AlertCircle } from "lucide-react";

interface DocumentosPanelProps {
  proyectoId: string;
  cotizacionId: string | null;
}

export default function DocumentosPanel({ proyectoId, cotizacionId }: DocumentosPanelProps) {
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchContratos = async () => {
    if (!cotizacionId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`/api/contratos?cotizacionId=${cotizacionId}`);
      if (res.ok) {
        const data = await res.json();
        setContratos(data);
      }
    } catch (e) {
      console.error("Error fetching project contracts:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContratos();
  }, [proyectoId, cotizacionId]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="animate-spin mb-2" size={24} />
        <p className="text-xs">Cargando documentos...</p>
      </div>
    );
  }

  if (!cotizacionId) {
    return (
      <div className="p-6 text-center text-muted-foreground bg-muted/20 border border-dashed border-border rounded-2xl">
        <AlertCircle className="mx-auto mb-2 opacity-30" size={32} />
        <p className="text-xs font-semibold">Este proyecto no está vinculado a una cotización comercial.</p>
        <p className="text-[10px] mt-1">No se pueden generar contratos sin una propuesta de referencia.</p>
      </div>
    );
  }

  return (
    <div className="bg-card ring-1 ring-border rounded-3xl p-6 shadow-sm min-h-[500px]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <FileText size={20} className="text-mie-secondary" />
            Documentos y Contratos del Proyecto
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Historial de contratos generados, estado de firmas digitales e información legal</p>
        </div>
        <button
          onClick={fetchContratos}
          className="px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground text-xs font-bold rounded-xl transition-all"
        >
          Actualizar
        </button>
      </div>

      <div className="space-y-4">
        {contratos.map((c) => {
          const publicLink = `${window.location.origin}/contrato/${c.id}`;
          const isFirmado = c.estado === "FIRMADO";

          return (
            <div
              key={c.id}
              className={`p-5 border rounded-2xl transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative group ${
                isFirmado 
                  ? "border-emerald-500/20 bg-emerald-50/5 dark:bg-emerald-950/5" 
                  : "border-border hover:border-mie-secondary/30"
              }`}
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm text-foreground flex items-center gap-1.5">
                    <FileText size={15} className="text-mie-secondary" />
                    Contrato de Servicios - {c.cotizacion?.codigo || "Cotización"}
                  </span>
                  
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase flex items-center gap-1 ${
                      isFirmado
                        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20"
                        : "bg-amber-50 text-amber-600 dark:bg-amber-950/20"
                    }`}
                  >
                    {isFirmado ? (
                      <>
                        <ShieldCheck size={11} /> Firmado
                      </>
                    ) : (
                      <>
                        <Clock size={11} /> Pendiente Firma
                      </>
                    )}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground line-clamp-1 max-w-2xl">
                  Propuesta: {c.cotizacion?.tituloPropuesta}
                </p>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-[11px] text-muted-foreground border-t border-border/40 mt-1">
                  <span>TRM: <strong className="text-foreground">{formatCurrency(c.trmAplicada, "COP")}</strong></span>
                  {c.condicionesPago && (
                    <span className="truncate max-w-xs">
                      Pago: <strong className="text-foreground" title={c.condicionesPago}>{c.condicionesPago}</strong>
                    </span>
                  )}
                  <span>Creado: <strong className="text-foreground">{c.fechaCreacion.split("T")[0]}</strong></span>
                </div>

                {isFirmado && (
                  <div className="mt-2 p-2.5 bg-emerald-500/5 border border-emerald-500/10 rounded-xl text-[10px] text-emerald-700 dark:text-emerald-400 space-y-0.5">
                    <p className="font-bold">Firmado digitalmente por el cliente:</p>
                    <p>Nombre: <span className="font-medium text-foreground">{c.nombreFirmante}</span> · Cédula/ID: <span className="font-medium text-foreground">{c.cedulaFirmante}</span></p>
                    <p>IP: <span className="font-medium text-foreground">{c.ipFirma}</span> · Fecha: <span className="font-medium text-foreground">{new Date(c.fechaFirma!).toLocaleString()}</span></p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                <button
                  onClick={() => copyToClipboard(publicLink, c.id)}
                  className="px-3 py-2 bg-muted hover:bg-muted/80 rounded-xl text-xs font-bold flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-all"
                  title="Copiar enlace público de firma"
                >
                  {copiedId === c.id ? (
                    <>
                      <Check size={13} className="text-emerald-500" /> Copiado
                    </>
                  ) : (
                    <>
                      <Clipboard size={13} /> Copiar Link Firma
                    </>
                  )}
                </button>
                <a
                  href={`/contrato/${c.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 bg-mie-secondary/10 hover:bg-mie-secondary/20 text-mie-secondary rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  <ExternalLink size={13} /> {isFirmado ? "Ver Contrato" : "Previsualizar"}
                </a>
              </div>
            </div>
          );
        })}

        {contratos.length === 0 && (
          <div className="text-center py-12 bg-muted/10 border border-dashed border-border rounded-2xl">
            <FileText size={32} className="mx-auto mb-2 text-muted-foreground opacity-30" />
            <p className="text-muted-foreground text-xs font-semibold">No se han generado contratos para este proyecto.</p>
            <p className="text-[10px] text-muted-foreground/80 mt-1 max-w-sm mx-auto">
              Puedes generar uno directamente desde la sección de Cotizaciones al aprobar la propuesta comercial del cliente.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
