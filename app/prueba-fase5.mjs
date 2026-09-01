/** Fase 5 — la familia, la campanita y las fechas importantes. */
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
const volver = async () => { await p.getByRole('button', { name: 'Volver' }).click(); await p.waitForTimeout(1000); };

// ------------------------------------------------------------- arranque
await p.goto(URL, { waitUntil: 'networkidle' });
await p.waitForTimeout(1700);
await p.getByText('Empezar').click(); await p.waitForTimeout(700);
await p.getByLabel('Tu nombre').fill('Leonora');
for (let i = 0; i < 4; i++) { await p.getByText('Siguiente').click(); await p.waitForTimeout(400); }
await p.getByText('Armar mi semana').click(); await p.waitForTimeout(900);
await p.getByText('Me gusta, empezar').click(); await p.waitForTimeout(1800);

// ------------------------------------------------------ 1. la campanita
const campana = p.getByRole('button', { name: /^Mensajes\./ });
assert.ok(await campana.count(), 'no sale la campanita en Hoy');
assert.match(await campana.getAttribute('aria-label'), /No tienes ninguno sin abrir/,
  'la campanita no dice que está vacía');
await p.screenshot({ path: 'capturas/fase5-hoy.png', fullPage: true });
console.log('✓ la campanita sale en Hoy y dice que no hay nada sin abrir');

// ------------------------------------------------------- 2. añadir a mamá
await irA(p, 'Mi familia y mis grupos');
let t = await texto();
assert.ok(t.includes('QUIÉN ESTÁ USANDO LA APP'), 'no sale el selector de persona');
assert.ok(t.includes('Leonora'), 'no sale la persona actual');
assert.ok(t.includes('Quién ve tu calendario'), 'no explica quién ve el calendario');
assert.ok(t.includes('no lo ve nadie más que tú'), 'debería decir que aún no lo ve nadie');
assert.ok(t.includes('Mi familia'), 'no viene el grupo familia de fábrica');
await p.screenshot({ path: 'capturas/fase5-familia-vacia.png', fullPage: true });
console.log('✓ Familia: selector de persona, la casa de fábrica y quién ve el calendario');

// R2: añadir sin nombre avisa, no se apaga el botón
await p.getByText('+ Añadir a alguien').click(); await p.waitForTimeout(800);
await p.getByText('Añadir', { exact: true }).click(); await p.waitForTimeout(600);
assert.ok((await texto()).includes('Escribe cómo se llama'),
  'añadir en blanco no avisa (R2)');
console.log('✓ R2: añadir a alguien sin nombre avisa en vez de apagar el botón');

await p.getByLabel('¿Cómo se llama?').fill('Mamá');
await p.getByRole('radio', { name: 'Papá o mamá' }).click();
await p.getByRole('radio', { name: 'Dibujo 👩' }).click();
await p.getByText('Añadir', { exact: true }).click();
await p.waitForTimeout(1400);
t = await texto();
assert.ok(t.includes('Mamá'), 'no se añadió a Mamá');
assert.ok(t.includes('Papá o mamá'), 'no se ve su rol');
assert.ok(t.includes('Lo ven Mamá'), 'no dice que ahora mamá ve el calendario');
await p.screenshot({ path: 'capturas/fase5-familia.png', fullPage: true });
console.log('✓ Mamá entra en la casa como tutora, y la app le dice a Leonora que la ve');

// -------------------------------------------- 3. mamá manda un recado
await p.getByRole('radio', { name: /Mamá/ }).first().click();
await p.waitForTimeout(1300);
assert.ok((await texto()).includes('Lo ven'), 'no se recargó al cambiar de persona');
await volver();
await p.waitForTimeout(600);
assert.ok((await texto()).includes('Mamá'), 'Hoy no saluda a la persona nueva');
console.log('✓ cambiar de persona cambia toda la app');

await p.getByRole('button', { name: /^Mensajes\./ }).click();
await p.waitForTimeout(1200);
assert.ok((await texto()).includes('+ Mandar un mensaje'),
  'una tutora debería poder mandar mensajes');
await p.getByText('+ Mandar un mensaje').click(); await p.waitForTimeout(800);

// R2: mandar sin título avisa
await p.getByText('Mandar', { exact: true }).click(); await p.waitForTimeout(600);
assert.ok((await texto()).includes('Escribe qué le quieres mandar'),
  'mandar sin título no avisa (R2)');
console.log('✓ R2: mandar un recado vacío avisa');

await p.getByLabel('¿Qué le mandas?').fill('Sacar la basura');
await p.getByLabel('Una nota (opcional)').fill('Antes de que pase el camión');
await p.getByRole('switch', { name: /Ponerle una hora/ }).click();
await p.getByText('Mandar', { exact: true }).click();
await p.waitForTimeout(1400);
t = await texto();
assert.ok(t.includes('Sacar la basura'), 'el recado no aparece en «Que mandé»');
assert.ok(t.includes('Todavía no lo ha abierto'), 'no dice si lo abrió');
await p.screenshot({ path: 'capturas/fase5-mandado.png', fullPage: true });
console.log('✓ Mamá manda un recado y ve que todavía no lo han abierto');

// ------------------------------------ 4. Leonora lo recibe y contesta
await volver();
await p.getByRole('button', { name: /Tocar para cambiar de persona/ }).click();
await p.waitForTimeout(700);
await p.getByRole('radio', { name: /Leonora/ }).click();
await p.waitForTimeout(1600);

const campana2 = p.getByRole('button', { name: /^Mensajes\./ });
assert.match(await campana2.getAttribute('aria-label'), /1 sin abrir/,
  'la campanita no cuenta el recado nuevo');
