/** Fase 4 — el versículo del día y el devocional. */
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';

const URL = 'http://localhost:8123';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const c = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'America/Guatemala' });
const p = await c.newPage();
const fallos = [];
p.on('pageerror', (e) => fallos.push('PAGE ' + e.message));

await p.goto(URL, { waitUntil: 'networkidle' });
await p.waitForTimeout(1700);
await p.getByText('Empezar').click(); await p.waitForTimeout(700);
await p.getByLabel('Tu nombre').fill('Leonora');
for (let i = 0; i < 4; i++) { await p.getByText('Siguiente').click(); await p.waitForTimeout(400); }
await p.getByText('Armar mi semana').click(); await p.waitForTimeout(900);
await p.getByText('Me gusta, empezar').click(); await p.waitForTimeout(1800);

// 1. El versículo, arriba en Hoy
const tarjeta = p.getByRole('button', { name: /Versículo del día/ });
assert.ok(await tarjeta.count(), 'no sale el versículo en Hoy');
const enHoy = await tarjeta.innerText();
assert.ok(enHoy.includes('VERSÍCULO DE HOY'));
assert.match(enHoy, /«.+»/, 'el versículo sale sin comillas ni texto');
await p.screenshot({ path: 'capturas/fase4-hoy.png', fullPage: true });
console.log('✓ el versículo del día sale arriba en Hoy');

// 2. Su pantalla completa
await tarjeta.click();
await p.waitForTimeout(1300);
const pantalla = await p.locator('body').innerText();
assert.ok(pantalla.includes('GraceDay'), 'la lámina no lleva la marca');
assert.ok(pantalla.includes('RV1909'), 'no dice en qué versión está');
assert.ok(pantalla.includes('Compartir'), 'no hay botón de compartir');
assert.ok(pantalla.includes('derechos de autor'),
  'no explica por qué solo hay una versión');
assert.ok(await p.getByRole('button', { name: 'Volver' }).count(), 'no se puede volver');
await p.screenshot({ path: 'capturas/fase4-versiculo.png', fullPage: true });
console.log('✓ la pantalla del versículo: lámina, versión, compartir y la nota de derechos');

await p.getByRole('button', { name: 'Volver' }).click();
await p.waitForTimeout(1200);

// 3. El devocional dentro de la tarea de fe
await p.getByRole('button', { name: /Devocional, / }).first().click();
await p.waitForTimeout(900);
// Desde que se puede hacer el devocional a tu manera, el texto de la app sale
// cuando eliges hacerlo con la app. Es lo que se está probando aquí.
await p.getByText('El de GraceDay').click();
await p.waitForTimeout(600);
const detalle = await p.locator('body').innerText();
assert.ok(detalle.includes('DEVOCIONAL DE HOY'), 'la tarea de fe no trae devocional');
assert.ok(detalle.includes('PARA PENSAR'), 'el devocional no trae pregunta');
assert.ok(detalle.includes('Tu respuesta'), 'en fe la nota debería llamarse «Tu respuesta»');
assert.ok(/\?/.test(detalle), 'la pregunta no es una pregunta');
await p.screenshot({ path: 'capturas/fase4-devocional.png', fullPage: true });
console.log('✓ la tarea de fe abre con su devocional: pasaje, texto y pregunta');

// 4. Y la respuesta se guarda
await p.getByLabel('Tu respuesta').fill('Necesito, no quiero. Eso me hizo pensar.');
await p.getByText('Guardar', { exact: true }).click();
await p.waitForTimeout(900);
assert.ok((await p.locator('body').innerText()).includes('📝'), 'no se guardó la respuesta');
console.log('✓ la respuesta a la pregunta se guarda');

// 5. Una tarea que no es de fe no trae devocional
const otra = p.getByRole('button', { name: /Cena, |Dormir, / }).first();
if (await otra.count()) {
  await otra.click();
  await p.waitForTimeout(800);
  const d2 = await p.locator('body').innerText();
  assert.ok(!d2.includes('DEVOCIONAL DE HOY'), 'una tarea que no es de fe trae devocional');
  assert.ok(d2.includes('Tu nota'));
  console.log('✓ una tarea que no es de fe no trae devocional');
}

await b.close();
if (fallos.length) { console.error('FALLOS:\n' + fallos.join('\n')); process.exit(1); }
console.log('\nFase 4 funciona.');
