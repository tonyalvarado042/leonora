/**
 * El recorrido de alguien que acaba de bajar la app: bienvenida, cinco
 * preguntas, la semana propuesta, y su primer día ya armado.
 */
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';

import { fijarElDia, irA } from './arrancar.mjs';

const URL = 'http://localhost:8123';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const c = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'America/Guatemala' });
await fijarElDia(c);
const p = await c.newPage();
const fallos = [];
p.on('pageerror', (e) => fallos.push('PAGE ' + e.message));
const tiro = async (n) => p.screenshot({ path: `capturas/arranque-${n}.png`, fullPage: true });

await p.goto(URL, { waitUntil: 'networkidle' });
await p.waitForTimeout(1800);

// 1. Bienvenida, no un formulario
assert.ok(await p.getByText('GraceDay').count(), 'no salió la bienvenida');
assert.ok(await p.getByText('Te avisa lo que toca').count());
assert.ok(await p.getByText(/Cómo funciona/).count(), 'falta el video');
await tiro('1-bienvenida');
console.log('✓ un usuario nuevo aterriza en la bienvenida, no en un día vacío');

await p.getByText('Empezar').click();
await p.waitForTimeout(900);

// 2. Nombre y edad
assert.ok(await p.getByText('Pregunta 1 de 5').count());
const siguiente = p.getByRole('button', { name: 'Siguiente' });
await p.getByLabel('Tu nombre').fill('Leonora');
await p.getByText('13', { exact: true }).click();
await tiro('2-nombre');
console.log('✓ paso 1: nombre y edad');
await siguiente.click(); await p.waitForTimeout(500);

// 3. Horas
assert.ok(await p.getByText('Pregunta 2 de 5').count());
await p.getByLabel('Hora de 🌙  Me acuesto a las').fill('22');
await p.waitForTimeout(200);
await p.getByLabel('🌙  Me acuesto a las: minuto 30').click();
await p.waitForTimeout(400);
assert.equal(await p.getByLabel('Hora de 🌙  Me acuesto a las').inputValue(), '22');
assert.equal(await p.getByLabel('Minutos de 🌙  Me acuesto a las').inputValue(), '30');
await tiro('3-horas');
console.log('✓ paso 2: horas de despertar y dormir');
await siguiente.click(); await p.waitForTimeout(500);

// 4. Devocional
assert.ok(await p.getByText('Pregunta 3 de 5').count());
await p.getByText('1 hora').click();
await p.getByText('Los dos').click();
await tiro('4-devocional');
console.log('✓ paso 3: una hora de devocional, mañana y noche');
await siguiente.click(); await p.waitForTimeout(500);

// 5. Colegio
assert.ok(await p.getByText('Pregunta 4 de 5').count());
assert.ok(await p.getByRole('button', { name: 'Escanear mi horario' }).count(),
  'falta el botón de escanear el horario');
await p.getByLabel('Hora de Salgo a las').fill('13');
await p.waitForTimeout(400);
assert.equal(await p.getByLabel('Hora de Salgo a las').inputValue(), '13');
assert.equal(await p.getByLabel('Minutos de Salgo a las').inputValue(), '00');
await tiro('5-colegio');
console.log('✓ paso 4: colegio de 08:00 a 13:00, lunes a viernes');
await siguiente.click(); await p.waitForTimeout(500);

// 6. Quehaceres y gustos
assert.ok(await p.getByText('Pregunta 5 de 5').count());
for (const x of ['🛏️ Tender la cama', '🧹 Ordenar el cuarto', '📖 Leer', '🎸 Tocar música']) {
  await p.getByText(x).click();
  await p.waitForTimeout(140);
}
await tiro('6-quehaceres');
console.log('✓ paso 5: dos quehaceres y dos gustos');
await p.getByRole('button', { name: 'Armar mi semana' }).click();
await p.waitForTimeout(900);

// 7. La propuesta
assert.ok(await p.getByText(/Listo, Leonora/).count(), 'no llegó la propuesta');
const resumen = await p.locator('body').innerText();
assert.ok(resumen.includes('60 min de devocional'), 'el resumen no menciona el devocional');
assert.ok(resumen.includes('13:00'), 'el resumen no recoge la hora de salida');
assert.match(resumen, /\d+ cosas · \d+ bloques/);
await tiro('7-propuesta');
console.log('✓ propuesta:', resumen.match(/\d+ cosas · \d+ bloques en la semana/)[0]);

await p.getByText('Me gusta, empezar').click();
await p.waitForTimeout(1800);

// 8. Su primer día
const casillas = await p.getByRole('checkbox').count();
assert.ok(casillas >= 5, `el primer día salió con ${casillas} tareas`);
const hoy = await p.locator('body').innerText();
assert.ok(hoy.includes('Leonora'), 'la app no le llama por su nombre');
assert.ok(hoy.includes('Devocional'), 'el devocional no está en su día');
await tiro('8-primer-dia');
console.log(`✓ su primer día ya está armado, con ${casillas} tareas`);

// 9. Y no vuelve a pedir el arranque
await p.reload({ waitUntil: 'networkidle' });
await p.waitForTimeout(1600);
assert.equal(await p.getByText('Empezar', { exact: true }).count(), 0,
  'volvió a pedir el arranque después de hacerlo');
assert.ok(await p.getByRole('checkbox').count() >= 5);
console.log('✓ al volver a abrir va directo a su día');

// 10. Y se puede empezar de nuevo, que es como se vuelve a probar todo
await irA(p, 'Ajustes');
await p.getByRole('button', { name: 'Empezar de nuevo' }).click();
await p.waitForTimeout(400);
assert.ok(await p.getByText(/¿Seguro\? Se borra todo/).count(), 'no pide confirmación');
console.log('✓ empezar de nuevo pide confirmación antes de borrar');
await p.getByText('Sí, borrar').click();
await p.waitForTimeout(1600);
assert.ok(await p.getByText('Te avisa lo que toca').count(), 'no volvió a la bienvenida');
console.log('✓ y vuelve a la bienvenida, como recién instalada');

await b.close();
if (fallos.length) { console.error('FALLOS:\n' + fallos.join('\n')); process.exit(1); }
console.log('\nEl recorrido completo funciona.');
