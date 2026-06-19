import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/constants";
import { Plus, Trash2, CheckCircle, Clock } from "lucide-react";
import { Modal, Toast } from "@/components/ui/SharedUI";

interface Ingreso {
    id: string;
    concepto: string;
    monto: number;
    moneda: string;
    trm: number;
    fecha: string;
    metodoPago: string;
    estado: string;
}

export default function IngresosPanel({ proyectoId, monedaBase = "COP" }: { proyectoId: string, monedaBase?: string }) {
    const [ingresos, setIngresos] = useState<Ingreso[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [toast, setToast] = useState<{message: string, type: "success"|"error"} | null>(null);

    const [form, setForm] = useState({
        concepto: "",
        monto: 0,
        moneda: monedaBase,
        trm: 1.0,
        metodoPago: "Transferencia",
        estado: "COMPLETADO"
    });

    const loadIngresos = async () => {
        try {
            const res = await fetch(`/api/finanzas/ingresos?proyectoId=${proyectoId}`);
            if (res.ok) {
                const data = await res.json();
                setIngresos(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadIngresos();
    }, [proyectoId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch("/api/finanzas/ingresos", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...form, proyectoId })
            });
            if (res.ok) {
                setToast({ message: "Ingreso registrado", type: "success" });
                setShowModal(false);
                loadIngresos();
                setForm({ ...form, concepto: "", monto: 0 }); // reset
            } else {
                setToast({ message: "Error al guardar", type: "error" });
            }
        } catch (e) {
            setToast({ message: "Error de red", type: "error" });
        }
    };

    if (isLoading) return <div className="p-4 text-center text-muted-foreground text-sm">Cargando ingresos...</div>;

    const totalIngresos = ingresos.filter(i => i.estado === "COMPLETADO").reduce((sum, i) => sum + i.monto, 0);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="font-bold text-lg text-foreground">Abonos e Ingresos</h3>
                    <p className="text-xs text-muted-foreground">Pagos registrados para este proyecto</p>
                </div>
                <button 
                    onClick={() => setShowModal(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                >
                    <Plus size={14} /> Registrar Abono
                </button>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 flex justify-between items-center">
                <span className="text-sm font-bold text-emerald-800 dark:text-emerald-400">Total Recaudado</span>
                <span className="text-xl font-black text-emerald-600 dark:text-emerald-500">
                    {formatCurrency(totalIngresos, form.moneda)}
                </span>
            </div>

            <div className="space-y-2 mt-4">
                {ingresos.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
                        No hay ingresos registrados
                    </div>
                ) : (
                    ingresos.map(ingreso => (
                        <div key={ingreso.id} className="flex justify-between items-center p-3 border border-border rounded-xl bg-card hover:border-emerald-500/50 transition-colors">
                            <div>
                                <p className="text-sm font-bold text-foreground">{ingreso.concepto}</p>
                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1">
                                    <span className="flex items-center gap-1">
                                        {ingreso.estado === "COMPLETADO" ? <CheckCircle size={10} className="text-emerald-500"/> : <Clock size={10} className="text-amber-500"/>}
                                        {ingreso.estado}
                                    </span>
                                    <span>•</span>
                                    <span>{new Date(ingreso.fecha).toLocaleDateString()}</span>
                                    <span>•</span>
                                    <span>{ingreso.metodoPago}</span>
                                    {ingreso.moneda !== "COP" && (
                                        <>
                                            <span>•</span>
                                            <span>TRM: {ingreso.trm}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-black text-emerald-600">{formatCurrency(ingreso.monto, ingreso.moneda)}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Registrar Abono/Ingreso">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-muted-foreground mb-1">Concepto</label>
                        <input required type="text" className="w-full p-2 bg-muted rounded-lg border border-border text-sm" value={form.concepto} onChange={e => setForm({...form, concepto: e.target.value})} placeholder="Ej. Anticipo 50%" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-muted-foreground mb-1">Monto</label>
                            <input required type="number" step="0.01" className="w-full p-2 bg-muted rounded-lg border border-border text-sm" value={form.monto || ""} onChange={e => setForm({...form, monto: parseFloat(e.target.value)})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-muted-foreground mb-1">Moneda</label>
                            <select className="w-full p-2 bg-muted rounded-lg border border-border text-sm" value={form.moneda} onChange={e => setForm({...form, moneda: e.target.value})}>
                                <option value="COP">COP</option>
                                <option value="USD">USD</option>
                                <option value="EUR">EUR</option>
                            </select>
                        </div>
                    </div>
                    {form.moneda !== "COP" && (
                        <div>
                            <label className="block text-xs font-bold text-muted-foreground mb-1">TRM (Tasa a COP)</label>
                            <input required type="number" step="0.01" className="w-full p-2 bg-muted rounded-lg border border-border text-sm" value={form.trm} onChange={e => setForm({...form, trm: parseFloat(e.target.value)})} />
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-muted-foreground mb-1">Método de Pago</label>
                            <input type="text" className="w-full p-2 bg-muted rounded-lg border border-border text-sm" value={form.metodoPago} onChange={e => setForm({...form, metodoPago: e.target.value})} placeholder="Transferencia, Stripe, etc." />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-muted-foreground mb-1">Estado</label>
                            <select className="w-full p-2 bg-muted rounded-lg border border-border text-sm" value={form.estado} onChange={e => setForm({...form, estado: e.target.value})}>
                                <option value="COMPLETADO">COMPLETADO</option>
                                <option value="PENDIENTE">PENDIENTE</option>
                            </select>
                        </div>
                    </div>
                    <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg mt-4 transition-colors">
                        Guardar Ingreso
                    </button>
                </form>
            </Modal>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
