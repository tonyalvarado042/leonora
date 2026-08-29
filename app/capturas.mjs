import { chromium } from 'playwright-core';

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const errores = [];

// Una sesión por esquema de color: así lo que se marca en una captura se ve
// en la siguiente, y las rachas salen con datos de verdad y no en cero.
const sesiones = new Map();
async function contexto(esquema) {
  if (!sesiones.has(esquema)) {
    sesiones.set(esquema, await b.newContext({
      viewport: { width: 400, height: 900 }, colorScheme: esquema,
      deviceScaleFactor: 2, timezoneId: 'America/Guatemala',
    }));
  }
  return sesiones.get(esquema);
}

async function tirar(ruta, archivo, esquema, antes) {
  const c = await contexto(esquema);
  const p = await c.newPage();
  p.on('console', (m) => { if (m.type() === 'error') errores.push(`[${archivo}] ${m.text()}`); });
  p.on('pageerror', (e) => errores.push(`[${archivo}] PAGE ${e.message}`));
  await p.goto('http://localhost:8123' + ruta, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1400);
  if (antes) await antes(p);
  await p.screenshot({ path: `capturas/${archivo}.png`, fullPage: true });
  const texto = await p.evaluate(() => document.body.innerText.slice(0, 400));
  console.log(`--- ${archivo} ---\n${texto}\n`);
  await p.close();
}

await tirar('/rachas', 'rachas-vacias', 'dark');
await tirar('/', 'hoy-claro', 'light');
await tirar('/', 'celebracion', 'light', async (p) => {
  const c = p.getByRole('checkbox');
  const n = await c.count();
  for (let i = 0; i < n; i++) { await c.nth(i).click(); await p.waitForTimeout(230); }
  await p.waitForTimeout(420); // en pleno confeti
});
await tirar('/rachas', 'rachas-con-dia', 'light');
await tirar('/', 'hoy-oscuro', 'dark');
await tirar('/rutina', 'rutina', 'light');
await tirar('/ajustes', 'ajustes', 'light');

await b.close();
console.log(errores.length ? 'ERRORES:\n' + errores.join('\n') : 'Sin errores de consola.');
