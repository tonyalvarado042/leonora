import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  actividadesParaSubir, equipajeVacio, eventosParaSubir, loQueNoViaja,
  loQueViaja, traducirRutina, traeAlgo, type Equipaje,
} from '../src/lib/equipaje.ts';
import { rachaVacia } from '../src/lib/rachas.ts';
import type { Actividad, Ajustes, BloqueRutina, Evento } from '../src/lib/tipos.ts';

const AJUSTES = {
  hora_despertar: '06:00', hora_dormir: '21:30', ocupacion: 'colegio',
  ocupacion_nombre: '', hora_fin_ocupacion: '14:00', dias_ocupados: [1, 2, 3, 4, 5],
  avisos_activos: true, avisar_antes_min: 10, sonido_aviso: 'campana',
  sonido_devocional: 'arpa', vibrar: true, silencio_desde: null, silencio_hasta: null,
  tema: 'auto', celebraciones: true, ciclo_activo: false, arranque_hecho: true,
} as Omit<Ajustes, 'persona_id'>;

const PERSONA = {
  nombre: 'Leonora', sexo: 'mujer', fecha_nacimiento: '2013-04-02',
  zona_horaria: 'America/Guatemala', avatar_tipo: 'emoji', avatar_valor: '🙂',
} as const;

function vacio(): Equipaje {
  return equipajeVacio({ ...PERSONA }, AJUSTES);
}

function actividad(id: string, nombre = 'Devocional'): Actividad {
  return {
    id, persona_id: 'p-vieja', nombre, tipo: 'fe', emoji: '📖', duracion_min: 30,
    es_habito: true, es_fijo: true, avisar: true, avisar_antes_min: null, activa: true,
  };
}

function bloque(id: string, actividad_id: string): BloqueRutina {
  return {
    id, persona_id: 'p-vieja', actividad_id, modo: 'escolar', repeticion: 'semanal',
    dia_semana: 1, cada_n: null, dia_mes: null, mes: null,
    desde: '2020-01-01', hasta: null, hora_inicio: '06:30', hora_fin: '07:00', activo: true,
  };
}

function evento(id: string, de: { grupo?: string; persona?: string }): Evento {
  return {
    id, grupo_id: de.grupo ?? null, persona_id: de.persona ?? null, tipo: 'personal',
    titulo: 'Examen', descripcion: null, fecha_inicio: '2026-09-10',
    fecha_fin: '2026-09-10', todo_el_dia: true, hora_inicio: null, hora_fin: null,
    repeticion: 'ninguna', efecto: 'solo_avisa', origen: 'manual',
    confianza: null, confirmado: true,
  };
}

// ------------------------------------------------------------- ¿hay algo?

test('una app recién instalada no trae nada que subir', () => {
  assert.equal(traeAlgo(vacio()), false);
});

test('con una sola actividad ya hay algo que subir', () => {
  assert.ok(traeAlgo({ ...vacio(), actividades: [actividad('a1')] }));
});

test('unas rachas en cero no cuentan como equipaje', () => {
  const e = { ...vacio(), rachas: [rachaVacia('dia'), rachaVacia('devocional')] };
  assert.equal(traeAlgo(e), false);
});

test('una racha viva sí cuenta', () => {
  const viva = { ...rachaVacia('devocional'), total_dias: 12, racha_actual: 12 };
  assert.ok(traeAlgo({ ...vacio(), rachas: [viva] }));
});

// --------------------------------------------------- lo que viaja, en frases

test('lo que viaja se cuenta con números, no con «algunos datos»', () => {
  const e: Equipaje = {
    ...vacio(),
    actividades: [actividad('a1'), actividad('a2')],
    rutina: [bloque('r1', 'a1')],
    ciclo: [{ persona_id: 'p', fecha: '2026-08-01', sangrado: true, intensidad: null, animo: null, nota: null }],
  };
  const dice = loQueViaja(e).join(' · ');
  assert.match(dice, /2 actividades/);
  assert.match(dice, /1 bloque de tu rutina/);
  assert.match(dice, /1 día apuntado del ciclo/);
});

test('el singular y el plural se dicen bien', () => {
  const una = loQueViaja({ ...vacio(), actividades: [actividad('a1')] }).join(' ');
  assert.match(una, /1 actividad\b/);
  assert.doesNotMatch(una, /1 actividades/);
});

test('la racha más larga sale en la frase: es lo que duele perder', () => {
  const viva = { ...rachaVacia('devocional'), total_dias: 30, racha_actual: 24 };
  assert.match(loQueViaja({ ...vacio(), rachas: [viva] }).join(' '), /24/);
});

