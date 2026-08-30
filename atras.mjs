import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
await p.goto('http://localhost:8123/calendario', { waitUntil: 'networkidle' });
await p.waitForTimeout(1600);
const botones = await p.getByRole('button').evaluateAll((ns) =>
  ns.map((n) => (n.getAttribute('aria-label') || n.innerText || '').trim().slice(0, 30)));
console.log('botones en /calendario:', JSON.stringify(botones.slice(0, 12)));
console.log('¿hay algo de "atrás/back"?:',
  botones.some((x) => /atr|back|volver/i.test(x)));
await b.close();
