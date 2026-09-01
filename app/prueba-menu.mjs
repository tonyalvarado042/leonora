/** El menú de las tres rayas, y que Hoy ya no lleva la pila de enlaces. */
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';

import { arrancar, fijarElDia } from './arrancar.mjs';

const URL = 'http://localhost:8123';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const c = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'America/Guatemala' });
await fijarElDia(c);
const p = await c.newPage();
const fallos = [];
p.on('pageerror', (e) => fallos.push('PAGE ' + e.message));

const texto = () => p.locator('body').innerText();
const abrirMenu = async () => {
  await p.getByRole('button', { name: 'Abrir el menú' }).first().click();
  await p.waitForTimeout(700);
};

await arrancar(p, { url: URL });

// ----------------------------------------- 1. Hoy ya no lleva la pila
let t = await texto();
assert.ok(!t.includes('Ver mi semana y mi mes'), 'el calendario debería estar en el menú');
assert.ok(!t.includes('Editar mi rutina de la semana'), 'la rutina debería estar en el menú');
assert.ok(!t.includes('Mi familia y mis grupos'), 'la familia debería estar en el menú');
assert.ok(!t.includes('⚙️'), 'los ajustes deberían estar en el menú');
assert.ok(/chispas/.test(t), 'la racha tiene que seguir a la vista');
assert.ok(await p.getByRole('button', { name: /^Mensajes\./ }).count(), 'falta la campanita');
await p.screenshot({ path: 'capturas/menu-hoy.png', fullPage: true });
console.log('✓ Hoy: fuera la pila de enlaces, dentro la racha y la campanita');

// ----------------------------------------- 2. el menú se abre y lo trae todo
await abrirMenu();
t = await texto();
for (const x of ['Hoy', 'Mensajes', 'Mi semana y mi mes', 'Mi rutina',
                 'Fechas importantes', 'Mi familia y mis grupos',
                 'Rachas y chispas', 'Versículo del día', 'Ajustes']) {
  assert.ok(t.includes(x), `falta «${x}» en el menú`);
}
assert.ok(t.includes('Cambiar de persona'), 'el menú no deja cambiar de persona');
assert.equal(await p.getByRole('link', { name: 'Hoy' }).getAttribute('aria-current'), 'page',
  'el menú no marca dónde estás');
await p.screenshot({ path: 'capturas/menu-abierto.png', fullPage: true });
console.log('✓ el menú trae los nueve sitios, y marca en cuál estás');

// ----------------------------------------- 3. lleva a donde dice
await p.getByRole('link', { name: 'Mi semana y mi mes' }).click();
await p.waitForTimeout(1400);
assert.ok((await texto()).includes('Tu calendario'), 'el menú no llevó al calendario');
console.log('✓ el menú lleva a donde dice');

// ----------------------------------------- 4. y está en las demás pantallas
await abrirMenu();
assert.equal(
  await p.getByRole('link', { name: 'Mi semana y mi mes' }).getAttribute('aria-current'),
  'page', 'desde el calendario, el menú debería marcar el calendario');
await p.getByRole('link', { name: 'Fechas importantes' }).click();
await p.waitForTimeout(1400);
assert.ok((await texto()).includes('Fechas importantes'), 'no se salta de pantalla a pantalla');
console.log('✓ el menú está en todas las pantallas y salta de una a otra');

// ----------------------------------------- 5. se cierra tocando fuera
await abrirMenu();
await p.getByRole('button', { name: 'Cerrar el menú' }).click();
await p.waitForTimeout(700);
assert.ok(!(await texto()).includes('Cambiar de persona'), 'el menú no se cerró');
console.log('✓ se cierra tocando fuera');

// ----------------------------------------- 6. y vuelve a Hoy sin apilar
await abrirMenu();
await p.getByRole('link', { name: 'Hoy' }).click();
await p.waitForTimeout(1500);
t = await texto();
assert.ok(t.includes('Leonora'), 'no volvió a Hoy');
assert.equal(await p.getByRole('button', { name: 'Volver' }).count(), 0,
  'volver a Hoy no debería dejar pantallas apiladas detrás');
console.log('✓ vuelve a Hoy sin dejar pantallas apiladas');

// ----------------------------------------- 7. Mensajes, con su nombre nuevo
await abrirMenu();
await p.getByRole('link', { name: 'Mensajes' }).click();
await p.waitForTimeout(1400);
t = await texto();
assert.ok(t.includes('Mensajes'), 'la pantalla no se llama Mensajes');
assert.ok(!t.includes('recado'), `todavía queda la palabra «recado»: ${t.slice(0, 300)}`);
assert.ok(t.includes('+ Mandar un mensaje'), 'el botón no dice mandar un mensaje');
await p.screenshot({ path: 'capturas/menu-mensajes.png', fullPage: true });
console.log('✓ «Recados» ahora es «Mensajes», por dentro y por fuera');

if (fallos.length) { console.error('\n✗ errores de página:\n' + fallos.join('\n')); process.exit(1); }
console.log('\nTodo bien.');
await b.close();
