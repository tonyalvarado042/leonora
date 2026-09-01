import assert from 'node:assert/strict';
import { test } from 'node:test';

import { armarSemana, RESPUESTAS_EN_BLANCO, type Respuestas } from '../src/lib/arranque.ts';
import { generarDia } from '../src/lib/dia.ts';
import { aMinutos } from '../src/lib/fechas.ts';
import type { Ajustes } from '../src/lib/tipos.ts';

const ZONA = 'America/Guatemala';

function respuestas(cambios: Partial<Respuestas> = {}): Respuestas {
  return {
    ...RESPUESTAS_EN_BLANCO,
    nombre: 'Leonora', edad: 13,
    quehaceres: ['cama', 'cuarto'], gustos: ['leer', 'dibujar'],
    ...cambios,
  };
}

const ajustes: Ajustes = {
  persona_id: 'p', hora_despertar: '06:00', hora_dormir: '21:30',
  ocupacion: 'colegio', ocupacion_nombre: '', hora_fin_ocupacion: '14:00', dias_ocupados: [1, 2, 3, 4, 5],
  avisos_activos: true, avisar_antes_min: 10, sonido_aviso: 'campana',
  sonido_devocional: 'arpa', vibrar: true, silencio_desde: null, silencio_hasta: null,
  tema: 'auto', celebraciones: true, ciclo_activo: false, arranque_hecho: true,
};

test('arma los siete días de la semana', () => {
  const p = armarSemana(respuestas(), 'p');
  const dias = new Set(p.rutina.map((b) => b.dia_semana));
  assert.deepEqual([...dias].sort(), [0, 1, 2, 3, 4, 5, 6]);
});

test('el devocional va lo primero del día, antes que nada', () => {
  const p = armarSemana(respuestas(), 'p');
  const lunes = p.rutina.filter((b) => b.dia_semana === 1)
    .sort((a, b) => aMinutos(a.hora_inicio) - aMinutos(b.hora_inicio));
  const primera = p.actividades.find((a) => a.id === lunes[0].actividad_id);
  assert.equal(primera?.tipo, 'fe');
  assert.equal(lunes[0].hora_inicio, '06:00');
  assert.equal(lunes[0].hora_fin, '07:00'); // 60 min por defecto
});

test('respeta cuántos minutos de devocional se pidieron', () => {
  const p = armarSemana(respuestas({ devocional_min: 15 }), 'p');
  const devo = p.rutina.find((b) => b.dia_semana === 1 && b.actividad_id === 'act-devocional');
  assert.equal(devo?.hora_fin, '06:15');
});

test('«ambas» pone dos devocionales al día, y el de la noche antes de dormir', () => {
  const p = armarSemana(respuestas({ devocional_momento: 'ambas' }), 'p');
  const fe = p.actividades.filter((a) => a.tipo === 'fe');
  assert.equal(fe.length, 2);
  const noche = p.rutina.find((b) => b.dia_semana === 1 && b.actividad_id === 'act-devocional-noche');
  assert.ok(aMinutos(noche!.hora_fin) < aMinutos('21:30'), 'el de la noche tiene que acabar antes de dormir');
});

test('«noche» no pone ninguno por la mañana', () => {
  const p = armarSemana(respuestas({ devocional_momento: 'noche' }), 'p');
  assert.equal(p.actividades.filter((a) => a.tipo === 'fe').length, 1);
  assert.equal(p.rutina.some((b) => b.actividad_id === 'act-devocional'), false);
});

test('el colegio solo cae en los días de colegio', () => {
  const p = armarSemana(respuestas({ dias_ocupados: [1, 3, 5] }), 'p');
  const dias = p.rutina.filter((b) => b.actividad_id === 'act-ocupacion')
    .map((b) => b.dia_semana).sort();
  assert.deepEqual(dias, [1, 3, 5]);
});

test('el estudio empieza justo cuando termina el colegio', () => {
  const p = armarSemana(respuestas({ ocupacion_fin: '14:00' }), 'p');
  const est = p.rutina.find((b) => b.dia_semana === 1 && b.actividad_id === 'act-estudiar');
  assert.equal(est?.hora_inicio, '14:00');
});

