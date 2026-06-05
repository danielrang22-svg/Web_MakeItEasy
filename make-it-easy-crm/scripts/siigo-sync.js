/**
 * Script de sincronización automática Siigo ↔ CRM
 * Se ejecuta como proceso separado con PM2 (cron mode cada 5 min).
 *
 * - Modo INCREMENTAL (cada 5 min): solo trae productos NUEVOS desde la última sync.
 * - Modo COMPLETO (cada 24h automático): trae todo y detecta borrados/inactivaciones.
 *
 * Para correr manualmente: node scripts/siigo-sync.js
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
const CRON_SECRET = process.env.CRON_SECRET || 'mie-internal-cron-key-2024';

async function sync() {
  const now = new Date().toISOString();
  console.log(`[${now}] Iniciando sincronización automática Siigo → CRM (incremental)...`);

  try {
    // Sin full:true → el endpoint decide automáticamente si es incremental o completo
    // (completo si han pasado más de 24h desde el último full sync)
    const res = await fetch(`${BASE_URL}/api/siigo/products/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cron-key': CRON_SECRET,
      },
      body: JSON.stringify({}),
    });

    const data = await res.json();

    if (res.ok) {
      if (data.totalProcessed === 0 && data.imported === 0) {
        console.log(`[${now}] ✅ Sin cambios nuevos en Siigo.`);
      } else {
        console.log(
          `[${now}] ✅ Sync ${data.mode}: ${data.imported} importados, ${data.updated} actualizados, ${data.inactivated ?? 0} inactivados de ${data.totalProcessed} productos procesados.`
        );
      }
    } else {
      console.error(`[${now}] ❌ Error en sincronización:`, data.error);
    }
  } catch (err) {
    console.error(`[${now}] ❌ Error de conexión:`, err.message);
  }
}

sync();
