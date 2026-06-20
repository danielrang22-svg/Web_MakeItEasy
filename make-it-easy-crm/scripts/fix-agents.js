const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function run() {
  const all = await p.agent.findMany({ orderBy: { fechaCreacion: 'asc' } });
  console.log('\nAgentes actuales:');
  all.forEach(function(a) {
    console.log(' -', a.nombre, '| activo:', a.activo, '| id:', a.id);
  });

  // Desactivar TODOS los agentes
  await p.agent.updateMany({ data: { activo: false } });
  console.log('\nTodos desactivados.');

  // Activar SOLO el Agente Comercial
  const comercial = all.find(function(a) { return a.nombre === 'Agente Comercial \u2014 Make It Easy'; });
  if (comercial) {
    await p.agent.update({ where: { id: comercial.id }, data: { activo: true } });
    console.log('Agente Comercial activado:', comercial.id);
  } else {
    console.log('WARN: No encontre el Agente Comercial por nombre exacto');
    // Activar el mas reciente que tenga ese patron
    const ultimo = all[all.length - 2]; // El antepenultimo es el Comercial (penultimo creado)
    if (ultimo) {
      await p.agent.update({ where: { id: ultimo.id }, data: { activo: true } });
      console.log('Activado por posicion:', ultimo.nombre);
    }
  }

  const final = await p.agent.findMany({ orderBy: { fechaCreacion: 'asc' } });
  console.log('\nEstado final de agentes:');
  final.forEach(function(a) {
    var icon = a.activo ? '[ACTIVO]' : '[inactivo]';
    console.log(' ', icon, a.nombre);
  });
}

run()
  .catch(function(e) { console.error(e); })
  .finally(function() { return p.$disconnect(); });
