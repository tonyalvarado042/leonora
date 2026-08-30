import assert from 'node:assert/strict';
import { test } from 'node:test';

import { avisosDelDia, enSilencio } from '../src/lib/avisos.ts';
import { aHora, aMinutos, diaSemana, fechaLarga, fechaLocal, horaLocal, instante } from '../src/lib/fechas.ts';
import type { Actividad, Ajustes, Tarea } from '../src/lib/tipos.ts';

const ZONA = 'America/Guatemala'; // UTC-6 todo el año, sin horario de verano.

// ------------------------------------------------------------------ horas

test('las horas van y vuelven a minutos', () => {
  assert.equal(aMinutos('00:00'), 0);
  assert.equal(aMinutos('14:30'), 870);
  assert.equal(aMinutos('23:59'), 1439);
  assert.equal(aHora(870), '14:30');
  assert.equal(aHora(0), '00:00');
});

test('una hora mal escrita falla en el sitio, no más adelante', () => {
  assert.throws(() => aMinutos('25:00'), /Hora inválida/);
  assert.throws(() => aMinutos('9:30'), /Hora inválida/);
  assert.throws(() => aMinutos('14:60'), /Hora inválida/);
});

test('aHora se ajusta al día en vez de devolver horas imposibles', () => {
  assert.equal(aHora(1440), '00:00');
  assert.equal(aHora(-30), '23:30');
});

test('la fecha local es la de la persona, no la del servidor', () => {
  // 03:00 UTC del día 3 todavía es el día 2 en Guatemala.
  const t = new Date('2026-09-03T03:00:00Z');
  assert.equal(fechaLocal(t, ZONA), '2026-09-02');
  assert.equal(horaLocal(t, ZONA), '21:00');
  assert.equal(fechaLocal(t, 'UTC'), '2026-09-03');
});

test('el día de la semana no se corre por la zona horaria', () => {
  assert.equal(diaSemana('2026-09-02', ZONA), 3); // miércoles
  assert.equal(diaSemana('2026-09-06', ZONA), 0); // domingo
  assert.equal(diaSemana('2026-09-05', 'Asia/Tokyo'), 6);
});

test('la fecha larga se lee como se dice', () => {
  assert.equal(fechaLarga('2026-09-02', ZONA), 'Miércoles 2 de septiembre');
});

test('instante convierte hora local a instante real', () => {
  assert.equal(instante('2026-09-02', '14:00', ZONA).toISOString(), '2026-09-02T20:00:00.000Z');
});

test('instante respeta el horario de verano donde lo hay', () => {
  // Madrid: verano UTC+2, invierno UTC+1.
  assert.equal(instante('2026-07-15', '12:00', 'Europe/Madrid').toISOString(), '2026-07-15T10:00:00.000Z');
  assert.equal(instante('2026-01-15', '12:00', 'Europe/Madrid').toISOString(), '2026-01-15T11:00:00.000Z');
});

// ------------------------------------------------------------------ silencio

test('el silencio normal cubre solo su rango', () => {
  assert.equal(enSilencio('14:00', '13:00', '15:00'), true);
  assert.equal(enSilencio('12:00', '13:00', '15:00'), false);
  assert.equal(enSilencio('15:00', '13:00', '15:00'), false); // el final no entra
});

test('el silencio que cruza medianoche cubre los dos lados', () => {
  assert.equal(enSilencio('23:00', '22:00', '06:00'), true);
  assert.equal(enSilencio('02:00', '22:00', '06:00'), true);
  assert.equal(enSilencio('12:00', '22:00', '06:00'), false);
  assert.equal(enSilencio('06:00', '22:00', '06:00'), false);
});

test('sin silencio configurado nada está en silencio', () => {
  assert.equal(enSilencio('03:00', null, null), false);
});

// ------------------------------------------------------------------ avisos

const ajustes: Ajustes = {
  persona_id: 'p', hora_despertar: '06:00', hora_dormir: '21:30',
  ocupacion: 'colegio', ocupacion_nombre: '', hora_fin_ocupacion: '14:00', dias_ocupados: [1, 2, 3, 4, 5],
  avisos_activos: true, avisar_antes_min: 10, sonido_aviso: 'campana',
  sonido_devocional: 'arpa', vibrar: true, silencio_desde: null, silencio_hasta: null,
  tema: 'auto', celebraciones: true, arranque_hecho: true,
};

function act(id: string, e: Partial<Actividad> = {}): Actividad {
  return {
    id, persona_id: 'p', nombre: id, tipo: 'casa', emoji: '•', duracion_min: 30,
    es_habito: false, es_fijo: false, avisar: true, avisar_antes_min: null,
    activa: true, ...e,
  };
}