t = await texto();
assert.ok(t.includes('Sacar la basura'), 'el recado no bajó al horario de hoy');
await p.screenshot({ path: 'capturas/fase5-recibido.png', fullPage: true });
console.log('✓ el recado le llega a Leonora: número rojo en la campana y tarea en su día');

await campana2.click(); await p.waitForTimeout(1200);
assert.ok((await texto()).includes('Mamá te mandó una tarea'), 'no dice quién lo mandó');
await p.getByRole('button', { name: /Sacar la basura\. Mensaje de Mamá/ }).click();
await p.waitForTimeout(900);
await p.getByText('Contestar', { exact: true }).click(); await p.waitForTimeout(600);
assert.ok((await texto()).includes('Escribe qué le quieres contestar'),
  'contestar en blanco no avisa (R2)');
await p.getByLabel('Tu respuesta').fill('Ya la saqué');
await p.getByText('Contestar', { exact: true }).click();
await p.waitForTimeout(1300);
t = await texto();
assert.ok(t.includes('Ya la saqué'), 'no se guardó la respuesta');
await p.screenshot({ path: 'capturas/fase5-contestado.png', fullPage: true });

await volver();
await p.waitForTimeout(700);
assert.match(await p.getByRole('button', { name: /^Mensajes\./ }).getAttribute('aria-label'),
  /No tienes ninguno sin abrir/, 'la campana sigue gritando después de abrirlo');
console.log('✓ Leonora abre el recado, contesta, y la campana se calla');

// ------------------------------------------- 5. marcarlo se ve del otro lado
await p.getByRole('checkbox', { name: 'Marcar Sacar la basura' }).click();
await p.waitForTimeout(1200);
await p.getByRole('button', { name: /Tocar para cambiar de persona/ }).click();
await p.waitForTimeout(700);
await p.getByRole('radio', { name: /Mamá/ }).click();
await p.waitForTimeout(1600);
await p.getByRole('button', { name: /^Mensajes\./ }).click();
await p.waitForTimeout(1200);
await p.getByRole('tab', { name: 'Que mandé' }).click();
await p.waitForTimeout(600);
t = await texto();
assert.ok(t.includes('hecho ✓'), 'mamá no ve que ya está hecho');
assert.ok(t.includes('Ya la saqué'), 'mamá no ve la respuesta');
await p.screenshot({ path: 'capturas/fase5-visto-por-mama.png', fullPage: true });
console.log('✓ marcar la tarea aquí se ve allá: mamá lo ve hecho y contestado');

// --------------------------------------------- 6. un feriado libra el día
await volver();
await p.getByRole('button', { name: /Tocar para cambiar de persona/ }).click();
await p.waitForTimeout(700);
await p.getByRole('radio', { name: /Leonora/ }).click();
await p.waitForTimeout(1600);

const antes = await texto();
const habiaColegio = antes.includes('Colegio');

await irA(p, 'Fechas importantes');
assert.ok((await texto()).includes('No hay nada apuntado'), 'la lista debería empezar vacía');

await p.getByText('+ Añadir una fecha').click(); await p.waitForTimeout(800);
await p.getByText('Guardar', { exact: true }).click(); await p.waitForTimeout(600);
assert.ok((await texto()).includes('Ponle un nombre al evento'),
  'guardar un evento sin nombre no avisa (R2)');
console.log('✓ R2: una fecha sin nombre avisa');

await p.getByLabel('¿Qué es?').fill('Día de la Independencia');
await p.getByText('Guardar', { exact: true }).click();
await p.waitForTimeout(1300);
t = await texto();
assert.ok(t.includes('Día de la Independencia'), 'no se guardó el feriado');
assert.ok(t.includes('Ese día no hay colegio ni trabajo'), 'no explica qué hace un feriado');
await p.screenshot({ path: 'capturas/fase5-eventos.png', fullPage: true });
console.log('✓ un feriado se guarda y dice qué hace');

await volver();
await p.waitForTimeout(1200);
t = await texto();
assert.ok(t.includes('Día de la Independencia'), 'el feriado no se anuncia en Hoy');
assert.ok(t.includes('Hoy no hay'), 'no explica que hoy no hay colegio');
if (habiaColegio) {
  assert.ok(!t.includes('Colegio'), 'el feriado no quitó el colegio del día');
}
assert.ok(t.includes('Devocional'), 'el feriado se llevó por delante el devocional');
assert.ok(t.includes('Cena'), 'el feriado se llevó por delante la cena');
await p.screenshot({ path: 'capturas/fase5-feriado.png', fullPage: true });
console.log('✓ el feriado quita el colegio y deja el devocional y la cena');

// -------------------------------------------- 7. y se ve en el calendario
await irA(p, 'Mi semana y mi mes');
assert.ok((await texto()).includes('Día de la Independencia') ||
          (await p.locator('[aria-label*="Independencia"]').count()) > 0,
  'el feriado no se ve en el calendario');
await p.getByRole('tab', { name: 'Semana' }).click();
await p.waitForTimeout(900);
assert.ok((await texto()).includes('sin colegio'), 'la semana no marca el día libre');
await p.screenshot({ path: 'capturas/fase5-calendario.png', fullPage: true });
console.log('✓ el feriado se ve en el mes y en la semana');

// ------------------------------------------------------------- final
if (fallos.length) { console.error('\n✗ errores de página:\n' + fallos.join('\n')); process.exit(1); }
console.log('\nTodo bien.');
await b.close();