test('el fin de semana se empieza una hora más tarde', () => {
  const p = armarSemana(respuestas(), 'p');
  const sab = p.rutina.find((b) => b.dia_semana === 6 && b.actividad_id === 'act-devocional');
  assert.equal(sab?.hora_inicio, '07:00');
  assert.equal(p.rutina.some((b) => b.dia_semana === 6 && b.actividad_id === 'act-ocupacion'), false);
});

test('en el trabajo la etiqueta y el emoji cambian, y no se añade estudio', () => {
  const p = armarSemana(respuestas({ ocupacion: 'trabajo' }), 'p');
  const o = p.actividades.find((a) => a.id === 'act-ocupacion');
  assert.equal(o?.nombre, 'Trabajo');
  assert.equal(o?.emoji, '💼');
  assert.equal(p.actividades.some((a) => a.id === 'act-estudiar'), false);
});

test('sin colegio ni trabajo la semana sigue teniendo sentido', () => {
  const p = armarSemana(respuestas({ ocupacion: 'ninguno' }), 'p');
  assert.equal(p.rutina.some((b) => b.actividad_id === 'act-ocupacion'), false);
  assert.ok(p.rutina.filter((b) => b.dia_semana === 1).length >= 4);
  assert.ok(p.resumen.some((r) => r.includes('Sin colegio ni trabajo')));
});

test('nada flexible se pone encima de la cena', () => {
  const p = armarSemana(respuestas({
    quehaceres: ['cama', 'cuarto', 'platos', 'basura', 'ropa', 'mascota'],
    gustos: ['leer', 'dibujar', 'musica', 'deporte'],
    ocupacion_fin: '18:00',
  }), 'p');
  for (const b of p.rutina.filter((x) => x.dia_semana === 1)) {
    const a = p.actividades.find((y) => y.id === b.actividad_id)!;
    if (a.es_fijo) continue;
    assert.ok(aMinutos(b.hora_fin) <= aMinutos('19:00'),
      `${a.nombre} se mete en la cena: acaba a las ${b.hora_fin}`);
  }
});

test('ningún bloque acaba antes de empezar', () => {
  const p = armarSemana(respuestas({ devocional_momento: 'ambas' }), 'p');
  for (const b of p.rutina) {
    assert.ok(aMinutos(b.hora_fin) > aMinutos(b.hora_inicio),
      `bloque al revés: ${b.hora_inicio}–${b.hora_fin}`);
  }
});

test('todo bloque apunta a una actividad que existe', () => {
  const p = armarSemana(respuestas(), 'p');
  const ids = new Set(p.actividades.map((a) => a.id));
  for (const b of p.rutina) assert.ok(ids.has(b.actividad_id), `huérfano: ${b.actividad_id}`);
});

test('con las mismas respuestas sale siempre la misma semana', () => {
  assert.deepEqual(armarSemana(respuestas(), 'p'), armarSemana(respuestas(), 'p'));
});

test('lo que arma el asistente lo entiende el generador del día', () => {
  const p = armarSemana(respuestas(), 'p');
  const dia = generarDia({
    fecha: '2026-09-02', zonaHoraria: ZONA, // miércoles
    ajustes: { ...ajustes, ...p.ajustes },
    actividades: p.actividades, rutina: p.rutina,
  });
  assert.ok(dia.tareas.length >= 5, 'el miércoles salió casi vacío');
  assert.equal(dia.tareas[0].tipo, 'fe', 'el día no empieza con el devocional');
  assert.equal(dia.tipo, 'escolar');
});

test('los ajustes que devuelve recogen lo contestado', () => {
  const p = armarSemana(respuestas({ hora_dormir: '22:30', ocupacion_fin: '15:00' }), 'p');
  assert.equal(p.ajustes.hora_dormir, '22:30');
  assert.equal(p.ajustes.hora_fin_ocupacion, '15:00');
});
