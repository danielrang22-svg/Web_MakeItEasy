const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function inspect() {
  console.log("=== INSPECCIONANDO AGENTES E INTEGRACIONES ===");
  try {
    const connections = await prisma.aiConnection.findMany();
    console.log(`\nConexiones de IA registradas (${connections.length}):`);
    connections.forEach(c => {
      console.log(`- ID: ${c.id}`);
      console.log(`  Proveedor: ${c.proveedor}`);
      console.log(`  Modelo: ${c.modelo}`);
      console.log(`  Tiene API Key: ${c.apiKey ? "SÍ (longitud: " + c.apiKey.length + ")" : "NO"}`);
      console.log(`  API Key valor: "${c.apiKey}"`);
      console.log(`  Base URL: ${c.baseUrl}`);
    });

    const agents = await prisma.agent.findMany({ include: { conexion: true } });
    console.log(`\nAgentes registrados (${agents.length}):`);
    agents.forEach(a => {
      console.log(`- Nombre: ${a.nombre}`);
      console.log(`  Activo: ${a.activo}`);
      console.log(`  Conexión asociada: ${a.conexion ? a.conexion.proveedor : "NINGUNA"}`);
    });
  } catch (err) {
    console.error("Error al inspeccionar:", err);
  } finally {
    await prisma.$disconnect();
  }
}

inspect();
