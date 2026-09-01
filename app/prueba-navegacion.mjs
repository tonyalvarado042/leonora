/** Volver atrás desde todas las pantallas, y la vista previa del calendario. */
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';

import { contestarSiPregunta, fijarElDia, irA } from './arrancar.mjs';

const URL = 'http://localhost:8123';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const c = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'America/Guatemala' });
await fijarElDia(c);
const p = await c.newPage();
const fallos = [];
p.on('pageerror', (e) => fallos.push('PAGE ' + e.message));

// Arranque rápido para tener un día con datos.
await p.goto(URL, { waitUntil: 'networkidle' });
await p.waitForTimeout(1700);
await p.getByText('Empezar').click(); await p.waitForTimeout(700);
await p.getByLabel('Tu nombre').fill('Leonora');
for (let i = 0; i < 4; i++) { await p.getByRole('button', { name: 'Siguiente' }).click(); await p.waitForTimeout(400); }
await p.getByText('🧹 Ordenar el cuarto').click();
await p.getByText('⚽ Hacer deporte').click();
await p.getByRole('button', { name: 'Armar mi semana' }).click(); await p.waitForTimeout(900);
await p.getByText('Me gusta, empezar').click(); await p.waitForTimeout(1700);

// Marcar un par, para que el calendario tenga qué enseñar.
const cas = p.getByRole('checkbox');
await cas.nth(0).click(); await p.waitForTimeout(400);
await contestarSiPregunta(p);
await cas.nth(1).click(); await p.waitForTimeout(500);
await contestarSiPregunta(p);

// --- 1. Volver atrás desde cada pantalla ---
const pantallas = [
  ['Mi semana y mi mes', 'Tu calendario'],
  ['Mi rutina', 'Tu rutina'],
  ['Fechas importantes', 'Fechas importantes'],
  ['Mi familia y mis grupos', 'Mi familia y mis grupos'],
  ['Mensajes', 'Mensajes'],
  ['Ajustes', 'Ajustes'],
];
for (const [enlace, titulo] of pantallas) {
  await irA(p, enlace);
  assert.ok(await p.getByText(titulo).count(), `no abrió ${titulo}`);
  const volver = p.getByRole('button', { name: 'Volver', exact: true });
  assert.ok(await volver.count(), `${titulo} no tiene botón de volver`);
  await volver.click();
  await p.waitForTimeout(1100);
  assert.ok(await p.getByRole('checkbox').count() > 0, `volver desde ${titulo} no llevó a Hoy`);
  console.log(`✓ ${titulo}: se abre y se vuelve`);
}

await irA(p, 'Ajustes');
assert.ok(await p.getByRole('button', { name: 'Volver', exact: true }).count(), 'Ajustes no tiene volver');
await p.getByRole('button', { name: 'Volver', exact: true }).click();
await p.waitForTimeout(1000);
console.log('✓ Ajustes: se abre y se vuelve');

await p.getByText(/chispas →$/).click();
await p.waitForTimeout(1100);
assert.ok(await p.getByRole('button', { name: 'Volver', exact: true }).count(), 'Rachas no tiene volver');
await p.getByRole('button', { name: 'Volver', exact: true }).click();
await p.waitForTimeout(1000);
console.log('✓ Tus rachas: se abre y se vuelve');

// Y desde el editor de actividades, que está dos niveles adentro
await irA(p, 'Mi rutina');
await p.getByText('+ Añadir algo a este día').click();
await p.waitForTimeout(600);
await p.getByLabel('Crear una cosa nueva').click();
await p.waitForTimeout(1200);
assert.ok(await p.getByRole('button', { name: 'Volver', exact: true }).count(), 'Actividad no tiene volver');
await p.getByRole('button', { name: 'Volver', exact: true }).click();
await p.waitForTimeout(1000);
assert.ok(await p.getByText('Esto es tu semana normal', { exact: false }).count(),
  'volver desde Actividad no llevó a Rutina');
console.log('✓ Una cosa tuya: se abre y se vuelve a la rutina');
await p.getByRole('button', { name: 'Volver', exact: true }).click();
await p.waitForTimeout(1000);

// --- 2. La vista previa del calendario ---
await irA(p, 'Mi semana y mi mes');

const barras = await p.locator('div').evaluateAll((ns) =>
  ns.filter((n) => {
    const s = getComputedStyle(n);
    return s.width === '6px' && s.height === '3px';
  }).length);
assert.ok(barras > 0, 'el mes no dibuja barras de tipo');
console.log(`✓ el mes dibuja ${barras} barritas de color por tipo`);

const leyenda = await p.locator('body').innerText();
for (const t of ['Fe', 'Estudio', 'Casa', 'Deporte', 'Familia']) {
  assert.ok(leyenda.includes(t), `falta ${t} en la leyenda`);
}
await p.screenshot({ path: 'capturas/calendario-mes.png', fullPage: true });
console.log('✓ leyenda con los cinco tipos');

await p.getByRole('tab', { name: 'Semana' }).click();
await p.waitForTimeout(900);
const semana = await p.locator('body').innerText();
assert.ok(/\d\d:\d\d/.test(semana), 'la semana no enseña las horas de las tareas');
assert.ok(semana.includes('Devocional'), 'la semana no enseña los nombres de las tareas');
await p.screenshot({ path: 'capturas/calendario-semana.png', fullPage: true });
console.log('✓ la semana es una agenda de verdad, con horas y nombres');

await b.close();
if (fallos.length) { console.error('FALLOS:\n' + fallos.join('\n')); process.exit(1); }
console.log('\nNavegación y vista previa funcionan.');
