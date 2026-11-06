import type { RadarBusiness, RadarLead } from "./types";

export function normalizePhone(phone: string | null | undefined): string {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("57") && digits.length >= 11) return digits;
  if (digits.startsWith("34") && digits.length >= 11) return digits;
  if (digits.length === 10 && digits.startsWith("3")) return `57${digits}`;
  if (digits.length === 7) return `57${digits}`;
  return digits;
}

export function whatsappUrl(phone: string | null | undefined, message: string): string | null {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export function buildIntroMessage(business: RadarBusiness, sellerName?: string): string {
  const who = sellerName?.trim() || "el equipo de Make it Easy";
  const city = business.address.split("·").pop()?.trim() || "";
  const place = city ? ` en ${city}` : "";
  return `Hola, soy ${who}. Vi ${business.name}${place} y quería comentarte algo sobre su presencia online. ¿Te va bien si te cuento en 2 minutos?`;
}

export function mapsRouteUrl(addresses: Array<string | null | undefined>): string | null {
  const stops = addresses
    .map((a) => (a || "").trim())
    .filter(Boolean)
    .slice(0, 10);

  if (stops.length === 0) return null;
  if (stops.length === 1) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(stops[0])}`;
  }

  const destination = stops[stops.length - 1];
  const waypoints = stops.slice(0, -1).join("|");
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    destination
  )}&waypoints=${encodeURIComponent(waypoints)}&travelmode=driving`;
}

function esc(value: string): string {
  return String(value).replace(/[&<>"']/g, (m) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m] || m)
  );
}

export type VisitSheetItem = RadarLead;

export function buildVisitSheetHtml(items: VisitSheetItem[], sellerName?: string): string {
  const today = new Date().toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const rows = items
    .map(
      (lead, index) => {
        const business = lead.business;
        return `
      <section class="card">
        <div class="top">
          <div>
            <h2>${index + 1}. ${esc(business.name)}</h2>
            <p class="muted">${esc(business.category)} · ${esc(business.address || "sin dirección")}</p>
          </div>
          <span class="score">${business.score}/100</span>
        </div>
        <p class="line"><strong>Teléfono:</strong> ${esc(business.phone || "no disponible")}</p>
        <p class="line"><strong>Web:</strong> ${esc(business.website || "sin web propia")}</p>
        ${lead.notes ? `<p class="line"><strong>Notas:</strong> ${esc(lead.notes)}</p>` : ""}
        <div class="check">
          <span>☐ Llamar</span><span>☐ Visitar</span><span>☐ Revisar web</span><span>☐ Propuesta</span><span>☐ Seguimiento</span>
        </div>
      </section>`;
      }
    )
    .join("");

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Hoja de visitas · ${today}</title>
<style>
  *{box-sizing:border-box} body{font-family:"Segoe UI",Arial,sans-serif;color:#111;margin:28px}
  h1{font-size:20px;margin:0 0 2px} .sub{color:#555;font-size:12px;margin-bottom:18px}
  .card{border:1px solid #ddd;border-radius:10px;padding:12px 14px;margin-bottom:12px;page-break-inside:avoid}
  .top{display:flex;justify-content:space-between;gap:12px;align-items:start}
  h2{font-size:15px;margin:0} .muted{color:#666;font-size:11px;margin:2px 0 0}
  .score{font-weight:800;color:#0e7490;font-size:14px}
  .line{font-size:12px;margin:6px 0 0}
  .check{display:flex;flex-wrap:wrap;gap:14px;margin-top:10px;font-size:12px;color:#333;border-top:1px dashed #ddd;padding-top:8px}
  @media print{ body{margin:0} .card{break-inside:avoid} }
</style>
</head>
<body>
  <h1>Hoja de visitas</h1>
  <p class="sub">${today} · ${esc(sellerName || "Make it Easy")} · ${items.length} negocio(s)</p>
  ${rows}
  <script>window.onload=function(){setTimeout(function(){window.print()},300)}</script>
</body>
</html>`;
}

export function printVisitSheet(items: VisitSheetItem[], sellerName?: string): void {
  const win = window.open("", "_blank", "width=820,height=980");
  if (!win) return;
  win.document.write(buildVisitSheetHtml(items, sellerName));
  win.document.close();
  win.focus();
}
