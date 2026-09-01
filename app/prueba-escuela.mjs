/**
 * La pulga: poner escuela de 8 a 3 y que se vea que cargó.
 * Los datos ya estaban bien; lo que fallaba era que no se veía.
 */
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';

import { fijarElDia, irA } from './arrancar.mjs';

const URL = 'http://localhost:8123';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const c = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'America/Guatemala' });
// La prueba va justo de eso: un sábado sin escuela, que parecía un fallo.
await fijarElDia(c, new Date('2026-09-05T15:00:00Z'));
const p = await c.newPage();
const fallos = [];
p.on('pageerror', (e) => fallos.push('PAGE ' + e.message));

await p.goto(URL, { waitUntil: 'networkidle' });
await p.waitForTimeout(1700);
await p.getByText('Empezar').click(); await p.waitForTimeout(700);
await p.getByLabel('Tu nombre').fill('Leonora');
for (let i = 0; i < 3; i++) { await p.getByRole('button', { name: 'Siguiente' }).click(); await p.waitForTimeout(400); }

await p.getByText('🎒 Escuela').click(); await p.waitForTimeout(400);
await p.getByLabel('Salgo a las: una hora después').click(); await p.waitForTimeout(400);
await p.getByRole('button', { name: 'Siguiente' }).click(); await p.waitForTimeout(500);
await p.getByRole('button', { name: 'Armar mi semana' }).click(); await p.waitForTimeout(900);

const prop = await p.locator('body').innerText();
assert.ok(prop.includes('Escuela de 08:00 a 15:00'), 'la propuesta no recoge las horas');
assert.ok(prop.includes('5 días a la semana'));
console.log('✓ la propuesta dice: Escuela de 08:00 a 15:00, 5 días');

await p.getByText('Me gusta, empezar').click(); await p.waitForTimeout(1900);

// --- Lo que fallaba: hoy es sábado y parecía que no había cargado ---
const hoy = await p.locator('body').innerText();
assert.ok(hoy.includes('Hoy no hay escuela'), 'no explica por qué hoy no hay escuela');
assert.ok(hoy.includes('Tu horario está guardado'), 'no dice que el horario sí se guardó');
assert.ok(/vuelve el (lunes|martes|miércoles|jueves|viernes)/.test(hoy), 'no dice cuándo vuelve');
await p.screenshot({ path: 'capturas/escuela-hoy.png', fullPage: true });
console.log('✓ Hoy explica: «Hoy no hay escuela · tu horario está guardado y vuelve el lunes»');

// --- Y la rutina, en un día vacío, tampoco deja creer que se perdió ---
await irA(p, 'Mi rutina');
// Cada día enseña cuántas cosas tiene: así se ve que L-V tienen más que S-D
// y que el colegio no se perdió.
const cuentas = [];
for (const d of ['lunes', 'sábado']) {
  const t = await p.getByRole('tab', { name: d }).innerText();
  cuentas.push(Number(t.split('\n').pop().trim()));
}
assert.ok(cuentas[0] > cuentas[1],
  `el lunes debería tener más cosas que el sábado: ${cuentas.join(' vs ')}`);
await p.screenshot({ path: 'capturas/escuela-rutina.png', fullPage: true });
console.log(`✓ cada día enseña su cuenta: lunes ${cuentas[0]}, sábado ${cuentas[1]}`);

await p.getByRole('tab', { name: 'lunes' }).click();
await p.waitForTimeout(700);
const lunes = await p.locator('body').innerText();
assert.ok(lunes.includes('Escuela'), 'el atajo no llevó a un día con escuela');
assert.ok(lunes.includes('08:00 — 15:00'), `el lunes no tiene las horas puestas: ${lunes.match(/\d\d:\d\d — \d\d:\d\d/g)}`);
console.log('✓ el atajo lleva al lunes, con Escuela 08:00 — 15:00');

await b.close();
if (fallos.length) { console.error('FALLOS:\n' + fallos.join('\n')); process.exit(1); }
console.log('\nLa pulga está arreglada.');
