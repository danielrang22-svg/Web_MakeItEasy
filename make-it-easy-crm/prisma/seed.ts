import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // ── Contraseñas predeterminadas (cambiar tras primer ingreso) ──
  const adminPassword    = await bcrypt.hash('MakeItEasy2026!', 10);
  const comercialPassword = await bcrypt.hash('MakeItEasy2026!', 10);

  // ── Daniel Rangel — Admin & Arquitecto de Procesos ──
  await prisma.usuario.upsert({
    where: { email: 'daniel.makeiteasy@gmail.com' },
    update: { passwordHash: adminPassword, rol: 'admin', activo: true },
    create: {
      email: 'daniel.makeiteasy@gmail.com',
      nombre: 'Daniel Rangel López',
      rol: 'admin',
      passwordHash: adminPassword,
      activo: true,
    },
  });

  // ── Cristian Cuéllar — Admin & Desarrollo ──
  await prisma.usuario.upsert({
    where: { email: 'cristian.makeiteasy@gmail.com' },
    update: { passwordHash: adminPassword, rol: 'admin', activo: true },
    create: {
      email: 'cristian.makeiteasy@gmail.com',
      nombre: 'Cristian Cuéllar',
      rol: 'admin',
      passwordHash: adminPassword,
      activo: true,
    },
  });

  // ── Luis Ramírez — Comercial (solo ventas, sin acceso a propuestas técnicas) ──
  await prisma.usuario.upsert({
    where: { email: 'luis.makeiteasy@gmail.com' },
    update: { passwordHash: comercialPassword, rol: 'comercial', activo: true },
    create: {
      email: 'luis.makeiteasy@gmail.com',
      nombre: 'Luis Ramírez',
      rol: 'comercial',
      passwordHash: comercialPassword,
      activo: true,
    },
  });

  // ── Usuario admin genérico de respaldo ──
  await prisma.usuario.upsert({
    where: { email: 'admin@makeiteasycol.com' },
    update: {},
    create: {
      email: 'admin@makeiteasycol.com',
      nombre: 'Administrador Make It Easy',
      rol: 'admin',
      passwordHash: adminPassword,
      activo: true,
    },
  });

  // ── Servicios / Catálogo de Productos por defecto ──
  const defaultServices = [
    { referencia: 'MIE-AGENTE-IA', nombre: 'Agente de IA 🤖', proveedor: 'Make It Easy', costoEstimado: 100000, precioSugerido: 300000, tipo: 'servicio', descripcion: 'Chatbot para WhatsApp Business, asistente web o Instagram' },
    { referencia: 'MIE-WEB', nombre: 'Página Web ✨', proveedor: 'Make It Easy', costoEstimado: 150000, precioSugerido: 500000, tipo: 'servicio', descripcion: 'Sitios web rápidos, modernos y optimizados para conversión' },
    { referencia: 'MIE-AUTO-PROC', nombre: 'Automatización de Procesos ⚡', proveedor: 'Make It Easy', costoEstimado: 250000, precioSugerido: 800000, tipo: 'servicio', descripcion: 'Identificación y automatización de tareas repetitivas' },
    { referencia: 'MIE-CRM-MGMT', nombre: 'CRM & Gestión de Ventas 💼', proveedor: 'Make It Easy', costoEstimado: 200000, precioSugerido: 600000, tipo: 'servicio', descripcion: 'Implementación y automatización de HubSpot, Pipedrive, etc.' },
    { referencia: 'MIE-INTEGRACION', nombre: 'Integraciones de Sistemas 🔗', proveedor: 'Make It Easy', costoEstimado: 150000, precioSugerido: 500000, tipo: 'servicio', descripcion: 'Conexión de apps y ERPs mediante APIs REST/GraphQL' },
    { referencia: 'MIE-DASHBOARD', nombre: 'Dashboards & Reportes 📊', proveedor: 'Make It Easy', costoEstimado: 200000, precioSugerido: 700000, tipo: 'servicio', descripcion: 'Paneles de control visuales y en tiempo real' },
    { referencia: 'MIE-SISTEMA-MEDIDA', nombre: 'Sistemas a la Medida 💻', proveedor: 'Make It Easy', costoEstimado: 350000, precioSugerido: 1000000, tipo: 'servicio', descripcion: 'Desarrollo de software y plataformas personalizadas' },
    { referencia: 'MIE-CAPACITACION', nombre: 'Capacitación en IA 🎓', proveedor: 'Make It Easy', costoEstimado: 100000, precioSugerido: 400000, tipo: 'servicio', descripcion: 'Talleres prácticos sobre herramientas de IA y productividad' }
  ];

  for (const s of defaultServices) {
    await prisma.producto.upsert({
      where: { referencia: s.referencia },
      update: s,
      create: s
    });
  }

  console.log('✅ Seed ejecutado satisfactoriamente');
  console.log('');
  console.log('👥 Usuarios creados:');
  console.log('  📧 daniel.makeiteasy@gmail.com  | Rol: admin      | Pass: MakeItEasy2026!');
  console.log('  📧 cristian.makeiteasy@gmail.com | Rol: admin      | Pass: MakeItEasy2026!');
  console.log('  📧 luis.makeiteasy@gmail.com     | Rol: comercial  | Pass: MakeItEasy2026!');
  console.log('  📧 admin@makeiteasycol.com       | Rol: admin      | Pass: MakeItEasy2026!');
  console.log('');
  console.log('⚠️  IMPORTANTE: Cambia las contraseñas en Ajustes > Usuarios tras el primer login.');
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
