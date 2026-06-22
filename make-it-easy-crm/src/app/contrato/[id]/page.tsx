"use client";

import { useEffect, useState, use } from "react";
import { Contrato } from "@/lib/types";
import { formatCurrency } from "@/lib/constants";
import { FileText, ShieldCheck, Download, Fingerprint, Globe, User, AlertCircle, CheckCircle } from "lucide-react";

export default function ContratoClientePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const [contrato, setContrato] = useState<Contrato | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [nombre, setNombre] = useState("");
  const [cedula, setCedula] = useState("");
  const [isSigning, setIsSigning] = useState(false);
  const [signSuccess, setSignSuccess] = useState(false);

  const fetchContrato = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/contratos/${id}`);
      if (!res.ok) {
        throw new Error("El contrato solicitado no existe o no pudo ser cargado.");
      }
      const data = await res.json();
      setContrato(data);
    } catch (err: any) {
      setError(err.message || "Error al cargar el contrato");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContrato();
  }, [id]);

  const handleSign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !cedula.trim()) return;

    setIsSigning(true);
    try {
      const res = await fetch(`/api/contratos/${id}/firmar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombreFirmante: nombre.trim(),
          cedulaFirmante: cedula.trim(),
        }),
      });

      if (res.ok) {
        setSignSuccess(true);
        fetchContrato(); // reload contract details
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Error al procesar la firma digital");
      }
    } catch (err) {
      console.error(err);
      alert("Error al conectar con el servidor");
    } finally {
      setIsSigning(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080B11] text-white flex flex-col items-center justify-center p-6 w-full">
        <div className="w-10 h-10 border-4 border-mie-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-medium text-muted-foreground">Cargando contrato legal...</p>
      </div>
    );
  }

  if (error || !contrato) {
    return (
      <div className="min-h-screen bg-[#080B11] text-white flex flex-col items-center justify-center p-6 w-full text-center">
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-3xl max-w-md">
          <AlertCircle className="mx-auto mb-3 text-rose-500" size={40} />
          <h2 className="text-lg font-bold mb-2">Error de Acceso</h2>
          <p className="text-sm text-muted-foreground mb-4">{error || "El contrato solicitado no existe."}</p>
          <a href="/" className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-xl text-xs font-bold transition-all">
            Volver al CRM
          </a>
        </div>
      </div>
    );
  }

  const isFirmado = contrato.estado === "FIRMADO";

  return (
    <div className="min-h-screen bg-[#0B111B] text-foreground p-4 md:p-8 w-full flex justify-center overflow-y-auto">
      {/* Print Stylesheet */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .print-container {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: transparent !important;
          }
          .contract-sheet {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            color: black !important;
            background: white !important;
          }
          h1, h2, h3, h4, h5, p, li, strong, span {
            color: black !important;
          }
        }
      `}</style>

      <div className="w-full max-w-4xl space-y-6 print-container">
        
        {/* Navigation & Header Actions - hidden during print */}
        <div className="flex items-center justify-between no-print bg-[#131B2A] border border-[#212E46] p-4 rounded-2xl shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-mie-secondary/15 rounded-xl flex items-center justify-center text-mie-secondary">
              <FileText size={20} />
            </div>
            <div>
              <h1 className="font-bold text-sm text-white">Contrato Digital - {contrato.cotizacion?.codigo}</h1>
              <p className="text-[11px] text-muted-foreground">Make It Easy · Portal de Clientes</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="bg-card text-foreground px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm ring-1 ring-border hover:bg-surface-bright hover:text-white transition-all"
            >
              <Download size={14} /> Descargar PDF / Imprimir
            </button>
          </div>
        </div>

        {/* The Contract Paper Sheet */}
        <div className="contract-sheet bg-white text-[#2D3748] p-8 md:p-12 rounded-3xl shadow-xl border border-gray-200 font-serif leading-relaxed space-y-6">
          
          {/* Logo / Company header */}
          <div className="flex justify-between items-start border-b pb-6 border-gray-200">
            <div>
              <p className="font-sans font-black text-xl text-[#1A365D] tracking-tight">MAKE IT EASY</p>
              <p className="font-sans text-[10px] text-gray-500 uppercase tracking-widest font-bold">Smart Automation Solutions</p>
            </div>
            <div className="text-right font-sans text-xs text-gray-500 space-y-0.5">
              <p>NIT: 901.452.731-2</p>
              <p>Email: legal@makeiteasycol.com</p>
              <p>Fecha: {new Date(contrato.fechaCreacion).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Render Contract Content (markdown representation) */}
          <div className="prose max-w-none text-[#2D3748] font-sans">
            {contrato.contenidoPlantilla.split("\n").map((line, idx) => {
              const trimmed = line.trim();
              if (trimmed.startsWith("# ")) {
                return (
                  <h1 key={idx} className="text-xl md:text-2xl font-bold text-[#1A365D] mt-8 mb-4 uppercase text-center border-b pb-2 font-display">
                    {trimmed.replace("# ", "")}
                  </h1>
                );
              }
              if (trimmed.startsWith("### ")) {
                return (
                  <h2 key={idx} className="text-base font-bold text-[#1A365D] mt-6 mb-3 uppercase tracking-wide">
                    {trimmed.replace("### ", "")}
                  </h2>
                );
              }
              if (trimmed.startsWith("#### ")) {
                return (
                  <h3 key={idx} className="text-sm font-bold text-gray-800 mt-4 mb-2">
                    {trimmed.replace("#### ", "")}
                  </h3>
                );
              }
              if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
                return (
                  <p key={idx} className="font-bold text-[#1A365D] my-2">
                    {trimmed.replace(/\*\*/g, "")}
                  </p>
                );
              }
              if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
                return (
                  <li key={idx} className="ml-6 list-disc text-sm my-1 text-gray-700 leading-relaxed">
                    {trimmed.substring(2)}
                  </li>
                );
              }
              if (trimmed === "---") {
                return <hr key={idx} className="my-6 border-gray-200" />;
              }
              if (trimmed === "") {
                return <div key={idx} className="h-2" />;
              }

              // Handle bolding within regular lines
              // Simple markdown replacement for bold text **like this**
              const parts = trimmed.split("**");
              if (parts.length > 1) {
                return (
                  <p key={idx} className="text-sm my-2.5 text-gray-700 text-justify">
                    {parts.map((part, pIdx) => 
                      pIdx % 2 === 1 ? <strong key={pIdx} className="text-gray-900">{part}</strong> : part
                    )}
                  </p>
                );
              }

              return (
                <p key={idx} className="text-sm my-2.5 text-gray-700 text-justify">
                  {trimmed}
                </p>
              );
            })}
          </div>

          {/* Legal Signatures / Stamp */}
          <div className="border-t border-gray-200 pt-8 mt-12 grid grid-cols-1 md:grid-cols-2 gap-8 font-sans">
            {/* Provider Signature */}
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-wider text-gray-500 font-bold">Por el Proveedor:</p>
              <div className="h-16 flex items-end">
                <div className="border-b border-gray-400 w-full pb-2">
                  <p className="font-mono text-xs italic text-[#1A365D] font-bold">Daniel Rangel - Representante Legal</p>
                </div>
              </div>
              <div className="text-[10px] text-gray-500 space-y-0.5">
                <p className="font-bold text-gray-700">MAKE IT EASY S.A.S.</p>
                <p>Firma autorizada por plataforma</p>
              </div>
            </div>

            {/* Client Signature */}
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-wider text-gray-500 font-bold">Por el Cliente:</p>
              {isFirmado ? (
                <div className="space-y-4">
                  <div className="h-16 flex items-end">
                    <div className="border-b border-emerald-500 w-full pb-2 relative">
                      {/* Signature check badge */}
                      <div className="absolute right-0 bottom-6 bg-emerald-500 text-white rounded-full p-1 flex items-center justify-center shadow-md">
                        <CheckCircle size={18} />
                      </div>
                      <p className="font-mono text-xs italic text-emerald-600 font-bold">
                        Aceptado Digitalmente por: {contrato.nombreFirmante}
                      </p>
                    </div>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl text-[10px] text-emerald-800 space-y-1">
                    <p className="font-bold flex items-center gap-1">
                      <ShieldCheck size={12} className="text-emerald-600" />
                      Firma Electrónica Simple Verificada
                    </p>
                    <p className="flex items-center gap-1"><User size={10} /> Documento ID: <strong>{contrato.cedulaFirmante}</strong></p>
                    <p className="flex items-center gap-1"><Globe size={10} /> IP de Aceptación: <strong>{contrato.ipFirma}</strong></p>
                    <p className="flex items-center gap-1"><Fingerprint size={10} /> Sello de Fecha: <strong>{new Date(contrato.fechaFirma!).toLocaleString()}</strong></p>
                  </div>
                </div>
              ) : (
                <div className="h-16 flex items-end">
                  <div className="border-b border-dashed border-gray-400 w-full pb-2">
                    <p className="text-xs text-gray-400 italic">Pendiente de firma digital por el cliente</p>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Signature form box - only shown if not signed yet - hidden during print */}
        {!isFirmado && (
          <div className="no-print bg-[#131B2A] border border-[#212E46] p-6 rounded-3xl shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center">
                <Fingerprint size={20} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">Firmar Digitalmente el Contrato</h3>
                <p className="text-[11px] text-muted-foreground">Por favor complete sus datos para firmar y aceptar los términos.</p>
              </div>
            </div>

            <form onSubmit={handleSign} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase text-muted-foreground">Nombre Completo del Firmante *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Juan Pérez"
                  className="w-full px-3 py-2.5 bg-[#1C2638] text-white border border-[#2B3B56] rounded-xl outline-none focus:ring-2 focus:ring-mie-primary text-xs"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  disabled={isSigning}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase text-muted-foreground">Cédula / Documento de Identificación *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: 1.032.483.921"
                  className="w-full px-3 py-2.5 bg-[#1C2638] text-white border border-[#2B3B56] rounded-xl outline-none focus:ring-2 focus:ring-mie-primary text-xs"
                  value={cedula}
                  onChange={(e) => setCedula(e.target.value)}
                  disabled={isSigning}
                />
              </div>

              <div className="md:col-span-2 pt-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <p className="text-[10px] text-muted-foreground max-w-lg leading-relaxed">
                  Al hacer clic en "Aceptar y Firmar", usted declara bajo gravedad de juramento que actúa en representación legal o autorizada del cliente y que consiente en suscribir este acuerdo utilizando firma electrónica simple en los términos del Decreto 2364 de 2012 de Colombia.
                </p>
                <button
                  type="submit"
                  disabled={isSigning || !nombre.trim() || !cedula.trim()}
                  className="w-full sm:w-auto bg-mie-secondary hover:bg-mie-secondary/90 disabled:bg-gray-700 text-white font-bold px-6 py-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-mie-secondary/20"
                >
                  {isSigning ? (
                    <>
                      <Loader2 className="animate-spin" size={14} /> Procesando Firma...
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={14} /> Aceptar y Firmar Contrato
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Signature Success Message - hidden during print */}
        {signSuccess && (
          <div className="no-print p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center gap-3 animate-fade-in shadow-md">
            <CheckCircle size={20} className="text-emerald-500" />
            <div>
              <p className="text-xs font-bold text-white">¡Contrato Firmado Correctamente!</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">El contrato ha quedado registrado y firmado electrónicamente de forma exitosa.</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// Loader icon helper
function Loader2({ className, size }: { className?: string; size?: number }) {
  return (
    <span className={`animate-spin ${className}`} style={{ fontSize: `${size}px` }}>🔄</span>
  );
}
