import React from "react";
import { Cotizacion } from "@/lib/types";
import { formatCurrency } from "@/lib/constants";
import { Server, CheckCircle, FileText, DollarSign, Layers, PlayCircle, HelpCircle } from "lucide-react";

export function CotizacionView({ cot, isClient }: { cot: Cotizacion; isClient: boolean }) {
    const currency = cot.moneda || "COP";
    
    // Parse JSON lists safely
    let prereqs: { titulo: string; descripcion: string }[] = [];
    try {
        if (cot.prerrequisitos) prereqs = JSON.parse(cot.prerrequisitos);
    } catch(e) { console.error("Error parsing prereqs", e); }

    let arch: { componente: string; funcion: string }[] = [];
    try {
        if (cot.arquitecturaJson) arch = JSON.parse(cot.arquitecturaJson);
    } catch(e) { console.error("Error parsing architecture", e); }

    let phases: { nombre: string; objetivo: string; detalles: string; precio: number }[] = [];
    try {
        if (cot.fasesJson) phases = JSON.parse(cot.fasesJson);
    } catch(e) { console.error("Error parsing phases", e); }

    let checklist: string[] = [];
    try {
        if (cot.checklistInicio) checklist = JSON.parse(cot.checklistInicio);
    } catch(e) { console.error("Error parsing checklist", e); }

    return (
        <div className="space-y-6 text-sm text-foreground">
            {/* Header section */}
            <div className="flex flex-wrap justify-between items-start border-b border-border pb-4 gap-4">
                <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Propuesta Comercial para</p>
                    <h2 className="text-xl font-bold text-foreground font-display">{cot.empresaNombre}</h2>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                        Contacto: <strong className="text-foreground">{cot.contactoNombre}</strong>
                    </p>
                </div>
                <div className="text-right space-y-1 text-xs">
                    <p className="font-bold text-sm text-mie-secondary">{cot.codigo} {cot.version > 1 ? `V${cot.version}` : ""}</p>
                    <p className="text-muted-foreground">Fecha: {cot.fecha.split("T")[0]}</p>
                    <p className="text-muted-foreground">Responsable: {cot.vendedor}</p>
                    <p className="text-muted-foreground">Validez: {cot.validez}</p>
                </div>
            </div>

            {/* Title Proposal */}
            <div className="p-4 bg-mie-secondary/5 border border-mie-secondary/10 rounded-2xl">
                <h3 className="font-bold text-sm text-mie-secondary flex items-center gap-1.5 font-display">
                    <FileText size={16} />
                    {cot.tituloPropuesta}
                </h3>
            </div>

            {/* 1. Desafio de Negocio */}
            <div className="space-y-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <HelpCircle size={14} className="text-mie-primary" />
                    1. El Desafío de Negocio
                </h4>
                <p className="text-xs leading-relaxed text-muted-foreground text-justify p-4 bg-muted/20 border border-border/50 rounded-2xl italic">
                    "{cot.desafioNegocio || "No especificado."}"
                </p>
            </div>

            {/* 2. Prerrequisitos de Viabilidad */}
            {prereqs.length > 0 && (
                <div className="space-y-2">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <CheckCircle size={14} className="text-emerald-500" />
                        2. Prerrequisitos de Viabilidad
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {prereqs.map((p, idx) => (
                            <div key={idx} className="p-3 bg-muted/10 border border-border/50 rounded-xl">
                                <strong className="text-xs text-foreground block">{p.titulo}</strong>
                                <span className="text-[11px] text-muted-foreground mt-1 block leading-normal">{p.descripcion}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 3. Arquitectura del Ecosistema */}
            {arch.length > 0 && (
                <div className="space-y-2">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <Server size={14} className="text-mie-primary" />
                        3. Arquitectura del Ecosistema
                    </h4>
                    <div className="border border-border rounded-xl overflow-hidden text-xs">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-muted/50 border-b border-border">
                                    <th className="p-3 font-bold text-muted-foreground w-1/3">Componente</th>
                                    <th className="p-3 font-bold text-muted-foreground">Función en el Sistema</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {arch.map((a, idx) => (
                                    <tr key={idx} className="hover:bg-muted/20 transition-colors">
                                        <td className="p-3 font-bold text-foreground">{a.componente}</td>
                                        <td className="p-3 text-muted-foreground">{a.funcion}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* 4. Fases de Implementación */}
            {phases.length > 0 && (
                <div className="space-y-2">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <Layers size={14} className="text-mie-secondary" />
                        4. Fases de Implementación e Inversión
                    </h4>
                    <div className="space-y-3">
                        {phases.map((p, idx) => (
                            <div key={idx} className="p-4 bg-muted/10 border-l-4 border-mie-primary rounded-r-2xl relative">
                                <div className="flex justify-between items-center mb-1.5 flex-wrap gap-2">
                                    <strong className="text-xs text-foreground font-display">{p.nombre}</strong>
                                    <span className="text-xs bg-mie-primary/10 text-mie-primary px-2.5 py-0.5 rounded-full font-bold">
                                        {formatCurrency(p.precio, currency)}
                                    </span>
                                </div>
                                <p className="text-[11px] text-muted-foreground mb-1"><span className="font-bold">Objetivo:</span> {p.objetivo}</p>
                                <p className="text-xs text-foreground/80 leading-relaxed">{p.detalles}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 5. Resumen Comercial */}
            <div className="space-y-2 border-t border-border pt-4">
                <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <DollarSign size={14} className="text-mie-secondary" />
                    5. Resumen Comercial
                </h4>
                <div className="bg-muted/30 border border-border rounded-2xl p-4 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                        <span className="font-medium text-muted-foreground">Proyecto Core (Desarrollo):</span>
                        <span className="font-bold text-sm">{formatCurrency(cot.totalProyectoCore, currency)}</span>
                    </div>
                    {cot.moduloOpcionalFee > 0 && (
                        <div className="flex justify-between items-center">
                            <span className="font-medium text-muted-foreground">Módulo Opcional Outbound:</span>
                            <span className="font-bold text-sm">+{formatCurrency(cot.moduloOpcionalFee, currency)}</span>
                        </div>
                    )}
                    <div className="flex justify-between items-start border-t border-border/50 pt-2 mt-2">
                        <div>
                            <span className="font-bold text-foreground">Soporte y Operación Continua:</span>
                            <span className="block text-[10px] text-muted-foreground mt-0.5 max-w-sm italic">
                                <strong>Incluye:</strong> {cot.feeMensualIncluye || "Soporte y mantenimiento de APIs"}
                            </span>
                        </div>
                        <span className="font-bold text-emerald-600 text-sm text-right whitespace-nowrap">
                            {formatCurrency(cot.feeMensual, currency)} /mes
                        </span>
                    </div>
                </div>
            </div>

            {/* 6. Checklist de Inicio */}
            {checklist.length > 0 && (
                <div className="space-y-2">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <PlayCircle size={14} className="text-mie-primary" />
                        6. Checklist de Inicio para el Cliente
                    </h4>
                    <ul className="space-y-1.5 pl-1">
                        {checklist.map((c, idx) => (
                            <li key={idx} className="text-xs text-muted-foreground flex items-center gap-2">
                                <span className="text-emerald-500 font-bold">✓</span> {c}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Observaciones */}
            {cot.observaciones && (
                <div className="text-xs bg-muted/40 p-3 rounded-xl">
                    <strong className="block mb-1">Observaciones adicionales:</strong>
                    <span className="text-muted-foreground">{cot.observaciones}</span>
                </div>
            )}
        </div>
    );
}
