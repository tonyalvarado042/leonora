/** El selector de hora: dos campos que se escriben, y salta solo. */
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';

import { fijarElDia } from './arrancar.mjs';

const URL = 'http://localhost:8123';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const c = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'America/Guatemala' });
await fijarElDia(c);
const p = await c.newPage();
const fallos = [];
p.on('pageerror', (e) => fallos.push('PAGE ' + e.message));

await p.goto(URL, { waitUntil: 'networkidle' });
await p.waitForTimeout(1700);
await p.getByText('Empezar').click(); await p.waitForTimeout(800);
await p.getByLabel('Tu nombre').fill('Leonora');
await p.getByRole('button', { name: 'Siguiente' }).click();
await p.waitForTimeout(700);

// ------------------------------------------- 1. la frase, sin acertijo
let t = await p.locator('body').innerText();
assert.ok(t.includes('¿A qué hora te levantas y a qué hora te acuestas?'),
  `la pregunta no es la nueva: ${t.slice(0, 300)}`);
assert.ok(!t.includes('¿A qué hora vives?'), 'quedó la frase vieja');
console.log('✓ la pregunta se lee como se habla');

// ------------------------------------------- 2. dos campos, no uno
const hora = p.getByLabel('Hora de ☀️  Me levanto a las');
const min = p.getByLabel('Minutos de ☀️  Me levanto a las');
assert.equal(await hora.inputValue(), '06');
assert.equal(await min.inputValue(), '00');
await p.screenshot({ path: 'capturas/hora-campos.png', fullPage: true });
console.log('✓ la hora y los minutos son dos campos aparte, y se leen aparte');

// ------------------------------------------- 3. se escriben
await hora.fill('');
await hora.type('07');
await p.waitForTimeout(400);
assert.equal(await hora.inputValue(), '07');
// Al llenar la hora, el foco salta solo a los minutos.
assert.equal(
  await p.evaluate(() => document.activeElement?.getAttribute('aria-label')),
  'Minutos de ☀️  Me levanto a las',
  'al completar la hora debería saltar a los minutos',
);
await p.keyboard.type('45');
await p.waitForTimeout(400);
assert.equal(await min.inputValue(), '45');
console.log('✓ se escribe la hora, salta solo a los minutos, y se escriben');

// ------------------------------------------- 4. un dígito que ya no crece
await hora.fill('');
await hora.type('8');
await p.waitForTimeout(400);
assert.equal(
  await p.evaluate(() => document.activeElement?.getAttribute('aria-label')),
  'Minutos de ☀️  Me levanto a las',
  'un 8 no puede llevar otro dígito: debería saltar ya');
console.log('✓ un 8 salta solo, porque no hay hora 80');

// ------------------------------------------- 5. R2: avisa, no corrige solo
// Escribiendo no se puede llegar a una hora imposible —el 9 salta solo—, pero
// pegando sí. Y una hora pegada mala tiene que avisar, no corregirse sola.
await hora.fill('99');
await p.waitForTimeout(600);
t = await p.locator('body').innerText();
assert.ok(t.includes('Las horas van de 0 a 23'), `no avisa de la hora mala: ${t.slice(0, 300)}`);
await p.screenshot({ path: 'capturas/hora-error.png', fullPage: true });
console.log('✓ R2: una hora imposible avisa en vez de corregirse sola');

// Y al salir del campo vuelve a lo último bueno.
await min.click();
await p.waitForTimeout(500);
assert.notEqual(await hora.inputValue(), '99', 'lo inválido debería volver atrás');
assert.ok(!(await p.locator('body').innerText()).includes('Las horas van de 0 a 23'));
console.log('✓ al salir del campo, lo que no vale vuelve a lo último bueno');

// ------------------------------------------- 6. los minutos redondos
await p.getByLabel('☀️  Me levanto a las: minuto 30').click();
await p.waitForTimeout(400);
assert.equal(await min.inputValue(), '30');
console.log('✓ los minutos redondos se tocan, sin escribir');

// ------------------------------------------- 7. y llega hasta el día
await hora.fill('');
await hora.type('07');
await p.keyboard.type('15');
await p.waitForTimeout(400);
for (let i = 0; i < 3; i++) {
  await p.getByRole('button', { name: 'Siguiente' }).click();
  await p.waitForTimeout(450);
}
await p.getByRole('button', { name: 'Armar mi semana' }).click(); await p.waitForTimeout(900);
await p.getByText('Me gusta, empezar').click(); await p.waitForTimeout(1900);
t = await p.locator('body').innerText();
assert.ok(t.includes('07:15'), `la hora escrita no llegó al día: ${t.slice(0, 900)}`);
await p.screenshot({ path: 'capturas/hora-en-el-dia.png', fullPage: true });
console.log('✓ la hora escrita a mano llega al día de verdad');

if (fallos.length) { console.error('\n✗ errores de página:\n' + fallos.join('\n')); process.exit(1); }
console.log('\nTodo bien.');
await b.close();
