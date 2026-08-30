import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  anosQueCumple, caeEnFecha, EFECTO_POR_TIPO, EMOJI_TIPO_EVENTO, enPalabras,
  eventosDeFecha, libraElDia, NOMBRE_TIPO_EVENTO, proximos,
} from '../src/lib/eventos.ts';
import type { Evento, TipoEvento } from '../src/lib/tipos.ts';

const TIPOS: TipoEvento[] = [
  'feriado', 'escolar', 'examen', 'entrega', 'cumpleanos', 'cita', 'viaje', 'personal',
];

function ev(id: string, e: Partial<Evento> = {}): Evento {
  const tipo = e.tipo ?? 'personal';
  return {
    id, grupo_id: 'g', persona_id: null, tipo, titulo: id, descripcion: null,
    fecha_inicio: '2026-09-02', fecha_fin: '2026-09-02', todo_el_dia: true,
    hora_inicio: null, hora_fin: null, repeticion: 'ninguna',
    efecto: EFECTO_POR_TIPO[tipo], origen: 'manual', confianza: null,
    confirmado: true, ...e,
  };
}

// ------------------------------------------------------------------ catálogo

test('todos los tipos tienen nombre, emoji y efecto', () => {
  for (const t of TIPOS) {
    assert.ok(NOMBRE_TIPO_EVENTO[t], `falta el nombre de ${t}`);
    assert.ok(EMOJI_TIPO_EVENTO[t], `falta el emoji de ${t}`);
    assert.ok(EFECTO_POR_TIPO[t], `falta el efecto de ${t}`);
  }
});

test('un feriado libra el día y un examen solo avisa', () => {
  assert.equal(EFECTO_POR_TIPO.feriado, 'libra_el_dia');
  assert.equal(EFECTO_POR_TIPO.viaje, 'libra_el_dia');
  assert.equal(EFECTO_POR_TIPO.examen, 'solo_avisa');
  assert.equal(EFECTO_POR_TIPO.cumpleanos, 'solo_avisa');
});

// ------------------------------------------------------------------- caeEn

test('un evento de un día cae solo ese día', () => {
  const e = ev('feria', { fecha_inicio: '2026-09-02', fecha_fin: '2026-09-02' });
  assert.equal(caeEnFecha(e, '2026-09-01'), false);
  assert.equal(caeEnFecha(e, '2026-09-02'), true);
  assert.equal(caeEnFecha(e, '2026-09-03'), false);
});

test('un evento de varios días cae en todos, no solo en el primero', () => {
  const viaje = ev('viaje', {
    tipo: 'viaje', fecha_inicio: '2026-09-02', fecha_fin: '2026-09-06',
  });
  for (const f of ['2026-09-02', '2026-09-03', '2026-09-05', '2026-09-06']) {
    assert.equal(caeEnFecha(viaje, f), true, `debería caer el ${f}`);
  }
  assert.equal(caeEnFecha(viaje, '2026-09-07'), false);
});

test('un cumpleaños anual vuelve cada año, sin importar el año que se guardó', () => {
  const cumple = ev('Leonora', {
    tipo: 'cumpleanos', repeticion: 'anual',
    fecha_inicio: '2012-11-14', fecha_fin: '2012-11-14',
  });
  assert.equal(caeEnFecha(cumple, '2026-11-14'), true);
  assert.equal(caeEnFecha(cumple, '2030-11-14'), true);
  assert.equal(caeEnFecha(cumple, '2026-11-13'), false);
  assert.equal(caeEnFecha(cumple, '2026-10-14'), false);
});

test('el cumpleaños del 29 de febrero se celebra el 28 cuando el año no es bisiesto', () => {
  const cumple = ev('bisiesto', {
    tipo: 'cumpleanos', repeticion: 'anual',
    fecha_inicio: '2012-02-29', fecha_fin: '2012-02-29',
  });
  assert.equal(caeEnFecha(cumple, '2028-02-29'), true);  // bisiesto: su día
  assert.equal(caeEnFecha(cumple, '2028-02-28'), false);
  assert.equal(caeEnFecha(cumple, '2026-02-28'), true);  // no bisiesto: el 28
  assert.equal(caeEnFecha(cumple, '2026-03-01'), false);
});

test('lo que salió de una foto y nadie confirmó no cae en ningún día', () => {
  const leido = ev('Examen de mate', {
    tipo: 'examen', origen: 'foto', confianza: 0.6, confirmado: false,
  });
  assert.equal(caeEnFecha(leido, '2026-09-02'), false);
  assert.deepEqual(eventosDeFecha([leido], '2026-09-02', 'p1'), []);
});

// ------------------------------------------------------------- eventosDeFecha

