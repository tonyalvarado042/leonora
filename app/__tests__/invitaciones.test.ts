import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  armarMensaje, comoCorreo, comoWhatsApp, DONDE_BAJARLA, esCodigoValido,
  limpiarCodigo, nuevoCodigo, pareceCorreo,
} from '../src/lib/invitaciones.ts';
import type { Grupo, Invitacion, Persona, TipoGrupo } from '../src/lib/tipos.ts';

const CASA: Grupo = {
  id: 'g', nombre: 'Mi familia', tipo: 'familia', emoji: '🏠', creado_por: 'leo',
};

const LEO: Persona = {
  id: 'leo', nombre: 'Leonora', avatar_tipo: 'emoji', avatar_valor: '👧',
  zona_horaria: 'America/Guatemala',
};

const INV: Invitacion = {
  id: 'i1', grupo_id: 'g', email: 'mama@correo.com', nombre: 'Mamá',
  rol: 'tutor', codigo: 'CASA-4F2A', creada_por: 'leo',
  creada_en: '2026-08-30T12:00:00Z', aceptada_en: null,
};

// ------------------------------------------------------------------ código

test('el código lleva el prefijo del tipo de grupo', () => {
  const fijo = () => 0; // siempre la primera letra del alfabeto
  assert.equal(nuevoCodigo('familia', fijo), 'CASA-AAAA');
  assert.equal(nuevoCodigo('amigos', fijo), 'AMIS-AAAA');
  assert.equal(nuevoCodigo('iglesia', fijo), 'IGLE-AAAA');
  assert.equal(nuevoCodigo('otro', fijo), 'GRUP-AAAA');
});

test('el código no trae letras que se confundan al copiarlas a mano', () => {
  // 0 y O, 1 e I y L: escritos a mano se leen igual y se equivoca cualquiera.
  for (let i = 0; i < 400; i++) {
    const c = nuevoCodigo('familia').slice(5);
    assert.doesNotMatch(c, /[OIL01]/, `salió ${c}`);
  }
});

test('los códigos no salen todos iguales', () => {
  const vistos = new Set<string>();
  for (let i = 0; i < 200; i++) vistos.add(nuevoCodigo('amigos'));
  assert.ok(vistos.size > 100, `solo salieron ${vistos.size} distintos`);
});

test('el código se limpia como lo escriba la persona', () => {
  assert.equal(limpiarCodigo('casa-4f2a'), 'CASA-4F2A');
  assert.equal(limpiarCodigo('casa 4f2a'), 'CASA-4F2A');
  assert.equal(limpiarCodigo('  CASA4F2A '), 'CASA-4F2A');
  assert.equal(limpiarCodigo('CASA--4F2A'), 'CASA-4F2A');
});

test('un código a medias no vale', () => {
  assert.equal(esCodigoValido('CASA-4F2A'), true);
  assert.equal(esCodigoValido('casa 4f2a'), true);
  assert.equal(esCodigoValido('CASA'), false);
  assert.equal(esCodigoValido(''), false);
  assert.equal(esCodigoValido('1234-4F2A'), false); // el prefijo son letras
});

// ------------------------------------------------------------------ correo

test('se comprueba lo que un dedo se equivoca de verdad', () => {
  assert.equal(pareceCorreo('mama@correo.com'), true);
  assert.equal(pareceCorreo('  mama@correo.com  '), true);
  assert.equal(pareceCorreo('mama.de.leo@mi-correo.co.cr'), true);
  assert.equal(pareceCorreo('mama'), false);
  assert.equal(pareceCorreo('mama@correo'), false);
  assert.equal(pareceCorreo('mama correo.com'), false);
  assert.equal(pareceCorreo(''), false);
});

// ---------------------------------------------------------------- mensaje

test('el mensaje dice quién invita, a qué, y con qué código', () => {
  const m = armarMensaje(INV, CASA, LEO);
  assert.equal(m.para, 'mama@correo.com');
  assert.equal(m.codigo, 'CASA-4F2A');
  assert.ok(m.asunto.includes('Leonora'));
  assert.ok(m.asunto.includes('Mi familia'));
  assert.ok(m.cuerpo.includes('Hola, Mamá'));
  assert.ok(m.cuerpo.includes('CASA-4F2A'));
  assert.ok(m.cuerpo.includes(DONDE_BAJARLA));
});

test('el mensaje le dice que lo suyo lo decide ella', () => {
  const m = armarMensaje(INV, CASA, LEO);
  assert.match(m.cuerpo, /puedes enseñar tu calendario o no/i);
});

test('sin nombre de quien invita no se queda en blanco', () => {
  const m = armarMensaje(INV, CASA, { ...LEO, nombre: '  ' });
  assert.ok(m.asunto.startsWith('Alguien de tu familia'));
});

test('el enlace lleva el código, para no tener que escribirlo', () => {
  const m = armarMensaje(INV, CASA, LEO);
  assert.equal(m.enlace, `${DONDE_BAJARLA}/unirse?codigo=CASA-4F2A`);
});

test('el correo y el WhatsApp llevan el mismo texto, escapado', () => {
  const m = armarMensaje(INV, CASA, LEO);
  const correo = comoCorreo(m);
  assert.ok(correo.startsWith('mailto:mama%40correo.com?'));
  assert.ok(correo.includes(encodeURIComponent('CASA-4F2A')));
  assert.ok(comoWhatsApp(m).startsWith('https://wa.me/?text='));
  assert.ok(comoWhatsApp(m).includes(encodeURIComponent('CASA-4F2A')));
});

test('un asunto con comillas no rompe el enlace', () => {
  const raro: Grupo = { ...CASA, nombre: 'Casa & "los demás"' };
  const m = armarMensaje(INV, raro, LEO);
  assert.ok(!comoCorreo(m).includes('"'));
  assert.ok(!comoCorreo(m).includes('&"'));
});

test('todos los tipos de grupo tienen su prefijo', () => {
  for (const t of ['familia', 'amigos', 'iglesia', 'otro'] as TipoGrupo[]) {
    assert.equal(esCodigoValido(nuevoCodigo(t)), true);
  }
});
