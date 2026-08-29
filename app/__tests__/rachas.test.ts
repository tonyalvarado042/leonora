import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  avanzar, celebracionPor, chispas, cumplioHoy, LOGROS, logrosAl,
  preguntarSiTermino, proximoLogro, rachaVacia, type Racha,
} from '../src/lib/rachas.ts';
import { diasEntre, mesDe, sumarDias } from '../src/lib/fechas.ts';
import type { Actividad, Tarea } from '../src/lib/tipos.ts';

// ------------------------------------------------------------------ fechas

test('diasEntre y sumarDias cruzan meses y años', () => {
  assert.equal(diasEntre('2026-09-02', '2026-09-03'), 1);
  assert.equal(diasEntre('2026-08-31', '2026-09-01'), 1);
  assert.equal(diasEntre('2026-12-31', '2027-01-01'), 1);
  assert.equal(diasEntre('2026-09-03', '2026-09-02'), -1);
  assert.equal(sumarDias('2026-02-28', 1), '2026-03-01'); // 2026 no es bisiesto
  assert.equal(sumarDias('2024-02-28', 1), '2024-02-29'); // 2024 sí
  assert.equal(mesDe('2026-09-17'), '2026-09-01');
});

// ------------------------------------------------------------------ avanzar

test('el primer día empieza la racha en 1', () => {
  const a = avanzar(rachaVacia('devocional'), '2026-09-02');
  assert.equal(a.racha.racha_actual, 1);
  assert.equal(a.racha.total_dias, 1);
  assert.equal(a.racha.ultimo_dia, '2026-09-02');
});

test('un día seguido suma uno', () => {
  const ayer: Racha = { ...rachaVacia('devocional'), racha_actual: 5, racha_mejor: 5, ultimo_dia: '2026-09-01' };
  const a = avanzar(ayer, '2026-09-02');
  assert.equal(a.racha.racha_actual, 6);
  assert.equal(a.racha.racha_mejor, 6);
  assert.equal(a.uso_gracia, false);
});

test('el mismo día no cuenta dos veces', () => {
  const hoy: Racha = { ...rachaVacia('dia'), racha_actual: 5, ultimo_dia: '2026-09-02' };
  const a = avanzar(hoy, '2026-09-02');
  assert.equal(a.repetido, true);
  assert.equal(a.racha.racha_actual, 5);
  assert.deepEqual(a.logros, []);
});

test('fallar un día lo salva la gracia, una sola vez al mes', () => {
  const base: Racha = { ...rachaVacia('devocional'), racha_actual: 12, racha_mejor: 12, ultimo_dia: '2026-09-01' };
  const primera = avanzar(base, '2026-09-03'); // se saltó el 2
  assert.equal(primera.uso_gracia, true);
  assert.equal(primera.racha.racha_actual, 13);
  assert.equal(primera.racha.gracia_usada_mes, '2026-09-01');

  const segunda = avanzar(primera.racha, '2026-09-05'); // se saltó el 4, ya sin gracia
  assert.equal(segunda.uso_gracia, false);
  assert.equal(segunda.racha.racha_actual, 1);
});

test('la gracia se renueva al cambiar de mes', () => {
  const gastada: Racha = {
    ...rachaVacia('dia'), racha_actual: 20, racha_mejor: 20,
    ultimo_dia: '2026-09-29', gracia_usada_mes: '2026-09-01',
  };
  const a = avanzar(gastada, '2026-10-01'); // se saltó el 30, ya en octubre
  assert.equal(a.uso_gracia, true);
  assert.equal(a.racha.racha_actual, 21);
  assert.equal(a.racha.gracia_usada_mes, '2026-10-01');
});

test('faltar dos días seguidos rompe la racha aunque quede gracia', () => {
  const base: Racha = { ...rachaVacia('dia'), racha_actual: 40, racha_mejor: 40, ultimo_dia: '2026-09-01' };
  const a = avanzar(base, '2026-09-04'); // se saltó el 2 y el 3
  assert.equal(a.racha.racha_actual, 1);
  assert.equal(a.uso_gracia, false);
});

test('romper la racha no borra el récord', () => {
  const base: Racha = { ...rachaVacia('dia'), racha_actual: 40, racha_mejor: 40, ultimo_dia: '2026-01-01' };
  const a = avanzar(base, '2026-09-02');
  assert.equal(a.racha.racha_actual, 1);
  assert.equal(a.racha.racha_mejor, 40);
});

// ------------------------------------------------------------------ logros

test('cruzar un umbral desbloquea su insignia', () => {
  const seis: Racha = { ...rachaVacia('devocional'), racha_actual: 6, ultimo_dia: '2026-09-01' };
  const a = avanzar(seis, '2026-09-02', new Set(['fe-3']));
  assert.deepEqual(a.logros.map((l) => l.id), ['fe-7']);
});

test('las ya ganadas no se vuelven a dar', () => {
  const a = logrosAl('devocional', 30, new Set(['fe-3', 'fe-7', 'fe-14', 'fe-30']));
  assert.deepEqual(a, []);
});

test('empezar de cero en 3 días da la primera de golpe, no las anteriores', () => {
  assert.deepEqual(logrosAl('dia', 3, new Set()).map((l) => l.id), ['dia-3']);
});

test('el próximo logro es el siguiente peldaño', () => {
  assert.equal(proximoLogro('devocional', 12)?.id, 'fe-14');
  assert.equal(proximoLogro('devocional', 365), null);
});

