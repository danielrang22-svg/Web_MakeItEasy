"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/constants";
import { Modal, Toast } from "@/components/ui/SharedUI";
import { 
  Receipt, Search, Filter, Plus, ArrowUpRight, CheckCircle2, 
  AlertCircle, Trash2, Ban, ExternalLink, Calendar, CreditCard, DollarSign
} from "lucide-react";

interface Pago {
  id: string;
  monto: number;
  medioPagoId: string;
  fechaPago: string;
  origen: string;
  numeroRC: string | null;
}

interface Factura {
  id: string;
  proyectoId: string;
  siigoId: string;
  numero: string;
  tipo: string;
  valorTotal: number;
  saldoPendiente: number;
  estado: string;
  url: string | null;
  fechaEmision: string;
  notaCreditoId: string | null;
  notaCreditoNumero: string | null;
  proyecto: {
    id: string;
    titulo: string;
    clienteNombre: string;
  };
  pagos: Pago[];
}

export default function FacturasPage() {
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("TODOS");
  const [tipoFilter, setTipoFilter] = useState("TODOS");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Modales
  const [selectedFactura, setSelectedFactura] = useState<Factura | null>(null);
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [showAnularModal, setShowAnularModal] = useState(false);

  // Formulario Pago
  const [montoPago, setMontoPago] = useState("");
  const [medioPagoId, setMedioPagoId] = useState("8844");
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().split('T')[0]);
  const [isRegistrandoPago, setIsRegistrandoPago] = useState(false);

  // Formulario Anular
  const [dianReason, setDianReason] = useState("2");
  const [isAnulando, setIsAnulando] = useState(false);

  const fetchFacturas = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/facturas");
      const data = await res.json();
      if (res.ok) {
        setFacturas(data);
      } else {
        setToast({ message: data.error || "Error al cargar facturas", type: "error" });
      }
    } catch (error) {
      setToast({ message: "Error al consultar las facturas", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFacturas();
  }, []);

  const handleOpenPagoModal = (factura: Factura) => {
    setSelectedFactura(factura);
    setMontoPago(factura.saldoPendiente.toString());
    setShowPagoModal(true);
  };

  const handleOpenAnularModal = (factura: Factura) => {
    setSelectedFactura(factura);
    setShowAnularModal(true);
  };

  const submitPago = async () => {
    if (!selectedFactura) return;
    const monto = parseFloat(montoPago);
    if (isNaN(monto) || monto <= 0 || monto > selectedFactura.saldoPendiente) {
      setToast({ message: "Monto inválido o excede el saldo pendiente", type: "error" });
      return;
    }

    setIsRegistrandoPago(true);
    try {
      const res = await fetch(`/api/facturas/${selectedFactura.id}/pagar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monto,
          medioPagoId,
          fechaPago
        })
      });
      const data = await res.json();
      if (res.ok) {
        setToast({ message: `Pago registrado. Recibo de Caja: ${data.siigoVoucher?.name || 'Creado'}`, type: "success" });
        setShowPagoModal(false);
        fetchFacturas();
      } else {
        setToast({ message: data.error || "Error al registrar el pago", type: "error" });
      }
    } catch (error) {
      setToast({ message: "Error de red al intentar registrar el pago", type: "error" });
    } finally {
      setIsRegistrandoPago(false);
    }
  };

  const submitAnulacion = async () => {
    if (!selectedFactura) return;
    setIsAnulando(true);
    try {
      const res = await fetch(`/api/facturas/${selectedFactura.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dianReason: selectedFactura.tipo === "FV-2" ? dianReason : undefined
        })
      });
      const data = await res.json();
      if (res.ok) {
        setToast({ 
          message: selectedFactura.tipo === "FV-1" 
            ? "Factura FV-1 eliminada correctamente." 
            : `Factura FV-2 anulada. Nota Crédito: ${data.notaCredito?.name || 'Creada'}`, 
          type: "success" 
        });
        setShowAnularModal(false);
        fetchFacturas();
      } else {
        setToast({ message: data.error || "Error al anular la factura", type: "error" });
      }
    } catch (error) {
      setToast({ message: "Error de red al intentar anular la factura", type: "error" });
    } finally {
      setIsAnulando(false);
    }
  };

  // Filtrado de facturas
  const filteredFacturas = facturas.filter((f) => {
    const matchesSearch = 
      f.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.proyecto?.clienteNombre || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.proyecto?.titulo || "").toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesEstado = estadoFilter === "TODOS" || f.estado === estadoFilter;
    const matchesTipo = tipoFilter === "TODOS" || f.tipo === tipoFilter;

    return matchesSearch && matchesEstado && matchesTipo;
  });

  // Totales
  const totalFacturado = filteredFacturas.reduce((acc, f) => f.estado !== "ANULADA" ? acc + f.valorTotal : acc, 0);
  const totalPendiente = filteredFacturas.reduce((acc, f) => f.estado !== "ANULADA" ? acc + f.saldoPendiente : acc, 0);
  const totalCobrado = totalFacturado - totalPendiente;

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case "EMITIDA":
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">Emitida</span>;
      case "PAGO_PARCIAL":
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">Pago Parcial</span>;
      case "PAGADA":
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">Pagada</span>;
      case "ANULADA":
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400">Anulada</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-50 text-gray-600">{estado}</span>;
    }
  };

  const isInvoiceCancellable = (f: Factura) => {
    if (f.tipo !== "FV-2") return true;
    const emisionDate = new Date(f.fechaEmision);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - emisionDate.getTime());
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays <= 3;
  };

  return (
    <div className="px-6 py-6 pb-32 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
            <Receipt className="text-mie-secondary" size={32} /> Facturación y Siigo
          </h1>
          <p className="text-muted-foreground text-sm">Gestiona tus facturas electrónicas (FV-2), no electrónicas (FV-1), recibos de caja y notas crédito en tiempo real.</p>
        </div>
      </div>

      {/* Tarjetas de Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-card ring-1 ring-border rounded-2xl flex items-center gap-4">
          <div className="p-3.5 bg-mie-primary/10 text-mie-primary rounded-xl">
            <Receipt size={24} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Total Facturado</p>
            <p className="text-2xl font-black text-foreground">{formatCurrency(totalFacturado)}</p>
          </div>
        </div>

        <div className="p-5 bg-card ring-1 ring-border rounded-2xl flex items-center gap-4">
          <div className="p-3.5 bg-emerald-500/10 text-emerald-600 rounded-xl">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Total Recaudado</p>
            <p className="text-2xl font-black text-emerald-600">{formatCurrency(totalCobrado)}</p>
          </div>
        </div>

        <div className="p-5 bg-card ring-1 ring-border rounded-2xl flex items-center gap-4">
          <div className="p-3.5 bg-amber-500/10 text-amber-600 rounded-xl">
            <CreditCard size={24} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Saldo Pendiente</p>
            <p className="text-2xl font-black text-amber-600">{formatCurrency(totalPendiente)}</p>
          </div>
        </div>
      </div>

      {/* Buscador y Filtros */}
      <div className="bg-card ring-1 ring-border p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input
            type="text"
            placeholder="Buscar por número, cliente o proyecto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-muted/40 border border-border rounded-xl text-foreground text-sm focus:outline-none focus:border-mie-secondary transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-muted-foreground" />
            <select
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value)}
              className="px-3 py-2 bg-muted/40 border border-border rounded-xl text-foreground text-sm focus:outline-none"
            >
              <option value="TODOS">Todos los Estados</option>
              <option value="EMITIDA">Emitida</option>
              <option value="PAGO_PARCIAL">Pago Parcial</option>
              <option value="PAGADA">Pagada</option>
              <option value="ANULADA">Anulada</option>
            </select>
          </div>

          <select
            value={tipoFilter}
            onChange={(e) => setTipoFilter(e.target.value)}
            className="px-3 py-2 bg-muted/40 border border-border rounded-xl text-foreground text-sm focus:outline-none"
          >
            <option value="TODOS">Todos los Tipos</option>
            <option value="FV-1">FV-1 (No Electrónica)</option>
            <option value="FV-2">FV-2 (Electrónica)</option>
          </select>
        </div>
      </div>

      {/* Listado de Facturas */}
      {loading ? (
        <div className="text-center py-20 text-muted-foreground font-semibold">Cargando módulo de facturación...</div>
      ) : filteredFacturas.length === 0 ? (
        <div className="text-center py-20 bg-card ring-1 ring-border rounded-2xl">
          <Receipt className="mx-auto mb-4 text-muted-foreground opacity-30 animate-pulse" size={48} />
          <p className="text-muted-foreground font-medium text-lg">No se encontraron facturas registradas.</p>
        </div>
      ) : (
        <div className="bg-card ring-1 ring-border rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs font-bold uppercase text-muted-foreground">
                  <th className="px-6 py-4">Factura</th>
                  <th className="px-6 py-4">Cliente / Proyecto</th>
                  <th className="px-6 py-4">Fecha Emisión</th>
                  <th className="px-6 py-4">Tipo</th>
                  <th className="px-6 py-4 text-right">Valor Total</th>
                  <th className="px-6 py-4 text-right">Saldo Pendiente</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {filteredFacturas.map((f) => (
                  <tr key={f.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-4 font-bold text-foreground">
                      <div className="flex flex-col">
                        <span>{f.numero}</span>
                        {f.notaCreditoNumero && (
                          <span className="text-[10px] text-rose-500 font-medium">Nota Crédito: {f.notaCreditoNumero}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">{f.proyecto?.clienteNombre}</span>
                        <span className="text-xs text-muted-foreground">{f.proyecto?.titulo}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground flex items-center gap-1.5 mt-2">
                      <Calendar size={14} />
                      {f.fechaEmision.split("T")[0]}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${f.tipo === "FV-2" ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                        {f.tipo}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-foreground">
                      {formatCurrency(f.valorTotal)}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-amber-600">
                      {formatCurrency(f.saldoPendiente)}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(f.estado)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {f.url && (
                          <a
                            href={f.url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                            title="Ver en Siigo"
                          >
                            <ExternalLink size={16} />
                          </a>
                        )}
                        {f.estado !== "ANULADA" && f.saldoPendiente > 0.01 && (
                          <button
                            onClick={() => handleOpenPagoModal(f)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-colors shadow-sm"
                          >
                            <DollarSign size={12} /> Registrar Pago
                          </button>
                        )}
                        {f.estado !== "ANULADA" && (
                          <button
                            onClick={() => handleOpenAnularModal(f)}
                            disabled={!isInvoiceCancellable(f)}
                            className={`p-1.5 rounded-lg border text-xs font-bold transition-all ${
                              !isInvoiceCancellable(f)
                                ? 'border-gray-200 bg-gray-50 text-gray-400 opacity-50 cursor-not-allowed'
                                : f.tipo === "FV-1" 
                                  ? 'border-rose-200 hover:bg-rose-50 text-rose-600' 
                                  : 'border-amber-200 hover:bg-amber-50 text-amber-600'
                            }`}
                            title={
                              !isInvoiceCancellable(f)
                                ? "La factura electrónica tiene más de 3 días de emitida y ha sido aceptada por la DIAN (No anulable)"
                                : f.tipo === "FV-1" 
                                  ? "Eliminar Factura" 
                                  : "Anular con Nota Crédito"
                            }
                          >
                            {f.tipo === "FV-1" ? <Trash2 size={16} /> : <Ban size={16} />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Registrar Pago */}
      <Modal isOpen={showPagoModal} onClose={() => !isRegistrandoPago && setShowPagoModal(false)} title="Registrar Pago (Recibo de Caja)">
        {selectedFactura && (
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-2xl text-sm">
              <p className="font-bold text-foreground">Factura: {selectedFactura.numero}</p>
              <p className="text-muted-foreground">Cliente: {selectedFactura.proyecto?.clienteNombre}</p>
              <p className="text-muted-foreground mt-1">Saldo pendiente actual: <span className="font-black text-amber-600">{formatCurrency(selectedFactura.saldoPendiente)}</span></p>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Monto a abonar/pagar</label>
              <input
                type="number"
                max={selectedFactura.saldoPendiente}
                value={montoPago}
                onChange={(e) => setMontoPago(e.target.value)}
                disabled={isRegistrandoPago}
                className="w-full px-3 py-2.5 bg-card border border-border rounded-xl text-foreground text-sm focus:outline-none focus:border-mie-secondary"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Medio de Pago (Siigo)</label>
              <select
                value={medioPagoId}
                onChange={(e) => setMedioPagoId(e.target.value)}
                disabled={isRegistrandoPago}
                className="w-full px-3 py-2.5 bg-card border border-border rounded-xl text-foreground text-sm focus:outline-none focus:border-mie-secondary"
              >
                <option value="8844">Clientes Nacionales (Cartera)</option>
                <option value="1675">Efectivo (11050501)</option>
                <option value="13588">Cuenta Davivienda (11200502)</option>
                <option value="1676">Crédito (13050501)</option>
                <option value="1677">Tarjeta Débito (11100501)</option>
                <option value="1678">Tarjeta Crédito (11100501)</option>
                <option value="8845">Clientes Extranjero (13051001)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Fecha de Pago</label>
              <input
                type="date"
                value={fechaPago}
                onChange={(e) => setFechaPago(e.target.value)}
                disabled={isRegistrandoPago}
                className="w-full px-3 py-2.5 bg-card border border-border rounded-xl text-foreground text-sm focus:outline-none"
              />
            </div>

            <button
              onClick={submitPago}
              disabled={isRegistrandoPago}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md transition-colors disabled:opacity-50 mt-4"
            >
              {isRegistrandoPago ? "Registrando en Siigo..." : "Confirmar Recibo de Caja"}
            </button>
          </div>
        )}
      </Modal>

      {/* Modal Anular Factura */}
      <Modal isOpen={showAnularModal} onClose={() => !isAnulando && setShowAnularModal(false)} title={selectedFactura?.tipo === "FV-1" ? "Eliminar Factura" : "Anular Factura Electrónica"}>
        {selectedFactura && (
          <div className="space-y-4">
            <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 p-4 rounded-2xl text-sm">
              <p className="font-bold text-rose-600 dark:text-rose-400">⚠️ Advertencia de Procedimiento</p>
              <p className="text-muted-foreground mt-1">
                {selectedFactura.tipo === "FV-1" 
                  ? "Esta factura NO es electrónica. Se eliminará físicamente tanto del CRM como del servidor de Siigo." 
                  : "Esta factura es ELECTRÓNICA. No se puede eliminar. Se emitirá una Nota de Crédito Electrónica de anulación y se reportará a la DIAN."}
              </p>
            </div>

            <div className="bg-muted p-3.5 rounded-xl text-sm">
              <p className="font-bold text-foreground">Factura a afectar: {selectedFactura.numero}</p>
              <p className="text-muted-foreground">Valor total: {formatCurrency(selectedFactura.valorTotal)}</p>
            </div>

            {selectedFactura.tipo === "FV-2" && (
              <div className="space-y-1">
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Concepto de Corrección / Motivo DIAN</label>
                <select
                  value={dianReason}
                  onChange={(e) => setDianReason(e.target.value)}
                  disabled={isAnulando}
                  className="w-full px-3 py-2.5 bg-card border border-border rounded-xl text-foreground text-sm focus:outline-none"
                >
                  <option value="2">Anulación de factura electrónica (Motivo 2)</option>
                  <option value="1">Devolución parcial de los bienes y/o no aceptación parcial del servicio (Motivo 1)</option>
                  <option value="3">Rebaja o descuento parcial o total (Motivo 3)</option>
                  <option value="4">Ajuste de precio (Motivo 4)</option>
                  <option value="5">Descuento comercial por pronto pago (Motivo 5)</option>
                  <option value="6">Descuento comercial por volumen de ventas (Motivo 6)</option>
                </select>
              </div>
            )}

            <button
              onClick={submitAnulacion}
              disabled={isAnulando}
              className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md transition-colors disabled:opacity-50 mt-4 text-white ${
                selectedFactura.tipo === "FV-1" ? 'bg-rose-600 hover:bg-rose-700' : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              {isAnulando 
                ? "Procesando en Siigo..." 
                : selectedFactura.tipo === "FV-1" ? "Confirmar Eliminación Física" : "Emitir Nota Crédito"}
            </button>
          </div>
        )}
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
