import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const adminPassword = await bcrypt.hash('makeiteasy-admin-2026', 10);
  const ventasPassword = await bcrypt.hash('makeiteasy-ventas-2026', 10);

  const admin = await prisma.usuario.upsert({
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

  const ventas = await prisma.usuario.upsert({
    where: { email: 'ventas@makeiteasycol.com' },
    update: {},
    create: {
      email: 'ventas@makeiteasycol.com',
      nombre: 'Ventas Make It Easy',
      rol: 'ventas',
      passwordHash: ventasPassword,
      activo: true,
    },
  });

  const teamMembers = [
    { email: 'daniel.makeiteasy@gmail.com', nombre: 'Daniel Rangel', rol: 'admin' },
    { email: 'cristian.makeiteasy@gmail.com', nombre: 'Cristian MakeItEasy', rol: 'ventas' },
    { email: 'luis.makeiteasy@gmail.com', nombre: 'Luis MakeItEasy', rol: 'ventas' },
  ];

  for (const member of teamMembers) {
    await prisma.usuario.upsert({
      where: { email: member.email },
      update: {},
      create: {
        email: member.email,
        nombre: member.nombre,
        rol: member.rol,
        passwordHash: null,
        activo: true,
      },
    });
  }

  // Seed default automation services
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

  console.log('Seed ejecutado satisfactoriamente', { admin, ventas });
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