test('son 24 insignias, cuatro vías, sin ids repetidos', () => {
  assert.equal(LOGROS.length, 24);
  assert.equal(new Set(LOGROS.map((l) => l.id)).size, 24);
  assert.deepEqual([...new Set(LOGROS.map((l) => l.via))].sort(),
    ['apertura', 'devocional', 'dia', 'oracion']);
});

// ------------------------------------------------------------------ cumplió

function tarea(tipo: Tarea['tipo'], estado: Tarea['estado']): Tarea {
  return {
    id: Math.random().toString(36), dia_id: 'd', actividad_id: null, titulo: 't',
    emoji: '•', tipo, hora_inicio: '08:00', hora_fin: '09:00', orden: 0,
    es_fijo: false, origen: 'rutina', estado,
    completado_en: estado === 'hecha' ? '2026-09-02T12:00:00Z' : null,
    nota: null, minutos_reales: null, termino_de_verdad: null, puntos: 0,
  };
}

test('el devocional se cumple cuando están todas las de fe', () => {
  assert.equal(cumplioHoy('devocional', [tarea('fe', 'hecha'), tarea('casa', 'pendiente')]), true);
  assert.equal(cumplioHoy('devocional', [tarea('fe', 'hecha'), tarea('fe', 'pendiente')]), false);
});

test('sin ninguna tarea de fe, la vía del devocional no se cumple sola', () => {
  assert.equal(cumplioHoy('devocional', [tarea('casa', 'hecha')]), false);
  assert.equal(cumplioHoy('devocional', []), false);
});

test('el día se cumple cuando está todo lo que cuenta', () => {
  assert.equal(cumplioHoy('dia', [tarea('fe', 'hecha'), tarea('casa', 'hecha')]), true);
  assert.equal(cumplioHoy('dia', [tarea('fe', 'hecha'), tarea('casa', 'pendiente')]), false);
});

test('lo omitido no impide cumplir el día', () => {
  assert.equal(cumplioHoy('dia', [tarea('fe', 'hecha'), tarea('casa', 'omitida')]), true);
});

test('un día entero omitido no cuenta como cumplido', () => {
  assert.equal(cumplioHoy('dia', [tarea('casa', 'omitida')]), false);
});

// ------------------------------------------------------------------ chispas

test('en los quehaceres se premia la rapidez', () => {
  assert.equal(chispas('casa', 30, { minutos_reales: 30, termino_de_verdad: null }), 10);
  assert.equal(chispas('casa', 30, { minutos_reales: 5, termino_de_verdad: null }), 23);
  assert.equal(chispas('casa', 30, { minutos_reales: 0, termino_de_verdad: null }), 25);
});

test('en el estudio se premia haber terminado, no haber parado el reloj', () => {
  assert.equal(chispas('estudio', 60, { minutos_reales: 30, termino_de_verdad: true }), 20);
  assert.equal(chispas('estudio', 60, { minutos_reales: 30, termino_de_verdad: false }), 10);
  // Correr sin terminar no paga más que ir despacio: es justo lo que se busca.
  assert.equal(
    chispas('estudio', 60, { minutos_reales: 5, termino_de_verdad: false }),
    chispas('estudio', 60, { minutos_reales: 60, termino_de_verdad: false }),
  );
});

test('en la fe se premia el tiempo completo', () => {
  assert.equal(chispas('fe', 60, { minutos_reales: 60, termino_de_verdad: null }), 20);
  assert.equal(chispas('fe', 60, { minutos_reales: 20, termino_de_verdad: null }), 10);
});

test('los tipos sin regla propia dan la base', () => {
  assert.equal(chispas('familia', 45, { minutos_reales: 10, termino_de_verdad: null }), 10);
  assert.equal(chispas('descanso', 30, { minutos_reales: null, termino_de_verdad: null }), 10);
});

test('sin minutos medidos no se inventa un premio de rapidez', () => {
  assert.equal(chispas('casa', 30, { minutos_reales: null, termino_de_verdad: null }), 10);
});

// ------------------------------------------------------- preguntar y celebrar

function act(tipo: Actividad['tipo'], duracion: number): Actividad {
  return {
    id: 'a', persona_id: 'p', nombre: 'n', tipo, emoji: '•', duracion_min: duracion,
    es_habito: false, es_fijo: false, avisar: true, avisar_antes_min: null, activa: true,
  };
}

test('solo se pregunta al marcar estudio antes de tiempo', () => {
  assert.equal(preguntarSiTermino(tarea('estudio', 'pendiente'), act('estudio', 60), 30), true);
  assert.equal(preguntarSiTermino(tarea('estudio', 'pendiente'), act('estudio', 60), 60), false);
  assert.equal(preguntarSiTermino(tarea('casa', 'pendiente'), act('casa', 30), 5), false);
  assert.equal(preguntarSiTermino(tarea('estudio', 'pendiente'), undefined, 5), false);
});

test('cada premio tiene su forma, y la insignia manda', () => {
  const l = [LOGROS[0]];
  assert.equal(celebracionPor({ logros: l, diaPerfecto: true, rachaAvanzo: true, chispasExtra: true }), 'confeti');
  assert.equal(celebracionPor({ logros: [], diaPerfecto: true, rachaAvanzo: true, chispasExtra: false }), 'estrellas');
  assert.equal(celebracionPor({ logros: [], diaPerfecto: false, rachaAvanzo: true, chispasExtra: false }), 'fuego');
  assert.equal(celebracionPor({ logros: [], diaPerfecto: false, rachaAvanzo: false, chispasExtra: true }), 'fuego');
  assert.equal(celebracionPor({ logros: [], diaPerfecto: false, rachaAvanzo: false, chispasExtra: false }), null);
});
