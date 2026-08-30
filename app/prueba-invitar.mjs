/** Invitar a alguien: por su nombre, o por correo con un código. */
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';

import { arrancar } from './arrancar.mjs';

const URL = 'http://localhost:8123';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const c = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'America/Guatemala' });
const p = await c.newPage();
const fallos = [];
p.on('pageerror', (e) => fallos.push('PAGE ' + e.message));

const texto = () => p.locator('body').innerText();
// Exacto a propósito: «Volver a hoy» también contiene «Volver», y sin esto
// el localizador casa con los dos y se queda esperando.
const volver = async () => {
  await p.getByRole('button', { name: 'Volver', exact: true }).click();
  await p.waitForTimeout(1100);
};

await arrancar(p, { url: URL });
await p.getByText('Mi familia y mis grupos').click();
await p.waitForTimeout(1200);

// ------------------------------------------ 1. cualquiera puede añadir
assert.ok((await texto()).includes('+ Añadir a alguien'),
  'un miembro debería poder añadir gente');
console.log('✓ cualquier miembro puede añadir a alguien, no solo quien administra');

// ------------------------------------------ 2. solo con su nombre
await p.getByText('+ Añadir a alguien').click();
await p.waitForTimeout(800);
let t = await texto();
assert.ok(t.includes('Entra en este teléfono'), 'falta la opción de entrar aquí');
assert.ok(t.includes('Le mando una invitación'), 'falta la opción de invitar por correo');

await p.getByLabel('¿Cómo se llama?').fill('Mamá');
await p.getByRole('radio', { name: 'Papá o mamá' }).click();
await p.getByText('Añadir', { exact: true }).click();
await p.waitForTimeout(1400);
t = await texto();
assert.ok(t.includes('Mamá'), 'no se añadió a Mamá');
assert.ok(t.includes('toca para ver su día'), 'no dice que se puede ver su día');
await p.screenshot({ path: 'capturas/invitar-nombre.png', fullPage: true });
console.log('✓ con solo su nombre entra ya, y se puede cambiar a ella');

// ------------------------------------------ 3. por correo
await p.getByText('+ Añadir a alguien').click();
await p.waitForTimeout(800);
await p.getByLabel('¿Cómo se llama?').fill('Abuela');
await p.getByRole('radio', { name: '✉️ Le mando una invitación' }).click();
await p.waitForTimeout(400);

// R2: sin correo avisa
await p.getByText('Añadir', { exact: true }).click();
await p.waitForTimeout(600);
assert.ok((await texto()).includes('Escribe su correo'), 'sin correo no avisa (R2)');

// R2: un correo mal escrito también avisa
await p.getByLabel('Su correo').fill('abuela');
await p.getByText('Añadir', { exact: true }).click();
await p.waitForTimeout(600);
assert.ok((await texto()).includes('no se ve bien'), 'un correo malo no avisa (R2)');
console.log('✓ R2: sin correo, y con un correo mal escrito, avisa');

await p.getByLabel('Su correo').fill('abuela@correo.com');
await p.getByText('Añadir', { exact: true }).click();
await p.waitForTimeout(1400);
t = await texto();
assert.ok(t.includes('Mándale la invitación'), 'no sale la hoja para mandarla');
assert.ok(t.includes('SU CÓDIGO'), 'no enseña el código');
const codigo = (t.match(/CASA-[A-Z0-9]{4}/) ?? [])[0];
assert.ok(codigo, `no salió un código con forma de código: ${t.slice(0, 300)}`);
assert.ok(t.includes('abuela@correo.com'), 'no dice a quién va');
assert.ok(t.includes('Por correo') && t.includes('Por WhatsApp'), 'faltan las dos maneras');
assert.ok(t.includes('graceday.app'), 'el mensaje no lleva de dónde bajar la app');
await p.screenshot({ path: 'capturas/invitar-codigo.png', fullPage: true });
console.log(`✓ la invitación por correo sale con su código (${codigo}) y las dos maneras de mandarla`);

await p.getByText('Listo', { exact: true }).click();
await p.waitForTimeout(1000);
t = await texto();
assert.ok(t.includes('Invitada a abuela@correo.com'), 'no aparece como invitada');
assert.ok(t.includes(codigo), 'no se ve su código en la lista');
console.log('✓ queda apuntada como invitada, con su código a la vista');

// ------------------------------------------ 4. entrar con el código
await p.getByRole('radio', { name: /Mamá/ }).first().click();
await p.waitForTimeout(1400);
await p.getByText('Entrar con un código').click();
await p.waitForTimeout(800);

await p.getByText('Entrar', { exact: true }).click();
await p.waitForTimeout(600);
assert.ok((await texto()).includes('Escribe el código'), 'un código vacío no avisa (R2)');

