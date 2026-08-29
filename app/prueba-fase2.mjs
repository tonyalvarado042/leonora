/**
 * Fase 2 de extremo a extremo: marcar todo el día tiene que subir las rachas,
 * desbloquear insignias, dar chispas y lanzar la celebración.
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

// La racha de abrir la app cuenta desde el primer arranque.
const banda = p.getByText(/chispas →$/);
assert.ok(await banda.count(), 'no salió la banda de rachas');
const inicial = (await banda.innerText()).trim();
assert.match(inicial, /🔥 1 día/, `abrir la app debería contar ya hoy: ${inicial}`);
console.log('✓ banda de rachas al abrir:', inicial);

const casillas = p.getByRole('checkbox');
const total = await casillas.count();

// Marcar todo menos una: nada de día perfecto todavía.
for (let i = 0; i < total - 1; i++) {
  await casillas.nth(i).click();
  await p.waitForTimeout(260);
}
assert.match(await banda.innerText(), /chispas/);
const chispasParciales = Number((await banda.innerText()).match(/(\d+) chispas/)[1]);
assert.ok(chispasParciales > 0, 'marcar tareas no dio chispas');
console.log(`✓ ${total - 1} tareas marcadas → ${chispasParciales} chispas`);

// La última cierra el día: racha, insignias y celebración.
await casillas.nth(total - 1).click();
await p.waitForTimeout(600);

const cartel = p.locator('[data-testid="cartel-celebracion"]');
assert.ok(await cartel.count(), 'no apareció el cartel de la celebración');
console.log('✓ celebración:', (await cartel.innerText()).trim());

await p.waitForTimeout(2200);
assert.equal(await cartel.count(), 0, 'la celebración no se fue sola');
console.log('✓ la celebración desaparece sola');

const bandaFinal = await banda.innerText();
assert.match(bandaFinal, /🔥 1 día/, `la racha no subió: ${bandaFinal}`);
const chispasFinal = Number(bandaFinal.match(/(\d+) chispas/)[1]);
assert.ok(chispasFinal >= chispasParciales + 50, `faltó el premio del día perfecto: ${chispasFinal}`);
console.log(`✓ día perfecto: ${chispasParciales} → ${chispasFinal} chispas`);

// La pantalla de rachas enseña lo mismo.
await banda.click();
await p.waitForTimeout(1300);
const cuerpo = await p.locator('body').innerText();
for (const esperado of ['Devocional', 'Cumplir tu día', 'Abrir la app', 'Orar por otros', 'insignias']) {
  assert.ok(cuerpo.includes(esperado), `falta "${esperado}" en la pantalla de rachas`);
}
assert.match(cuerpo, /\d+ de 24 insignias/, 'no cuenta las insignias sobre 24');
console.log('✓ pantalla de rachas con las cuatro vías y 24 insignias');

await b.close();
if (fallos.length) { console.error('FALLOS:\n' + fallos.join('\n')); process.exit(1); }
console.log('\nFase 2 bien.');
