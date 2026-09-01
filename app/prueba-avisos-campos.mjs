/**
 * R2 · Ningún campo se queda callado.
 * Ningún botón puede quedarse muerto sin decir qué falta.
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

await p.goto(URL, { waitUntil: 'networkidle' });
await p.waitForTimeout(1700);
await p.getByText('Empezar').click();
await p.waitForTimeout(800);

// --- El fallo que reportaste ---
assert.ok(await p.getByText('obligatorio').count(), 'el campo no dice que es obligatorio');
await p.getByText('Siguiente').click();
await p.waitForTimeout(500);
let txt = await p.locator('body').innerText();
assert.ok(txt.includes('Falta tu nombre'), 'seguir sin nombre no avisa de nada');
assert.ok(await p.getByRole('alert').count() > 0, 'el aviso no se anuncia como alerta');
await p.screenshot({ path: 'capturas/aviso-nombre.png', fullPage: true });
console.log('✓ seguir sin nombre avisa: «Falta tu nombre»');

// Y el aviso se quita al escribir
await p.getByLabel('Tu nombre').fill('Leonora');
await p.waitForTimeout(400);
txt = await p.locator('body').innerText();
assert.ok(!txt.includes('Falta tu nombre'), 'el aviso no se quita al escribir');
console.log('✓ y desaparece en cuanto escribes');

await p.getByText('Siguiente').click(); await p.waitForTimeout(500);
assert.ok(await p.getByText('Pregunta 2 de 5').count(), 'con nombre no dejó seguir');
console.log('✓ con el nombre puesto, sigue');

// --- Sin días marcados en el paso 4 ---
await p.getByText('Siguiente').click(); await p.waitForTimeout(400);
await p.getByText('Siguiente').click(); await p.waitForTimeout(600);
for (const d of ['L', 'M', 'X', 'J', 'V']) {
  await p.getByLabel(`Día ${d}`).click();
  await p.waitForTimeout(120);
}
await p.getByText('Siguiente').click();
await p.waitForTimeout(500);
txt = await p.locator('body').innerText();
assert.ok(txt.includes('No marcaste ningún día'), 'seguir sin días no avisa');
console.log('✓ sin días marcados también avisa, y dice qué hacer');
await p.getByLabel('Día L').click();
await p.waitForTimeout(300);
await p.getByText('Siguiente').click(); await p.waitForTimeout(500);
assert.ok(await p.getByText('Pregunta 5 de 5').count());

// --- Lo opcional se dice ---
txt = await p.locator('body').innerText();
assert.ok(txt.includes('puedes no marcar nada'), 'no dice que los quehaceres son opcionales');
console.log('✓ lo opcional también se dice');

await p.getByText('Armar mi semana').click(); await p.waitForTimeout(900);
await p.getByText('Me gusta, empezar').click(); await p.waitForTimeout(1800);

// --- Añadir algo a hoy, sin texto ---
await p.getByText('+ Añadir una tarea').click();
await p.waitForTimeout(600);
await p.getByText('Añadir a hoy').click();
await p.waitForTimeout(500);
txt = await p.locator('body').innerText();
assert.ok(txt.includes('Falta decir qué hay que hacer'), 'añadir sin texto no avisa');
console.log('✓ añadir algo sin escribir nada avisa');
await p.getByText('Cancelar').click(); await p.waitForTimeout(500);

// --- Crear una actividad sin nombre ---
await irA(p, 'Mi rutina');
await p.getByText('+ Añadir algo a este día').click(); await p.waitForTimeout(600);
await p.getByLabel('Crear una cosa nueva').click(); await p.waitForTimeout(1200);
await p.getByText('Crear', { exact: true }).click();
await p.waitForTimeout(500);
txt = await p.locator('body').innerText();
assert.ok(txt.includes('Falta el nombre'), 'crear sin nombre no avisa');
console.log('✓ crear una actividad sin nombre avisa');

// --- Ningún botón muerto en toda la app ---
for (const ruta of ['/', '/rutina', '/ajustes', '/calendario', '/rachas', '/actividad']) {
  await p.goto(URL + ruta, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1200);
  const muertos = await p.locator('[aria-disabled="true"], button:disabled').count();
  assert.equal(muertos, 0, `${ruta} tiene ${muertos} botones apagados`);
}
console.log('✓ ningún botón apagado en las seis pantallas');

await b.close();
if (fallos.length) { console.error('FALLOS:\n' + fallos.join('\n')); process.exit(1); }
console.log('\nR2 se cumple.');
