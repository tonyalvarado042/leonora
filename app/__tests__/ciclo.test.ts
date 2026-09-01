import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  CICLO_MAXIMO, CICLO_MINIMO, confianza, duracionMedia, enPalabras, intervalos,
  periodos, predecir, seLeOfrece, vaLaPenaContarlo,
} from '../src/lib/ciclo.ts';
import type { DiaCiclo } from '../src/lib/tipos.ts';

function d(fecha: string, sangrado = true): DiaCiclo {
  return { persona_id: 'p', fecha, sangrado, intensidad: null, animo: null, nota: null };
}

/** Los días de un período que empieza en `inicio` y dura `n` días. */
function periodo(inicio: string, n = 5): DiaCiclo[] {
  const salida: DiaCiclo[] = [];
  const base = Date.parse(`${inicio}T00:00:00Z`);
  for (let i = 0; i < n; i++) {
    salida.push(d(new Date(base + i * 86_400_000).toISOString().slice(0, 10)));
  }
  return salida;
}

// ------------------------------------------------------------------ agrupar

test('los días seguidos son un solo período', () => {
  const ps = periodos(periodo('2026-09-01', 5));
  assert.equal(ps.length, 1);
  assert.deepEqual(ps[0], { inicio: '2026-09-01', fin: '2026-09-05', dias: 5 });
});

test('un día flojo en medio no parte el período en dos', () => {
  // Marcado el 1, 2, 4 y 5: el 3 no lo apuntó.
  const ps = periodos([d('2026-09-01'), d('2026-09-02'), d('2026-09-04'), d('2026-09-05')]);
  assert.equal(ps.length, 1, 'un hueco de un día no es un período nuevo');
  assert.equal(ps[0].dias, 5);
});

test('un hueco de verdad sí separa', () => {
  const ps = periodos([...periodo('2026-09-01', 4), ...periodo('2026-09-29', 4)]);
  assert.equal(ps.length, 2);
  assert.equal(ps[1].inicio, '2026-09-29');
});

test('los días sin sangrado no cuentan como período', () => {
  const ps = periodos([d('2026-09-01', false), d('2026-09-02', false)]);
  assert.deepEqual(ps, []);
});

test('el orden en que se apuntaron da igual', () => {
  const ps = periodos([d('2026-09-03'), d('2026-09-01'), d('2026-09-02')]);
  assert.equal(ps.length, 1);
  assert.equal(ps[0].inicio, '2026-09-01');
});

// ------------------------------------------------------------- intervalos

test('los intervalos van de principio a principio', () => {
  const ps = periodos([...periodo('2026-09-01'), ...periodo('2026-09-29')]);
  assert.deepEqual(intervalos(ps), [28]);
});

test('la media usa los tres últimos, no todos', () => {
  // 40, 28, 28, 28 → la media de los tres últimos es 28, no 31.
  const ps = periodos([
    ...periodo('2026-01-01'), ...periodo('2026-02-10'),
    ...periodo('2026-03-10'), ...periodo('2026-04-07'), ...periodo('2026-05-05'),
  ]);
  assert.equal(duracionMedia(ps), 28);
});

test('con un solo período no hay media', () => {
  assert.equal(duracionMedia(periodos(periodo('2026-09-01'))), null);
});

// ------------------------------------------------------------- confianza

test('la confianza sube con la historia, no antes', () => {
  assert.equal(confianza(periodos(periodo('2026-09-01'))), 'ninguna');
  assert.equal(confianza(periodos([...periodo('2026-08-01'), ...periodo('2026-08-29')])), 'poca');
  assert.equal(
    confianza(periodos([
      ...periodo('2026-06-01'), ...periodo('2026-06-29'),
      ...periodo('2026-07-27'), ...periodo('2026-08-24'),
    ])),
    'buena',
  );
});

// ------------------------------------------------------------- predecir

test('con un solo período NO se inventa una fecha a 28 días', () => {
  const p = predecir(periodo('2026-09-01'), '2026-09-20');
  assert.equal(p.fecha, null, 'no puede haber fecha con un solo período');
  assert.equal(p.enCuantos, null);
  assert.equal(p.confianza, 'ninguna');
  assert.equal(p.diaDelCiclo, 20);
});

