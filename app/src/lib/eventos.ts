/**
 * Los eventos: feriados, exámenes, cumpleaños y planes.
 *
 * Puro. La regla importante es que **un evento no borra la rutina, la tapa**:
 * un feriado libra el día de colegio pero deja el devocional y la cena, porque
 * el colegio se cancela y la vida no.
 */

import { sumarDias } from './fechas';
import type { EfectoEvento, Evento, Fecha, TipoEvento } from './tipos';

export const NOMBRE_TIPO_EVENTO: Record<TipoEvento, string> = {
  feriado: 'Feriado', escolar: 'Del colegio', examen: 'Examen',
  entrega: 'Entrega', cumpleanos: 'Cumpleaños', cita: 'Cita',
  viaje: 'Viaje', personal: 'Personal',
};

export const EMOJI_TIPO_EVENTO: Record<TipoEvento, string> = {
  feriado: '🎊', escolar: '🏫', examen: '📝', entrega: '📤',
  cumpleanos: '🎂', cita: '📍', viaje: '✈️', personal: '⭐',
};

/** Los tipos que por defecto libran el día de colegio. */
export const EFECTO_POR_TIPO: Record<TipoEvento, EfectoEvento> = {
  feriado: 'libra_el_dia', escolar: 'solo_avisa', examen: 'solo_avisa',
  entrega: 'solo_avisa', cumpleanos: 'solo_avisa', cita: 'bloquea_horas',
  viaje: 'libra_el_dia', personal: 'solo_avisa',
};

/**
 * ¿Cae este evento en esta fecha?
 *
 * Un evento anual —un cumpleaños— compara mes y día, no el año. Y uno que
 * dura varios días cae en todos ellos, no solo en el primero.
 */
export function caeEnFecha(e: Evento, fecha: Fecha): boolean {
  if (!e.confirmado) return false;

  if (e.repeticion === 'anual') {
    // El 29 de febrero cae el 28 cuando el año no es bisiesto, igual que las
    // repeticiones de la rutina.
    const [, mesE, diaE] = e.fecha_inicio.split('-').map(Number);
    const [a, mes, dia] = fecha.split('-').map(Number);
    if (mes !== mesE) return false;
    const ultimo = new Date(Date.UTC(a, mes, 0)).getUTCDate();
    return dia === Math.min(diaE, ultimo);
  }

  return fecha >= e.fecha_inicio && fecha <= e.fecha_fin;
}

export function eventosDeFecha(eventos: Evento[], fecha: Fecha, personaId: string): Evento[] {
  return eventos
    .filter((e) => e.persona_id === null || e.persona_id === personaId)
    .filter((e) => caeEnFecha(e, fecha))
    .sort((a, b) => a.titulo.localeCompare(b.titulo, 'es'));
}

/** ¿Hay algo hoy que libre el día de colegio? */
export function libraElDia(eventos: Evento[], fecha: Fecha, personaId: string): Evento | null {
  return eventosDeFecha(eventos, fecha, personaId)
    .find((e) => e.efecto === 'libra_el_dia') ?? null;
}

/** Los que vienen pronto, para avisar antes de que lleguen. */
export function proximos(
  eventos: Evento[], fecha: Fecha, personaId: string, dentroDeDias = 7,
): { evento: Evento; enCuantos: number }[] {
  const salida: { evento: Evento; enCuantos: number }[] = [];
  for (let i = 1; i <= dentroDeDias; i++) {
    const f = sumarDias(fecha, i);
    for (const e of eventosDeFecha(eventos, f, personaId)) {
      salida.push({ evento: e, enCuantos: i });
    }
  }
  return salida;
}

/** Cuántos años cumple. Null si no se sabe el año de nacimiento. */
export function anosQueCumple(e: Evento, fecha: Fecha): number | null {
  if (e.tipo !== 'cumpleanos' || e.repeticion !== 'anual') return null;
  const nacio = Number(e.fecha_inicio.slice(0, 4));
  const ahora = Number(fecha.slice(0, 4));
  const anos = ahora - nacio;
  return anos > 0 && anos < 130 ? anos : null;
}

/** Cuántos días faltan, para decirlo en palabras. */
export function enPalabras(enCuantos: number): string {
  if (enCuantos === 0) return 'hoy';
  if (enCuantos === 1) return 'mañana';
  return `en ${enCuantos} días`;
}
