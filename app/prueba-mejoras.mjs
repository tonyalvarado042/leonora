/** Las siete cosas que pediste, una por una. */
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';

const URL = 'http://localhost:8123';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const c = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'America/Guatemala' });
const p = await c.newPage();
const fallos = [];
p.on('pageerror', (e) => fallos.push('PAGE ' + e.message));
const tiro = (n) => p.screenshot({ path: `capturas/mejora-${n}.png`, fullPage: true });

await p.goto(URL, { waitUntil: 'networkidle' });
await p.waitForTimeout(1800);
await p.getByText('Empezar').click();
await p.waitForTimeout(800);

// 1. Edad escrita a mano
await p.getByLabel('Tu nombre').fill('Leonora');
await p.getByLabel('Escribe tu edad').fill('14');
await p.waitForTimeout(300);
assert.equal(await p.getByLabel('Escribe tu edad').inputValue(), '14');
await tiro('1-edad');
console.log('✓ 1. se puede escribir una edad que no está en la lista');
await p.getByText('Siguiente').click(); await p.waitForTimeout(400);
await p.getByText('Siguiente').click(); await p.waitForTimeout(400);
await p.getByText('Siguiente').click(); await p.waitForTimeout(600);

// 2. Ocupaciones: universidad, escuela, otros — y nombre propio
const cuerpo = await p.locator('body').innerText();
for (const o of ['Colegio', 'Escuela', 'Universidad', 'Trabajo', 'Otra cosa', 'Ninguno']) {
  assert.ok(cuerpo.includes(o), `falta la ocupación ${o}`);
}
await p.getByText('🎓 Universidad').click();
await p.waitForTimeout(400);
await p.getByLabel('Nombre de tu colegio o trabajo').fill('Facultad de Medicina');
await tiro('2-ocupacion');
console.log('✓ 2. seis ocupaciones, y se le puede poner el nombre que uno quiera');

// 3. Escanear el horario
await p.getByLabel('Escanear mi horario').click();
await p.waitForTimeout(2600);
assert.ok(await p.getByText(/Leí \d+ materias/).count(), 'no salió lo leído de la foto');
// Los nombres viven en campos editables, así que hay que leer sus valores.
const nombres = await p.locator('input[aria-label^="Nombre de "]').evaluateAll(
  (ns) => ns.map((n) => n.value));
for (const m of ['Matemática', 'Estudios Sociales', 'Educación Física']) {
  assert.ok(nombres.includes(m), `no leyó ${m}. Leyó: ${nombres.join(', ')}`);
}
assert.ok((await p.locator('body').innerText()).includes('Salió borrosa'),
  'no marca las materias dudosas');
await tiro('3-horario-leido');
console.log('✓ 3. el escaneo mete el horario entero y marca lo borroso');

await p.getByText(/Aceptar · de/).click();
await p.waitForTimeout(700);
await p.getByText('Siguiente').click(); await p.waitForTimeout(400);
await p.getByText('🧹 Ordenar el cuarto').click();
await p.getByText('📖 Leer').click();
await p.getByText('Armar mi semana').click();
await p.waitForTimeout(900);

// 4. Preview editable
assert.ok(await p.getByText(/Mira día por día/).count(), 'el preview no es editable');
const bloquesAntes = await p.getByRole('button', { name: /^Quitar / }).count();
assert.ok(bloquesAntes > 0, 'el preview no lista los bloques del día');
await p.getByRole('button', { name: /^Retrasar / }).first().click();
await p.waitForTimeout(400);
await p.getByRole('button', { name: /^Quitar / }).first().click();
await p.waitForTimeout(400);
assert.equal(await p.getByRole('button', { name: /^Quitar / }).count(), bloquesAntes - 1,
  'quitar un bloque en el preview no lo quita');
await tiro('4-preview-editable');
console.log(`✓ 4. el preview deja mover y quitar antes de aceptar (${bloquesAntes} → ${bloquesAntes - 1})`);

await p.getByText('Me gusta, empezar').click();
await p.waitForTimeout(1800);

// 5. El bug del toque largo
// El toque largo va en la fila, no en la casilla: la casilla es su propio
// botón y se queda el gesto.
await p.getByRole('button', { name: /Devocional, / }).first().click({ delay: 1000 });
await p.waitForTimeout(700);
let hoy = await p.locator('body').innerText();
assert.ok(hoy.includes('SALTADA'), 'saltarse una tarea no se ve distinto de hacerla');
assert.equal(await p.getByRole('checkbox').first().getAttribute('aria-checked'), 'false');
await tiro('5-saltada');
console.log('✓ 5. saltarse una tarea se ve como SALTADA, no como hecha a medias');

// 6. Detalle con nota
await p.getByRole('button', { name: /Devocional, / }).first().click();
await p.waitForTimeout(700);
assert.ok(await p.getByLabel('Nota de la tarea').count(), 'no abre el detalle');
await p.getByLabel('Nota de la tarea').fill('Salmos 23. Hoy me costó concentrarme.');
await p.getByText('Guardar', { exact: true }).click();
await p.waitForTimeout(800);
hoy = await p.locator('body').innerText();
assert.ok(hoy.includes('📝'), 'la nota no se marca en la fila');
await tiro('6-nota');
console.log('✓ 6. tocar una tarea abre su detalle y guarda la nota');

// 7. Calendario
await p.getByText(/Ver mi semana y mi mes/).click();
await p.waitForTimeout(1400);
const cal = await p.locator('body').innerText();
assert.ok(cal.includes('Semana') && cal.includes('Mes'), 'faltan las vistas');
assert.match(cal, /(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre) de \d{4}/);
await tiro('7-calendario-mes');
await p.getByLabel('Ir hacia atrás').click();
await p.waitForTimeout(700);
assert.ok(await p.getByText('Volver a hoy').count(), 'no deja volver a hoy');
console.log('✓ 7. calendario con mes, semana e historial hacia atrás');
await p.getByRole('tab', { name: 'Semana' }).click();
await p.waitForTimeout(600);
await tiro('7-calendario-semana');
console.log('✓ 7b. y la vista de semana');

await b.close();
if (fallos.length) { console.error('FALLOS:\n' + fallos.join('\n')); process.exit(1); }
console.log('\nLas siete cosas funcionan.');
