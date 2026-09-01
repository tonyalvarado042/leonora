/** Añadir una tarea que se repite, como en un calendario. */
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

await p.goto(URL, { waitUntil: 'networkidle' });
await p.waitForTimeout(1700);
await p.getByText('Empezar').click(); await p.waitForTimeout(700);
await p.getByLabel('Tu nombre').fill('Leonora');
for (let i = 0; i < 4; i++) { await p.getByRole('button', { name: 'Siguiente' }).click(); await p.waitForTimeout(400); }
await p.getByRole('button', { name: 'Armar mi semana' }).click(); await p.waitForTimeout(900);
await p.getByText('Me gusta, empezar').click(); await p.waitForTimeout(1900);

const antes = await p.getByRole('checkbox').count();

// El botón ya no dice «solo para hoy»
assert.ok(await p.getByText('+ Añadir una tarea').count(), 'el botón sigue diciendo «solo para hoy»');
await p.getByText('+ Añadir una tarea').click();
await p.waitForTimeout(700);

const opciones = await p.locator('body').innerText();
for (const o of ['Solo este día', 'Todos los días', 'Cada semana', 'Cada tantos días',
                 'Cada mes el', 'Cada año el']) {
  assert.ok(opciones.includes(o), `falta la opción: ${o}`);
}
await p.screenshot({ path: 'capturas/repeticion.png', fullPage: true });
console.log('✓ seis maneras de repetir, como en un calendario');

// Cada semana sin días → avisa
await p.getByLabel('Tu nombre', { exact: false }).count(); // no-op
await p.getByLabel('¿Qué hay que hacer?').fill('Clase de piano');
await p.getByRole('radio', { name: 'Cada semana' }).click();
await p.waitForTimeout(400);
await p.getByText('Añadir y repetir').click();
await p.waitForTimeout(500);
assert.ok((await p.locator('body').innerText()).includes('Marca al menos un día'),
  'cada semana sin días no avisa');
console.log('✓ «cada semana» sin marcar días avisa, no se apaga');

// Marcar todos los días de la semana
for (const d of ['L', 'M', 'X', 'J', 'V', 'S', 'D']) {
  await p.getByLabel(`Repetir el día ${d}`).click();
  await p.waitForTimeout(120);
}
assert.ok((await p.locator('body').innerText()).includes('Se repetirá cada L, M, X, J, V, S, D'),
  'no dice cómo se va a repetir');
console.log('✓ dice en palabras cómo se va a repetir');

await p.getByText('Añadir y repetir').click();
await p.waitForTimeout(1200);
assert.equal(await p.getByRole('checkbox').count(), antes + 1, 'no se añadió al día de hoy');
assert.ok((await p.locator('body').innerText()).includes('Clase de piano'));
console.log('✓ aparece hoy');

// Y está en la rutina, todos los días
await irA(p, 'Mi rutina');
for (const d of ['lunes', 'miércoles', 'domingo']) {
  await p.getByRole('tab', { name: d }).click();
  await p.waitForTimeout(450);
  assert.ok((await p.locator('body').innerText()).includes('Clase de piano'),
    `no está el ${d}`);
}
console.log('✓ y está en la rutina el lunes, el miércoles y el domingo');

// Ahora una que se repite cada mes
await p.getByRole('button', { name: 'Volver' }).click();
await p.waitForTimeout(1200);
await p.getByText('+ Añadir una tarea').click(); await p.waitForTimeout(600);
await p.getByLabel('¿Qué hay que hacer?').fill('Pagar la mensualidad');
await p.getByRole('radio', { name: /Cada mes el/ }).click();
await p.waitForTimeout(400);
assert.ok((await p.locator('body').innerText()).includes('Se repetirá cada mes el'));
await p.getByText('Añadir y repetir').click();
await p.waitForTimeout(1200);
assert.ok((await p.locator('body').innerText()).includes('Pagar la mensualidad'));
console.log('✓ una que se repite cada mes también entra');

// La rutina avisa de las que no son semanales
await irA(p, 'Mi rutina');
assert.ok((await p.locator('body').innerText()).includes('de otra manera'),
  'la rutina no menciona las repeticiones que no son semanales');
console.log('✓ la rutina avisa de las que se repiten de otra manera');

await b.close();
if (fallos.length) { console.error('FALLOS:\n' + fallos.join('\n')); process.exit(1); }
console.log('\nLas repeticiones funcionan.');
