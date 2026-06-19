import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const targetCurrency = searchParams.get("currency") || "COP"; // Moneda en la que se consolidará el reporte

    // 1. Obtener todos los ingresos completados
    const ingresos = await prisma.ingreso.findMany({
      where: { estado: "COMPLETADO" },
      include: {
        proyecto: { select: { titulo: true } }
      }
    });

    // 2. Obtener todos los gastos pagados
    const gastos = await prisma.gasto.findMany({
      where: { estado: "PAGADO" }
    });

    // Agruparemos por "YYYY-MM"
    const resumen: Record<string, { totalIngresos: number, totalGastos: number, totalNomina: number, rentabilidad: number }> = {};

    let totalGlobalIngresos = 0;
    let totalGlobalGastos = 0;
    let totalGlobalNomina = 0;

    // Procesar ingresos
    ingresos.forEach(ingreso => {
      const month = ingreso.fecha.toISOString().substring(0, 7); // "YYYY-MM"
      if (!resumen[month]) resumen[month] = { totalIngresos: 0, totalGastos: 0, totalNomina: 0, rentabilidad: 0 };

      // Convertir a COP usando la TRM histórica guardada en el ingreso
      // Si el targetCurrency es USD, luego convertiremos el consolidado
      let valorEnCop = ingreso.moneda === "COP" ? ingreso.monto : ingreso.monto * ingreso.trm;
      
      // Si la moneda destino solicitada es diferente a COP, hacemos una conversión aproximada
      // (Para un reporte exacto en USD, idealmente se usaría la TRM del día actual, aquí dividiremos por una TRM base si se pide en USD)
      let valorAportado = valorEnCop;
      if (targetCurrency === "USD") valorAportado = valorEnCop / 4000; // Valor harcodeado como fallback, idealmente se pasaría la TRM actual
      if (targetCurrency === "EUR") valorAportado = valorEnCop / 4300;

      resumen[month].totalIngresos += valorAportado;
      totalGlobalIngresos += valorAportado;
    });

    // Procesar gastos (asumimos que los gastos locales están en COP, si hay USD usamos un factor)
    gastos.forEach(gasto => {
      const month = gasto.fecha.toISOString().substring(0, 7); // "YYYY-MM"
      if (!resumen[month]) resumen[month] = { totalIngresos: 0, totalGastos: 0, totalNomina: 0, rentabilidad: 0 };

      let valorEnCop = gasto.moneda === "COP" ? gasto.monto : gasto.monto * 4000; // Asumiendo TRM 4000 para gastos históricos en USD
      
      let valorAportado = valorEnCop;
      if (targetCurrency === "USD") valorAportado = valorEnCop / 4000;
      if (targetCurrency === "EUR") valorAportado = valorEnCop / 4300;

      resumen[month].totalGastos += valorAportado;
      totalGlobalGastos += valorAportado;

      if (gasto.categoria === "NOMINA") {
        resumen[month].totalNomina += valorAportado;
        totalGlobalNomina += valorAportado;
      }
    });

    // Calcular rentabilidad por mes
    Object.keys(resumen).forEach(month => {
      resumen[month].rentabilidad = resumen[month].totalIngresos - resumen[month].totalGastos;
    });

    const data = {
      targetCurrency,
      totalGlobalIngresos,
      totalGlobalGastos,
      totalGlobalNomina,
      rentabilidadGlobal: totalGlobalIngresos - totalGlobalGastos,
      mensual: resumen
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error generating report:", error);
    return NextResponse.json({ error: "Error al generar reporte financiero" }, { status: 500 });
  }
}
