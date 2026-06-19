"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/constants";
import { DollarSign, TrendingUp, TrendingDown, RefreshCw, BarChart } from "lucide-react";
import { Toast } from "@/components/ui/SharedUI";

interface ReporteData {
  targetCurrency: string;
  totalGlobalIngresos: number;
  totalGlobalGastos: number;
  totalGlobalNomina: number;
  rentabilidadGlobal: number;
  mensual: Record<string, { totalIngresos: number; totalGastos: number; totalNomina: number; rentabilidad: number }>;
}

export default function FinanzasPage() {
  const [data, setData] = useState<ReporteData | null>(null);
  const [currency, setCurrency] = useState("COP");
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const fetchReporte = async (targetCurrency: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/finanzas/reportes?currency=${targetCurrency}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        setToast({ message: "Error al obtener reporte", type: "error" });
      }
    } catch (error) {
      setToast({ message: "Error de red", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReporte(currency);
  }, [currency]);

  if (isLoading && !data) {
    return <div className="p-8 text-center text-muted-foreground">Cargando reporte financiero...</div>;
  }

  const sortedMonths = data ? Object.keys(data.mensual).sort().reverse() : [];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display flex items-center gap-2">
            <DollarSign className="text-emerald-500" /> Reporte Financiero
          </h1>
          <p className="text-muted-foreground mt-1">Consolidado de ingresos y gastos con conversión TRM</p>
        </div>
        
        <div className="flex items-center gap-2 bg-card p-2 rounded-xl ring-1 ring-border shadow-sm">
          <span className="text-xs font-bold text-muted-foreground uppercase pl-2">Moneda Reporte:</span>
          <select 
            value={currency} 
            onChange={(e) => setCurrency(e.target.value)}
            className="bg-muted border-none rounded-lg text-sm font-bold focus:ring-0 outline-none cursor-pointer"
          >
            <option value="COP">COP (Pesos Colombianos)</option>
            <option value="USD">USD (Dólares)</option>
            <option value="EUR">EUR (Euros)</option>
          </select>
          <button 
            onClick={() => fetchReporte(currency)}
            className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 hover:bg-emerald-200 dark:hover:bg-emerald-800/50 rounded-lg transition-colors"
            title="Actualizar reporte"
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {data && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-card ring-1 ring-border rounded-3xl p-6 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <p className="text-xs font-bold uppercase text-muted-foreground">Total Ingresos</p>
                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 rounded-xl">
                  <TrendingUp size={18} />
                </div>
              </div>
              <h2 className="text-3xl font-black text-foreground">
                {formatCurrency(data.totalGlobalIngresos, data.targetCurrency)}
              </h2>
            </div>

            <div className="bg-card ring-1 ring-border rounded-3xl p-6 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <p className="text-xs font-bold uppercase text-muted-foreground">Total Gastos</p>
                <div className="p-2 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-xl">
                  <TrendingDown size={18} />
                </div>
              </div>
              <h2 className="text-3xl font-black text-foreground">
                {formatCurrency(data.totalGlobalGastos, data.targetCurrency)}
              </h2>
              {data.totalGlobalNomina > 0 && (
                <div className="mt-2 text-sm font-bold text-muted-foreground flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  Incluye {formatCurrency(data.totalGlobalNomina, data.targetCurrency)} de Nómina
                </div>
              )}
            </div>

            <div className="bg-card ring-1 ring-border rounded-3xl p-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-5">
                <BarChart size={100} />
              </div>
              <div className="flex justify-between items-start mb-4 relative z-10">
                <p className="text-xs font-bold uppercase text-muted-foreground">Rentabilidad Global</p>
              </div>
              <h2 className={`text-3xl font-black relative z-10 ${data.rentabilidadGlobal >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {formatCurrency(data.rentabilidadGlobal, data.targetCurrency)}
              </h2>
            </div>
          </div>

          {/* Breakdown by Month */}
          <div className="bg-card ring-1 ring-border rounded-3xl p-6 shadow-sm">
            <h3 className="text-lg font-bold mb-4">Desglose Mensual</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-muted-foreground">
                    <th className="pb-3 font-semibold">Mes (Año-Mes)</th>
                    <th className="pb-3 font-semibold text-right">Ingresos</th>
                    <th className="pb-3 font-semibold text-right">Gastos Totales</th>
                    <th className="pb-3 font-semibold text-right text-muted-foreground">(de los cuales Nómina)</th>
                    <th className="pb-3 font-semibold text-right">Rentabilidad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {sortedMonths.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-muted-foreground">No hay registros financieros.</td>
                    </tr>
                  ) : (
                    sortedMonths.map(month => {
                      const stats = data.mensual[month];
                      return (
                        <tr key={month} className="hover:bg-muted/30 transition-colors">
                          <td className="py-4 font-bold text-foreground">{month}</td>
                          <td className="py-4 text-right text-emerald-500 font-semibold">
                            {formatCurrency(stats.totalIngresos, data.targetCurrency)}
                          </td>
                          <td className="py-4 text-right text-rose-500 font-semibold">
                            {formatCurrency(stats.totalGastos, data.targetCurrency)}
                          </td>
                          <td className="py-4 text-right text-muted-foreground text-xs font-semibold">
                            {stats.totalNomina > 0 ? formatCurrency(stats.totalNomina, data.targetCurrency) : "-"}
                          </td>
                          <td className={`py-4 text-right font-black ${stats.rentabilidad >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                            {formatCurrency(stats.rentabilidad, data.targetCurrency)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
