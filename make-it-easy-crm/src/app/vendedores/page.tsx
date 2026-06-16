"use client";

import { useCotizacionesStore } from "@/lib/state/cotizacionesStore";
import { EstadoCotizacion, Cotizacion } from "@/lib/types";
import { formatCurrency } from "@/lib/constants";
import { useEffect, useState } from "react";
import { Users, FileText, CheckCircle, Ban, TrendingUp, CalendarDays, DollarSign } from "lucide-react";

export default function VendedoresPage() {
    const { cotizaciones, error, loadCotizaciones } = useCotizacionesStore();
    const [fechaDesde, setFechaDesde] = useState("");
    const [fechaHasta, setFechaHasta] = useState("");
    const [filtroVendedor, setFiltroVendedor] = useState("Todos");
    const [filtroEstado, setFiltroEstado] = useState("Todos");

    useEffect(() => {
        loadCotizaciones();
    }, [loadCotizaciones]);

    const computeCotizacionTotal = (c: Cotizacion) => {
        return c.totalProyectoCore + c.moduloOpcionalFee;
    };

    const filterCotizaciones = (item: Cotizacion) => {
        const creation = new Date(item.fechaCreacion || item.fecha);
        
        // Filtro Fechas
        if (fechaDesde) {
            const start = new Date(fechaDesde + 'T00:00:00');
            if (start > creation) return false;
        }
        if (fechaHasta) {
            const end = new Date(fechaHasta + 'T23:59:59');
            if (end < creation) return false;
        }

        // Filtro Vendedor
        const itemVendedor = item.vendedor || "No Asignado";
        if (filtroVendedor !== "Todos" && itemVendedor !== filtroVendedor) return false;

        // Filtro Estado
        if (filtroEstado !== "Todos" && item.estado !== filtroEstado) return false;

        return true;
    };

    const filteredCotizaciones = cotizaciones.filter(filterCotizaciones);
    const vendedoresDisponibles = Array.from(new Set(cotizaciones.map(c => c.vendedor || "No Asignado"))).sort();

    // Agrupar por vendedor
    const vendedoresData: Record<string, {
        nombre: string;
        total: number;
        aprobadas: number;
        rechazadas: number;
        pendientes: number;
        valorTotal: number;
        valorAprobado: number;
        cotizaciones: Cotizacion[];
    }> = {};

    filteredCotizaciones.forEach(c => {
        const vendedor = c.vendedor || "No Asignado";
        if (!vendedoresData[vendedor]) {
            vendedoresData[vendedor] = {
                nombre: vendedor,
                total: 0,
                aprobadas: 0,
                rechazadas: 0,
                pendientes: 0,
                valorTotal: 0,
                valorAprobado: 0,
                cotizaciones: []
            };
        }

        const data = vendedoresData[vendedor];
        data.total++;
        data.cotizaciones.push(c);
        
        const valor = computeCotizacionTotal(c);
        data.valorTotal += valor;

        if (c.estado === EstadoCotizacion.APROBADA_CLIENTE) {
            data.aprobadas++;
            data.valorAprobado += valor;
        } else if (c.estado === EstadoCotizacion.RECHAZADA_CLIENTE) {
            data.rechazadas++;
        } else {
            data.pendientes++;
        }
    });

    const vendedoresList = Object.values(vendedoresData).sort((a, b) => b.valorAprobado - a.valorAprobado);

    return (
        <div className="px-5 pb-32">
            {error ? (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 p-4 rounded-xl mb-6 ring-1 ring-red-500/50">
                    <p className="font-bold">Aviso del servidor:</p>
                    <p className="text-sm">{error}</p>
                    <p className="text-xs mt-2 opacity-80">Si acaba de haber una actualización, espera un momento y recarga la página.</p>
                </div>
            ) : null}

            <div className="mt-4 mb-6 flex flex-col xl:flex-row xl:items-end justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Users size={24} className="text-mie-secondary" />
                        Comerciales
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1">
                        Rendimiento de cotizaciones por vendedor
                    </p>
                </div>

                {/* Filters */}
                <div className="bg-card ring-1 ring-border p-3 rounded-2xl flex flex-wrap items-center gap-3 shadow-sm">
                    {/* Vendedor Filter */}
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Comercial</label>
                        <select 
                            value={filtroVendedor} 
                            onChange={e => setFiltroVendedor(e.target.value)}
                            className="bg-muted px-2 py-1.5 rounded-lg border-none outline-none text-sm font-medium"
                        >
                            <option value="Todos">Todos</option>
                            {vendedoresDisponibles.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                    </div>

                    {/* Estado Filter */}
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Estado</label>
                        <select 
                            value={filtroEstado} 
                            onChange={e => setFiltroEstado(e.target.value)}
                            className="bg-muted px-2 py-1.5 rounded-lg border-none outline-none text-sm font-medium"
                        >
                            <option value="Todos">Cualquiera</option>
                            {Object.values(EstadoCotizacion).map(e => <option key={e} value={e}>{e}</option>)}
                        </select>
                    </div>

                    <div className="w-px h-8 bg-border hidden sm:block mx-1"></div>

                    {/* Date Filter */}
                    <div className="flex items-end gap-2 h-full pb-0.5">
                        <CalendarDays size={18} className="text-muted-foreground shrink-0 mb-1.5" />
                        <input
                            type="date"
                            value={fechaDesde}
                            onChange={e => setFechaDesde(e.target.value)}
                            onClick={(e) => 'showPicker' in e.target && (e.target as any).showPicker()}
                            className="bg-muted px-2 py-1.5 rounded-lg border-none outline-none text-sm font-medium w-[125px] cursor-pointer"
                            title="Desde"
                        />
                        <span className="text-muted-foreground mb-1.5">-</span>
                        <input
                            type="date"
                            value={fechaHasta}
                            onChange={e => setFechaHasta(e.target.value)}
                            onClick={(e) => 'showPicker' in e.target && (e.target as any).showPicker()}
                            className="bg-muted px-2 py-1.5 rounded-lg border-none outline-none text-sm font-medium w-[125px] cursor-pointer"
                            title="Hasta"
                        />
                    </div>

                    {(fechaDesde || fechaHasta || filtroVendedor !== "Todos" || filtroEstado !== "Todos") && (
                        <button
                            onClick={() => { setFechaDesde(""); setFechaHasta(""); setFiltroVendedor("Todos"); setFiltroEstado("Todos"); }}
                            className="bg-mie-secondary/10 hover:bg-mie-secondary/20 text-mie-secondary px-3 py-1.5 rounded-lg text-xs font-bold transition-colors mt-4 sm:mt-0"
                        >
                            Limpiar
                        </button>
                    )}
                </div>
            </div>

            {vendedoresList.length === 0 && !error ? (
                <div className="text-center py-10 bg-card ring-1 ring-border rounded-3xl mt-10">
                    <Users size={48} className="mx-auto text-muted-foreground opacity-20 mb-3" />
                    <p className="text-muted-foreground font-medium">No hay cotizaciones en este período.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                    {vendedoresList.map((v) => {
                        const tasaEfectividad = v.total > 0 ? Math.round((v.aprobadas / v.total) * 100) : 0;
                        
                        return (
                            <div key={v.nombre} className="bg-card ring-1 ring-border rounded-3xl p-5 hover:shadow-xl transition-shadow relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-1 h-full bg-mie-secondary opacity-50"></div>
                                
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h3 className="text-xl font-bold">{v.nombre}</h3>
                                        <p className="text-xs text-muted-foreground font-medium mt-1">Comercial</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-muted-foreground font-bold uppercase">Total Vendido</p>
                                        <p className="text-xl font-bold text-green-600 dark:text-green-400">
                                            {formatCurrency(v.valorAprobado)}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mb-6">
                                    <div className="bg-muted/30 rounded-2xl p-3 ring-1 ring-border/50">
                                        <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1 flex items-center gap-1">
                                            <FileText size={12} /> Cotizado (Valor)
                                        </p>
                                        <p className="font-bold text-foreground">{formatCurrency(v.valorTotal)}</p>
                                    </div>
                                    <div className="bg-muted/30 rounded-2xl p-3 ring-1 ring-border/50">
                                        <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1 flex items-center gap-1">
                                            <TrendingUp size={12} /> Efectividad
                                        </p>
                                        <p className="font-bold text-mie-secondary">{tasaEfectividad}%</p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between gap-2 px-1">
                                    <div className="flex-1 text-center">
                                        <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">Total</p>
                                        <p className="text-lg font-bold">{v.total}</p>
                                    </div>
                                    <div className="w-px h-8 bg-border" />
                                    <div className="flex-1 text-center">
                                        <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1 flex justify-center items-center gap-1 text-green-600">
                                            <CheckCircle size={10} /> Aprob.
                                        </p>
                                        <p className="text-lg font-bold text-green-600">{v.aprobadas}</p>
                                    </div>
                                    <div className="w-px h-8 bg-border" />
                                    <div className="flex-1 text-center">
                                        <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1 flex justify-center items-center gap-1 text-amber-500">
                                            <CalendarDays size={10} /> Pend.
                                        </p>
                                        <p className="text-lg font-bold text-amber-500">{v.pendientes}</p>
                                    </div>
                                    <div className="w-px h-8 bg-border" />
                                    <div className="flex-1 text-center">
                                        <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1 flex justify-center items-center gap-1 text-red-500">
                                            <Ban size={10} /> Rechaz.
                                        </p>
                                        <p className="text-lg font-bold text-red-500">{v.rechazadas}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
