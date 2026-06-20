import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/SharedUI";
import { formatCurrency } from "@/lib/constants";
import { Proyecto, Cotizacion } from "@/lib/types";
import { Printer } from "lucide-react";

interface InvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    proyecto: Proyecto;
    cotizacion: Cotizacion | null;
}

export default function InvoiceModal({ isOpen, onClose, proyecto, cotizacion }: InvoiceModalProps) {
    const [ingresos, setIngresos] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (isOpen && proyecto?.id) {
            setIsLoading(true);
            fetch(`/api/finanzas/ingresos?proyectoId=${proyecto.id}`)
                .then(res => res.json())
                .then(data => {
                    setIngresos(data || []);
                    setIsLoading(false);
                })
                .catch(err => {
                    console.error("Error fetching ingresos:", err);
                    setIsLoading(false);
                });
        }
    }, [isOpen, proyecto?.id]);

    if (!isOpen) return null;

    const totalFacturado = cotizacion ? (cotizacion.totalProyectoCore + cotizacion.moduloOpcionalFee) : 0;
    const totalAbonado = ingresos.reduce((sum, ing) => sum + (ing.monto || 0), 0);
    const saldoPendiente = totalFacturado - totalAbonado;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Factura de Cierre">
            {/* Modal Content */}
            <div className="bg-white p-4 sm:p-8 rounded-lg text-slate-800 print:p-0 print:m-0 print:bg-white" id="invoice-content">
                {/* Header */}
                <div className="flex justify-between items-start mb-8 border-b pb-6">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">FACTURA</h1>
                        <p className="text-sm text-slate-500 mt-1 uppercase tracking-widest font-semibold">Make It Easy CRM</p>
                    </div>
                    <div className="text-right">
                        <p className="font-bold text-lg">{proyecto.clienteNombre}</p>
                        <p className="text-sm text-slate-500">{new Date().toLocaleDateString()}</p>
                        <p className="text-sm text-slate-500 font-mono mt-1">PROY-{proyecto.id.split("-")[0].toUpperCase()}</p>
                    </div>
                </div>

                {/* Conceptos */}
                <div className="mb-8">
                    <h3 className="text-sm font-bold uppercase text-slate-400 mb-3 tracking-wider">Conceptos Facturados</h3>
                    <div className="w-full border rounded-xl overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b">
                                <tr>
                                    <th className="px-4 py-3 font-semibold text-slate-700">Descripción</th>
                                    <th className="px-4 py-3 font-semibold text-slate-700 text-right">Monto</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b">
                                    <td className="px-4 py-3">{proyecto.titulo} (Proyecto Core)</td>
                                    <td className="px-4 py-3 text-right font-mono">{formatCurrency(cotizacion?.totalProyectoCore || 0, cotizacion?.moneda || "COP")}</td>
                                </tr>
                                {(cotizacion?.moduloOpcionalFee || 0) > 0 && (
                                    <tr className="border-b">
                                        <td className="px-4 py-3">Módulos Opcionales</td>
                                        <td className="px-4 py-3 text-right font-mono">{formatCurrency(cotizacion?.moduloOpcionalFee || 0, cotizacion?.moneda || "COP")}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Abonos */}
                <div className="mb-8">
                    <h3 className="text-sm font-bold uppercase text-slate-400 mb-3 tracking-wider">Abonos Realizados</h3>
                    {isLoading ? (
                        <p className="text-sm text-slate-500">Cargando abonos...</p>
                    ) : ingresos.length === 0 ? (
                        <p className="text-sm text-slate-500 italic">No se han registrado abonos para este proyecto.</p>
                    ) : (
                        <div className="w-full border rounded-xl overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 border-b">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold text-slate-700">Fecha</th>
                                        <th className="px-4 py-3 font-semibold text-slate-700">Concepto</th>
                                        <th className="px-4 py-3 font-semibold text-slate-700 text-right">Monto</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ingresos.map((ing) => (
                                        <tr key={ing.id} className="border-b last:border-0">
                                            <td className="px-4 py-3 text-slate-500">{new Date(ing.fecha).toLocaleDateString()}</td>
                                            <td className="px-4 py-3">{ing.concepto}</td>
                                            <td className="px-4 py-3 text-right font-mono text-emerald-600">-{formatCurrency(ing.monto, ing.moneda)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Totales */}
                <div className="flex justify-end pt-4 border-t-2 border-slate-900">
                    <div className="w-64 space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="font-semibold text-slate-600">Total Proyecto:</span>
                            <span className="font-mono">{formatCurrency(totalFacturado, cotizacion?.moneda || "COP")}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="font-semibold text-slate-600">Total Abonos:</span>
                            <span className="font-mono text-emerald-600">-{formatCurrency(totalAbonado, cotizacion?.moneda || "COP")}</span>
                        </div>
                        <div className="flex justify-between items-center pt-3 border-t">
                            <span className="font-black text-slate-900 uppercase tracking-widest text-sm">Saldo a Pagar</span>
                            <span className={`font-mono text-xl font-black ${saldoPendiente > 0 ? "text-rose-600" : "text-slate-900"}`}>
                                {formatCurrency(saldoPendiente, cotizacion?.moneda || "COP")}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Print Button (Hidden in print mode) */}
                <div className="mt-12 flex justify-end gap-3 print:hidden">
                    <button onClick={onClose} className="px-4 py-2 border rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                        Cerrar
                    </button>
                    <button onClick={() => window.print()} className="bg-mie-blue text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-mie-blue/90 transition-colors shadow-lg shadow-mie-blue/20">
                        <Printer size={16} />
                        Imprimir / Guardar PDF
                    </button>
                </div>
            </div>

            {/* Global Print Styles to make only the invoice visible when printing */}
            <style jsx global>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    #invoice-content, #invoice-content * {
                        visibility: visible !important;
                    }
                    #invoice-content {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100vw;
                        height: 100vh;
                        margin: 0;
                        padding: 2cm !important;
                        background: white;
                        color: black !important;
                    }
                    .fixed {
                        position: absolute !important;
                        background: transparent !important;
                    }
                }
            `}</style>
        </Modal>
    );
}
