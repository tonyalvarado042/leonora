import assert from 'node:assert/strict';
import { test } from 'node:test';

import { foco, generarDia, porcentajeCumplido, proximaOcupacion, resumenAvance, tocaEsteDia } from '../src/lib/dia.ts';
import type { Actividad, Ajustes, BloqueRutina, Tarea } from '../src/lib/tipos.ts';

const ZONA = 'America/Guatemala';

const ajustes: Ajustes = {
  persona_id: 'p', hora_despertar: '06:00', hora_dormir: '21:30',
  ocupacion: 'colegio', ocupacion_nombre: '', hora_fin_ocupacion: '14:00', dias_ocupados: [1, 2, 3, 4, 5],
  avisos_activos: true, avisar_antes_min: 10, sonido_aviso: 'campana',
  sonido_devocional: 'arpa', vibrar: true, silencio_desde: null, silencio_hasta: null,
  tema: 'auto', celebraciones: true, arranque_hecho: true,
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
    id, persona_id: 'p', actividad_id, modo: 'escolar',
    repeticion: 'semanal', dia_semana: dia, cada_n: null, dia_mes: null, mes: null,
    desde: '2020-01-01', hasta: null,
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
    nota: null, minutos_reales: null, termino_de_verdad: null, puntos: 0, metodo_devocional: null,
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

// ------------------------------------------------------- próxima ocupación

test('la próxima ocupación es el siguiente día que toca', () => {
  // 2026-09-05 es sábado.
  const r = proximaOcupacion('2026-09-05', [1, 2, 3, 4, 5], ZONA);
  assert.equal(r?.fecha, '2026-09-07');
  assert.equal(r?.nombre, 'lunes');
  assert.equal(r?.enCuantos, 2);
});

test('desde un domingo, el lunes es mañana', () => {
  const r = proximaOcupacion('2026-09-06', [1, 2, 3, 4, 5], ZONA);
  assert.equal(r?.nombre, 'lunes');
  assert.equal(r?.enCuantos, 1);
});

test('desde un lunes, la próxima es el martes, no hoy', () => {
  const r = proximaOcupacion('2026-09-07', [1, 2, 3, 4, 5], ZONA);
  assert.equal(r?.nombre, 'martes');
  assert.equal(r?.enCuantos, 1);
});

test('con un solo día ocupado, da la vuelta a la semana', () => {
  const r = proximaOcupacion('2026-09-02', [3], ZONA); // miércoles a miércoles
  assert.equal(r?.enCuantos, 7);
  assert.equal(r?.nombre, 'miércoles');
});

test('sin días ocupados no hay próxima', () => {
  assert.equal(proximaOcupacion('2026-09-05', [], ZONA), null);
});

// ------------------------------------------------------------ repeticiones

function regla(e: Partial<BloqueRutina>): BloqueRutina {
  return {
    id: 'r', persona_id: 'p', actividad_id: 'a', modo: 'escolar',
    repeticion: 'diaria', dia_semana: null, cada_n: null, dia_mes: null, mes: null,
    desde: '2026-01-01', hasta: null,
    hora_inicio: '08:00', hora_fin: '09:00', activo: true, ...e,
  };
}

test('diaria toca todos los días', () => {
  const r = regla({ repeticion: 'diaria' });
  for (const f of ['2026-09-02', '2026-09-03', '2026-09-05', '2026-12-31']) {
    assert.equal(tocaEsteDia(r, f, ZONA), true, f);
  }
});

test('semanal toca solo su día', () => {
  const r = regla({ repeticion: 'semanal', dia_semana: 3 }); // miércoles
  assert.equal(tocaEsteDia(r, '2026-09-02', ZONA), true);
  assert.equal(tocaEsteDia(r, '2026-09-03', ZONA), false);
  assert.equal(tocaEsteDia(r, '2026-09-09', ZONA), true);
});

test('cada n días cuenta desde su ancla', () => {
  const r = regla({ repeticion: 'cada_n_dias', cada_n: 15, desde: '2026-09-01' });
  assert.equal(tocaEsteDia(r, '2026-09-01', ZONA), true);
  assert.equal(tocaEsteDia(r, '2026-09-16', ZONA), true);
  assert.equal(tocaEsteDia(r, '2026-10-01', ZONA), true);
  assert.equal(tocaEsteDia(r, '2026-09-15', ZONA), false);
});

test('cada n días no toca antes de su ancla', () => {
  const r = regla({ repeticion: 'cada_n_dias', cada_n: 3, desde: '2026-09-10' });
  assert.equal(tocaEsteDia(r, '2026-09-07', ZONA), false);
  assert.equal(tocaEsteDia(r, '2026-09-10', ZONA), true);
});

test('mensual toca su día del mes', () => {
  const r = regla({ repeticion: 'mensual', dia_mes: 3 });
  assert.equal(tocaEsteDia(r, '2026-09-03', ZONA), true);
  assert.equal(tocaEsteDia(r, '2026-10-03', ZONA), true);
  assert.equal(tocaEsteDia(r, '2026-09-04', ZONA), false);
});

test('el día 31 cae en el último día de los meses cortos', () => {
  const r = regla({ repeticion: 'mensual', dia_mes: 31 });
  assert.equal(tocaEsteDia(r, '2026-01-31', ZONA), true);
  assert.equal(tocaEsteDia(r, '2026-04-30', ZONA), true, 'abril tiene 30: debería caer el 30');
  assert.equal(tocaEsteDia(r, '2026-02-28', ZONA), true, 'febrero: el último día');
  assert.equal(tocaEsteDia(r, '2026-04-29', ZONA), false);
});

test('anual toca su mes y su día', () => {
  const r = regla({ repeticion: 'anual', mes: 3, dia_mes: 14 });
  assert.equal(tocaEsteDia(r, '2026-03-14', ZONA), true);
  assert.equal(tocaEsteDia(r, '2027-03-14', ZONA), true);
  assert.equal(tocaEsteDia(r, '2026-03-15', ZONA), false);
  assert.equal(tocaEsteDia(r, '2026-04-14', ZONA), false);
});

test('el 29 de febrero cae el 28 cuando el año no es bisiesto', () => {
  // La regla tiene que empezar antes de las fechas que se prueban.
  const r = regla({ repeticion: 'anual', mes: 2, dia_mes: 29, desde: '2020-01-01' });
  assert.equal(tocaEsteDia(r, '2024-02-29', ZONA), true, '2024 es bisiesto');
  assert.equal(tocaEsteDia(r, '2026-02-28', ZONA), true, '2026 no lo es: cae el 28');
  assert.equal(tocaEsteDia(r, '2026-02-27', ZONA), false);
});

test('una regla apagada no toca nunca', () => {
  assert.equal(tocaEsteDia(regla({ activo: false }), '2026-09-02', ZONA), false);
});

test('la regla no vale antes de empezar ni después de terminar', () => {
  const r = regla({ repeticion: 'diaria', desde: '2026-09-01', hasta: '2026-09-30' });
  assert.equal(tocaEsteDia(r, '2026-08-31', ZONA), false);
  assert.equal(tocaEsteDia(r, '2026-09-15', ZONA), true);
  assert.equal(tocaEsteDia(r, '2026-10-01', ZONA), false);
});

test('una regla incompleta no toca, en vez de reventar', () => {
  assert.equal(tocaEsteDia(regla({ repeticion: 'semanal', dia_semana: null }), '2026-09-02', ZONA), false);
  assert.equal(tocaEsteDia(regla({ repeticion: 'cada_n_dias', cada_n: 0 }), '2026-09-02', ZONA), false);
  assert.equal(tocaEsteDia(regla({ repeticion: 'mensual', dia_mes: null }), '2026-09-02', ZONA), false);
  assert.equal(tocaEsteDia(regla({ repeticion: 'anual', mes: null, dia_mes: 1 }), '2026-09-02', ZONA), false);
});

test('el generador del día mezcla repeticiones distintas', () => {
  const d = generarDia({
    fecha: '2026-09-02', zonaHoraria: ZONA, ajustes, // miércoles, día 2 del mes
    actividades: [act('diaria'), act('semanal'), act('mensual'), act('anual')],
    rutina: [
      regla({ id: 'r1', actividad_id: 'diaria', repeticion: 'diaria', hora_inicio: '06:00', hora_fin: '06:30' }),
      regla({ id: 'r2', actividad_id: 'semanal', repeticion: 'semanal', dia_semana: 3, hora_inicio: '08:00', hora_fin: '09:00' }),
      regla({ id: 'r3', actividad_id: 'mensual', repeticion: 'mensual', dia_mes: 2, hora_inicio: '10:00', hora_fin: '11:00' }),
      regla({ id: 'r4', actividad_id: 'anual', repeticion: 'anual', mes: 12, dia_mes: 25, hora_inicio: '12:00', hora_fin: '13:00' }),
    ],
  });
  assert.deepEqual(d.tareas.map((t) => t.titulo), ['diaria', 'semanal', 'mensual']);
});
