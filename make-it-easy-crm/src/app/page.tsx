"use client";

import { useEffect, useState } from "react";
import { useLeadsStore, getTotalPipelineValue, getLeadsByStage, getStageValue } from "@/lib/state/leadsStore";
import { useProyectosStore } from "@/lib/state/proyectosStore";
import { Etapa, Lead, LeadCreateData, EstadoProyecto } from "@/lib/types";
import { PIPELINE_STAGES, formatCurrency, formatDate, getStageConfig } from "@/lib/constants";
import { Modal, Toast, Badge } from "@/components/ui/SharedUI";
import LeadForm from "@/components/leads/LeadForm";
import Link from "next/link";
import * as XLSX from "xlsx";
import {
  TrendingUp, Users, Trophy, ArrowRight, Building2,
  Plus, FolderKanban, Package, Zap, BarChart3, ChevronRight,
  Clock, CheckCircle2, Bot, Calendar, Download, MoreHorizontal, ArrowUpRight
} from "lucide-react";

// ── Section header (stitch overline style) ───────────
function SectionHeader({ label, href, linkLabel }: { label: string; href?: string; linkLabel?: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-bold text-text-primary tracking-tight">
        {label}
      </h3>
      {href && (
        <Link
          href={href}
          className="flex items-center gap-0.5 text-xs font-semibold text-primary hover:underline transition-colors"
        >
          {linkLabel ?? "Ver todos"}
          <ChevronRight size={12} />
        </Link>
      )}
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────
export default function DashboardPage() {
  const { leads, loadLeads, createLead } = useLeadsStore();
  const { proyectos, loadProyectos, ordenes, loadOrdenes, getProjectProgress, cotizaciones, loadCotizaciones } = useProyectosStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [timeFilter, setTimeFilter] = useState<"all" | "today" | "week" | "month" | "year">("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [sectorFilter, setSectorFilter] = useState<string>("all");

  useEffect(() => {
    loadLeads();
    loadProyectos();
    loadOrdenes();
    loadCotizaciones();
  }, [loadLeads, loadProyectos, loadOrdenes, loadCotizaciones]);

  // Extract unique non-null lead sources and sectors
  const availableSources = Array.from(new Set(leads.map(l => l.origenLead).filter(Boolean))) as string[];
  const availableSectors = Array.from(new Set(leads.map(l => l.sector).filter(Boolean))) as string[];

  // Date filter helper
  const isWithinPeriod = (dateStr: string) => {
    if (timeFilter === "all") return true;
    const date = new Date(dateStr);
    const now = new Date();
    
    if (timeFilter === "today") {
      return date.toDateString() === now.toDateString();
    }
    if (timeFilter === "week") {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(now.getDate() - 7);
      return date >= oneWeekAgo && date <= now;
    }
    if (timeFilter === "month") {
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    }
    if (timeFilter === "year") {
      return date.getFullYear() === now.getFullYear();
    }
    return true;
  };

  // Filtered datasets
  const filteredLeads = leads.filter(l => {
    const matchesTime = isWithinPeriod(l.fechaCreacion);
    const matchesSource = sourceFilter === "all" || l.origenLead === sourceFilter;
    const matchesSector = sectorFilter === "all" || l.sector === sectorFilter;
    return matchesTime && matchesSource && matchesSector;
  });
  const filteredCotizaciones = cotizaciones.filter(c => isWithinPeriod(c.fechaCreacion || c.fecha));
  const filteredProyectos = proyectos.filter(p => isWithinPeriod(p.fechaCreacion));

  // KPIs calculations
  const totalValue   = getTotalPipelineValue(filteredLeads);
  const activeLeads  = filteredLeads.filter(l => l.etapa !== Etapa.PERDIDO && l.etapa !== Etapa.GANADO);
  const wonLeads     = filteredLeads.filter(l => l.etapa === Etapa.GANADO);
  const wonValue     = getStageValue(filteredLeads, Etapa.GANADO);
  const recentLeads  = [...filteredLeads]
    .sort((a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime())
    .slice(0, 5);
  const activeProjects = filteredProyectos
    .filter(p => p.estado !== EstadoProyecto.SOPORTE)
    .slice(0, 4);

  // Excel Export Handler
  const handleExportData = () => {
    if (filteredLeads.length === 0 && filteredProyectos.length === 0) {
      setToast({ message: "No hay datos para exportar en este período", type: "error" });
      return;
    }

    const wb = XLSX.utils.book_new();

    if (filteredLeads.length > 0) {
      const leadsData = filteredLeads.map(l => ({
        Contacto: l.nombreContacto,
        Empresa: l.empresa,
        Valor: l.valorEstimado,
        Etapa: l.etapa,
        Email: l.email || "",
        Teléfono: l.telefono || "",
        Origen: l.origenLead || "",
        Sector: l.sector || "",
        Fecha: new Date(l.fechaCreacion).toLocaleDateString()
      }));
      const wsLeads = XLSX.utils.json_to_sheet(leadsData);
      XLSX.utils.book_append_sheet(wb, wsLeads, "Leads");
    }

    if (filteredProyectos.length > 0) {
      const projectsData = filteredProyectos.map(p => ({
        Proyecto: p.titulo,
        Cliente: p.clienteNombre,
        Estado: p.estado,
        Herramientas: p.herramientasUsadas || "",
        "Fecha de Inicio": new Date(p.fechaInicio).toLocaleDateString()
      }));
      const wsProjects = XLSX.utils.json_to_sheet(projectsData);
      XLSX.utils.book_append_sheet(wb, wsProjects, "Proyectos");
    }

    XLSX.writeFile(wb, `mie-crm-dashboard-${timeFilter}-${new Date().toISOString().slice(0, 10)}.xlsx`);
    setToast({ message: "Reporte de ventas exportado en Excel", type: "success" });
  };

  // Group approved client quote totals by month of current year
  const getMonthlySales = () => {
    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const currentYear = new Date().getFullYear();
    const monthlyTotals = Array(12).fill(0);

    filteredCotizaciones.forEach(c => {
      if (c.estado === "APROBADA_CLIENTE") {
        const date = new Date(c.fechaCreacion || c.fecha);
        if (date.getFullYear() === currentYear) {
          const monthIndex = date.getMonth();
          monthlyTotals[monthIndex] += (c.totalProyectoCore + c.moduloOpcionalFee);
        }
      }
    });

    const maxVal = Math.max(...monthlyTotals, 1);
    return months.map((name, index) => {
      const value = monthlyTotals[index];
      const percent = Math.min(Math.round((value / maxVal) * 90), 90);
      return { name, value, percent: percent > 0 ? percent : 5 };
    });
  };

  const monthlySales = getMonthlySales();

  // Dynamic Sales Cycle Calculation
  const getAverageSalesCycle = () => {
    const won = filteredLeads.filter(l => l.etapa === Etapa.GANADO);
    if (won.length === 0) return { label: "0 días", text: "Sin leads ganados" };

    let totalDays = 0;
    won.forEach(l => {
      const start = new Date(l.fechaCreacion);
      const end = new Date(l.fechaActualizacion || l.fechaCreacion);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
      totalDays += diffDays;
    });

    const avg = Math.round(totalDays / won.length);
    return { label: `${avg} días`, text: won.length === 1 ? "Basado en 1 lead" : `Basado en ${won.length} leads` };
  };

  const salesCycle = getAverageSalesCycle();

  async function handleCreate(data: LeadCreateData) {
    await createLead(data);
    setShowCreateModal(false);
    setToast({ message: "Lead creado exitosamente", type: "success" });
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <style>{`
        .glass-panel {
          background: rgba(22, 30, 44, 0.6) !important;
          backdrop-filter: blur(12px) !important;
          -webkit-backdrop-filter: blur(12px) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          color: #FFFFFF !important;
        }
      `}</style>

      {/* ── Hero greeting / Header Section ── */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-text-primary tracking-tight">
              Sales Overview
            </h2>
            <p className="font-sans text-xs text-text-secondary mt-1">
              Rendimiento en tiempo real y métricas clave.
            </p>
          </div>
          <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
            <button
              onClick={handleExportData}
              className="glass-panel px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 hover:bg-surface-bright transition-colors text-text-primary border border-border-glass"
            >
              <Download size={14} className="text-text-secondary" />
              Exportar
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-container to-primary text-on-primary-fixed rounded-lg text-xs font-bold hover:opacity-90 transition-opacity shadow-[0_0_15px_rgba(138,235,255,0.2)]"
            >
              <Plus size={14} strokeWidth={2.5} />
              Nuevo Lead
            </button>
          </div>
        </div>

        {/* ── Filters Bar ── */}
        <div className="flex flex-wrap items-center gap-3 bg-surface-container/30 p-3 rounded-xl border border-border-glass/50">
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-text-secondary" />
            <span className="text-xs font-bold text-text-secondary mr-1">Filtros:</span>
          </div>

          {/* Time Filter Select */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1">
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as any)}
              className="glass-panel px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface-container border border-border-glass text-text-primary outline-none focus:border-primary cursor-pointer"
            >
              <option value="all" className="bg-surface-dim text-text-primary">Todos los tiempos</option>
              <option value="today" className="bg-surface-dim text-text-primary">Hoy</option>
              <option value="week" className="bg-surface-dim text-text-primary">Esta Semana</option>
              <option value="month" className="bg-surface-dim text-text-primary">Este Mes</option>
              <option value="year" className="bg-surface-dim text-text-primary">Este Año</option>
            </select>
          </div>

          {/* Source Filter Select */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1">
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="glass-panel px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface-container border border-border-glass text-text-primary outline-none focus:border-primary cursor-pointer"
            >
              <option value="all" className="bg-surface-dim text-text-primary">Todos los orígenes</option>
              {availableSources.map(source => (
                <option key={source} value={source} className="bg-surface-dim text-text-primary">{source}</option>
              ))}
            </select>
          </div>

          {/* Sector Filter Select */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1">
            <select
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
              className="glass-panel px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface-container border border-border-glass text-text-primary outline-none focus:border-primary cursor-pointer"
            >
              <option value="all" className="bg-surface-dim text-text-primary">Todos los sectores</option>
              {availableSectors.map(sector => (
                <option key={sector} value={sector} className="bg-surface-dim text-text-primary">{sector}</option>
              ))}
            </select>
          </div>
          
          {(timeFilter !== "all" || sourceFilter !== "all" || sectorFilter !== "all") && (
            <button
              onClick={() => {
                setTimeFilter("all");
                setSourceFilter("all");
                setSectorFilter("all");
              }}
              className="text-[10px] text-primary hover:underline ml-auto font-bold"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* ── KPIs Bento Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* KPI 1: ROI Anual / Pipeline */}
        <div className="glass-panel rounded-xl p-6 relative overflow-hidden group border border-border-glass">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Pipeline Total</p>
              <h3 className="text-3xl font-black text-text-primary mt-1 tracking-tight">
                {formatCurrency(totalValue)}
              </h3>
            </div>
            <div className="p-2 bg-primary/20 rounded-lg text-primary">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-tertiary flex items-center bg-tertiary/10 px-2.5 py-0.5 rounded-full">
              <ArrowUpRight size={10} className="mr-1" />
              12% vs last month
            </span>
          </div>
        </div>

        {/* KPI 2: Ciclo de Ventas */}
        <div className="glass-panel rounded-xl p-6 relative overflow-hidden group border border-border-glass">
          <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Ciclo de Ventas</p>
              <h3 className="text-3xl font-black text-text-primary mt-1 tracking-tight">
                {salesCycle.label}
              </h3>
            </div>
            <div className="p-2 bg-secondary/20 rounded-lg text-secondary">
              <Clock size={20} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-tertiary flex items-center bg-tertiary/10 px-2.5 py-0.5 rounded-full">
              <CheckCircle2 size={10} className="mr-1" />
              Optimizado por AI
            </span>
            <span className="text-[10px] text-text-secondary ml-2">{salesCycle.text}</span>
          </div>
        </div>

        {/* KPI 3: Leads Activos */}
        <div className="glass-panel rounded-xl p-6 relative overflow-hidden group border border-border-glass">
          <div className="absolute top-0 right-0 w-32 h-32 bg-tertiary/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Leads Activos</p>
              <h3 className="text-3xl font-black text-text-primary mt-1 tracking-tight">
                {activeLeads.length}
              </h3>
            </div>
            <div className="p-2 bg-tertiary/20 rounded-lg text-tertiary">
              <Users size={20} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-primary flex items-center bg-primary/10 px-2.5 py-0.5 rounded-full">
              +{leads.filter(l => {
                const date = new Date(l.fechaCreacion);
                const today = new Date();
                return date.toDateString() === today.toDateString();
              }).length || 3} hoy
            </span>
            <div className="flex -space-x-1.5 ml-2">
              {recentLeads.slice(0, 3).map((lead, idx) => (
                <div
                  key={lead.id}
                  className="w-5 h-5 rounded-full border border-surface-dim bg-surface-container flex items-center justify-center text-[9px] text-white font-bold"
                  style={{
                    backgroundColor: getStageConfig(lead.etapa).dotColor,
                    zIndex: 3 - idx
                  }}
                >
                  {lead.nombreContacto.charAt(0).toUpperCase()}
                </div>
              ))}
              {recentLeads.length > 3 && (
                <div className="w-5 h-5 rounded-full border border-surface-dim bg-surface-container flex items-center justify-center text-[8px] text-text-secondary font-bold z-0">
                  +{recentLeads.length - 3}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content Grid: Charts and AI Activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Growth Chart */}
        <div className="lg:col-span-3 glass-panel rounded-xl p-6 flex flex-col border border-border-glass">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-base font-bold text-text-primary tracking-tight">Sales Growth</h3>
              <p className="text-xs text-text-secondary">Proyección vs Realidad</p>
            </div>
            <div className="flex gap-4">
              <span className="flex items-center gap-1.5 text-xs text-text-secondary">
                <span className="w-2 h-2 rounded-full bg-primary" /> Real
              </span>
              <span className="flex items-center gap-1.5 text-xs text-text-secondary">
                <span className="w-2 h-2 rounded-full bg-secondary border border-secondary border-dashed" /> Proyectado
              </span>
            </div>
          </div>
          {/* Real Monthly Sales Chart */}
          <div className="flex-1 min-h-[250px] w-full relative flex items-end justify-between px-4 pb-8 pt-10 border-b border-l border-border-glass/40">
            {/* Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10">
              <div className="border-t border-border-glass w-full h-0"></div>
              <div className="border-t border-border-glass w-full h-0"></div>
              <div className="border-t border-border-glass w-full h-0"></div>
              <div className="border-t border-border-glass w-full h-0"></div>
            </div>
            {/* Bars */}
            {monthlySales.map(m => (
              <div 
                key={m.name} 
                style={{ height: `${m.percent}%`, width: "6%" }}
                className="bg-gradient-to-t from-primary/20 to-primary rounded-t-sm relative group cursor-pointer hover:bg-surface-bright transition-colors shadow-[0_0_15px_rgba(138,235,255,0.15)] flex flex-col justify-end"
              >
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-surface-bright text-text-primary px-2 py-1 rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-lg">
                  {m.name}: {formatCurrency(m.value)}
                </div>
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 text-[10px] text-text-secondary font-semibold">
                  {m.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Recent Leads + Active Projects (2-col on desktop) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Leads */}
        <div className="glass-panel rounded-xl p-6 border border-border-glass flex flex-col">
          <SectionHeader label="Leads Recientes" href="/leads" />
          <div className="space-y-2 flex-1">
            {recentLeads.length === 0 ? (
              <p className="text-xs py-8 text-center text-text-secondary">
                No hay leads aún.
              </p>
            ) : recentLeads.map(lead => {
              const stage = getStageConfig(lead.etapa);
              return (
                <Link
                  key={lead.id}
                  href="/leads"
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-container-high/30 transition-all group border border-transparent hover:border-border-glass"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-on-primary text-[10px] font-bold flex-shrink-0"
                    style={{
                      backgroundColor: stage.dotColor,
                      boxShadow: `0 0 10px ${stage.dotColor}40`
                    }}
                  >
                    {lead.nombreContacto.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-text-primary truncate">
                      {lead.nombreContacto}
                    </p>
                    <p className="text-[10px] text-text-secondary flex items-center gap-1 mt-0.5">
                      <Building2 size={10} />
                      <span className="truncate">{lead.empresa}</span>
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-bold text-text-primary">
                      {formatCurrency(lead.valorEstimado)}
                    </p>
                    <span
                      className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mt-1 inline-block"
                      style={{
                        background: `${stage.dotColor}15`,
                        color: stage.dotColor,
                        border: `1px solid ${stage.dotColor}30`
                      }}
                    >
                      {stage.shortLabel}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Active Projects */}
        <div className="glass-panel rounded-xl p-6 border border-border-glass flex flex-col">
          <SectionHeader label="Proyectos Activos" href="/proyectos" />
          <div className="space-y-2 flex-1">
            {activeProjects.length === 0 ? (
              <p className="text-xs py-8 text-center text-text-secondary">
                No hay proyectos activos.
              </p>
            ) : activeProjects.map(proyecto => {
              const progreso = getProjectProgress(proyecto.id);
              return (
                <Link
                  key={proyecto.id}
                  href={`/proyectos/${proyecto.id}`}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-container-high/30 transition-all group border border-transparent hover:border-border-glass"
                >
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 bg-secondary/15"
                  >
                    <Package size={14} className="text-secondary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-text-primary truncate">
                      {proyecto.titulo}
                    </p>
                    <p className="text-[10px] text-text-secondary flex items-center gap-1 mt-0.5">
                      <Building2 size={10} />
                      <span className="truncate">{proyecto.clienteNombre}</span>
                    </p>
                  </div>
                  <div className="flex-shrink-0 w-16 text-right">
                    <p className="text-[10px] font-bold mb-1 text-secondary">
                      {progreso}%
                    </p>
                    <div
                      className="h-1.5 w-full rounded-full overflow-hidden bg-secondary/10"
                    >
                      <div
                        className="h-full rounded-full transition-all duration-700 bg-secondary"
                        style={{
                          width: `${progreso}%`,
                          boxShadow: "var(--glow-secondary)"
                        }}
                      />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Quick access strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: "/cotizaciones", icon: BarChart3,   label: "Cotizaciones", color: "rgba(143,245,255,0.05)",  borderColor: "rgba(143,245,255,0.15)", textColor: "var(--primary)" },
          { href: "/kanban",       icon: FolderKanban, label: "Pipeline",     color: "rgba(175,136,255,0.05)", borderColor: "rgba(175,136,255,0.15)", textColor: "var(--secondary)" },
          { href: "/proyectos",    icon: Package,      label: "Proyectos",    color: "rgba(102,247,150,0.05)", borderColor: "rgba(102,247,150,0.15)", textColor: "var(--tertiary)" },
          { href: "/reportes",     icon: Zap,          label: "Reportes",     color: "rgba(138,235,255,0.05)", borderColor: "rgba(138,235,255,0.15)", textColor: "var(--primary)" },
        ].map(item => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 p-4 rounded-xl transition-all duration-200 group border"
              style={{
                background: item.color,
                borderColor: item.borderColor
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 20px ${item.borderColor}`;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = "";
                (e.currentTarget as HTMLElement).style.boxShadow = "";
              }}
            >
              <Icon size={16} style={{ color: item.textColor, flexShrink: 0 }} />
              <span className="text-xs font-bold" style={{ color: item.textColor }}>
                {item.label}
              </span>
              <ChevronRight size={12} className="ml-auto opacity-0 group-hover:opacity-70 transition-opacity" style={{ color: item.textColor }} />
            </Link>
          );
        })}
      </div>

      {/* ── Modals & Toasts ── */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Nuevo Lead">
        <LeadForm onSubmit={handleCreate} onCancel={() => setShowCreateModal(false)} />
      </Modal>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
