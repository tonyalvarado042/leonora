/** Hombre o mujer en el primer paso, y el calendario del período. */
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

const texto = () => p.locator('body').innerText();

await p.goto(URL, { waitUntil: 'networkidle' });
await p.waitForTimeout(1700);
await p.getByText('Empezar').click(); await p.waitForTimeout(800);

// ------------------------------ 1. está en el primer paso, no en uno aparte
let t = await texto();
assert.ok(t.includes('Pregunta 1 de 5'), 'no debería haber un paso nuevo');
assert.ok(t.includes('¿Eres…?'), 'falta la pregunta en el primer paso');
for (const x of ['Mujer', 'Hombre', 'Prefiero no decir']) {
  assert.ok(t.includes(x), `falta la opción ${x}`);
}
assert.ok(!t.includes('Tu calendario del período'),
  'no se ofrece antes de saber la edad');
console.log('✓ la pregunta va en el primer paso, sin un paso aparte');

// ------------------------------ 2. a una niña de 11 no se le ofrece
await p.getByLabel('Tu nombre').fill('Leonora');
await p.getByText('👧 Mujer').click(); await p.waitForTimeout(400);
await p.getByPlaceholder('Otra').fill('11'); await p.waitForTimeout(500);
assert.ok(!(await texto()).includes('Tu calendario del período'),
  'a una niña de 11 no se le ofrece');
console.log('✓ a una niña de 11 no se le ofrece');

// ------------------------------ 3. a un hombre tampoco
await p.getByText('👦 Hombre').click(); await p.waitForTimeout(400);
await p.getByText('13', { exact: true }).click(); await p.waitForTimeout(500);
assert.ok(!(await texto()).includes('Tu calendario del período'), 'a un hombre no se le ofrece');
console.log('✓ a un hombre no se le ofrece');

// ------------------------------ 4. a una mujer de 13, sí, y con la promesa
await p.getByText('👧 Mujer').click(); await p.waitForTimeout(600);
t = await texto();
assert.ok(t.includes('Tu calendario del período'), 'a una mujer de 13 sí se le ofrece');
assert.ok(t.includes('Esto no lo ve nadie más'), 'no promete la privacidad');
assert.ok(/Ni tu mamá, ni tu papá/.test(t), 'no dice quién no lo ve');
assert.ok(t.includes('Ajustes'), 'no dice que se puede apagar');
await p.screenshot({ path: 'capturas/ciclo-arranque.png', fullPage: true });
console.log('✓ a una mujer de 13 se le ofrece, y se le promete que es solo suyo');

// ------------------------------ 5. no se enciende solo
await p.getByRole('switch', { name: /quiero llevarlo/ }).click();
await p.waitForTimeout(400);
for (let i = 0; i < 4; i++) { await p.getByRole('button', { name: 'Siguiente' }).click(); await p.waitForTimeout(400); }
await p.getByRole('button', { name: 'Armar mi semana' }).click(); await p.waitForTimeout(900);
await p.getByText('Me gusta, empezar').click(); await p.waitForTimeout(1900);

await p.getByRole('button', { name: 'Abrir el menú' }).first().click();
await p.waitForTimeout(700);
assert.ok((await texto()).includes('Mi calendario'), 'no aparece en el menú');
console.log('✓ encendido, aparece en el menú');

// ------------------------------ 6. el calendario, y que no invente fechas
await p.getByRole('link', { name: 'Mi calendario' }).click();
await p.waitForTimeout(1400);
t = await texto();
assert.ok(t.includes('Esto es solo tuyo'), 'la pantalla no lo recuerda');
assert.ok(t.includes('Marca los días'), 'sin datos debería pedir que marque');
await p.screenshot({ path: 'capturas/ciclo-vacio.png', fullPage: true });
console.log('✓ el calendario se abre, y sin datos no dice nada que no sepa');

// Se marca en un mes ya pasado, para que hoy no caiga dentro del período.
async function marcarPeriodo() {
  for (const d of ['1', '2', '3', '4']) {
    // «Lunes 1 de agosto»: con espacios alrededor, el 1 no casa con el 21.
    await p.getByRole('checkbox', { name: ' ' + d + ' de ' }).first().click();
    await p.waitForTimeout(320);
  }
}

await p.getByRole('button', { name: 'El mes anterior' }).click();
await p.waitForTimeout(700);
await marcarPeriodo();

t = await texto();
assert.ok(t.includes('Apunta un período más'),
  `con un solo período NO puede predecir: ${t.slice(0, 400)}`);
assert.ok(!/Te tocaría en \d+ días/.test(t), 'no puede inventar una fecha con un período');
await p.screenshot({ path: 'capturas/ciclo-un-periodo.png', fullPage: true });
console.log('✓ con un solo período dice que no puede, en vez de inventarse una fecha');

// Con un segundo período ya hay un intervalo, y sí puede.
await p.getByRole('button', { name: 'El mes anterior' }).click();
await p.waitForTimeout(700);
await marcarPeriodo();

t = await texto();
assert.ok(!t.includes('Apunta un período más'), 'con dos períodos ya debería calcular');
assert.ok(/tu ciclo dura \d+ días/.test(t), `no dice cuánto dura su ciclo: ${t.slice(0, 400)}`);
await p.screenshot({ path: 'capturas/ciclo-dos-periodos.png', fullPage: true });
console.log('✓ con dos períodos ya calcula, y dice de dónde sale la cuenta');

// Volver al mes de hoy, para que el detalle sea de un día marcado.
await p.getByRole('button', { name: 'El mes siguiente' }).click();
await p.waitForTimeout(600);
await p.getByRole('checkbox', { name: ' 2 de ' }).first().click();
await p.waitForTimeout(600);

// ------------------------------ 7. el detalle es opcional
t = await texto();
assert.ok(t.includes('Solo si quieres'), 'el detalle debería ser opcional y decirlo');
assert.ok(t.includes('¿Cómo te sientes?'), 'falta el ánimo');
console.log('✓ el detalle del día es opcional y lo dice');

// ------------------------------ 8. se puede apagar sin perder nada
await p.getByRole('button', { name: 'Volver', exact: true }).click();
await p.waitForTimeout(1200);
await irA(p, 'Ajustes');
t = await texto();
assert.ok(t.includes('Mi calendario del período'), 'no se puede apagar desde Ajustes');
assert.ok(t.includes('No se borra nada'), 'no dice que apagarlo no borra');
await p.getByRole('switch', { name: /Mi calendario del período/ }).first().click();
await p.waitForTimeout(900);
await p.getByRole('button', { name: 'Abrir el menú' }).first().click();
await p.waitForTimeout(700);
// Se mira el enlace del menú, no el texto de la pantalla: Ajustes tiene una
// fila que se llama «Mi calendario del período» y siempre casaría.
assert.equal(await p.getByRole('link', { name: 'Mi calendario', exact: true }).count(), 0,
  'apagado, no debería salir en el menú');
await p.screenshot({ path: 'capturas/ciclo-apagado.png', fullPage: true });
console.log('✓ se apaga desde Ajustes, sale del menú, y no borra nada');

if (fallos.length) { console.error('\n✗ errores de página:\n' + fallos.join('\n')); process.exit(1); }
console.log('\nTodo bien.');
await b.close();
