/**
 * El versículo del día y el devocional del día.
 *
 * Puro: qué toca hoy se decide con la fecha, no con el reloj del servidor ni
 * con un sorteo — así dos personas en la misma fecha ven lo mismo, y volver a
 * abrir la app no cambia el versículo a media mañana.
 */

import { DEVOCIONALES, type Devocional } from '@/datos/devocionales';
import { VERSICULOS, type Versiculo } from '@/datos/versiculos';
import type { Fecha } from './tipos';

/** 1 el 1 de enero, 366 el 31 de diciembre de un año bisiesto. */
export function diaDelAnio(fecha: Fecha): number {
  const [a, m, d] = fecha.split('-').map(Number);
  const inicio = Date.UTC(a, 0, 1);
  return Math.round((Date.UTC(a, m - 1, d) - inicio) / 86_400_000) + 1;
}

/**
 * El versículo que toca hoy.
 *
 * Mientras el juego no llegue a 366, se da la vuelta. Es a propósito: es mejor
 * repetir un versículo bueno que dejar días en blanco, y ampliar la lista es
 * añadir filas.
 */
export function versiculoDelDia(fecha: Fecha, lista: Versiculo[] = VERSICULOS): Versiculo | null {
  if (lista.length === 0) return null;
  return lista[(diaDelAnio(fecha) - 1) % lista.length];
}

/** El texto en la versión pedida, o en la primera que haya. */
export function textoEn(v: Versiculo, version?: string): { version: string; texto: string } {
  return v.versiones.find((x) => x.version === version) ?? v.versiones[0];
}

export function versionesDe(v: Versiculo): string[] {
  return v.versiones.map((x) => x.version);
}

/**
 * El devocional que toca hoy, filtrado por edad.
 *
 * Sin edad se sirve todo: es mejor dar algo que no dar nada. Con edad, no se
 * le pone a alguien de 8 años un texto escrito para un adulto.
 */
export function devocionalDelDia(
  fecha: Fecha, edad: number | null, lista: Devocional[] = DEVOCIONALES,
): Devocional | null {
  const buenos = edad === null
    ? lista
    : lista.filter((d) => edad >= d.edad_min && edad <= d.edad_max);
  const usar = buenos.length > 0 ? buenos : lista;
  if (usar.length === 0) return null;
  return usar[(diaDelAnio(fecha) - 1) % usar.length];
}

/** Lo que se manda al compartir. Cabe en un mensaje y dice de dónde salió. */
export function textoParaCompartir(v: Versiculo, version?: string): string {
  const t = textoEn(v, version);
  return `«${t.texto}»\n\n${v.referencia} · ${t.version}\n\nGraceDay`;
}
