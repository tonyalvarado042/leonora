/**
 * Lo que faltaba: poder crear y añadir cosas, no solo marcar las de fábrica.
 */
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';

const URL = 'http://localhost:8123';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const c = await b.newContext({ viewport: { width: 400, height: 900 }, timezoneId: 'America/Guatemala' });
const p = await c.newPage();
const fallos = [];
p.on('pageerror', (e) => fallos.push('PAGE ' + e.message));

await p.goto(URL, { waitUntil: 'networkidle' });
await p.waitForTimeout(1400);
const antes = await p.getByRole('checkbox').count();

// --- 1. Algo suelto solo para hoy ---
await p.getByText('+ Añadir algo solo para hoy').click();
await p.waitForTimeout(500);
await p.getByLabel('Qué hay que hacer').fill('Llamar a la abuela');
await p.getByLabel('¿A qué hora?: una hora después').click();
await p.getByText('Añadir a hoy').click();
await p.waitForTimeout(700);

assert.equal(await p.getByRole('checkbox').count(), antes + 1, 'no se añadió la tarea suelta');
assert.ok(await p.getByText('Llamar a la abuela').count(), 'la tarea suelta no aparece');
console.log(`✓ tarea suelta añadida a hoy (${antes} → ${antes + 1})`);

await p.reload({ waitUntil: 'networkidle' });
await p.waitForTimeout(1400);
assert.ok(await p.getByText('Llamar a la abuela').count(), 'la tarea suelta no sobrevive a recargar');
console.log('✓ y sobrevive a recargar');

// --- 2. Crear una actividad nueva y meterla en la rutina ---
await p.getByText('Editar mi rutina de la semana →').click();
await p.waitForTimeout(1200);
const bloquesAntes = await p.getByRole('button', { name: /^Retrasar / }).count();

await p.getByText('+ Añadir algo a este día').click();
await p.waitForTimeout(600);
await p.getByLabel('Crear una cosa nueva').click();
await p.waitForTimeout(1200);

await p.getByLabel('Nombre de la actividad').fill('Tocar guitarra');
await p.getByRole('radio', { name: 'Emoji 🎸' }).click();
await p.getByText('Deporte').click();
await p.getByText('45 min').click();
await p.getByText('Crear', { exact: true }).click();
await p.waitForTimeout(1300);
console.log('✓ actividad nueva creada: Tocar guitarra');

await p.getByText('+ Añadir algo a este día').click();
await p.waitForTimeout(600);
const nueva = p.getByText(/🎸\s+Tocar guitarra/);
assert.ok(await nueva.count(), 'la actividad nueva no sale en la lista para añadir');
await nueva.click();
await p.waitForTimeout(600);

const resumen = await p.getByText(/Dura 45 min/).innerText();
console.log('✓ propone hora y calcula el final:', resumen.replace(/\s+/g, ' ').trim());
await p.getByText('Añadir', { exact: true }).click();
await p.waitForTimeout(900);

const bloquesDespues = await p.getByRole('button', { name: /^Retrasar / }).count();
assert.equal(bloquesDespues, bloquesAntes + 1, 'el bloque no entró en la rutina');
assert.ok(await p.getByText(/Tocar guitarra/).count(), 'el bloque nuevo no se ve');
console.log(`✓ metida en la rutina (${bloquesAntes} → ${bloquesDespues} bloques)`);

// --- 3. Y aparece en el día de hoy ---
await p.getByText('Listo').click();
await p.waitForTimeout(1400);
assert.ok(await p.getByText(/Tocar guitarra/).count(), 'lo nuevo de la rutina no llegó a hoy');
console.log('✓ y aparece en la pantalla de Hoy');

await b.close();
if (fallos.length) { console.error('FALLOS:\n' + fallos.join('\n')); process.exit(1); }
console.log('\nCrear y añadir funciona.');
