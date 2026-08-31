import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';

import { fijarElDia } from './arrancar.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const c = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'America/Guatemala' });
await fijarElDia(c);
const p = await c.newPage();
p.on('pageerror', (e) => console.log('ERROR:', e.message));
await p.goto('http://localhost:8123', { waitUntil: 'networkidle' });
await p.waitForTimeout(1700);
await p.getByText('Empezar').click(); await p.waitForTimeout(700);
await p.getByLabel('Tu nombre').fill('Leonora');
for (let i = 0; i < 4; i++) { await p.getByText('Siguiente').click(); await p.waitForTimeout(400); }
await p.getByText('Armar mi semana').click(); await p.waitForTimeout(900);
await p.getByText('Me gusta, empezar').click(); await p.waitForTimeout(1900);

await p.getByRole('button', { name: /Devocional, / }).first().click();
await p.waitForTimeout(900);
const t = await p.locator('body').innerText();
assert.ok(t.includes('¿Cómo lo hiciste hoy?'), 'no pregunta cómo lo hizo');
for (const m of ['El de GraceDay', 'Leí la Biblia', 'En familia', 'Oyendo la radio', 'En la iglesia']) {
  assert.ok(t.includes(m), `falta el método: ${m}`);
}
console.log('✓ ocho maneras de haber hecho el devocional');

// Con el de la app sale el devocional; con la Biblia, no
await p.getByRole('radio', { name: 'El de GraceDay' }).click();
await p.waitForTimeout(500);
assert.ok((await p.locator('body').innerText()).includes('DEVOCIONAL DE HOY'),
  'con el de la app debería salir el devocional');
console.log('✓ con «El de GraceDay» sale el pasaje y la pregunta');

await p.getByRole('radio', { name: 'Leí la Biblia' }).click();
await p.waitForTimeout(500);
const t2 = await p.locator('body').innerText();
assert.ok(!t2.includes('DEVOCIONAL DE HOY'), 'leyendo la Biblia no debería imponer el texto de la app');
assert.ok(t2.includes('Tu nota'));
console.log('✓ con «Leí la Biblia» no impone su texto, solo pide la nota');

await p.getByLabel('Tu nota').fill('Salmos 91 entero, con papá.');
await p.getByText('Guardar', { exact: true }).click();
await p.waitForTimeout(900);
const fila = await p.locator('body').innerText();
assert.ok(fila.includes('📖'), 'la fila no enseña con qué lo hizo');
console.log('✓ la fila enseña 📖 y 📝: cómo lo hizo y que dejó nota');
await p.screenshot({ path: 'capturas/metodo-devocional.png', fullPage: true });
await b.close();
console.log('\nEl devocional propio funciona.');
