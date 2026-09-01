import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  correoLimpio, enCristiano, LARGO_CLAVE, queFalta, revisarClave, revisarCorreo,
  revisarNombre, SIN_AVISOS, todoBien, trasCrear,
} from '../src/lib/sesion.ts';

// ------------------------------------------------------------------ el nombre

test('el nombre solo se pide al crear la cuenta', () => {
  assert.equal(revisarNombre('', 'entrar'), null);
  assert.ok(revisarNombre('', 'crear'));
});

test('un nombre de solo espacios es un nombre vacío', () => {
  assert.ok(revisarNombre('   ', 'crear'));
});

test('el nombre tiene tope, y el aviso lo dice', () => {
  assert.match(revisarNombre('a'.repeat(61), 'crear') ?? '', /60/);
  assert.equal(revisarNombre('a'.repeat(60), 'crear'), null);
});

// ------------------------------------------------------------------ el correo

test('un correo vacío avisa, no se queda callado', () => {
  assert.ok(revisarCorreo(''));
});

test('un correo sin arroba o sin punto no pasa', () => {
  for (const malo of ['leonora', 'leonora@casa', 'leonora casa.com', '@casa.com']) {
    assert.ok(revisarCorreo(malo), `debería avisar de «${malo}»`);
  }
});

test('el aviso del correo enseña un ejemplo', () => {
  assert.match(revisarCorreo('leonora') ?? '', /@/);
});

test('los espacios de los lados no cuentan', () => {
  assert.equal(revisarCorreo('  leonora@casa.com  '), null);
});

test('el correo se guarda sin espacios y en minúsculas', () => {
  assert.equal(correoLimpio('  Leonora@Casa.COM '), 'leonora@casa.com');
});

// --------------------------------------------------------------- la contraseña

test('al crear, la contraseña corta avisa y dice cuánto lleva', () => {
  const aviso = revisarClave('1234', 'crear') ?? '';
  assert.match(aviso, new RegExp(String(LARGO_CLAVE)));
  assert.match(aviso, /4/);
});

test('al entrar no se mide el largo', () => {
  // La cuenta puede ser vieja. Decirle a alguien que su contraseña es corta
  // cuando lo que pasó es que se equivocó le manda a cambiarla sin necesidad.
  assert.equal(revisarClave('123', 'entrar'), null);
});

test('vacía avisa en los dos modos', () => {
  assert.ok(revisarClave('', 'entrar'));
  assert.ok(revisarClave('', 'crear'));
});

test('con el largo justo ya vale', () => {
  assert.equal(revisarClave('a'.repeat(LARGO_CLAVE), 'crear'), null);
});

// ------------------------------------------------------------ todo a la vez

test('salen TODOS los avisos, no solo el primero (R2)', () => {
  const a = queFalta('crear', { nombre: '', correo: 'no-es-correo', clave: '1' });
  assert.ok(a.nombre);
  assert.ok(a.correo);
  assert.ok(a.clave);
});

test('con todo bien no hay ni un aviso', () => {
  const a = queFalta('crear', {
    nombre: 'Leonora', correo: 'leonora@casa.com', clave: 'unaclavelarga',
  });
  assert.deepEqual(a, SIN_AVISOS);
  assert.ok(todoBien(a));
});

test('entrar no exige nombre aunque esté vacío', () => {
  assert.ok(todoBien(queFalta('entrar', {
    nombre: '', correo: 'leonora@casa.com', clave: 'x',
  })));
});

// ---------------------------------------------------- lo que dice el servidor

test('«Invalid login credentials» se dice en español y sin jerga', () => {
  const dicho = enCristiano('Invalid login credentials');
  assert.doesNotMatch(dicho, /credential/i);
  assert.match(dicho, /contraseña/);
});

test('un correo ya registrado manda a entrar, no a insistir', () => {
  assert.match(enCristiano('User already registered'), /[Ee]ntra/);
});

test('el correo sin confirmar explica qué hacer', () => {
  assert.match(enCristiano('Email not confirmed'), /enlace/);
});

test('sin internet se dice que no hay internet', () => {
  assert.match(enCristiano('TypeError: Failed to fetch'), /internet/);
});

test('demasiados intentos dice cuánto esperar', () => {
  assert.match(enCristiano('email rate limit exceeded'), /[Ee]spera/);
});

test('si la puerta del CRM para el alta, no se le echa la culpa a quien entra', () => {
  const dicho = enCristiano(
    'CRM Tony Alvarado: ese correo no esta autorizado. Pedile al administrador que te agregue.',
  );
  assert.doesNotMatch(dicho, /autorizado/);
  assert.match(dicho, /configuración/);
});

test('un mensaje que no se conoce se enseña tal cual, no se traga', () => {
  assert.equal(enCristiano('Algo rarísimo pasó'), 'Algo rarísimo pasó');
});

// ------------------------------------------------------- después de crearla

test('si vino sesión, se dice que ya está dentro', () => {
  const r = trasCrear(true, 'leonora@casa.com');
  assert.ok(r.dentro);
  assert.ok(r.mensaje.length > 0);
});

test('si falta confirmar, se dice a qué correo se mandó', () => {
  const r = trasCrear(false, '  Leonora@Casa.com ');
  assert.equal(r.dentro, false);
  assert.match(r.mensaje, /leonora@casa\.com/);
  assert.match(r.mensaje, /correo/);
});