test('sin nada apuntado no dice nada', () => {
  const p = predecir([], '2026-09-20');
  assert.deepEqual(p, {
    fecha: null, enCuantos: null, confianza: 'ninguna', diaDelCiclo: null, ahora: false,
  });
});

test('con dos períodos ya predice, y lo llama «más o menos»', () => {
  const dias = [...periodo('2026-08-01'), ...periodo('2026-08-29')];
  const p = predecir(dias, '2026-09-10');
  assert.equal(p.fecha, '2026-09-26');
  assert.equal(p.enCuantos, 16);
  assert.equal(p.confianza, 'poca');
  assert.match(enPalabras(p), /más o menos/);
});

test('con historia de sobra ya no dice «más o menos»', () => {
  const dias = [
    ...periodo('2026-06-01'), ...periodo('2026-06-29'),
    ...periodo('2026-07-27'), ...periodo('2026-08-24'),
  ];
  const p = predecir(dias, '2026-09-10');
  assert.equal(p.confianza, 'buena');
  assert.doesNotMatch(enPalabras(p), /más o menos/);
});

test('«ahora» sale de lo apuntado, no de la cuenta', () => {
  const dias = [...periodo('2026-08-01'), ...periodo('2026-08-29', 4)];
  // 2026-09-01 es el cuarto día del período apuntado.
  assert.equal(predecir(dias, '2026-09-01').ahora, true);
  assert.equal(enPalabras(predecir(dias, '2026-09-01')), 'Estás con el período');
  // Dos días después de que acabara, ya no.
  assert.equal(predecir(dias, '2026-09-04').ahora, false);
});

test('si se pasó de la fecha esperada, lo dice sin alarmar', () => {
  const dias = [...periodo('2026-07-01'), ...periodo('2026-07-29')];
  const p = predecir(dias, '2026-09-05');
  assert.ok(p.enCuantos !== null && p.enCuantos < 0);
  assert.match(enPalabras(p), /Se pasó por \d+ días/);
});

test('las palabras cambian con lo que se sabe', () => {
  assert.match(enPalabras(predecir([], '2026-09-01')), /Marca los días/);
  assert.match(enPalabras(predecir(periodo('2026-09-01'), '2026-09-20')),
    /Apunta un período más/);
});

// ------------------------------------------------------- cuándo contarlo

test('no dice nada raro sin historia suficiente', () => {
  assert.equal(vaLaPenaContarlo(periodos(periodo('2026-09-01'))), null);
  assert.equal(
    vaLaPenaContarlo(periodos([...periodo('2026-08-01'), ...periodo('2026-08-29')])),
    null,
  );
});

test('ciclos muy largos o muy seguidos se comentan, no se diagnostican', () => {
  const largos = periodos([
    ...periodo('2026-01-01'), ...periodo('2026-03-01'), ...periodo('2026-05-01'),
  ]);
  const aviso = vaLaPenaContarlo(largos);
  assert.ok(aviso && aviso.includes('mamá'), 'debería mandar a un adulto');
  assert.ok(aviso && !/enferm|mal|problema/i.test(aviso), 'no puede sonar a diagnóstico');

  const seguidos = periodos([
    ...periodo('2026-09-01', 3), ...periodo('2026-09-16', 3), ...periodo('2026-10-01', 3),
  ]);
  assert.ok(vaLaPenaContarlo(seguidos)?.includes('seguidos'));
});

test('un ciclo normal no dispara ningún aviso', () => {
  const ps = periodos([
    ...periodo('2026-06-01'), ...periodo('2026-06-29'),
    ...periodo('2026-07-27'), ...periodo('2026-08-24'),
  ]);
  assert.equal(vaLaPenaContarlo(ps), null);
  assert.ok(CICLO_MINIMO < 28 && 28 < CICLO_MAXIMO);
});

// -------------------------------------------------------- a quién se ofrece

test('el calendario se ofrece solo a una mujer de 12 o más', () => {
  assert.equal(seLeOfrece('mujer', 13), true);
  assert.equal(seLeOfrece('mujer', 12), true);
  assert.equal(seLeOfrece('mujer', 11), false);
  assert.equal(seLeOfrece('mujer', null), false);
  assert.equal(seLeOfrece('hombre', 15), false);
  assert.equal(seLeOfrece('sin_decir', 15), false);
  assert.equal(seLeOfrece(undefined, 15), false);
});
