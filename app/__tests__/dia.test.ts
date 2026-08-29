import assert from 'node:assert/strict';
import { test } from 'node:test';

import { foco, generarDia, porcentajeCumplido, resumenAvance } from '../src/lib/dia.ts';
import type { Actividad, Ajustes, BloqueRutina, Tarea } from '../src/lib/tipos.ts';

const ZONA = 'America/Guatemala';

const ajustes: Ajustes = {
  persona_id: 'p', hora_despertar: '06:00', hora_dormir: '21:30',
  ocupacion: 'colegio', hora_fin_ocupacion: '14:00', dias_ocupados: [1, 2, 3, 4, 5],
  avisos_activos: true, avisar_antes_min: 10, sonido_aviso: 'campana',
  sonido_devocional: 'arpa', vibrar: true, silencio_desde: null, silencio_hasta: null,
  tema: 'auto', celebraciones: true,
};

function act(id: string, extra: Partial<Actividad> = {}): Actividad {
  return {
    id, persona_id: 'p', nombre: id, tipo: 'casa', emoji: '•', duracion_min: 30,
    es_habito: false, es_fijo: false, avisar: true, avisar_antes_min: null,
    activa: true, ...extra,
  };
}

function bloque(id: string, actividad_id: string, dia: number, ini: string, fin: string,
                extra: Partial<BloqueRutina> = {}): BloqueRutina {
  return {
    id, persona_id: 'p', actividad_id, modo: 'escolar', dia_semana: dia,
    hora_inicio: ini, hora_fin: fin, activo: true, ...extra,
  };
}

// 2026-09-02 es miércoles (día 3).
const MIERCOLES = '2026-09-02';
const SABADO = '2026-09-05';

test('genera solo los bloques del día de la semana que toca', () => {
  const d = generarDia({
    fecha: MIERCOLES, zonaHoraria: ZONA, ajustes,
    actividades: [act('a'), act('b')],
    rutina: [bloque('r1', 'a', 3, '06:30', '07:30'), bloque('r2', 'b', 4, '08:00', '09:00')],
  });
  assert.equal(d.dia_semana, 3);
  assert.deepEqual(d.tareas.map((t) => t.titulo), ['a']);
});

test('un sábado se marca como fin de semana', () => {
  const d = generarDia({ fecha: SABADO, zonaHoraria: ZONA, ajustes, actividades: [], rutina: [] });
  assert.equal(d.dia_semana, 6);
  assert.equal(d.tipo, 'fin_de_semana');
});

test('ordena por hora y numera desde cero', () => {
  const d = generarDia({
    fecha: MIERCOLES, zonaHoraria: ZONA, ajustes,
    actividades: [act('tarde'), act('manana')],
    rutina: [
      bloque('r1', 'tarde', 3, '14:00', '14:30'),
      bloque('r2', 'manana', 3, '06:30', '07:30'),
    ],
  });
  assert.deepEqual(d.tareas.map((t) => t.titulo), ['manana', 'tarde']);
  assert.deepEqual(d.tareas.map((t) => t.orden), [0, 1]);
});

test('a igual hora, la anclada va primero', () => {
  const d = generarDia({
    fecha: MIERCOLES, zonaHoraria: ZONA, ajustes,
    actividades: [act('suelta'), act('anclada', { es_fijo: true })],
    rutina: [
      bloque('r1', 'suelta', 3, '19:00', '19:30'),
      bloque('r2', 'anclada', 3, '19:00', '19:45'),
    ],
  });
  assert.deepEqual(d.tareas.map((t) => t.titulo), ['anclada', 'suelta']);
});

test('salta bloques apagados, actividades apagadas y referencias rotas', () => {
  const d = generarDia({
    fecha: MIERCOLES, zonaHoraria: ZONA, ajustes,
    actividades: [act('viva'), act('apagada', { activa: false })],
    rutina: [
      bloque('r1', 'viva', 3, '08:00', '09:00'),
      bloque('r2', 'apagada', 3, '10:00', '11:00'),
      bloque('r3', 'no-existe', 3, '12:00', '13:00'),
      bloque('r4', 'viva', 3, '15:00', '16:00', { activo: false }),
    ],
  });
  assert.deepEqual(d.tareas.map((t) => t.titulo), ['viva']);
});

test('generar dos veces da exactamente lo mismo', () => {
  const args = {
    fecha: MIERCOLES, zonaHoraria: ZONA, ajustes,
    actividades: [act('a'), act('b')],
    rutina: [bloque('r1', 'a', 3, '06:30', '07:30'), bloque('r2', 'b', 3, '06:30', '07:00')],
  };
  assert.deepEqual(generarDia(args), generarDia(args));
});

// ------------------------------------------------------------------ foco

function tarea(id: string, ini: string, fin: string, estado: Tarea['estado'] = 'pendiente'): Tarea {
  return {
    id, dia_id: 'd', actividad_id: null, titulo: id, emoji: '•', tipo: 'casa',
    hora_inicio: ini, hora_fin: fin, orden: 0, es_fijo: false, origen: 'rutina',
    estado, completado_en: estado === 'hecha' ? '2026-09-02T12:00:00Z' : null,
    nota: null, minutos_reales: null, termino_de_verdad: null, puntos: 0,
  };
}

test('el foco es la tarea que contiene la hora', () => {
  const f = foco([tarea('a', '06:30', '07:30'), tarea('b', '14:00', '14:30')], '14:05');
  assert.equal(f.actual?.id, 'b');
  assert.equal(f.enCurso, true);
});

test('entre tareas, el foco es la siguiente que empieza', () => {
  const f = foco([tarea('a', '06:30', '07:30'), tarea('b', '14:00', '14:30')], '10:00');
  assert.equal(f.actual?.id, 'b');
  assert.equal(f.enCurso, false);
  assert.equal(f.siguiente, null);
});

test('el foco ignora lo ya hecho aunque el reloj caiga dentro', () => {
  const f = foco([tarea('a', '14:00', '15:00', 'hecha'), tarea('b', '16:00', '17:00')], '14:30');
  assert.equal(f.actual?.id, 'b');
  assert.equal(f.enCurso, false);
});

test('cuando no queda nada pendiente, no hay foco', () => {
  const f = foco([tarea('a', '06:30', '07:30', 'hecha')], '23:00');
  assert.equal(f.actual, null);
  assert.equal(f.siguiente, null);
});

test('el límite superior es exclusivo: a las 14:30 ya no estás en la de 14:00–14:30', () => {
  const f = foco([tarea('a', '14:00', '14:30'), tarea('b', '14:30', '15:00')], '14:30');
  assert.equal(f.actual?.id, 'b');
  assert.equal(f.enCurso, true);
});

// ------------------------------------------------------------------ avance

test('el porcentaje cuenta hechas sobre las que no se omitieron', () => {
  const t = [
    tarea('a', '06:00', '07:00', 'hecha'),
    tarea('b', '08:00', '09:00', 'hecha'),
    tarea('c', '10:00', '11:00'),
    tarea('d', '12:00', '13:00', 'omitida'),
  ];
  assert.equal(porcentajeCumplido(t), 67);
  assert.deepEqual(resumenAvance(t), { hechas: 2, total: 3 });
});

test('un día vacío no divide entre cero', () => {
  assert.equal(porcentajeCumplido([]), 0);
  assert.equal(porcentajeCumplido([tarea('a', '06:00', '07:00', 'omitida')]), 0);
});
