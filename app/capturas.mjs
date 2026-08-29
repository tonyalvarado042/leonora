import { chromium } from 'playwright-core';

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const errores = [];

async function tirar(ruta, archivo, esquema, antes) {
  const c = await b.newContext({ viewport: { width: 400, height: 900 }, colorScheme: esquema,
    deviceScaleFactor: 2, timezoneId: 'America/Guatemala' });
  const p = await c.newPage();
  p.on('console', (m) => { if (m.type() === 'error') errores.push(`[${archivo}] ${m.text()}`); });
  p.on('pageerror', (e) => errores.push(`[${archivo}] PAGE ${e.message}`));
  await p.goto('http://localhost:8123' + ruta, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1400);
  if (antes) await antes(p);
  await p.screenshot({ path: `capturas/${archivo}.png`, fullPage: true });
  const texto = await p.evaluate(() => document.body.innerText.slice(0, 400));
  console.log(`--- ${archivo} ---\n${texto}\n`);
  await c.close();
}

await tirar('/', 'hoy-claro', 'light');
await tirar('/', 'hoy-oscuro', 'dark');
await tirar('/', 'hoy-marcado', 'light', async (p) => {
  for (const t of ['Devocional', 'Colegio']) {
    const el = p.getByText(t, { exact: false }).first();
    if (await el.count()) { await el.click(); await p.waitForTimeout(350); }
  }
});
await tirar('/rutina', 'rutina', 'light');
await tirar('/ajustes', 'ajustes', 'light');

await b.close();
console.log(errores.length ? 'ERRORES:\n' + errores.join('\n') : 'Sin errores de consola.');
