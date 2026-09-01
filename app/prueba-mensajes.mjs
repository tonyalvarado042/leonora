/** Mandar un recado: siempre se puede intentar, y quién puede mandar qué. */
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';

import { arrancar, fijarElDia, irA } from './arrancar.mjs';

const URL = 'http://localhost:8123';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const c = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'America/Guatemala' });
await fijarElDia(c);
const p = await c.newPage();
const fallos = [];
p.on('pageerror', (e) => fallos.push('PAGE ' + e.message));

const texto = () => p.locator('body').innerText();
const volver = async () => {
  await p.getByRole('button', { name: 'Volver', exact: true }).click();
  await p.waitForTimeout(1100);
};

await arrancar(p, { url: URL });

// ------------------------------- 1. el botón está, aunque no haya a quién
await p.getByRole('button', { name: /^Mensajes\./ }).click();
await p.waitForTimeout(1200);
assert.ok((await texto()).includes('+ Mandar un mensaje'),
  'el botón de mandar tiene que estar siempre');

// R2: sin nadie en los grupos, se pulsa y lo dice
await p.getByText('+ Mandar un mensaje').click();
await p.waitForTimeout(700);
assert.ok((await texto()).includes('Todavía no tienes a nadie en tus grupos'),
  'sin nadie a quien mandar debería avisar, no esconder el botón (R2)');
await p.screenshot({ path: 'capturas/recados-sin-nadie.png', fullPage: true });
console.log('✓ R2: el botón está siempre, y sin nadie a quien mandar lo dice');

// ------------------------------- 2. con familia, se elige a quién
await volver();
await irA(p, 'Mi familia y mis grupos');
await p.getByText('+ Añadir a alguien').click();
await p.waitForTimeout(800);
await p.getByLabel('¿Cómo se llama?').fill('Mamá');
await p.getByRole('radio', { name: 'Papá o mamá' }).click();
await p.getByText('Añadir', { exact: true }).click();
await p.waitForTimeout(1400);
await p.getByText('+ Añadir a alguien').click();
await p.waitForTimeout(800);
await p.getByLabel('¿Cómo se llama?').fill('Sofía');
await p.getByText('Añadir', { exact: true }).click();
await p.waitForTimeout(1400);
await volver();

await p.getByRole('button', { name: /^Mensajes\./ }).click();
await p.waitForTimeout(1200);
await p.getByText('+ Mandar un mensaje').click();
await p.waitForTimeout(800);
let t = await texto();
assert.ok(t.includes('¿A quién?'), 'no se puede escoger a quién');
assert.ok(t.includes('Mamá') && t.includes('Sofía'),
  `deberían salir las dos personas de la casa: ${t.slice(0, 400)}`);
await p.screenshot({ path: 'capturas/recados-a-quien.png', fullPage: true });
console.log('✓ se puede escoger a quién, y salen todos los de mis grupos');

// ------------------------------- 3. una hija no le pone tareas a su mamá
await p.getByRole('radio', { name: /Mamá/ }).click();
await p.waitForTimeout(500);
await p.getByRole('radio', { name: /Tarea/ }).click();
await p.waitForTimeout(600);
assert.ok((await texto()).includes('papá o una mamá'),
  'ponerle una tarea a mamá debería avisar por qué no');
console.log('✓ R2: poner una tarea a quien no toca se pulsa y dice por qué');

// ------------------------------- 4. pero escribirle sí
await p.getByRole('radio', { name: /Mensaje/ }).click();
await p.waitForTimeout(400);
await p.getByLabel('¿Qué le mandas?').fill('¿Me llevas al cole mañana?');
await p.getByText('Mandar', { exact: true }).click();
await p.waitForTimeout(1500);
t = await texto();
assert.ok(t.includes('¿Me llevas al cole mañana?'), `no se mandó: ${t.slice(0, 400)}`);
assert.ok(t.includes('Para Mamá'), 'no dice a quién fue');
await p.screenshot({ path: 'capturas/recados-mandado.png', fullPage: true });
console.log('✓ una hija sí le puede escribir a su mamá, y se ve a quién fue');

// ------------------------------- 5. y mamá sí le pone tareas a su hija
await volver();
await p.getByRole('button', { name: /Tocar para cambiar de persona/ }).click();
await p.waitForTimeout(700);
await p.getByRole('radio', { name: /Mamá/ }).click();
await p.waitForTimeout(1600);
await p.getByRole('button', { name: /^Mensajes\./ }).click();
await p.waitForTimeout(1200);
await p.getByText('+ Mandar un mensaje').click();
await p.waitForTimeout(800);
await p.getByRole('radio', { name: /Leonora/ }).click();
await p.waitForTimeout(400);
await p.getByRole('radio', { name: /Tarea/ }).click();
await p.waitForTimeout(500);
assert.ok(!(await texto()).includes('papá o una mamá'),
  'mamá sí debería poder ponerle una tarea a su hija');
await p.getByLabel('¿Qué le mandas?').fill('Sacar la basura');
await p.getByText('Mandar', { exact: true }).click();
await p.waitForTimeout(1500);
assert.ok((await texto()).includes('Sacar la basura'), 'mamá no pudo mandar la tarea');
console.log('✓ mamá sí le pone una tarea a su hija');

if (fallos.length) { console.error('\n✗ errores de página:\n' + fallos.join('\n')); process.exit(1); }
console.log('\nTodo bien.');
await b.close();
