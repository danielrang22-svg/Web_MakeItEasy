import { formatCurrency } from "@/lib/constants";

interface ContractTemplateData {
  codigo: string;
  empresaNombre: string;
  contactoNombre: string;
  tituloPropuesta: string;
  totalProyectoCore: number;
  feeMensual: number;
  feeMensualIncluye?: string | null;
  moneda: string;
  trmAplicada: number;
  condicionesPago?: string | null;
  fasesJson?: string | null;
}

export function generateStandardContract(data: ContractTemplateData): string {
  let phasesText = "";
  try {
    if (data.fasesJson) {
      const fases = JSON.parse(data.fasesJson);
      if (Array.isArray(fases) && fases.length > 0) {
        phasesText = fases.map((f: any, idx: number) => {
          return `${idx + 1}. **${f.nombre || f.titulo || 'Fase'}**\n   - Descripción: ${f.descripcion || 'Sin descripción'}\n   - Valor/Porcentaje: ${f.costo || f.precio || ''}`;
        }).join("\n\n");
      }
    }
  } catch (e) {
    console.error("Error parsing fasesJson for contract:", e);
  }

  if (!phasesText) {
    phasesText = "Detalles de fases según propuesta adjunta.";
  }

  const trmText = data.moneda === "USD" && data.trmAplicada > 1 
    ? `(TRM aplicada de conversión: ${formatCurrency(data.trmAplicada, "COP")} por USD)`
    : "";

  const totalFormatted = formatCurrency(data.totalProyectoCore, data.moneda);
  const supportFormatted = formatCurrency(data.feeMensual, data.moneda);

  return `
# CONTRATO DE PRESTACIÓN DE SERVICIOS DE DESARROLLO TECNOLÓGICO

Entre los suscritos a saber, por una parte **MAKE IT EASY S.A.S.**, sociedad comercial legalmente constituida, en adelante denominada **EL PROVEEDOR**, y por la otra parte la empresa **${data.empresaNombre.toUpperCase()}**, representada por **${data.contactoNombre}**, quien para efectos del presente contrato se denominará **EL CLIENTE**, se ha convenido celebrar el presente contrato de prestación de servicios tecnológicos, el cual se regirá por las siguientes cláusulas:

---

### CLÁUSULA PRIMERA: OBJETO DEL CONTRATO
**EL PROVEEDOR** se obliga a prestar a **EL CLIENTE** los servicios de consultoría, diseño, desarrollo e implementación tecnológica descritos en la propuesta comercial vinculada a la cotización **${data.codigo}**, titulada:
**"${data.tituloPropuesta}"**

#### DESCRIPCIÓN DE LAS FASES DEL PROYECTO:
${phasesText}

---

### CLÁUSULA SEGUNDA: VALOR Y FORMA DE PAGO
El valor total por la ejecución de los servicios core del proyecto es de **${totalFormatted}** ${data.moneda} ${trmText}.

**Condiciones y plazos de pago pactados:**
${data.condicionesPago || "Por definir en el plan de trabajo del proyecto."}

Cualquier servicio adicional, módulo opcional o requerimiento que no esté contemplado explícitamente en el objeto del contrato será facturado por separado previo acuerdo entre las partes.

---

### CLÁUSULA TERCERA: SOPORTE Y MANTENIMIENTO (MENSUALIDAD)
Una vez entregado y puesto en marcha el proyecto core, **EL CLIENTE** pagará un fee mensual de **${supportFormatted}** ${data.moneda} en concepto de soporte y mantenimiento preventivo y correctivo.
Este soporte incluye:
* ${data.feeMensualIncluye || "Soporte preventivo y correctivo según ANS estándar de Make It Easy."}

---

### CLÁUSULA CUARTA: PROPIEDAD INTELECTUAL Y CONFIDENCIALIDAD
1. **Propiedad Intelectual:** Los derechos patrimoniales de propiedad intelectual del software desarrollado se transferirán a **EL CLIENTE** única y exclusivamente cuando se haya liquidado y pagado la totalidad del valor estipulado en la Cláusula Segunda de este contrato.
2. **Confidencialidad:** Ambas partes se comprometen a guardar absoluta reserva y estricta confidencialidad sobre cualquier información comercial, técnica, operativa, estratégica o de datos personales que conozcan en ejecución de este contrato.

---

### CLÁUSULA QUINTA: VIGENCIA Y TERMINACIÓN
La vigencia de este contrato iniciará a partir de la firma digital del mismo y se mantendrá hasta la entrega formal de los entregables acordados y la liquidación del proyecto. Las obligaciones de soporte y mantenimiento se renovarán automáticamente de forma mensual a menos que alguna de las partes notifique su terminación con un preaviso mínimo de treinta (30) días.

---

### CLÁUSULA SEXTA: FIRMAS Y ACEPTACIÓN DIGITAL
Las partes aceptan que el presente contrato se suscribe mediante el uso de firma electrónica simple en la plataforma interna del CRM de Make It Easy, vinculando la dirección IP, el nombre, identificación y fecha como constancia de aceptación del contenido del mismo para todos los efectos legales aplicables.
`.trim();
}
