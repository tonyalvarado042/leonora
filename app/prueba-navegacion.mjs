/** Volver atrás desde todas las pantallas, y la vista previa del calendario. */
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';

const URL = 'http://localhost:8123';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const c = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'America/Guatemala' });
const p = await c.newPage();
const fallos = [];
p.on('pageerror', (e) => fallos.push('PAGE ' + e.message));

// Arranque rápido para tener un día con datos.
await p.goto(URL, { waitUntil: 'networkidle' });
await p.waitForTimeout(1700);
await p.getByText('Empezar').click(); await p.waitForTimeout(700);
await p.getByLabel('Tu nombre').fill('Leonora');
for (let i = 0; i < 4; i++) { await p.getByText('Siguiente').click(); await p.waitForTimeout(400); }
await p.getByText('🧹 Ordenar el cuarto').click();
await p.getByText('⚽ Hacer deporte').click();
await p.getByText('Armar mi semana').click(); await p.waitForTimeout(900);
await p.getByText('Me gusta, empezar').click(); await p.waitForTimeout(1700);

// Marcar un par, para que el calendario tenga qué enseñar.
const cas = p.getByRole('checkbox');
await cas.nth(0).click(); await p.waitForTimeout(300);
await cas.nth(1).click(); await p.waitForTimeout(500);

// --- 1. Volver atrás desde cada pantalla ---
const pantallas = [
  ['📅  Ver mi semana y mi mes →', 'Tu calendario'],
  ['Editar mi rutina de la semana →', 'Tu rutina'],
];
for (const [enlace, titulo] of pantallas) {
  await p.getByText(enlace).click();
  await p.waitForTimeout(1100);
  assert.ok(await p.getByText(titulo).count(), `no abrió ${titulo}`);
  const volver = p.getByRole('button', { name: 'Volver' });
  assert.ok(await volver.count(), `${titulo} no tiene botón de volver`);
  await volver.click();
  await p.waitForTimeout(1100);
  assert.ok(await p.getByRole('checkbox').count() > 0, `volver desde ${titulo} no llevó a Hoy`);
  console.log(`✓ ${titulo}: se abre y se vuelve`);
}

await p.getByLabel('Ajustes').click();
await p.waitForTimeout(1100);
assert.ok(await p.getByRole('button', { name: 'Volver' }).count(), 'Ajustes no tiene volver');
await p.getByRole('button', { name: 'Volver' }).click();
await p.waitForTimeout(1000);
console.log('✓ Ajustes: se abre y se vuelve');

await p.getByText(/chispas →$/).click();
await p.waitForTimeout(1100);
assert.ok(await p.getByRole('button', { name: 'Volver' }).count(), 'Rachas no tiene volver');
await p.getByRole('button', { name: 'Volver' }).click();
await p.waitForTimeout(1000);
console.log('✓ Tus rachas: se abre y se vuelve');

// Y desde el editor de actividades, que está dos niveles adentro
await p.getByText('Editar mi rutina de la semana →').click();
await p.waitForTimeout(1100);
await p.getByText('+ Añadir algo a este día').click();
await p.waitForTimeout(600);
await p.getByLabel('Crear una cosa nueva').click();
await p.waitForTimeout(1200);
assert.ok(await p.getByRole('button', { name: 'Volver' }).count(), 'Actividad no tiene volver');
await p.getByRole('button', { name: 'Volver' }).click();
await p.waitForTimeout(1000);
assert.ok(await p.getByText('Esto es tu semana normal', { exact: false }).count(),
  'volver desde Actividad no llevó a Rutina');
console.log('✓ Una cosa tuya: se abre y se vuelve a la rutina');
await p.getByRole('button', { name: 'Volver' }).click();
await p.waitForTimeout(1000);

// --- 2. La vista previa del calendario ---
await p.getByText(/Ver mi semana y mi mes/).click();
await p.waitForTimeout(1400);

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