test('los del grupo salen para todos; los de una persona, solo para ella', () => {
  const eventos = [
    ev('Feriado', { tipo: 'feriado', persona_id: null }),
    ev('Examen', { tipo: 'examen', persona_id: 'p1' }),
    ev('Cita', { tipo: 'cita', persona_id: 'p2' }),
  ];
  assert.deepEqual(
    eventosDeFecha(eventos, '2026-09-02', 'p1').map((e) => e.id),
    ['Examen', 'Feriado'],
  );
  assert.deepEqual(
    eventosDeFecha(eventos, '2026-09-02', 'p2').map((e) => e.id),
    ['Cita', 'Feriado'],
  );
});

test('salen en orden alfabético español, con las tildes en su sitio', () => {
  const eventos = [
    ev('Zapatería'), ev('Álbum'), ev('Misa'), ev('ñoño'),
  ];
  assert.deepEqual(
    eventosDeFecha(eventos, '2026-09-02', 'p1').map((e) => e.id),
    ['Álbum', 'Misa', 'ñoño', 'Zapatería'],
  );
});

// ---------------------------------------------------------------- libraElDia

test('un feriado libra el día', () => {
  const eventos = [ev('Independencia', { tipo: 'feriado', fecha_inicio: '2026-09-15', fecha_fin: '2026-09-15' })];
  assert.equal(libraElDia(eventos, '2026-09-15', 'p1')?.id, 'Independencia');
  assert.equal(libraElDia(eventos, '2026-09-16', 'p1'), null);
});

test('un examen no libra el día por mucho que pese', () => {
  const eventos = [ev('Examen', { tipo: 'examen' })];
  assert.equal(libraElDia(eventos, '2026-09-02', 'p1'), null);
});

test('el feriado de otra persona no me libra a mí', () => {
  const eventos = [ev('Viaje de Emma', { tipo: 'viaje', persona_id: 'p2' })];
  assert.equal(libraElDia(eventos, '2026-09-02', 'p1'), null);
  assert.equal(libraElDia(eventos, '2026-09-02', 'p2')?.id, 'Viaje de Emma');
});

// ------------------------------------------------------------------ próximos

test('los próximos empiezan mañana, no hoy', () => {
  const eventos = [
    ev('hoy', { fecha_inicio: '2026-09-02', fecha_fin: '2026-09-02' }),
    ev('mañana', { fecha_inicio: '2026-09-03', fecha_fin: '2026-09-03' }),
    ev('el sábado', { fecha_inicio: '2026-09-05', fecha_fin: '2026-09-05' }),
    ev('en tres semanas', { fecha_inicio: '2026-09-23', fecha_fin: '2026-09-23' }),
  ];
  assert.deepEqual(
    proximos(eventos, '2026-09-02', 'p1').map((p) => [p.evento.id, p.enCuantos]),
    [['mañana', 1], ['el sábado', 3]],
  );
});

test('la ventana de próximos se puede abrir más', () => {
  const eventos = [ev('lejos', { fecha_inicio: '2026-09-20', fecha_fin: '2026-09-20' })];
  assert.deepEqual(proximos(eventos, '2026-09-02', 'p1'), []);
  assert.equal(proximos(eventos, '2026-09-02', 'p1', 30).length, 1);
});

test('un cumpleaños anual aparece en los próximos aunque se guardó hace años', () => {
  const cumple = ev('Mamá', {
    tipo: 'cumpleanos', repeticion: 'anual',
    fecha_inicio: '1985-09-04', fecha_fin: '1985-09-04',
  });
  const [p] = proximos([cumple], '2026-09-02', 'p1');
  assert.equal(p.evento.id, 'Mamá');
  assert.equal(p.enCuantos, 2);
});

test('los próximos cruzan el cambio de mes', () => {
  const eventos = [ev('uno de octubre', { fecha_inicio: '2026-10-01', fecha_fin: '2026-10-01' })];
  const [p] = proximos(eventos, '2026-09-28', 'p1');
  assert.equal(p.enCuantos, 3);
});

// ------------------------------------------------------------------- cumple

test('los años que cumple salen del año guardado', () => {
  const cumple = ev('Leonora', {
    tipo: 'cumpleanos', repeticion: 'anual',
    fecha_inicio: '2012-11-14', fecha_fin: '2012-11-14',
  });
  assert.equal(anosQueCumple(cumple, '2026-11-14'), 14);
});

test('sin año de verdad no se inventa una edad', () => {
  const mismoAno = ev('Amiga', {
    tipo: 'cumpleanos', repeticion: 'anual',
    fecha_inicio: '2026-11-14', fecha_fin: '2026-11-14',
  });
  assert.equal(anosQueCumple(mismoAno, '2026-11-14'), null);
  assert.equal(anosQueCumple(ev('Feriado', { tipo: 'feriado' }), '2026-09-02'), null);
});

// ------------------------------------------------------------------ palabras

test('los días que faltan se dicen como se hablan', () => {
  assert.equal(enPalabras(0), 'hoy');
  assert.equal(enPalabras(1), 'mañana');
  assert.equal(enPalabras(4), 'en 4 días');
});
