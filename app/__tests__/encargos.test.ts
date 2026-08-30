import assert from 'node:assert/strict';
import { test } from 'node:test';

import { generarDia } from '../src/lib/dia.ts';
import {
  comoSeLee, EMOJI_TIPO_ENCARGO, encargosDeFecha, entraAlHorario, esperanRespuesta,
  faltanEnElDia, HORA_SIN_HORA, NOMBRE_TIPO_ENCARGO, paraMi, queMande, sinLeer,
  tareaDeEncargo,
} from '../src/lib/encargos.ts';
import type { Ajustes, Encargo, Tarea, TipoEncargo } from '../src/lib/tipos.ts';

const HOY = '2026-09-02';

function enc(id: string, e: Partial<Encargo> = {}): Encargo {
  return {
    id, de_persona_id: 'mama', para_persona_id: 'leo', titulo: id, nota: null,
    fecha: HOY, hora_sugerida: null, tipo: 'tarea', estado: 'pendiente',
    respuesta: null, respondido_en: null, visto_en: null,
    creado_en: '2026-09-02T12:00:00Z', ...e,
  };
}

// ------------------------------------------------------------------ catálogo

test('cada tipo de encargo tiene nombre y dibujo', () => {
  for (const t of ['tarea', 'recordatorio', 'consejo'] as TipoEncargo[]) {
    assert.ok(NOMBRE_TIPO_ENCARGO[t]);
    assert.ok(EMOJI_TIPO_ENCARGO[t]);
  }
});

test('solo las tareas entran al horario: un consejo se lee, no se marca', () => {
  assert.equal(entraAlHorario(enc('a', { tipo: 'tarea' })), true);
  assert.equal(entraAlHorario(enc('b', { tipo: 'recordatorio' })), false);
  assert.equal(entraAlHorario(enc('c', { tipo: 'consejo' })), false);
  assert.equal(entraAlHorario(enc('d', { tipo: 'tarea', estado: 'archivado' })), false);
});

// ------------------------------------------------------------------ bandejas

test('lo mío es lo que me mandaron, con lo más nuevo arriba', () => {
  const encargos = [
    enc('viejo', { creado_en: '2026-09-01T08:00:00Z' }),
    enc('nuevo', { creado_en: '2026-09-02T18:00:00Z' }),
    enc('de otra', { para_persona_id: 'otra' }),
    enc('archivado', { estado: 'archivado' }),
  ];
  assert.deepEqual(paraMi(encargos, 'leo').map((e) => e.id), ['nuevo', 'viejo']);
  assert.deepEqual(queMande(encargos, 'mama').map((e) => e.id),
    ['nuevo', 'de otra', 'viejo']);
});

test('la campanita cuenta lo no abierto, no lo no hecho', () => {
  const encargos = [
    enc('sin abrir'),
    enc('ya lo vi', { visto_en: '2026-09-02T13:00:00Z' }),
    enc('visto y hecho', { visto_en: '2026-09-02T13:00:00Z', estado: 'hecho' }),
    enc('de otra', { para_persona_id: 'otra' }),
  ];
  assert.equal(sinLeer(encargos, 'leo'), 1);
  assert.equal(sinLeer(encargos, 'otra'), 1);
});

test('un encargo archivado deja de gritar', () => {
  assert.equal(sinLeer([enc('a', { estado: 'archivado' })], 'leo'), 0);
});

test('quien mandó ve lo que sigue sin contestar', () => {
  const encargos = [
    enc('sin contestar'),
    enc('contestado', { respuesta: 'Ya lo hice', respondido_en: '2026-09-02T20:00:00Z' }),
  ];
  assert.deepEqual(esperanRespuesta(encargos, 'mama').map((e) => e.id), ['sin contestar']);
});

// -------------------------------------------------------------- en el horario

test('los del día salen ordenados por hora, y los sin hora al final', () => {
  const encargos = [
    enc('tarde', { hora_sugerida: '17:00' }),
    enc('cuando pueda'),
    enc('temprano', { hora_sugerida: '07:00' }),
    enc('mañana', { fecha: '2026-09-03' }),
    enc('un consejo', { tipo: 'consejo' }),
  ];
  assert.deepEqual(
    encargosDeFecha(encargos, HOY, 'leo').map((e) => e.id),
    ['temprano', 'tarde', 'cuando pueda'],
  );
});

