import type { AuditReport } from "./audit/types";
import type { RadarPackage } from "./packages";
import { formatEur } from "./packages";
import type { RadarBusiness } from "./types";

function esc(value: string): string {
  return String(value).replace(/[&<>"']/g, (m) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m] || m)
  );
}

function scoreTone(score: number): string {
  if (score >= 75) return "#16a34a";
  if (score >= 50) return "#d97706";
  return "#dc2626";
}

export interface ReportOptions {
  business: RadarBusiness;
  report: AuditReport;
  pkg: RadarPackage;
  addOns: RadarPackage[];
  sellerName?: string;
}

export function buildAuditReportHtml({ business, report, pkg, addOns, sellerName }: ReportOptions): string {
  const today = new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
  const fails = report.checks.filter((c) => c.status === "fail").slice(0, 10);
  const warns = report.checks.filter((c) => c.status === "warn").slice(0, 6);
  const addOnTotal = addOns.reduce((sum, p) => sum + p.fromEur, 0);

  const areaRows = report.areas
    .map(
      (a) => `<tr>
        <td>${esc(a.label)}</td>
        <td class="num" style="color:${scoreTone(a.score ?? 0)};font-weight:700">${a.score ?? "—"}</td>
        <td class="num">${a.pass}</td>
        <td class="num">${a.warn}</td>
        <td class="num" style="color:#dc2626">${a.fail}</td>
      </tr>`
    )
    .join("");

  const findingRows = [...fails, ...warns]
    .map(
      (c) => `<tr>
        <td><span class="tag ${c.status}">${c.status === "fail" ? "FALLO" : "AVISO"}</span></td>
        <td><strong>${esc(c.label)}</strong><br><span class="muted">${esc(c.evidence)}</span></td>
        <td class="muted">${esc(c.fix)}</td>
      </tr>`
    )
    .join("");

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Informe SEO · ${esc(business.name)}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:"Segoe UI",Arial,sans-serif;color:#0f172a;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .page{max-width:820px;margin:0 auto;padding:32px 36px}
  .head{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #0e7490;padding-bottom:14px;margin-bottom:26px}
  .brand{font-size:22px;font-weight:800;letter-spacing:-.5px}
  .brand span{color:#0e7490}
  .head small{color:#64748b}
  h1{font-size:26px;letter-spacing:-.5px;margin-bottom:4px}
  h2{font-size:15px;margin:26px 0 8px;color:#0e7490;text-transform:uppercase;letter-spacing:.08em}
  .lead{color:#475569;font-size:13px;line-height:1.5}
  .scores{display:flex;gap:14px;margin:18px 0}
  .score{flex:1;border:1px solid #e2e8f0;border-radius:12px;padding:14px}
  .score .k{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#64748b}
  .score .v{font-size:30px;font-weight:800;line-height:1.1}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th{text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#64748b;border-bottom:1px solid #e2e8f0;padding:6px 4px}
  td{padding:6px 4px;border-bottom:1px solid #f1f5f9;vertical-align:top}
  td.num{text-align:right;font-variant-numeric:tabular-nums}
  .tag{font-size:9px;font-weight:800;padding:2px 6px;border-radius:6px;white-space:nowrap}
  .tag.fail{background:#fee2e2;color:#b91c1c}
  .tag.warn{background:#fef3c7;color:#92400e}
  .muted{color:#64748b}
  .box{border:1px solid #e2e8f0;border-radius:12px;padding:14px;background:#f8fafc}
  .price{font-size:24px;font-weight:800;color:#0e7490}
  ul{padding-left:18px}
  li{margin:4px 0;font-size:12px;color:#334155}
  .foot{margin-top:30px;border-top:1px solid #e2e8f0;padding-top:12px;font-size:10px;color:#64748b;display:flex;justify-content:space-between}
  .pill{display:inline-block;background:#ecfeff;color:#0e7490;border:1px solid #a5f3fc;border-radius:999px;padding:3px 10px;font-size:11px;font-weight:700}
  @media print{ .page{padding:0} .no-print{display:none} }
</style>
</head>
<body>
<div class="page">
  <div class="head">
    <div>
      <div class="brand">make it <span>easy</span></div>
      <small>Intelligent Automation · makeiteasycol.com</small>
    </div>
    <small>${today}</small>
  </div>

  <h1>Informe de auditoría SEO</h1>
  <p class="lead"><strong>${esc(business.name)}</strong> · ${esc(business.category)}<br>
  ${esc(business.address || "")}${business.phone ? ` · ${esc(business.phone)}` : ""}<br>
  ${esc(report.url)}</p>

  <div class="scores">
    <div class="score"><div class="k">Nota actual</div><div class="v" style="color:${scoreTone(report.globalScore)}">${report.globalScore}<span style="font-size:14px;color:#94a3b8">/100</span></div></div>
    <div class="score"><div class="k">Potencial</div><div class="v" style="color:#0e7490">${report.potentialScore}<span style="font-size:14px;color:#94a3b8">/100</span></div></div>
    <div class="score"><div class="k">Comprobaciones</div><div class="v">${report.checks.length}</div></div>
  </div>

  <h2>Resumen ejecutivo</h2>
  <p class="lead">${
    report.critical.length
      ? `Los tres puntos que más frenan la captación ahora mismo: <strong>${report.critical.map(esc).join(", ")}</strong>.`
      : "La base técnica está bien; el margen está en conversión y contenido."
  } Corregirlo puede llevar la nota de <strong>${report.globalScore}</strong> a <strong>${report.potentialScore}/100</strong>.</p>

  <h2>Notas por área</h2>
  <table>
    <thead><tr><th>Área</th><th class="num">Nota</th><th class="num">OK</th><th class="num">Avisos</th><th class="num">Fallos</th></tr></thead>
    <tbody>${areaRows}</tbody>
  </table>

  <h2>Hallazgos</h2>
  <table>
    <thead><tr><th></th><th>Comprobación</th><th>Cómo se arregla</th></tr></thead>
    <tbody>${findingRows || '<tr><td colspan="3" class="muted">Sin hallazgos relevantes.</td></tr>'}</tbody>
  </table>

  <h2>Plan de acción</h2>
  <div class="box">
    <ul>
      <li><strong>0-30 días:</strong> ${esc(report.quickWins[0] || "Corregir los fallos críticos de indexación y conversión.")}</li>
      <li><strong>30-60 días:</strong> ${esc(report.quickWins[1] || "Optimizar contenido y datos estructurados.")}</li>
      <li><strong>60-90 días:</strong> medir posiciones y conversiones, y ajustar la propuesta.</li>
    </ul>
  </div>

  <h2>Propuesta</h2>
  <div class="box">
    <span class="pill">${esc(pkg.label)}</span>
    <p class="lead" style="margin-top:8px">${esc(pkg.pitch)}</p>
    <ul>${pkg.services.map((s) => `<li>${esc(s.name)} — desde ${formatEur(s.fromEur)}</li>`).join("")}</ul>
    ${addOns.length ? `<p class="lead" style="margin-top:8px"><strong>Opcional:</strong> ${addOns.map((a) => `${esc(a.label)} (desde ${formatEur(a.fromEur)})`).join(" · ")}</p>` : ""}
    <p style="margin-top:10px"><span class="price">Desde ${formatEur(pkg.fromEur + addOnTotal)}</span> <span class="muted">+ IVA · presupuesto cerrado tras diagnóstico</span></p>
  </div>

  <div class="foot">
    <span>${esc(sellerName || "Make it Easy")} · makeiteasycol.com · +57 318 115 4477</span>
    <span>Informe confidencial · ${today}</span>
  </div>
</div>
<script>window.onload = function(){ setTimeout(function(){ window.print(); }, 350); };</script>
</body>
</html>`;
}

export function printAuditReport(options: ReportOptions): void {
  const html = buildAuditReportHtml(options);
  const win = window.open("", "_blank", "width=880,height=980");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
}
