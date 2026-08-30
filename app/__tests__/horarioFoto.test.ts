import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  aBloques, CONFIANZA_MINIMA, dudosas, jornada, leerHorario,
  type MateriaLeida,
} from '../src/lib/horarioFoto.ts';

function materia(c: Partial<MateriaLeida> = {}): MateriaLeida {
  return {
    id: 'm', nombre: 'Mate', emoji: '📐', dias: [1, 3], hora_inicio: '07:30',
    hora_fin: '08:20', confianza: 0.95, texto_leido: 'MATE', ...c,
  };
}

test('el horario de ejemplo trae materias con días y horas', async () => {
  const h = await leerHorario();
  assert.ok(h.materias.length >= 8);
  assert.ok(h.materias.every((m) => m.dias.length > 0));
  assert.ok(h.materias.every((m) => m.hora_fin > m.hora_inicio));
  assert.ok(h.materias.every((m) => m.id));
});

test('las materias borrosas se marcan para revisar', async () => {
  const h = await leerHorario();
  const d = dudosas(h);
  assert.ok(d.length > 0, 'un ejemplo sin ninguna dudosa no enseña el flujo de revisión');
  assert.ok(d.every((m) => m.confianza < CONFIANZA_MINIMA));
});

test('cada materia guarda lo que se leyó, para poder auditar un error', async () => {
  const h = await leerHorario();
  assert.ok(h.materias.every((m) => m.texto_leido.length > 0));
});

test('una materia de tres días produce tres bloques', () => {
  const b = aBloques([materia({ dias: [1, 3, 5] })], 'p', new Map([['m', 'act-mate']]));
  assert.equal(b.length, 3);
  assert.deepEqual(b.map((x) => x.dia_semana), [1, 3, 5]);
  assert.ok(b.every((x) => x.hora_inicio === '07:30' && x.hora_fin === '08:20'));
});

test('una materia sin actividad no produce bloques', () => {
  assert.deepEqual(aBloques([materia()], 'p', new Map()), []);
});

test('la jornada va del primer inicio al último fin', () => {
  const j = jornada([
    materia({ hora_inicio: '07:30', hora_fin: '08:20', dias: [1] }),
    materia({ hora_inicio: '11:10', hora_fin: '12:00', dias: [2, 4] }),
  ]);
  assert.equal(j?.inicio, '07:30');
  assert.equal(j?.fin, '12:00');
  assert.deepEqual(j?.dias, [1, 2, 4]);
});

test('sin materias no hay jornada', () => {
  assert.equal(jornada([]), null);
});