test('un encargo se vuelve tarea y se acuerda de dónde vino', () => {
  const t = tareaDeEncargo(enc('Sacar la basura', {
    hora_sugerida: '17:30', nota: 'Antes de que pase el camión',
  }));
  assert.equal(t.encargo_id, 'Sacar la basura');
  assert.equal(t.actividad_id, null);
  assert.equal(t.origen, 'encargo');
  assert.equal(t.hora_inicio, '17:30');
  assert.equal(t.hora_fin, '18:00');
  assert.equal(t.nota, 'Antes de que pase el camión');
  assert.equal(t.estado, 'pendiente');
});

test('un encargo sin hora cae en la tarde, no a medianoche', () => {
  const t = tareaDeEncargo(enc('Ordenar'));
  assert.equal(t.hora_inicio, HORA_SIN_HORA);
});

test('un encargo ya hecho llega al día marcado', () => {
  assert.equal(tareaDeEncargo(enc('a', { estado: 'hecho' })).estado, 'hecha');
});

// ---------------------------------------------------------- llegan más tarde

test('lo que llegó después de armar el día se detecta, y no se duplica', () => {
  const puesta: Tarea = {
    ...tareaDeEncargo(enc('ya puesta')), id: 't1', dia_id: 'd',
  };
  const encargos = [enc('ya puesta'), enc('recién llegado')];
  assert.deepEqual(
    faltanEnElDia([puesta], encargos, HOY, 'leo').map((e) => e.id),
    ['recién llegado'],
  );
  assert.deepEqual(faltanEnElDia([puesta], [enc('ya puesta')], HOY, 'leo'), []);
});

// ------------------------------------------------------------------ el día

const ajustes: Ajustes = {
  persona_id: 'leo', hora_despertar: '06:00', hora_dormir: '21:30',
  ocupacion: 'colegio', ocupacion_nombre: '', hora_fin_ocupacion: '14:00',
  dias_ocupados: [1, 2, 3, 4, 5], avisos_activos: true, avisar_antes_min: 10,
  sonido_aviso: 'campana', sonido_devocional: 'arpa', vibrar: true,
  silencio_desde: null, silencio_hasta: null, tema: 'auto', celebraciones: true,
  arranque_hecho: true,
};

test('un encargo de mamá aparece en el día, en su hora', () => {
  const d = generarDia({
    fecha: HOY, zonaHoraria: 'America/Guatemala', ajustes, actividades: [], rutina: [],
    encargos: [enc('Sacar la basura', { hora_sugerida: '17:30' })],
  });
  assert.deepEqual(d.tareas.map((t) => t.titulo), ['Sacar la basura']);
  assert.equal(d.tareas[0].origen, 'encargo');
});

test('un feriado cancela el colegio, no el encargo de mamá', () => {
  const d = generarDia({
    fecha: HOY, zonaHoraria: 'America/Guatemala', ajustes, actividades: [], rutina: [],
    eventos: [{
      id: 'f', grupo_id: null, persona_id: null, tipo: 'feriado', titulo: 'Feriado',
      descripcion: null, fecha_inicio: HOY, fecha_fin: HOY, todo_el_dia: true,
      hora_inicio: null, hora_fin: null, repeticion: 'ninguna',
      efecto: 'libra_el_dia', origen: 'manual', confianza: null, confirmado: true,
    }],
    encargos: [enc('Sacar la basura', { hora_sugerida: '17:30' })],
  });
  assert.deepEqual(d.tareas.map((t) => t.titulo), ['Sacar la basura']);
});

test('el encargo de otra persona no entra en mi día', () => {
  const d = generarDia({
    fecha: HOY, zonaHoraria: 'America/Guatemala', ajustes, actividades: [], rutina: [],
    encargos: [enc('Lo de mi hermano', { para_persona_id: 'otro' })],
  });
  assert.deepEqual(d.tareas, []);
});

// ------------------------------------------------------------------ palabras

test('la campanita dice quién mandó qué', () => {
  assert.equal(comoSeLee(enc('a', { tipo: 'tarea' }), 'Mamá'), 'Mamá te mandó una tarea');
  assert.equal(comoSeLee(enc('a', { tipo: 'recordatorio' }), 'Papá'), 'Papá te recordó algo');
  assert.equal(comoSeLee(enc('a', { tipo: 'consejo' }), 'Mamá'), 'Mamá te escribió');
});

test('sin nombre no se queda en blanco', () => {
  assert.equal(comoSeLee(enc('a'), '  '), 'Alguien de tu familia te mandó una tarea');
});
