/**
 * Prueba de extremo a extremo sobre el bundle web ya construido.
 * Comprueba lo único que la app tiene que hacer bien en la Fase 1:
 * marcar una tarea, que el avance suba, y que siga marcada al recargar.
 */
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';

import { arrancar, fijarElDia } from './arrancar.mjs';

const URL = 'http://localhost:8123';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const c = await b.newContext({ viewport: { width: 400, height: 900 }, timezoneId: 'America/Guatemala' });
await fijarElDia(c);
const p = await c.newPage();
const fallos = [];
p.on('pageerror', (e) => fallos.push('PAGE ' + e.message));

async function avance() {
  return (await p.getByText(/^\d+\/\d+$/).first().innerText()).trim();
}

await arrancar(p, { url: URL });

const casillas = p.getByRole('checkbox');
const total = await casillas.count();
assert.ok(total > 0, 'no se pintó ninguna tarea');
console.log(`✓ se pintaron ${total} tareas`);

const antes = await avance();
assert.match(antes, /^0\//, `el día debería empezar en 0, y empezó en ${antes}`);

await casillas.first().click();
await p.waitForTimeout(500);
const despues = await avance();
assert.match(despues, /^1\//, `tras marcar debería decir 1/, y dice ${despues}`);
assert.equal(await casillas.first().getAttribute('aria-checked'), 'true');
console.log(`✓ marcar una tarea: ${antes} → ${despues}`);

await casillas.first().click();
await p.waitForTimeout(500);
assert.match(await avance(), /^0\//, 'volver a tocar debería desmarcarla');
console.log('✓ volver a tocar la desmarca');

await casillas.first().click();
await p.waitForTimeout(500);
await p.reload({ waitUntil: 'networkidle' });
await p.waitForTimeout(1400);
assert.match(await avance(), /^1\//, 'lo marcado tiene que sobrevivir a recargar');
console.log('✓ lo marcado sobrevive a recargar');

await p.getByText('Editar mi rutina de la semana →').click();
await p.waitForTimeout(1200);
assert.ok(await p.getByText('Esto es tu semana normal', { exact: false }).count(), 'no se abrió Rutina');
console.log('✓ se navega a Rutina');

// El navegador de pila deja la pantalla anterior montada debajo, así que hay
// que mirar la fila concreta y no el primer texto que case en toda la página.
const boton = p.getByRole('button', { name: 'Retrasar Devocional 15 minutos' });
const fila = p.locator('div').filter({ has: boton }).last();
const horasAntes = (await fila.innerText()).match(/\d\d:\d\d — \d\d:\d\d/)[0];
await boton.click();
await p.waitForTimeout(800);
const horasDespues = (await fila.innerText()).match(/\d\d:\d\d — \d\d:\d\d/)[0];

// La hora exacta depende de lo que armó el asistente, así que se comprueba lo
// que de verdad importa: que las dos horas se muevan quince minutos juntas.
const mas15 = (h) => {
  const [a, b] = h.split(' — ').map((x) => {
    const [hh, mm] = x.split(':').map(Number);
    const t = hh * 60 + mm + 15;
    return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
  });
  return `${a} — ${b}`;
};
assert.equal(horasDespues, mas15(horasAntes), '+15 debería mover inicio y fin a la vez');
console.log(`✓ mover un bloque: ${horasAntes} → ${horasDespues}`);

// Y el cambio en la rutina tiene que verse hoy mismo.
await p.getByRole('button', { name: 'Volver' }).click();
await p.waitForTimeout(1400);
const nuevaHora = horasDespues.split(' — ')[0];
assert.ok(await p.getByText(nuevaHora).count(),
  `el día no recogió el cambio de la rutina (esperaba ver ${nuevaHora})`);
console.log('✓ mover la rutina cambia el día de hoy');

await b.close();
if (fallos.length) { console.error('FALLOS:\n' + fallos.join('\n')); process.exit(1); }
console.log('\nTodo bien.');