function tarea(id: string, actividad_id: string | null, ini: string, fin: string,
               e: Partial<Tarea> = {}): Tarea {
  return {
    id, dia_id: 'd', actividad_id, encargo_id: null, titulo: id, emoji: '•', tipo: 'casa',
    hora_inicio: ini, hora_fin: fin, orden: 0, es_fijo: false, origen: 'rutina',
    estado: 'pendiente', completado_en: null, nota: null, minutos_reales: null,
    termino_de_verdad: null, puntos: 0, ...e,
    metodo_devocional: e.metodo_devocional ?? null,
  };
}

const MADRUGADA = new Date('2026-09-02T06:00:00Z'); // medianoche en Guatemala

function base(extra: Partial<Parameters<typeof avisosDelDia>[0]> = {}) {
  return avisosDelDia({
    fecha: '2026-09-02', zonaHoraria: ZONA, ajustes,
    actividades: [act('a')], tareas: [tarea('t1', 'a', '14:00', '14:30')],
    ahora: MADRUGADA, ...extra,
  });
}

test('avisa con la anticipación de ajustes y lo dice en el título', () => {
  const [a] = base();
  assert.equal(a.titulo, 'En 10 min: t1');
  assert.equal(a.cuerpo, '14:00 — 14:30');
  assert.equal(a.momento.toISOString(), '2026-09-02T19:50:00.000Z'); // 13:50 local
});

test('la actividad le lleva la contraria a los ajustes', () => {
  const [a] = base({ actividades: [act('a', { avisar_antes_min: 30 })] });
  assert.equal(a.titulo, 'En 30 min: t1');
  assert.equal(a.momento.toISOString(), '2026-09-02T19:30:00.000Z'); // 13:30 local
});

test('una actividad sin aviso no suena', () => {
  assert.deepEqual(base({ actividades: [act('a', { avisar: false })] }), []);
});

test('apagar los avisos apaga todos', () => {
  assert.deepEqual(base({ ajustes: { ...ajustes, avisos_activos: false } }), []);
});

test('lo ya hecho no vuelve a sonar', () => {
  const hecha = tarea('t1', 'a', '14:00', '14:30', {
    estado: 'hecha', completado_en: '2026-09-02T19:00:00Z',
  });
  assert.deepEqual(base({ tareas: [hecha] }), []);
});

test('no se programa nada que ya pasó', () => {
  // 20:00 local: la tarea de las 14:00 quedó atrás.
  assert.deepEqual(base({ ahora: new Date('2026-09-03T02:00:00Z') }), []);
});

test('el devocional suena con su propio sonido', () => {
  const avisos = avisosDelDia({
    fecha: '2026-09-02', zonaHoraria: ZONA, ajustes,
    actividades: [act('d', { tipo: 'fe' }), act('c')],
    tareas: [
      tarea('devo', 'd', '06:30', '07:30', { tipo: 'fe' }),
      tarea('cena', 'c', '19:00', '19:45'),
    ],
    ahora: MADRUGADA,
  });
  assert.deepEqual(avisos.map((a) => a.sonido), ['arpa', 'campana']);
});

test('el silencio se mide en la hora del aviso, no en la de la tarea', () => {
  // Tarea a las 06:00, aviso 30 min antes = 05:30, dentro de 22:00–06:00.
  const avisos = avisosDelDia({
    fecha: '2026-09-02', zonaHoraria: ZONA,
    ajustes: { ...ajustes, silencio_desde: '22:00', silencio_hasta: '06:00' },
    actividades: [act('a', { avisar_antes_min: 30 })],
    tareas: [tarea('t1', 'a', '06:00', '06:30')],
    ahora: MADRUGADA,
  });
  assert.deepEqual(avisos, []);
});

test('con anticipación cero el título dice «Ahora»', () => {
  const [a] = base({ actividades: [act('a', { avisar_antes_min: 0 })] });
  assert.equal(a.titulo, 'Ahora: t1');
});

test('salen ordenados por hora', () => {
  const avisos = avisosDelDia({
    fecha: '2026-09-02', zonaHoraria: ZONA, ajustes,
    actividades: [act('a')],
    tareas: [
      tarea('tarde', 'a', '19:00', '19:45'),
      tarea('manana', 'a', '06:30', '07:30'),
    ],
    ahora: MADRUGADA,
  });
  assert.deepEqual(avisos.map((a) => a.tarea_id), ['manana', 'tarde']);
});

test('una tarea suelta, sin actividad, usa la regla general', () => {
  const [a] = base({ tareas: [tarea('suelta', null, '14:00', '14:30')], actividades: [] });
  assert.equal(a.titulo, 'En 10 min: suelta');
});
