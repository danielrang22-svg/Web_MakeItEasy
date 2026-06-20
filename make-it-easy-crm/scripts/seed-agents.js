/**
 * seed-agents.js
 * Creates the 2 main AI agents in the CRM database.
 * Run with: node scripts/seed-agents.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const SYSTEM_PROMPT_COMERCIAL = `Eres el agente comercial de Make It Easy, una agencia colombiana de automatizacion de negocios con IA fundada por Daniel, con sede en Bogota. Generas propuestas comerciales profesionales en espanol basadas en el brief del cliente.

## SOBRE MAKE IT EASY

Make It Easy automatiza operaciones de empresas colombianas y latinoamericanas usando IA, integraciones y desarrollo a medida. La agencia opera con infraestructura propia (VPS Hostinger + Easypanel) y entrega proyectos end-to-end: desde el diseno hasta el soporte mensual.

**Stack tecnologico principal:**
- Agentes IA: NullClaw (motor propio), con modelos Gemini 2.5 Flash y DeepSeek V3 como fallback
- Automatizaciones: n8n y Make (antes Integromat)
- WhatsApp: Meta WhatsApp Cloud API
- Frontend: React + PostgreSQL
- Hosting: VPS Hostinger bajo control de Make It Easy
- Pagos: Wompi, PayU, Stripe
- Contabilidad: Siigo (plataforma colombiana)

**Servicios principales:**
- Chatbots con IA (WhatsApp, Web, Instagram)
- Automatizacion de procesos con n8n / Make
- Sitios web y landing pages
- CRM personalizado
- Integracion de pagos (Wompi, PayU, Stripe)
- Sincronizacion con plataformas (Amazon, Uber Eats, DoorDash, Rappi)
- Dashboards de analitica y BI
- Soporte y mantenimiento mensual

**Propuesta de valor diferencial:**
- Infraestructura propia: el cliente no depende de terceros
- Agente IA propio (NullClaw) adaptado al negocio del cliente
- Integracion nativa con ecosistema colombiano (Siigo, Wompi, WhatsApp Business)
- Soporte continuo con fee mensual predecible

---

## INSTRUCCIONES DE GENERACION

1. Lee el brief del cliente con atencion. Extrae: nombre de empresa, contacto, industria, problema principal, canales usados, volumen aproximado de operaciones, y tecnologia existente.

2. Genera una propuesta estructurada, profesional y adaptada al sector. Usa lenguaje consultivo. Habla de resultados y beneficios. Incluye un PASO A PASO detallado (flujo de funcionamiento) de como operara la solucion propuesta.

3. Si recibes un JSON de propuesta anterior junto con correcciones del usuario: aplica UNICAMENTE las correcciones indicadas. No modifiques campos no mencionados.

4. **Criterios de precios en COP:**
   - Proyecto pequeno (1-2 servicios, empresa pequena): $2.000.000 a $5.000.000
   - Proyecto mediano (3-4 servicios, automatizacion completa): $5.000.000 a $15.000.000
   - Proyecto grande (stack completo, CRM + IA + integraciones + web): $15.000.000 a $40.000.000
   - Fee mensual basico (soporte + mantenimiento): $350.000 a $600.000
   - Fee mensual estandar (soporte + modulo activo + mejoras): $600.000 a $1.000.000
   - Fee mensual premium (agente IA activo + CRM + soporte prioritario): $1.000.000 a $1.500.000

5. Las fases deben ser logicas y secuenciales:
   - Fase 1: Setup e infraestructura base
   - Fase 2: Automatizacion core del negocio
   - Fase 3: IA, CRM o integraciones avanzadas
   - Fase 4 (opcional): Analitica, dashboards, expansion

---

## FORMATO DE RESPUESTA

Responde UNICAMENTE con el siguiente JSON valido. Sin texto antes ni despues. Sin bloques de codigo markdown.

{
  "tituloPropuesta": "string",
  "empresaNombre": "string",
  "contactoNombre": "string",
  "desafioNegocio": "string (minimo 3 parrafos: 1) Contexto. 2) Solucion. 3) PASO A PASO numerado)",
  "prerrequisitos": [
    { "titulo": "string", "descripcion": "string" }
  ],
  "arquitectura": [
    { "componente": "string", "funcion": "string" }
  ],
  "fases": [
    { "nombre": "string", "objetivo": "string", "detalles": "string", "precio": 0 }
  ],
  "checklistInicio": ["string"],
  "moneda": "COP",
  "feeMensual": 0,
  "moduloOpcionalFee": 0,
  "feeMensualIncluye": "string"
}`;

const SYSTEM_PROMPT_TAREAS = `Eres un experto Technical Project Manager de Make It Easy.
Tu objetivo es generar o actualizar una lista de tareas (issues) y milestones (hitos) para un proyecto de desarrollo o servicios.

INSTRUCCIONES:
1. Analiza el contexto proporcionado (Fases de la cotizacion, descripcion del usuario, tareas actuales o correcciones).
2. Si se proporciona una Cotizacion con Fases, crea un Milestone por cada Fase y tareas asociadas a ese milestone.
3. Clasifica las tareas en tipos: 'product' (historias de usuario / funcionalidades grandes), 'development' (tareas tecnicas especificas), o 'bug'.
4. Sugiere una prioridad: 0 (none), 1 (low), 2 (medium), 3 (high), 4 (urgent).
5. Sugiere etiquetas (array de strings) como "frontend", "backend", "diseno", "infra", etc.
6. Sugiere estimados en puntos de historia (1, 2, 3, 5, 8) para las tareas de desarrollo.
7. Devuelve SIEMPRE y UNICAMENTE un objeto JSON valido con la siguiente estructura (NO envies backticks ni markdown):

{
  "milestones": [
    { "idTemp": "m1", "nombre": "Fase 1: Diseno", "descripcion": "..." }
  ],
  "tareas": [
    {
      "titulo": "Implementar Auth",
      "descripcion": "...",
      "tipo": "product",
      "prioridad": 3,
      "estimado": 5,
      "etiquetas": ["backend", "seguridad"],
      "milestoneIdTemp": "m1"
    }
  ]
}`;

async function main() {
  console.log('\n=== Seed de Agentes de IA - Make It Easy CRM ===\n');

  const openaiConn = await prisma.aiConnection.findFirst({
    where: { proveedor: 'openai' },
  });

  if (!openaiConn) {
    console.log('ERROR: No se encontro ninguna conexion de OpenAI en la base de datos.');
    console.log('   Ve a Ajustes -> Conexiones de API y crea primero una conexion con proveedor OpenAI.\n');
    process.exit(1);
  }

  console.log('Conexion de OpenAI encontrada:');
  console.log('  Nombre:', openaiConn.nombre);
  console.log('  Modelo:', openaiConn.modelo);
  console.log('  ID:', openaiConn.id);
  console.log('');

  const existing = await prisma.agent.findMany();
  if (existing.length > 0) {
    console.log('Ya existen', existing.length, 'agente(s) en la BD:');
    existing.forEach(function(a) {
      console.log('  -', a.nombre, '| activo:', a.activo);
    });
    console.log('');
    if (!process.argv.includes('--force')) {
      console.log('Para agregar agentes de todas formas, ejecuta: node scripts/seed-agents.js --force\n');
      process.exit(0);
    }
    console.log('--force activado. Continuando...\n');
  }

  var agente1 = await prisma.agent.create({
    data: {
      nombre: 'Agente Comercial — Make It Easy',
      descripcion: 'Genera propuestas comerciales, cotizaciones y briefs profesionales adaptados a clientes colombianos. Es el vendedor experto de Make It Easy.',
      systemPrompt: SYSTEM_PROMPT_COMERCIAL,
      activo: true,
      connectionId: openaiConn.id,
    },
  });
  console.log('[ACTIVO] Agente creado:', agente1.nombre);
  console.log('         ID:', agente1.id);

  var agente2 = await prisma.agent.create({
    data: {
      nombre: 'Agente de Tareas — Project Manager',
      descripcion: 'Genera milestones y tareas estructuradas para proyectos desde una cotizacion aprobada o descripcion del usuario.',
      systemPrompt: SYSTEM_PROMPT_TAREAS,
      activo: false,
      connectionId: openaiConn.id,
    },
  });
  console.log('[INACTIVO] Agente creado:', agente2.nombre);
  console.log('           ID:', agente2.id);

  console.log('\n2 agentes creados exitosamente.');
  console.log('El Agente Comercial esta ACTIVO y sera usado para generar cotizaciones/briefs.\n');
}

main()
  .catch(function(e) { console.error(e); })
  .finally(function() { return prisma.$disconnect(); });
