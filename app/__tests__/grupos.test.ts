import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  activos, aQuienPuedoMandar, conQuienComparto, EMOJI_TIPO_GRUPO, invitacionesPendientes,
  mandaEn, miRolEn, misGrupos, NOMBRE_ROL, NOMBRE_TIPO_GRUPO, puedoVerElCalendarioDe,
  quienVeMiCalendario,
} from '../src/lib/grupos.ts';
import type { Grupo, MiembroGrupo, Persona, RolGrupo, TipoGrupo } from '../src/lib/tipos.ts';

// Una familia (papá, mamá, Leonora) y un grupo de amigas (Leonora, Emma, Sofía).
const FAMILIA: Grupo = { id: 'g-fam', nombre: 'Casa', tipo: 'familia', emoji: '🏠', creado_por: 'papa' };
const AMIGAS: Grupo = { id: 'g-ami', nombre: 'Las amigas', tipo: 'amigos', emoji: '💬', creado_por: 'leo' };
const GRUPOS = [FAMILIA, AMIGAS];

function miembro(
  grupo_id: string, persona_id: string, rol: RolGrupo,
  e: Partial<MiembroGrupo> = {},
): MiembroGrupo {
  return { grupo_id, persona_id, rol, ve_mi_calendario: false, estado: 'activo', ...e };
}

const MIEMBROS: MiembroGrupo[] = [
  miembro('g-fam', 'papa', 'tutor'),
  miembro('g-fam', 'mama', 'tutor'),
  miembro('g-fam', 'leo', 'miembro'),
  miembro('g-ami', 'leo', 'miembro'),
  miembro('g-ami', 'emma', 'miembro', { ve_mi_calendario: true }),
  miembro('g-ami', 'sofia', 'miembro'),
];

function persona(id: string, nombre: string): Persona {
  return {
    id, nombre, avatar_tipo: 'emoji', avatar_valor: '🙂',
    zona_horaria: 'America/Guatemala',
  };
}

const PERSONAS = [
  persona('papa', 'Papá'), persona('mama', 'Mamá'), persona('leo', 'Leonora'),
  persona('emma', 'Emma'), persona('sofia', 'Sofía'),
];

// ------------------------------------------------------------------ catálogo

test('cada tipo de grupo y cada rol tiene su nombre y su dibujo', () => {
  for (const t of ['familia', 'amigos', 'iglesia', 'otro'] as TipoGrupo[]) {
    assert.ok(NOMBRE_TIPO_GRUPO[t]);
    assert.ok(EMOJI_TIPO_GRUPO[t]);
  }
  for (const r of ['tutor', 'miembro'] as RolGrupo[]) assert.ok(NOMBRE_ROL[r]);
});

// -------------------------------------------------------------- pertenencia

test('mis grupos son los que ya acepté, no a los que me invitaron', () => {
  const conInvitacion = [...MIEMBROS, miembro('g-igl', 'leo', 'miembro', { estado: 'invitado' })];
  const iglesia: Grupo = { id: 'g-igl', nombre: 'Jóvenes', tipo: 'iglesia', emoji: '⛪', creado_por: 'x' };

  assert.deepEqual(
    misGrupos([...GRUPOS, iglesia], conInvitacion, 'leo').map((g) => g.id),
    ['g-fam', 'g-ami'],
  );
  assert.deepEqual(
    invitacionesPendientes([...GRUPOS, iglesia], conInvitacion, 'leo').map((g) => g.id),
    ['g-igl'],
  );
});

test('quien se fue deja de contar', () => {
  const fuera = MIEMBROS.map((m) =>
    m.persona_id === 'sofia' ? { ...m, estado: 'salio' as const } : m);
  assert.deepEqual(activos(fuera, 'g-ami').map((m) => m.persona_id), ['leo', 'emma']);
});

test('el rol es por grupo, y quien no está en el grupo no tiene ninguno', () => {
  assert.equal(miRolEn(MIEMBROS, 'g-fam', 'leo'), 'miembro');
  assert.equal(miRolEn(MIEMBROS, 'g-ami', 'leo'), 'miembro');
  assert.equal(miRolEn(MIEMBROS, 'g-ami', 'papa'), null);
});

test('administra quien lo creó y quien es tutor', () => {
  assert.equal(mandaEn(GRUPOS, MIEMBROS, 'g-fam', 'papa'), true);
  assert.equal(mandaEn(GRUPOS, MIEMBROS, 'g-fam', 'mama'), true);
  // Leonora no creó el grupo de casa y no es tutora: no administra.
  assert.equal(mandaEn(GRUPOS, MIEMBROS, 'g-fam', 'leo'), false);
  // Pero el de sus amigas lo creó ella, así que ese sí.
  assert.equal(mandaEn(GRUPOS, MIEMBROS, 'g-ami', 'leo'), true);
  assert.equal(mandaEn(GRUPOS, MIEMBROS, 'g-ami', 'emma'), false);
});

