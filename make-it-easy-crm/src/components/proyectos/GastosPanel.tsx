"use client";

import { useEffect, useState } from "react";
import { useGastosStore } from "@/lib/state/gastosStore";
import { Plus, DollarSign, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/constants";

export default function GastosPanel({ proyectoId }: { proyectoId: string }) {
    const { gastos, fetchGastos, isLoading, addGasto, deleteGasto } = useGastosStore();
    const [isCreating, setIsCreating] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        concepto: "",
        monto: "",
        categoria: "SOFTWARE"
    });

    useEffect(() => {
        fetchGastos(proyectoId);
    }, [proyectoId]);

    const projectGastos = gastos.filter(g => g.proyectoId === proyectoId);
    const totalCostos = projectGastos.reduce((sum, g) => sum + g.monto, 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await addGasto({
            ...formData,
            proyectoId,
            monto: Number(formData.monto),
            moneda: "COP",
            estado: "PAGADO",
            recurrente: false
        });
        setIsCreating(false);
        setFormData({ concepto: "", monto: "", categoria: "SOFTWARE" });
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <DollarSign className="text-mie-primary" size={20} />
                        Costos y Presupuesto
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">Total invertido: <span className="font-bold text-foreground">{formatCurrency(totalCostos)}</span></p>
                </div>
                {!isCreating && (
                    <button 
                        onClick={() => setIsCreating(true)}
                        className="bg-mie-primary/10 hover:bg-mie-primary/20 text-mie-primary px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                    >
                        <Plus size={14} /> Añadir Costo
                    </button>
                )}
            </div>

            {isCreating && (
                <form onSubmit={handleSubmit} className="mb-6 p-4 bg-muted/50 rounded-2xl ring-1 ring-border space-y-3">
                    <div>
                        <label className="text-xs font-bold text-muted-foreground mb-1 block">Concepto (Ej: Dominio, n8n, Plugin)</label>
                        <input required type="text" value={formData.concepto} onChange={e => setFormData({...formData, concepto: e.target.value})} className="w-full p-2 bg-card rounded-xl ring-1 ring-border text-sm" />
                    </div>
                    <div className="flex gap-3">
                        <div className="flex-1">
                            <label className="text-xs font-bold text-muted-foreground mb-1 block">Monto (COP)</label>
                            <input required type="number" value={formData.monto} onChange={e => setFormData({...formData, monto: e.target.value})} className="w-full p-2 bg-card rounded-xl ring-1 ring-border text-sm" />
                        </div>
                        <div className="flex-1">
                            <label className="text-xs font-bold text-muted-foreground mb-1 block">Categoría</label>
                            <select value={formData.categoria} onChange={e => setFormData({...formData, categoria: e.target.value})} className="w-full p-2 bg-card rounded-xl ring-1 ring-border text-sm">
                                <option value="SOFTWARE">Software / Infra</option>
                                <option value="TERCEROS">Pago a Terceros</option>
                                <option value="GENERAL">General</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={() => setIsCreating(false)} className="px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground">Cancelar</button>
                        <button type="submit" className="px-3 py-1.5 text-xs font-bold bg-mie-primary text-white rounded-xl">Guardar</button>
                    </div>
                </form>
            )}

            {isLoading ? (
                <div className="flex-1 flex justify-center items-center text-sm text-muted-foreground">Cargando costos...</div>
            ) : projectGastos.length === 0 ? (
                <div className="flex-1 flex flex-col justify-center items-center text-center p-8 bg-muted/30 rounded-2xl border border-dashed border-border">
                    <DollarSign size={32} className="text-muted-foreground/30 mb-3" />
                    <p className="text-sm font-bold text-muted-foreground">Sin costos registrados</p>
                    <p className="text-xs text-muted-foreground mt-1">Registra las compras o pagos asociados a este proyecto.</p>
                </div>
            ) : (
                <div className="space-y-3 overflow-y-auto pr-2">
                    {projectGastos.map(g => (
                        <div key={g.id} className="flex justify-between items-center p-4 bg-card rounded-2xl ring-1 ring-border">
                            <div>
                                <h4 className="text-sm font-bold">{g.concepto}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full font-bold text-muted-foreground">{g.categoria}</span>
                                    <span className="text-[10px] text-muted-foreground">{new Date(g.fecha).toLocaleDateString()}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="font-black text-rose-500 text-sm">-{formatCurrency(g.monto)}</span>
                                <button onClick={() => deleteGasto(g.id)} className="text-muted-foreground hover:text-red-500 transition-colors p-1">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
