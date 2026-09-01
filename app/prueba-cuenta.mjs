/**
 * Entrar y crear cuenta.
 *
 * La app se usa sin cuenta desde el primer día, así que lo que se prueba aquí
 * es sobre todo que **no obliga a nada** y que **no se calla**: qué falta, qué
 * se sube y qué se queda.
 *
 * No se crea una cuenta de verdad: eso metería filas en la base de datos
 * compartida cada vez que se corren las pruebas. Lo que se comprueba es todo
 * lo que pasa antes de tocar la red, que es donde están los fallos que ve una
 * persona.
 */
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

await arrancar(p);

// 1. Se llega desde el menú, abajo con Ajustes: no es algo de todos los días.
await irA(p, 'Mi cuenta');
const inicio = await p.locator('body').innerText();
assert.ok(inicio.includes('Crear mi cuenta'), 'no llegó a la pantalla de la cuenta');
assert.match(inicio, /funciona sin cuenta/i, 'no dice que se puede seguir sin cuenta');
await p.screenshot({ path: 'capturas/cuenta-1-entrada.png', fullPage: true });
console.log('✓ se llega desde el menú, y lo primero que dice es que no hace falta');

// 2. Hay salida: seguir sin cuenta.
assert.ok(await p.getByText('Seguir sin cuenta, en este teléfono').count(),
  'no hay manera de salir sin crear cuenta');
console.log('✓ hay una salida clara: seguir sin cuenta');

// 3. El botón NO se apaga: se pulsa vacío y dice qué falta, TODO a la vez (R2).
await p.getByRole('button', { name: 'Crear mi cuenta' }).click();
await p.waitForTimeout(500);
const vacio = await p.locator('body').innerText();
assert.match(vacio, /Escribe tu nombre/, 'no avisa del nombre');
assert.match(vacio, /Escribe tu correo/, 'no avisa del correo');
assert.match(vacio, /Escribe tu contraseña/, 'no avisa de la contraseña');
await p.screenshot({ path: 'capturas/cuenta-2-que-falta.png', fullPage: true });
console.log('✓ el botón no se apaga: se pulsa vacío y salen los tres avisos a la vez');

// 4. Cada aviso dice qué hacer, no solo que está mal.
await p.getByLabel('Tu nombre').fill('Leonora');
await p.getByLabel('Tu correo').fill('leonora');
await p.getByLabel('Tu contraseña').fill('1234');
await p.getByRole('button', { name: 'Crear mi cuenta' }).click();
await p.waitForTimeout(500);
const malos = await p.locator('body').innerText();
assert.match(malos, /nombre@correo\.com/, 'el aviso del correo no enseña un ejemplo');
assert.match(malos, /al menos 8/i, 'el aviso de la clave no dice cuánto hace falta');
assert.match(malos, /[Ll]levas 4/, 'el aviso de la clave no dice cuánto lleva');
assert.equal(await p.getByText('Escribe tu nombre').count(), 0,
  'el aviso del nombre se quedó puesto después de arreglarlo');
await p.screenshot({ path: 'capturas/cuenta-3-avisos.png', fullPage: true });
console.log('✓ cada aviso dice qué hacer, y el que se arregla desaparece');

// 5. Lo que se sube se enseña ANTES, con números.
const maleta = await p.locator('body').innerText();
assert.ok(/se sube contigo/i.test(maleta), 'no dice qué se lleva');
assert.match(maleta, /\d+ actividades/, 'no cuenta las actividades');
assert.match(maleta, /\d+ bloques de tu rutina/, 'no cuenta la rutina');
assert.ok(/se queda en este teléfono/i.test(maleta), 'no dice qué se queda');
assert.match(maleta, /rachas sí viajan/, 'no aclara que las rachas sí viajan');
console.log('✓ antes de subir nada dice qué viaja y qué se queda, con números');

// 6. «Ya tengo cuenta» quita lo que no aplica y limpia los avisos viejos.
await p.getByRole('tab', { name: 'Ya tengo cuenta' }).click();
await p.waitForTimeout(500);
const entrando = await p.locator('body').innerText();
assert.equal(await p.getByLabel('Tu nombre').count(), 0,
  'al entrar sigue pidiendo el nombre');
assert.doesNotMatch(entrando, /al menos 8/i,
  'quedó puesto el aviso de la contraseña corta, que al entrar no aplica');
assert.ok(!/se sube contigo/i.test(entrando),
  'al entrar promete subir cosas que solo suben al crear la cuenta');
await p.screenshot({ path: 'capturas/cuenta-4-entrar.png', fullPage: true });
console.log('✓ «Ya tengo cuenta» no pide el nombre ni arrastra los avisos del otro modo');

// 7. Al entrar no se mide el largo de la contraseña: la cuenta puede ser vieja.
await p.getByLabel('Tu correo').fill('leonora@casa.com');
await p.getByLabel('Tu contraseña').fill('123');
await p.getByRole('button', { name: 'Entrar' }).click();
await p.waitForTimeout(900);
assert.doesNotMatch(await p.locator('body').innerText(), /al menos 8/i,
  'al entrar mide el largo y manda a cambiar la contraseña sin necesidad');
console.log('✓ al entrar no mide el largo: mandaría a cambiar la contraseña sin razón');

// 8. Y la app sigue funcionando sin cuenta: se vuelve y el día está entero.
await p.getByText('Seguir sin cuenta, en este teléfono').click();
await p.waitForTimeout(1400);
assert.ok(await p.getByRole('checkbox').count() >= 5,
  'al volver sin cuenta el día se quedó vacío');
console.log('✓ se vuelve sin cuenta y el día sigue entero');

// 9. Ajustes dice contra qué está guardando, sin que haya que ir a mirarlo.
await irA(p, 'Ajustes');
const ajustes = await p.locator('body').innerText();
assert.ok(ajustes.includes('MI CUENTA'), 'Ajustes no habla de la cuenta');
assert.match(ajustes, /Guardando en este teléfono/,
  'Ajustes no dice dónde se está guardando');
await p.screenshot({ path: 'capturas/cuenta-5-ajustes.png', fullPage: true });
console.log('✓ Ajustes dice dónde se guarda, sin tener que entrar a mirarlo');

await b.close();
if (fallos.length) { console.error('FALLOS:\n' + fallos.join('\n')); process.exit(1); }
console.log('\nEntrar y crear cuenta funciona, y no obliga a nadie.');
