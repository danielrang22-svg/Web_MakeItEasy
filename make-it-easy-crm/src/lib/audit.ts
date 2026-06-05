export function auditLog(action: string, resourceId: string, userEmail: string = "System") {
    // Estas líneas saldrán interceptadas en consola y serán recogidas por PM2 logs en el VPS (pm2 logs mie-crm).
    const timestamp = new Date().toISOString();
    console.log(`[AUDIT] ${timestamp} | User: ${userEmail} | Action: ${action.toUpperCase()} | Target: ${resourceId}`);
}
