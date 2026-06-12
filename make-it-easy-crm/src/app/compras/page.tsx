"use client";

import { useEffect, useState } from "react";
import { useGastosStore, Gasto } from "@/lib/state/gastosStore";
import { useProyectosStore } from "@/lib/state/proyectosStore";
import { ShoppingCart, Plus, Search, Filter, DollarSign, Calendar, TrendingUp, Building2 } from "lucide-react";
import { formatCurrency } from "@/lib/constants";
import { Modal } from "@/components/ui/SharedUI";
import Sidebar from "@/components/layout/Sidebar";

export default function ComprasPage() {
    const { gastos, fetchGastos, isLoading, addGasto, deleteGasto } = useGastosStore();
    const { proyectos, loadProyectos } = useProyectosStore();
    
    const [search, setSearch] = useState("");
    const [filterCategory, setFilterCategory] = useState("TODAS");
    const [filterDate, setFilterDate] = useState("TODOS");
    const [showModal, setShowModal] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        concepto: "",
        monto: "",
        moneda: "COP",
        categoria: "GENERAL",
        fecha: new Date().toISOString().split('T')[0], // YYYY-MM-DD format for date input
        proyectoId: "",
        recurrente: false,
        estado: "PAGADO"
    });

    useEffect(() => {
        fetchGastos();
        loadProyectos();
    }, [fetchGastos, loadProyectos]);

    // Apply text search and category filter
    const filteredGastos = gastos.filter(g => {
        const matchesSearch = g.concepto.toLowerCase().includes(search.toLowerCase()) || 
                              g.categoria.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = filterCategory === "TODAS" || g.categoria === filterCategory;
        
        let matchesDate = true;
        if (filterDate !== "TODOS" && g.fecha) {
            const date = new Date(g.fecha);
            const today = new Date();
            if (filterDate === "ESTE_MES") {
                matchesDate = date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
            } else if (filterDate === "MES_ANTERIOR") {
                const prevMonth = today.getMonth() === 0 ? 11 : today.getMonth() - 1;
                const prevYear = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
                matchesDate = date.getMonth() === prevMonth && date.getFullYear() === prevYear;
            } else if (filterDate === "ESTE_AÑO") {
                matchesDate = date.getFullYear() === today.getFullYear();
            }
        }
        
        return matchesSearch && matchesCategory && matchesDate;
    });

    const totalGastado = gastos.reduce((sum, g) => sum + g.monto, 0);
    const totalRecurrente = gastos.filter(g => g.recurrente).reduce((sum, g) => sum + g.monto, 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await addGasto({
            ...formData,
            monto: Number(formData.monto),
            proyectoId: formData.proyectoId || undefined,
            fecha: new Date(formData.fecha).toISOString()
        });
        setShowModal(false);
        setFormData({ 
            concepto: "", 
            monto: "", 
            moneda: "COP", 
            categoria: "GENERAL", 
            fecha: new Date().toISOString().split('T')[0],
            proyectoId: "",
            recurrente: false, 
            estado: "PAGADO" 
        });
    };

    return (
        <div className="min-h-screen bg-background pb-20 md:pb-0 md:pl-64">
            <Sidebar />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <div className="p-2.5 bg-rose-500/10 rounded-2xl">
                                <ShoppingCart className="text-rose-500" size={28} />
                            </div>
                            Compras y Costos
                        </h1>
                        <p className="text-muted-foreground mt-2 font-medium">Gestión de pagos a terceros, suscripciones y costos operativos.</p>
                    </div>
                    
                    <button 
                        onClick={() => setShowModal(true)}
                        className="bg-mie-primary text-white hover:bg-mie-primary/90 px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(138,235,255,0.2)] active:scale-95"
                    >
                        <Plus size={18} /> Registrar Gasto
                    </button>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-surface-dim ring-1 ring-border-glass rounded-3xl p-6 shadow-sm flex items-center gap-4 relative overflow-hidden">
                        <div className="absolute -right-4 -bottom-4 opacity-5">
                            <TrendingUp size={100} />
                        </div>
                        <div className="p-4 bg-rose-500/10 rounded-2xl z-10">
                            <TrendingUp className="text-rose-500" size={24} />
                        </div>
                        <div className="z-10">
                            <p className="text-sm font-bold text-muted-foreground">Total Gastado</p>
                            <h3 className="text-2xl font-black text-text-primary">{formatCurrency(totalGastado)}</h3>
                        </div>
                    </div>
                    <div className="bg-surface-dim ring-1 ring-border-glass rounded-3xl p-6 shadow-sm flex items-center gap-4 relative overflow-hidden">
                        <div className="absolute -right-4 -bottom-4 opacity-5">
                            <Calendar size={100} />
                        </div>
                        <div className="p-4 bg-purple-500/10 rounded-2xl z-10">
                            <Calendar className="text-purple-500" size={24} />
                        </div>
                        <div className="z-10">
                            <p className="text-sm font-bold text-muted-foreground">Gastos Recurrentes</p>
                            <h3 className="text-2xl font-black text-text-primary">{formatCurrency(totalRecurrente)}</h3>
                        </div>
                    </div>
                    <div className="bg-surface-dim ring-1 ring-border-glass rounded-3xl p-6 shadow-sm flex items-center gap-4 relative overflow-hidden">
                        <div className="absolute -right-4 -bottom-4 opacity-5">
                            <DollarSign size={100} />
                        </div>
                        <div className="p-4 bg-blue-500/10 rounded-2xl z-10">
                            <DollarSign className="text-blue-500" size={24} />
                        </div>
                        <div className="z-10">
                            <p className="text-sm font-bold text-muted-foreground">Último Gasto</p>
                            <h3 className="text-2xl font-black text-text-primary">{gastos.length > 0 ? formatCurrency(gastos[0].monto) : "$0"}</h3>
                        </div>
                    </div>
                </div>

                {/* Filters & Search */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6 bg-surface-dim p-4 rounded-2xl ring-1 ring-border-glass items-center">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por concepto o categoría..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-background ring-1 ring-border rounded-xl focus:ring-2 focus:ring-mie-primary outline-none text-sm transition-all text-text-primary"
                        />
                    </div>
                    <div className="relative w-full sm:w-48">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                        <select
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            className="w-full pl-10 pr-8 py-2.5 bg-background ring-1 ring-border rounded-xl focus:ring-2 focus:ring-mie-primary outline-none appearance-none text-sm cursor-pointer text-text-primary"
                        >
                            <option value="TODAS">Categorías</option>
                            <option value="GENERAL">General</option>
                            <option value="SUSCRIPCION">Suscripción</option>
                            <option value="SOFTWARE">Software / Infra</option>
                            <option value="TERCEROS">Pago a Terceros</option>
                            <option value="OPERATIVO">Operativo</option>
                        </select>
                    </div>
                    <div className="relative w-full sm:w-48">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                        <select
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            className="w-full pl-10 pr-8 py-2.5 bg-background ring-1 ring-border rounded-xl focus:ring-2 focus:ring-mie-primary outline-none appearance-none text-sm cursor-pointer text-text-primary"
                        >
                            <option value="TODOS">Todas las Fechas</option>
                            <option value="ESTE_MES">Este Mes</option>
                            <option value="MES_ANTERIOR">Mes Anterior</option>
                            <option value="ESTE_AÑO">Este Año</option>
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-surface-dim ring-1 ring-border-glass rounded-3xl overflow-hidden shadow-sm">
                    {isLoading ? (
                        <div className="p-12 flex justify-center items-center gap-3 text-muted-foreground">
                            <div className="w-5 h-5 border-2 border-mie-primary border-t-transparent rounded-full animate-spin"></div>
                            Cargando gastos...
                        </div>
                    ) : filteredGastos.length === 0 ? (
                        <div className="p-16 text-center text-muted-foreground flex flex-col items-center">
                            <div className="w-20 h-20 bg-background/50 rounded-full flex items-center justify-center mb-4">
                                <ShoppingCart size={36} className="opacity-30" />
                            </div>
                            <h3 className="text-lg font-bold text-text-primary mb-1">No se encontraron gastos</h3>
                            <p className="text-sm max-w-md mx-auto">No hay registros de compras o costos operativos que coincidan con tu búsqueda actual.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse whitespace-nowrap">
                                <thead>
                                    <tr className="border-b border-border bg-background/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                                        <th className="p-4 font-bold">Fecha</th>
                                        <th className="p-4 font-bold">Concepto</th>
                                        <th className="p-4 font-bold">Categoría</th>
                                        <th className="p-4 font-bold">Proyecto Asociado</th>
                                        <th className="p-4 font-bold text-right">Monto</th>
                                        <th className="p-4 font-bold text-center">Estado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredGastos.map(g => (
                                        <tr key={g.id} className="border-b border-border hover:bg-background/40 transition-colors group">
                                            <td className="p-4 text-sm font-medium text-text-secondary">
                                                {new Date(g.fecha).toLocaleDateString()}
                                            </td>
                                            <td className="p-4">
                                                <div className="font-bold text-sm text-text-primary">{g.concepto}</div>
                                                {g.recurrente && <span className="text-[10px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full font-bold mt-1 inline-block border border-purple-500/20">Pago Recurrente</span>}
                                            </td>
                                            <td className="p-4 text-sm">
                                                <span className="bg-background px-2 py-1.5 rounded-md text-xs font-bold border border-border-glass text-text-secondary">
                                                    {g.categoria}
                                                </span>
                                            </td>
                                            <td className="p-4 text-sm font-medium">
                                                {g.proyecto?.titulo || g.proyectoId ? (
                                                    <div className="flex items-center gap-2 text-mie-primary">
                                                        <Building2 size={14} />
                                                        <span className="truncate max-w-[150px] inline-block">{g.proyecto?.titulo || "Proyecto Vinculado"}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-sm font-black text-right text-text-primary">
                                                {formatCurrency(g.monto)} <span className="text-[10px] font-bold text-muted-foreground">{g.moneda}</span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className={`px-2 py-1 rounded-md text-[10px] font-bold border ${g.estado === "PAGADO" ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"}`}>
                                                    {g.estado}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

            </main>

            {/* Modal Crear Gasto */}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Registrar Gasto">
                <form onSubmit={handleSubmit} className="space-y-5 p-2">
                    <div className="space-y-4">
                        {/* Fila 1: Concepto */}
                        <div>
                            <label className="text-xs font-bold text-text-secondary mb-1.5 block uppercase tracking-wider">Concepto del Gasto</label>
                            <input 
                                required 
                                type="text" 
                                value={formData.concepto} 
                                onChange={e => setFormData({...formData, concepto: e.target.value})} 
                                className="w-full p-2.5 bg-background rounded-xl ring-1 ring-border text-sm focus:ring-2 focus:ring-mie-primary outline-none transition-all text-text-primary" 
                                placeholder="Ej. Suscripción Notion Anual" 
                            />
                        </div>

                        {/* Fila 2: Monto y Fecha */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-text-secondary mb-1.5 block uppercase tracking-wider">Monto</label>
                                <div className="relative">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">$</div>
                                    <input 
                                        required 
                                        type="number" 
                                        step="0.01" 
                                        value={formData.monto} 
                                        onChange={e => setFormData({...formData, monto: e.target.value})} 
                                        className="w-full pl-8 pr-3 py-2.5 bg-background rounded-xl ring-1 ring-border text-sm focus:ring-2 focus:ring-mie-primary outline-none transition-all text-text-primary" 
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-text-secondary mb-1.5 block uppercase tracking-wider">Fecha</label>
                                <input 
                                    required 
                                    type="date" 
                                    value={formData.fecha} 
                                    onChange={e => setFormData({...formData, fecha: e.target.value})} 
                                    className="w-full p-2.5 bg-background rounded-xl ring-1 ring-border text-sm focus:ring-2 focus:ring-mie-primary outline-none transition-all text-text-primary color-scheme-dark" 
                                />
                            </div>
                        </div>

                        {/* Fila 3: Categoría y Proyecto */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-text-secondary mb-1.5 block uppercase tracking-wider">Categoría</label>
                                <select 
                                    value={formData.categoria} 
                                    onChange={e => setFormData({...formData, categoria: e.target.value})} 
                                    className="w-full p-2.5 bg-background rounded-xl ring-1 ring-border text-sm focus:ring-2 focus:ring-mie-primary outline-none transition-all text-text-primary cursor-pointer"
                                >
                                    <option value="GENERAL">General</option>
                                    <option value="SUSCRIPCION">Suscripción</option>
                                    <option value="SOFTWARE">Software / Infraestructura</option>
                                    <option value="TERCEROS">Pago a Terceros</option>
                                    <option value="OPERATIVO">Operativo</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-text-secondary mb-1.5 block uppercase tracking-wider">Vincular Proyecto</label>
                                <select 
                                    value={formData.proyectoId} 
                                    onChange={e => setFormData({...formData, proyectoId: e.target.value})} 
                                    className="w-full p-2.5 bg-background rounded-xl ring-1 ring-border text-sm focus:ring-2 focus:ring-mie-primary outline-none transition-all text-text-primary cursor-pointer"
                                >
                                    <option value="">-- Ninguno (Gasto Interno) --</option>
                                    {proyectos.map(p => (
                                        <option key={p.id} value={p.id}>{p.titulo}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-background rounded-xl border border-border">
                        <input 
                            type="checkbox" 
                            id="recurrente" 
                            className="w-4 h-4 rounded text-mie-primary focus:ring-mie-primary bg-background border-border"
                            checked={formData.recurrente} 
                            onChange={e => setFormData({...formData, recurrente: e.target.checked})} 
                        />
                        <label htmlFor="recurrente" className="text-sm font-bold text-text-primary cursor-pointer select-none">
                            Marcar como pago recurrente
                        </label>
                    </div>

                    <div className="pt-2 flex gap-3">
                        <button 
                            type="button" 
                            onClick={() => setShowModal(false)} 
                            className="flex-1 py-3 bg-background border border-border text-text-primary rounded-xl font-bold text-sm hover:bg-surface-bright transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit" 
                            className="flex-1 py-3 bg-gradient-to-r from-primary to-secondary text-on-primary rounded-xl font-bold text-sm hover:opacity-90 shadow-[0_0_15px_rgba(138,235,255,0.3)] transition-all active:scale-[0.98]"
                        >
                            Registrar Gasto
                        </button>
                    </div>
                </form>
            </Modal>

        </div>
    );
}