await p.getByLabel('El código').fill('CASA-ZZZZ');
await p.getByText('Entrar', { exact: true }).click();
await p.waitForTimeout(800);
assert.ok((await texto()).includes('no lleva a ningún grupo'), 'un código malo no avisa');
console.log('✓ R2: un código vacío y uno inventado avisan');

// ------------------------------------------ 5. ver el horario del grupo
await p.getByText('Cancelar', { exact: true }).click();
await p.waitForTimeout(700);
await p.getByRole('button', { name: /Ver el día de Leonora/ }).click();
await p.waitForTimeout(1400);
t = await texto();
assert.ok(t.includes('El día de Leonora'), 'no abre el día de la otra persona');
assert.ok(t.includes('Su día lo marca Leonora'), 'no dice que es solo para mirar');
assert.equal(await p.getByRole('checkbox').count(), 0,
  'el horario de otra persona no debería traer casillas para marcar');
await p.screenshot({ path: 'capturas/invitar-horario.png', fullPage: true });
console.log('✓ el horario de otra persona se ve, y es solo de mirar');

await p.getByRole('button', { name: 'El día siguiente' }).click();
await p.waitForTimeout(1000);
assert.ok((await texto()).includes('Volver a hoy'), 'no deja volver a hoy');
console.log('✓ y se puede mirar el día siguiente y volver');

// ------------------------------------------ 6. lo que no se comparte
await volver();
await p.getByText('+ Crear un grupo').click();
await p.waitForTimeout(800);
await p.getByLabel('¿Cómo se llama el grupo?').fill('Las amigas');
await p.getByRole('radio', { name: /Amigos/ }).click();
await p.getByText('Crear', { exact: true }).click();
await p.waitForTimeout(1300);

await p.getByText('+ Añadir a alguien').last().click();
await p.waitForTimeout(800);
await p.getByLabel('¿Cómo se llama?').fill('Emma');
await p.getByText('Añadir', { exact: true }).click();
await p.waitForTimeout(1400);
t = await texto();
assert.ok(t.includes('no comparte su calendario'),
  'fuera de casa, el calendario debería estar apagado de entrada');
await p.screenshot({ path: 'capturas/invitar-amigas.png', fullPage: true });
console.log('✓ fuera de casa el calendario empieza apagado, y se dice');

// ------------------------------------------ 7. el código mete de verdad
await p.getByText('+ Añadir a alguien').last().click();
await p.waitForTimeout(800);
await p.getByLabel('¿Cómo se llama?').fill('Sofía');
await p.getByRole('radio', { name: '✉️ Le mando una invitación' }).click();
await p.getByLabel('Su correo').fill('sofia@correo.com');
await p.getByText('Añadir', { exact: true }).click();
await p.waitForTimeout(1400);
const codigoAmigas = ((await texto()).match(/AMIS-[A-Z0-9]{4}/) ?? [])[0];
assert.ok(codigoAmigas, 'la invitación de un grupo de amigas debería llevar AMIS-');
await p.getByText('Listo', { exact: true }).click();
await p.waitForTimeout(900);

// «Las amigas» lo creó Mamá, que es quien está usando la app desde el paso 4.
// Leonora no está dentro: es ella quien escribe el código y entra.
await p.getByRole('radio', { name: /Leonora/ }).first().click();
await p.waitForTimeout(1500);
assert.ok(!(await texto()).includes('Las amigas'),
  'Leonora no debería estar en «Las amigas» todavía');

await p.getByText('Entrar con un código').click();
await p.waitForTimeout(800);
await p.getByLabel('El código').fill(codigoAmigas.toLowerCase());
await p.getByText('Entrar', { exact: true }).click();
await p.waitForTimeout(1500);
t = await texto();
assert.ok(t.includes('Ya estás en «Las amigas»'), `no entró con el código: ${t.slice(0, 400)}`);
assert.ok(t.includes('Las amigas'), 'el grupo no aparece en sus grupos');
await p.screenshot({ path: 'capturas/invitar-entro.png', fullPage: true });
console.log(`✓ el código (${codigoAmigas}) mete de verdad en el grupo`);

// Y es de un solo uso.
await p.getByText('Entrar con un código').click();
await p.waitForTimeout(800);
await p.getByLabel('El código').fill(codigoAmigas);
await p.getByText('Entrar', { exact: true }).click();
await p.waitForTimeout(900);
assert.ok((await texto()).includes('ya se usó'), 'el código debería ser de un solo uso');
console.log('✓ y no vale dos veces');

if (fallos.length) { console.error('\n✗ errores de página:\n' + fallos.join('\n')); process.exit(1); }
console.log('\nTodo bien.');
await b.close();