test('sin nada, no se promete nada', () => {
  assert.deepEqual(loQueViaja(vacio()), []);
});

// ------------------------------------------------- lo que NO viaja, dicho antes

test('los días que se quedan se explican, y se dice que las rachas sí viajan', () => {
  const e = { ...vacio(), se_quedan: { dias: 40, personas: 0, grupos: 0, encargos: 0 } };
  const dice = loQueNoViaja(e).join(' ');
  assert.match(dice, /40/);
  assert.match(dice, /rachas sí viajan/);
});

test('las otras personas del teléfono se nombran, y se dice qué hacer con ellas', () => {
  const e = { ...vacio(), se_quedan: { dias: 0, personas: 2, grupos: 1, encargos: 3 } };
  const dice = loQueNoViaja(e).join(' ');
  assert.match(dice, /2 personas/);
  assert.match(dice, /Familia/);
});

test('un solo día se dice en singular, no «los 1 días»', () => {
  const dice = loQueNoViaja({ ...vacio(), se_quedan: { dias: 1, personas: 0, grupos: 0, encargos: 0 } }).join(' ');
  assert.match(dice, /El día que ya viviste/);
  assert.doesNotMatch(dice, /Los 1 /);
});

test('una sola persona también, y con «invítala»', () => {
  const dice = loQueNoViaja({ ...vacio(), se_quedan: { dias: 0, personas: 1, grupos: 0, encargos: 0 } }).join(' ');
  assert.match(dice, /La otra persona/);
  assert.doesNotMatch(dice, /Las otras 1/);
});

test('«con ellas» no se dice si no se habló de ellas', () => {
  // Sin más gente en el teléfono la frase se quedaba sin a quién referirse.
  const solo = loQueNoViaja({ ...vacio(), se_quedan: { dias: 0, personas: 0, grupos: 1, encargos: 2 } }).join(' ');
  assert.doesNotMatch(solo, /con ellas/);
  assert.match(solo, /se quedan aquí/);

  const acompanada = loQueNoViaja({ ...vacio(), se_quedan: { dias: 0, personas: 2, grupos: 1, encargos: 2 } }).join(' ');
  assert.match(acompanada, /con ellas/);
});

test('sin nada que dejar atrás, no se asusta a nadie', () => {
  assert.deepEqual(loQueNoViaja(vacio()), []);
});

// ------------------------------------------------------ traducir los ids

test('la rutina se reengancha a las actividades nuevas', () => {
  const mapa = new Map([['a1', 'uuid-1'], ['a2', 'uuid-2']]);
  const { suben, perdidos } = traducirRutina(
    [bloque('r1', 'a1'), bloque('r2', 'a2')], mapa, 'yo',
  );
  assert.equal(perdidos, 0);
  assert.deepEqual(suben.map((b) => b.actividad_id), ['uuid-1', 'uuid-2']);
  assert.ok(suben.every((b) => b.persona_id === 'yo'));
});

test('un bloque sin su actividad se cae aquí, no se guarda roto', () => {
  // Guardarlo con el id viejo dejaría la rutina apuntando a la nada, y el día
  // saldría vacío sin que nadie supiera por qué.
  const { suben, perdidos } = traducirRutina(
    [bloque('r1', 'a1'), bloque('r2', 'se-perdio')], new Map([['a1', 'uuid-1']]), 'yo',
  );
  assert.equal(perdidos, 1);
  assert.equal(suben.length, 1);
});

test('el id viejo no viaja: lo pone Postgres', () => {
  const { suben } = traducirRutina([bloque('r1', 'a1')], new Map([['a1', 'u1']]), 'yo');
  assert.ok(!('id' in suben[0]));
});

test('las actividades suben sin id y con su dueña nueva', () => {
  const suben = actividadesParaSubir([actividad('a1'), actividad('a2')], 'yo');
  assert.ok(suben.every((a) => !('id' in a)));
  assert.ok(suben.every((a) => a.persona_id === 'yo'));
});

// --------------------------------------------------------------- los eventos

test('solo viajan los eventos propios; los de grupo se quedan', () => {
  const suben = eventosParaSubir(
    [evento('e1', { persona: 'p-vieja' }), evento('e2', { grupo: 'g1' })], 'yo',
  );
  assert.equal(suben.length, 1);
  assert.equal(suben[0].persona_id, 'yo');
  assert.equal(suben[0].grupo_id, null);
});

test('un evento de grupo no se cuela colgado de la persona', () => {
  // Sería convertirlo en otra cosa: el feriado del colegio no es «su» evento.
  assert.deepEqual(eventosParaSubir([evento('e2', { grupo: 'g1' })], 'yo'), []);
});