test('crear el grupo de tu familia no te convierte en la mamá de nadie', () => {
  // El caso de Leonora: monta la app para su casa, y aun así su mamá le manda.
  const suya: Grupo = { ...FAMILIA, creado_por: 'leo' };
  assert.equal(mandaEn([suya], MIEMBROS, 'g-fam', 'leo'), true);
  assert.deepEqual(aQuienPuedoMandar([suya], MIEMBROS, PERSONAS, 'leo'), []);
  assert.deepEqual(
    aQuienPuedoMandar([suya], MIEMBROS, PERSONAS, 'mama').map((p) => p.nombre),
    ['Leonora'],
  );
  assert.equal(puedoVerElCalendarioDe([suya], MIEMBROS, 'mama', 'leo'), true);
  assert.equal(puedoVerElCalendarioDe([suya], MIEMBROS, 'leo', 'mama'), false);
});

// ------------------------------------------------------------- ver calendario

test('lo mío siempre lo veo yo', () => {
  assert.equal(puedoVerElCalendarioDe(GRUPOS, MIEMBROS, 'leo', 'leo'), true);
});

test('papá y mamá ven el calendario de su hija sin pedir permiso', () => {
  assert.equal(puedoVerElCalendarioDe(GRUPOS, MIEMBROS, 'papa', 'leo'), true);
  assert.equal(puedoVerElCalendarioDe(GRUPOS, MIEMBROS, 'mama', 'leo'), true);
});

test('la hija no ve el calendario de sus papás solo por ser familia', () => {
  assert.equal(puedoVerElCalendarioDe(GRUPOS, MIEMBROS, 'leo', 'papa'), false);
});

test('entre amigas decide cada una, y se puede apagar', () => {
  // Emma lo tiene encendido; Sofía no.
  assert.equal(puedoVerElCalendarioDe(GRUPOS, MIEMBROS, 'leo', 'emma'), true);
  assert.equal(puedoVerElCalendarioDe(GRUPOS, MIEMBROS, 'leo', 'sofia'), false);

  const emmaLoApaga = MIEMBROS.map((m) =>
    m.persona_id === 'emma' ? { ...m, ve_mi_calendario: false } : m);
  assert.equal(puedoVerElCalendarioDe(GRUPOS, emmaLoApaga, 'leo', 'emma'), false);
});

test('ser tutor en mi casa no me deja ver a los amigos de mi hija', () => {
  assert.equal(puedoVerElCalendarioDe(GRUPOS, MIEMBROS, 'papa', 'emma'), false);
});

test('sin ningún grupo en común no se ve nada', () => {
  assert.equal(puedoVerElCalendarioDe(GRUPOS, MIEMBROS, 'emma', 'papa'), false);
});

test('a la persona se le puede decir por su nombre quién la ve', () => {
  assert.deepEqual(
    quienVeMiCalendario(GRUPOS, MIEMBROS, PERSONAS, 'leo').map((p) => p.nombre),
    ['Mamá', 'Papá'],
  );
  assert.deepEqual(quienVeMiCalendario(GRUPOS, MIEMBROS, PERSONAS, 'sofia'), []);
});

// -------------------------------------------------------------- encargos

test('un tutor le manda a sus hijos', () => {
  assert.deepEqual(
    aQuienPuedoMandar(GRUPOS, MIEMBROS, PERSONAS, 'papa').map((p) => p.nombre),
    ['Leonora'],
  );
});

test('una hija no le manda deberes a su papá', () => {
  assert.deepEqual(aQuienPuedoMandar(GRUPOS, MIEMBROS, PERSONAS, 'leo'), []);
});

test('haber creado un grupo de amigas no da derecho a mandarles tareas', () => {
  const soloAmigas = [AMIGAS];
  assert.deepEqual(aQuienPuedoMandar(soloAmigas, MIEMBROS, PERSONAS, 'leo'), []);
});

test('un tutor de otra familia le manda a su hijo, no al mío', () => {
  const otraCasa: Grupo = { id: 'g-otra', nombre: 'Otra casa', tipo: 'familia', emoji: '🏠', creado_por: 'tia' };
  const conOtra = [...MIEMBROS, miembro('g-otra', 'tia', 'tutor'), miembro('g-otra', 'primo', 'miembro')];
  const conPrimos = [...PERSONAS, persona('tia', 'Tía'), persona('primo', 'Primo')];
  assert.deepEqual(
    aQuienPuedoMandar([...GRUPOS, otraCasa], conOtra, conPrimos, 'tia').map((p) => p.nombre),
    ['Primo'],
  );
  assert.equal(puedoVerElCalendarioDe([...GRUPOS, otraCasa], conOtra, 'tia', 'leo'), false);
});

test('un tutor no le manda a otro tutor', () => {
  assert.deepEqual(
    aQuienPuedoMandar(GRUPOS, MIEMBROS, PERSONAS, 'mama').map((p) => p.nombre),
    ['Leonora'],
  );
});

// ------------------------------------------------------------------ compartir

test('comparto grupo con mi familia y con mis amigas', () => {
  assert.deepEqual(
    conQuienComparto(GRUPOS, MIEMBROS, PERSONAS, 'leo').map((p) => p.nombre),
    ['Emma', 'Mamá', 'Papá', 'Sofía'],
  );
});

test('Emma no comparte grupo con mi papá', () => {
  assert.deepEqual(
    conQuienComparto(GRUPOS, MIEMBROS, PERSONAS, 'emma').map((p) => p.nombre),
    ['Leonora', 'Sofía'],
  );
});
