"use client";

import { useLeadsStore, getLeadsByStage, getStageValue, getTotalPipelineValue } from "@/lib/state/leadsStore";
import { useCotizacionesStore } from "@/lib/state/cotizacionesStore";
import { useProyectosStore } from "@/lib/state/proyectosStore";
import { useGastosStore } from "@/lib/state/gastosStore";
import { Etapa, EstadoCotizacion, EstadoProyecto, Cotizacion } from "@/lib/types";
import { PIPELINE_STAGES, formatCurrency } from "@/lib/constants";
import { useEffect, useState } from "react";
import {
    BarChart3, TrendingUp, Target, PieChart, Trophy, XCircle, ArrowUpRight,
    Users, FileText, CheckCircle, Ban, Briefcase, Factory, DollarSign,
    LineChart, Star, CalendarDays
} from "lucide-react";

export default function ReportesPage() {
    const { leads, loadLeads } = useLeadsStore();
    const { cotizaciones, loadCotizaciones } = useCotizacionesStore();
    const { proyectos, ordenes, loadProyectos, loadOrdenes } = useProyectosStore();
    const { gastos, fetchGastos } = useGastosStore();

    const [fechaDesde, setFechaDesde] = useState("");
    const [fechaHasta, setFechaHasta] = useState("");

    const setPresetRange = (preset: string) => {
        const now = new Date();
        let start = new Date();
        let end = new Date();

        if (preset === "hoy") {
            // Already today
        } else if (preset === "mes") {
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        } else if (preset === "trimestre") {
            const q = Math.floor(now.getMonth() / 3);
            start = new Date(now.getFullYear(), q * 3, 1);
            end = new Date(now.getFullYear(), (q + 1) * 3, 0);
        } else if (preset === "semestre") {
            const s = now.getMonth() < 6 ? 0 : 6;
            start = new Date(now.getFullYear(), s, 1);
            end = new Date(now.getFullYear(), s + 6, 0);
        } else if (preset === "año") {
            start = new Date(now.getFullYear(), 0, 1);
            end = new Date(now.getFullYear(), 11, 31);
        } else if (preset.startsWith("month_")) {
            const m = parseInt(preset.split("_")[1]);
            start = new Date(now.getFullYear(), m, 1);
            end = new Date(now.getFullYear(), m + 1, 0);
        } else {
            return;
        }

        const toStr = (d: Date) => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            return `${y}-${m}-${day}`;
        };
        
        setFechaDesde(toStr(start));
        setFechaHasta(toStr(end));
    };

    useEffect(() => {
        loadLeads();
        loadCotizaciones();
        loadProyectos();
        loadOrdenes();
        fetchGastos();
    }, [loadLeads, loadCotizaciones, loadProyectos, loadOrdenes, fetchGastos]);

    const computeCotizacionTotal = (c: Cotizacion) => {
        return c.totalProyectoCore + c.moduloOpcionalFee;
    };

    const filterByDate = (item: any) => {
        if (!fechaDesde && !fechaHasta) return true;
        const creationIso = (item.fechaCreacion || item.fecha).split('T')[0];
        
        if (fechaDesde && creationIso < fechaDesde) return false;
        if (fechaHasta && creationIso > fechaHasta) return false;
        return true;
    };

    const filteredLeads = leads.filter(filterByDate);
    const filteredCotizaciones = cotizaciones.filter(filterByDate);
    const filteredProyectos = proyectos.filter(filterByDate);
    const filteredGastos = gastos.filter(filterByDate);

    // --- LEADS ---
    const totalValue = getTotalPipelineValue(filteredLeads);
    const wonLeads = filteredLeads.filter((l) => l.etapa === Etapa.GANADO);
    const wonValue = getStageValue(filteredLeads, Etapa.GANADO);
    const lostLeads = filteredLeads.filter((l) => l.etapa === Etapa.PERDIDO);
    const activeLeads = filteredLeads.filter(
        (l) => l.etapa !== Etapa.GANADO && l.etapa !== Etapa.PERDIDO
    );
    const conversionRate = filteredLeads.length > 0 ? ((wonLeads.length / filteredLeads.length) * 100).toFixed(1) : "0";
    const avgDealSize = wonLeads.length > 0 ? wonValue / wonLeads.length : 0;
    
    const topLeads = [...activeLeads].sort((a, b) => b.valorEstimado - a.valorEstimado).slice(0, 5);

    // --- COTIZACIONES ---
    const cotizacionesAprobadas = filteredCotizaciones.filter(c => c.estado === EstadoCotizacion.APROBADA_CLIENTE);
    const cotizacionesRechazadas = filteredCotizaciones.filter(c => c.estado === EstadoCotizacion.RECHAZADA_CLIENTE);
    const valorCotizado = filteredCotizaciones.reduce((acc, c) => acc + computeCotizacionTotal(c), 0);
    const tasaAprobacion = filteredCotizaciones.length > 0 
        ? ((cotizacionesAprobadas.length / filteredCotizaciones.length) * 100).toFixed(1) 
        : "0";

    // --- PRODUCCIÓN ---
    const proyectosActivos = filteredProyectos.filter(p => p.estado !== EstadoProyecto.SOPORTE);
    const proyectosCompletados = filteredProyectos.filter(p => p.estado === EstadoProyecto.SOPORTE);
    
    const filteredOrdenes = ordenes.filter(o => filteredProyectos.find(p => p.id === o.proyectoId));
    const costoProduccion = filteredGastos.reduce((acc, g) => acc + g.monto, 0);
    
    const ventaProduccion = filteredProyectos.reduce((acc, p) => {
        const coti = cotizaciones.find(c => c.id === p.cotizacionId);
        return acc + (coti ? computeCotizacionTotal(coti) : 0);
    }, 0);

    const gananciaProduccion = ventaProduccion - costoProduccion;

    // --- GASTOS BREAKDOWN ---
    const gastosPorCategoria = filteredGastos.reduce((acc: any, g) => {
        acc[g.categoria] = (acc[g.categoria] || 0) + g.monto;
        return acc;
    }, {});
    
    const categoriasGastos = Object.keys(gastosPorCategoria).map(cat => ({
        categoria: cat,
        monto: gastosPorCategoria[cat],
        porcentaje: costoProduccion > 0 ? (gastosPorCategoria[cat] / costoProduccion) * 100 : 0
    })).sort((a, b) => b.monto - a.monto);

    return (
        <div className="px-5 pb-32">
            <div className="mt-4 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <BarChart3 size={24} className="text-mie-primary" />
                        Reportes General
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1">
                        Métricas de todo el ciclo de negocio y producción
                    </p>
                </div>
                
                {/* Date Filter */}
                <div className="flex flex-col sm:flex-row gap-2">
                    <select 
                        onChange={(e) => setPresetRange(e.target.value)}
                        className="bg-card ring-1 ring-border p-2 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-mie-primary"
                    >
                        <option value="">Rango rápido...</option>
                        <option value="hoy">Hoy</option>
                        <option value="mes">Mes Actual</option>
                        <option value="trimestre">Trimestre Actual</option>
                        <option value="semestre">Semestre Actual</option>
                        <option value="año">Este Año</option>
                        <optgroup label="Seleccionar Mes">
                            <option value="month_0">Enero</option>
                            <option value="month_1">Febrero</option>
                            <option value="month_2">Marzo</option>
                            <option value="month_3">Abril</option>
                            <option value="month_4">Mayo</option>
                            <option value="month_5">Junio</option>
                            <option value="month_6">Julio</option>
                            <option value="month_7">Agosto</option>
                            <option value="month_8">Septiembre</option>
                            <option value="month_9">Octubre</option>
                            <option value="month_10">Noviembre</option>
                            <option value="month_11">Diciembre</option>
                        </optgroup>
                    </select>

                    <div className="bg-card ring-1 ring-border p-2 rounded-2xl flex items-center gap-2 shadow-sm">
                        <CalendarDays size={18} className="text-muted-foreground ml-2" />
                        <input 
                            type="date"
                            value={fechaDesde}
                            onChange={e => setFechaDesde(e.target.value)}
                            onClick={(e) => 'showPicker' in e.target && (e.target as any).showPicker()}
                            className="bg-transparent border-none outline-none text-sm font-medium w-[125px] cursor-pointer"
                            title="Desde"
                        />
                        <span className="text-muted-foreground">-</span>
                        <input 
                            type="date"
                            value={fechaHasta}
                            onChange={e => setFechaHasta(e.target.value)}
                            onClick={(e) => 'showPicker' in e.target && (e.target as any).showPicker()}
                            className="bg-transparent border-none outline-none text-sm font-medium w-[125px] cursor-pointer"
                            title="Hasta"
                        />
                        {(fechaDesde || fechaHasta) && (
                            <button 
                                onClick={() => { setFechaDesde(""); setFechaHasta(""); }}
                                className="bg-muted hover:bg-muted/80 px-2 py-1 rounded-lg text-xs font-bold transition-colors"
                            >
                                Limpiar
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* SECCIÓN LEADS */}
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2 text-muted-foreground mt-8">
                <Users size={18} /> Ciclo de Ventas (Leads)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-4 bg-card ring-1 ring-border rounded-2xl">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <TrendingUp size={16} className="text-mie-primary" />
                        </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase">Pipeline Total</p>
                    <p className="text-xl font-bold mt-1">{formatCurrency(totalValue)}</p>
                </div>
                <div className="p-4 bg-card ring-1 ring-border rounded-2xl">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                            <Trophy size={16} className="text-emerald-500" />
                        </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase">Valor Ganado</p>
                    <p className="text-xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{formatCurrency(wonValue)}</p>
                </div>
                <div className="p-4 bg-card ring-1 ring-border rounded-2xl">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                            <Target size={16} className="text-mie-secondary" />
                        </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase">Tasa Conversión</p>
                    <p className="text-xl font-bold mt-1">{conversionRate}%</p>
                </div>
                <div className="p-4 bg-card ring-1 ring-border rounded-2xl">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                            <PieChart size={16} className="text-orange-500" />
                        </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase">Ticket Promedio</p>
                    <p className="text-xl font-bold mt-1">{formatCurrency(avgDealSize)}</p>
                </div>
            </div>

            {/* SECCIÓN COTIZACIONES */}
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2 text-muted-foreground mt-8">
                <FileText size={18} /> Historial de Cotizaciones
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-4 bg-card ring-1 ring-border rounded-2xl">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase">Cotizaciones Emitidas</p>
                    <p className="text-2xl font-bold mt-1">{filteredCotizaciones.length}</p>
                </div>
                <div className="p-4 bg-card ring-1 ring-border rounded-2xl">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase">Valor Cotizado</p>
                    <p className="text-xl font-bold mt-1">{formatCurrency(valorCotizado)}</p>
                </div>
                <div className="p-4 bg-card ring-1 ring-border rounded-2xl flex items-center gap-4">
                    <div>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase flex items-center gap-1"><CheckCircle size={10} className="text-emerald-500" /> Aprob.</p>
                      <p className="text-xl font-bold text-emerald-500">{cotizacionesAprobadas.length}</p>
                    </div>
                    <div className="w-px h-8 bg-border" />
                    <div>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase flex items-center gap-1"><Ban size={10} className="text-red-500" /> Rechaz.</p>
                      <p className="text-xl font-bold text-red-500">{cotizacionesRechazadas.length}</p>
                    </div>
                </div>
                <div className="p-4 bg-card ring-1 ring-border rounded-2xl bg-muted/20">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase">Tasa Aprobación</p>
                    <p className="text-2xl font-bold mt-1">{tasaAprobacion}%</p>
                </div>
            </div>

            {/* SECCIÓN PRODUCCIÓN */}
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2 text-muted-foreground mt-8">
                <Factory size={18} /> Balance de Producción y Ganancia
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <div className="p-4 ring-1 ring-blue-500/20 rounded-2xl flex justify-between items-center bg-card">
                    <div>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase flex items-center gap-1">Ingresos de Proyectos (Facturado)</p>
                      <p className="text-2xl font-bold text-mie-primary">{formatCurrency(ventaProduccion)}</p>
                    </div>
                    <DollarSign size={24} className="text-mie-primary opacity-40" />
                </div>
                <div className="p-4 ring-1 ring-red-500/20 rounded-2xl flex justify-between items-center bg-card">
                    <div>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase flex items-center gap-1">Gastos y Costos Totales</p>
                      <p className="text-2xl font-bold text-red-500">-{formatCurrency(costoProduccion)}</p>
                    </div>
                    <TrendingUp size={24} className="text-red-500/40" />
                </div>
                <div className="p-4 ring-1 ring-emerald-500/20 rounded-2xl flex justify-between items-center bg-card">
                    <div>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase flex items-center gap-1">Rentabilidad Neta (Ganancia)</p>
                      <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(gananciaProduccion)}</p>
                    </div>
                    <LineChart size={24} className="text-emerald-500 opacity-40" />
                </div>
            </div>

            {/* GRÁFICOS INFERIORES */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                <div className="bg-card ring-1 ring-border rounded-3xl p-5">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><Star size={18} className="text-yellow-500" />Top 5 Negocios Activos (Hot Leads)</h3>
                    <div className="space-y-4">
                        {topLeads.length > 0 ? topLeads.map((lead, i) => (
                            <div key={lead.id} className="flex justify-between items-center group relative cursor-default">
                                <div className="flex gap-3 items-center w-[70%]">
                                    <div className="w-6 text-center font-bold text-muted-foreground text-sm">{i+1}.</div>
                                    <div className="truncate">
                                        <p className="font-bold text-sm truncate">{lead.titulo}</p>
                                        <p className="text-xs text-muted-foreground truncate">{lead.empresa}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-sm text-emerald-600">{formatCurrency(lead.valorEstimado)}</p>
                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase">{lead.etapa.replace("_", " ")}</p>
                                </div>
                            </div>
                        )) : (
                            <p className="text-muted-foreground text-sm text-center py-4">No hay leads activos en este período.</p>
                        )}
                    </div>
                </div>

                <div className="bg-card ring-1 ring-border rounded-3xl p-5">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><PieChart size={18} className="text-muted-foreground" />Embudo de Ventas (Filtrado)</h3>
                    <div className="space-y-2">
                        {PIPELINE_STAGES.map((stage) => {
                            const count = getLeadsByStage(filteredLeads, stage.key).length;
                            const value = getStageValue(filteredLeads, stage.key);
                            const maxCount = Math.max(...PIPELINE_STAGES.map((s) => getLeadsByStage(filteredLeads, s.key).length), 1);
                            const width = Math.max((count / maxCount) * 100, 8);
                            return (
                                <div key={stage.key} className="flex items-center gap-3">
                                    <div className="w-24 text-xs font-medium text-right flex-shrink-0 truncate">
                                        {stage.shortLabel}
                                    </div>
                                    <div className="flex-1 h-8 bg-muted rounded-xl overflow-hidden relative">
                                        <div
                                            className="h-full rounded-xl flex items-center px-3 transition-all duration-500"
                                            style={{ width: `${width}%`, backgroundColor: stage.dotColor }}
                                        >
                                            <span className="text-white text-xs font-bold whitespace-nowrap">
                                                {count} obj
                                            </span>
                                        </div>
                                    </div>
                                    <div className="w-24 text-xs font-bold text-right flex-shrink-0 opacity-80">
                                        {formatCurrency(value)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* SECCIÓN DESGLOSE DE GASTOS */}
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2 text-muted-foreground mt-8">
                <DollarSign size={18} className="text-rose-500" /> Desglose de Gastos por Categoría
            </h3>
            <div className="bg-card ring-1 ring-border rounded-3xl p-5">
                {categoriasGastos.length > 0 ? (
                    <div className="space-y-4">
                        {categoriasGastos.map((cat, i) => (
                            <div key={cat.categoria} className="flex items-center gap-3">
                                <div className="w-24 text-xs font-bold text-right flex-shrink-0 text-muted-foreground truncate">
                                    {cat.categoria}
                                </div>
                                <div className="flex-1 h-6 bg-muted rounded-xl overflow-hidden relative">
                                    <div
                                        className="h-full rounded-xl flex items-center px-3 transition-all duration-500 bg-rose-500/80"
                                        style={{ width: `${Math.max(cat.porcentaje, 2)}%` }}
                                    >
                                        <span className="text-white text-[10px] font-bold whitespace-nowrap drop-shadow-md">
                                            {cat.porcentaje.toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                                <div className="w-24 text-xs font-black text-right flex-shrink-0 text-text-primary">
                                    {formatCurrency(cat.monto)}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-muted-foreground text-sm text-center py-4">No hay gastos registrados en este período.</p>
                )}
            </div>

        </div>
    );
}
