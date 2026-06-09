import { Cotizacion } from "../types";
import { formatCurrency } from "../constants";

function escapeHTML(str: string | null | undefined): string {
    if (!str) return "";
    return String(str).replace(/[&<>"']/g, (m) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[m] || m));
}

export function exportCotizacionClientePDF(cot: Cotizacion): void {
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

    // Render prereqs
    const prereqsHtml = prereqs.map(p => `
        <div style="margin-bottom: 12px;">
            <strong style="color: #af88ff; font-size: 14px;">${escapeHTML(p.titulo)}:</strong>
            <span style="font-size: 13px; color: #4b5563; display: block; margin-top: 2px;">${escapeHTML(p.descripcion)}</span>
        </div>
    `).join("");

    // Render architecture rows
    const archRows = arch.map(a => `
        <tr>
            <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;font-weight:700;color:#0f172a;width:30%;font-size:13px;">${escapeHTML(a.componente)}</td>
            <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;color:#4b5563;font-size:13px;">${escapeHTML(a.funcion)}</td>
        </tr>
    `).join("");

    // Render phases list
    const phasesHtml = phases.map((p, idx) => `
        <div style="background: #f8fafc; border-left: 4px solid #8ff5ff; padding: 16px; margin-bottom: 16px; border-radius: 0 12px 12px 0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <h4 style="font-size: 15px; font-weight: 800; color: #0f172a; margin: 0;">${escapeHTML(p.nombre)}</h4>
                <strong style="font-size: 15px; color: #8ff5ff; background: #001f25; padding: 4px 10px; border-radius: 6px;">${formatCurrency(p.precio, currency)}</strong>
            </div>
            <p style="font-size: 13px; font-style: italic; color: #4b5563; margin-bottom: 6px;"><strong>Objetivo:</strong> ${escapeHTML(p.objetivo)}</p>
            <p style="font-size: 13px; color: #1f2937; margin: 0; line-height: 1.4;">${escapeHTML(p.detalles)}</p>
        </div>
    `).join("");

    // Render checklist items
    const checklistHtml = checklist.map(c => `
        <li style="margin-bottom: 8px; font-size: 13px; color: #374151; list-style-type: none; display: flex; align-items: center; gap: 8px;">
            <span style="color: #22c55e; font-weight: bold; font-size: 16px;">✓</span> ${escapeHTML(c)}
        </li>
    `).join("");

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Propuesta Comercial - ${escapeHTML(cot.empresaNombre)}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; color: #1f2937; padding: 0; line-height: 1.5; background: #ffffff; }
        .header { background: linear-gradient(135deg, #0b111b 0%, #161c26 100%); color: white; padding: 36px 40px; display: flex; justify-content: space-between; align-items: center; border-bottom: 4px solid #8ff5ff; }
        .logo { font-size: 26px; font-weight: 800; letter-spacing: 1px; color: #8ff5ff; font-family: 'Plus Jakarta Sans', sans-serif; }
        .logo-sub { font-size: 10px; opacity: 0.8; margin-top: 2px; text-transform: uppercase; letter-spacing: 2px; color: #af88ff; }
        .cot-code { font-size: 16px; font-weight: 700; text-align: right; color: #8ff5ff; }
        .cot-date { font-size: 12px; opacity: 0.8; margin-top: 4px; }
        .client-section { padding: 24px 40px; background: #f9fafb; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; }
        .client-section h2 { font-size: 18px; font-weight: 800; color: #111827; }
        .client-section p { font-size: 12px; color: #6b7280; margin-top: 4px; }
        .content-body { padding: 40px; }
        .section { margin-bottom: 36px; }
        .section-title { font-size: 16px; font-weight: 800; color: #111827; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #af88ff; padding-bottom: 6px; margin-bottom: 16px; }
        p.text-p { font-size: 13.5px; color: #374151; line-height: 1.6; text-align: justify; white-space: pre-wrap; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        thead th { background: #0b111b; color: white; padding: 10px 14px; font-size: 12px; font-weight: 700; text-align: left; text-transform: uppercase; border-bottom: 2px solid #8ff5ff; }
        tbody td { font-size: 13px; }
        .summary-table th { background: #161c26; color: #8ff5ff; }
        .fee-includes { font-size: 12px; color: #6b7280; font-style: italic; margin-top: 4px; line-height: 1.4; display: block; }
        .footer { text-align: center; padding: 20px; color: #9ca3af; font-size: 11px; border-top: 1px solid #e5e7eb; margin-top: 40px; }
        @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #fff; }
            .no-print { display: none !important; }
            .header { background: #0b111b !important; color: white !important; }
            .page-break { page-break-before: always; }
        }
    </style>
</head>
<body>
    <div class="no-print" style="background:#0b111b;color:white;padding:12px 40px;text-align:center;font-size:14px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #374151;">
        <span>Visualizando Propuesta Comercial</span>
        <button onclick="window.print()" style="background:linear-gradient(135deg, #8ff5ff 0%, #af88ff 100%);color:#001f25;border:none;padding:8px 24px;border-radius:9999px;cursor:pointer;font-weight:bold;font-size:14px;box-shadow:0 0 10px rgba(143,245,255,0.3);">
            ⬇ Descargar / Imprimir Propuesta
        </button>
    </div>

    <div class="header">
        <div>
            <div class="logo">MAKE IT EASY</div>
            <div class="logo-sub">Intelligent Automation</div>
        </div>
        <div>
            <div class="cot-code">${escapeHTML(cot.codigo)} ${cot.version > 1 ? `V${cot.version}` : ""}</div>
            <div class="cot-date">Presentado: ${cot.fecha.split("T")[0]}</div>
        </div>
    </div>

    <div class="client-section">
        <div>
            <p style="text-transform:uppercase; font-weight:700; color:#af88ff; font-size:10px; letter-spacing:1px; margin:0;">Propuesta para</p>
            <h2>${escapeHTML(cot.empresaNombre)}</h2>
            <p>Contacto: ${escapeHTML(cot.contactoNombre)}</p>
        </div>
        <div style="text-align: right;">
            <p><strong>Comercial:</strong> ${escapeHTML(cot.vendedor)}</p>
            <p><strong>Validez:</strong> ${escapeHTML(cot.validez)}</p>
        </div>
    </div>

    <div class="content-body">
        <!-- Section 1 -->
        <div class="section">
            <h3 class="section-title">1. El Desafío de Negocio</h3>
            <p class="text-p">${escapeHTML(cot.desafioNegocio || "No especificado.")}</p>
        </div>

        <!-- Section 2 -->
        ${prereqsHtml ? `
        <div class="section">
            <h3 class="section-title">2. Prerrequisitos de Viabilidad</h3>
            <div>${prereqsHtml}</div>
        </div>
        ` : ""}

        <!-- Section 3 -->
        ${archRows ? `
        <div class="section page-break">
            <h3 class="section-title">3. Arquitectura del Ecosistema</h3>
            <table>
                <thead>
                    <tr>
                        <th>Componente</th>
                        <th>Función en el Sistema</th>
                    </tr>
                </thead>
                <tbody>
                    ${archRows}
                </tbody>
            </table>
        </div>
        ` : ""}

        <!-- Section 4 -->
        ${phasesHtml ? `
        <div class="section page-break">
            <h3 class="section-title">4. Fases de Implementación e Inversión</h3>
            <div>${phasesHtml}</div>
        </div>
        ` : ""}

        <!-- Section 5 -->
        <div class="section">
            <h3 class="section-title">5. Resumen Comercial</h3>
            <table class="summary-table">
                <thead>
                    <tr>
                        <th>Concepto / Fase</th>
                        <th style="text-align: right;">Inversión (${escapeHTML(currency)})</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="padding:12px;border-bottom:1px solid #e5e7eb;font-weight:bold;">TOTAL PROYECTO CORE (Fases de Implementación)</td>
                        <td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:bold;color:#af88ff;font-size:15px;">${formatCurrency(cot.totalProyectoCore, currency)}</td>
                    </tr>
                    ${cot.moduloOpcionalFee > 0 ? `
                    <tr>
                        <td style="padding:12px;border-bottom:1px solid #e5e7eb;font-weight:500;">Módulo Opcional Outbound (Adicional)</td>
                        <td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:500;font-size:14px;">+${formatCurrency(cot.moduloOpcionalFee, currency)}</td>
                    </tr>
                    ` : ""}
                    <tr style="background:#f8fafc;">
                        <td style="padding:12px;border-bottom:2px solid #0b111b;font-weight:bold;">
                            Soporte, Mantenimiento y Operación Continua (Mensual)
                            <span class="fee-includes"><strong>Incluye:</strong> ${escapeHTML(cot.feeMensualIncluye || "Infraestructura y monitoreo")}</span>
                        </td>
                        <td style="padding:12px;border-bottom:2px solid #0b111b;text-align:right;font-weight:bold;color:#22c55e;font-size:15px;">
                            ${formatCurrency(cot.feeMensual, currency)} <span style="font-size:10px;color:#6b7280;">/mes</span>
                        </td>
                    </tr>
                </tbody>
            </table>
            ${cot.observaciones ? `<p style="font-size:12px;color:#4b5563;margin-top:12px;"><strong>Notas:</strong> ${escapeHTML(cot.observaciones)}</p>` : ""}
        </div>

        <!-- Section 6 -->
        ${checklistHtml ? `
        <div class="section page-break">
            <h3 class="section-title">6. Checklist de Inicio para el Cliente</h3>
            <p style="font-size:13px;color:#4b5563;margin-bottom:12px;">Pasos requeridos por parte del cliente para iniciar el proyecto:</p>
            <ul style="padding-left: 4px;">
                ${checklistHtml}
            </ul>
        </div>
        ` : ""}
    </div>

    <div class="footer">
        © 2026 Make It Easy — Intelligent Automation. Todos los derechos reservados.
    </div>

    <script>
        window.onload = function() { window.print(); };
    </script>
</body>
</html>`;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
    }
}
