/**
 * Horas y fechas, sin dependencias.
 *
 * Todo se maneja como texto ("14:00", "2026-09-03") y como minutos desde la
 * medianoche. Las comparaciones entre horas son comparaciones entre números,
 * que es lo que evita los errores de zona horaria dentro de un mismo día.
 */

import type { Fecha, Hora } from './tipos';

const RE_HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function esHoraValida(h: string): h is Hora {
  return RE_HORA.test(h);
}

/** "14:30" → 870. Lanza si la hora no es válida: un formato malo aquí se
 *  propaga en silencio a todo el horario. */
export function aMinutos(h: Hora): number {
  const m = RE_HORA.exec(h);
  if (!m) throw new Error(`Hora inválida: "${h}". Se esperaba HH:MM.`);
  return Number(m[1]) * 60 + Number(m[2]);
}

/** 870 → "14:30". Se ajusta al día (0–1439). */
export function aHora(minutos: number): Hora {
  const m = ((Math.round(minutos) % 1440) + 1440) % 1440;
  const hh = String(Math.floor(m / 60)).padStart(2, '0');
  const mm = String(m % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function duracionMin(inicio: Hora, fin: Hora): number {
  return aMinutos(fin) - aMinutos(inicio);
}

/** La fecha local de una persona, como "AAAA-MM-DD". */
export function fechaLocal(cuando: Date, zonaHoraria: string): Fecha {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: zonaHoraria,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(cuando);
  const v = (t: string) => partes.find((p) => p.type === t)!.value;
  return `${v('year')}-${v('month')}-${v('day')}`;
}

/** La hora local de una persona, como "HH:MM". */
export function horaLocal(cuando: Date, zonaHoraria: string): Hora {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: zonaHoraria, hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(cuando);
}

/** 0 = domingo … 6 = sábado, en la zona de la persona. */
export function diaSemana(fecha: Fecha, zonaHoraria: string): number {
  const nombre = new Intl.DateTimeFormat('en-US', {
    timeZone: zonaHoraria, weekday: 'short',
  }).format(new Date(`${fecha}T12:00:00Z`));
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(nombre);
}

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
  'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** "Miércoles 3 de septiembre". */
export function fechaLarga(fecha: Fecha, zonaHoraria: string): string {
  const [, mes, dia] = fecha.split('-').map(Number);
  const nombre = DIAS[diaSemana(fecha, zonaHoraria)];
  return `${nombre[0].toUpperCase()}${nombre.slice(1)} ${dia} de ${MESES[mes - 1]}`;
}

/** El instante real que corresponde a una fecha y hora locales de la persona. */
export function instante(fecha: Fecha, hora: Hora, zonaHoraria: string): Date {
  const [a, me, d] = fecha.split('-').map(Number);
  const [h, mi] = hora.split(':').map(Number);
  // Se parte de la lectura UTC y se corrige por el desfase real de esa zona en
  // esa fecha, así que los cambios de horario de verano quedan cubiertos.
  const comoUtc = Date.UTC(a, me - 1, d, h, mi);
  const desfase = desfaseZonaMin(new Date(comoUtc), zonaHoraria);
  return new Date(comoUtc - desfase * 60_000);
}

function desfaseZonaMin(cuando: Date, zonaHoraria: string): number {
  const p = new Intl.DateTimeFormat('en-US', {
    timeZone: zonaHoraria, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(cuando);
  const v = (t: string) => Number(p.find((x) => x.type === t)!.value);
  const local = Date.UTC(v('year'), v('month') - 1, v('day'),
    v('hour') % 24, v('minute'), v('second'));
  return (local - Math.floor(cuando.getTime() / 1000) * 1000) / 60_000;
}
