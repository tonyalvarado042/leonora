import assert from 'node:assert/strict';
import { test } from 'node:test';

import { DEVOCIONALES } from '../src/datos/devocionales.ts';
import { VERSICULOS } from '../src/datos/versiculos.ts';
import {
  devocionalDelDia, diaDelAnio, textoEn, textoParaCompartir,
  versiculoDelDia, versionesDe,
} from '../src/lib/fe.ts';

test('el día del año cuenta bien, también en bisiesto', () => {
  assert.equal(diaDelAnio('2026-01-01'), 1);
  assert.equal(diaDelAnio('2026-02-01'), 32);
  assert.equal(diaDelAnio('2026-12-31'), 365);
  assert.equal(diaDelAnio('2024-12-31'), 366); // 2024 es bisiesto
  assert.equal(diaDelAnio('2024-03-01'), 61);  // 2024: enero 31 + febrero 29
  assert.equal(diaDelAnio('2026-03-01'), 60);  // 2026: enero 31 + febrero 28
});

test('el mismo día da siempre el mismo versículo', () => {
  assert.equal(versiculoDelDia('2026-09-02')?.id, versiculoDelDia('2026-09-02')?.id);
});

test('días seguidos dan versículos distintos', () => {
  const a = versiculoDelDia('2026-09-02')!.id;
  const b = versiculoDelDia('2026-09-03')!.id;
  assert.notEqual(a, b);
});

test('la lista se da la vuelta en vez de dejar días en blanco', () => {
  const primero = versiculoDelDia('2026-01-01')!.id;
  const vuelta = versiculoDelDia(`2026-01-${String(1 + VERSICULOS.length).padStart(2, '0')}`);
  assert.equal(vuelta?.id, primero);
});

test('todos los días del año tienen versículo', () => {
  for (const f of ['2026-01-01', '2026-06-15', '2026-12-31', '2024-02-29']) {
    assert.ok(versiculoDelDia(f), `sin versículo el ${f}`);
  }
});

test('una lista vacía no revienta', () => {
  assert.equal(versiculoDelDia('2026-09-02', []), null);
  assert.equal(devocionalDelDia('2026-09-02', 13, []), null);
});

test('el texto sale en la versión pedida, o en la que haya', () => {
  const v = VERSICULOS[0];
  assert.equal(textoEn(v, 'RV1909').version, 'RV1909');
  assert.equal(textoEn(v, 'NO_EXISTE').version, v.versiones[0].version);
});

test('todos los versículos traen referencia, tema y al menos una versión', () => {
  for (const v of VERSICULOS) {
    assert.ok(v.referencia.length > 0, `${v.id} sin referencia`);
    assert.ok(v.tema.length > 0, `${v.id} sin tema`);
    assert.ok(v.versiones.length > 0, `${v.id} sin ninguna versión`);
    assert.ok(v.versiones.every((x) => x.texto.trim().length > 10), `${v.id} con texto vacío`);
  }
});

test('solo se distribuye la versión de dominio público', () => {
  const versiones = new Set(VERSICULOS.flatMap(versionesDe));
  assert.deepEqual([...versiones], ['RV1909'],
    'hay una versión con derechos sin licencia: ' + [...versiones].join(', '));
});

test('los ids de los versículos no se repiten', () => {
  assert.equal(new Set(VERSICULOS.map((v) => v.id)).size, VERSICULOS.length);
});

test('lo que se comparte lleva el texto, la referencia y la versión', () => {
  const t = textoParaCompartir(VERSICULOS[0]);
  assert.ok(t.includes(VERSICULOS[0].referencia));
  assert.ok(t.includes('RV1909'));
  assert.ok(t.includes('GraceDay'));
});

// ------------------------------------------------------------- devocionales

test('el devocional respeta la edad', () => {
  const soloAdultos = DEVOCIONALES.filter((d) => d.edad_min >= 12);
  const d = devocionalDelDia('2026-09-02', 12, soloAdultos);
  assert.ok(d && 12 >= d.edad_min);
});

test('si ninguno encaja con la edad, se sirve igual algo', () => {
  const d = devocionalDelDia('2026-09-02', 3);
  assert.ok(d, 'una edad rara no debería dejar el día sin devocional');
});

test('sin edad se sirven todos', () => {
  assert.ok(devocionalDelDia('2026-09-02', null));
});

test('todos los devocionales traen pasaje, texto y pregunta', () => {
  for (const d of DEVOCIONALES) {
    assert.ok(d.pasaje.length > 0, `${d.id} sin pasaje`);
    assert.ok(d.texto.length > 80, `${d.id} con texto demasiado corto`);
    assert.ok(d.pregunta.endsWith('?'), `${d.id}: la pregunta tiene que ser una pregunta`);
    assert.ok(d.edad_max > d.edad_min, `${d.id} con rango de edad al revés`);
  }
});

test('los ids de los devocionales no se repiten', () => {
  assert.equal(new Set(DEVOCIONALES.map((d) => d.id)).size, DEVOCIONALES.length);
});
