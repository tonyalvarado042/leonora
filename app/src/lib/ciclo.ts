/**
 * El calendario del ciclo.
 *
 * Puro. Aquí solo se cuentan días; lo delicado de esto no es la cuenta, es no
 * mentir con ella.
 *
 * **La regla que gobierna todo el módulo: con un solo período no se puede
 * predecir nada.** Hace falta al menos un intervalo entre dos, y de verdad
 * hacen falta tres para que la media signifique algo. Enseñarle a una niña de
 * 13 años una fecha inventada con la misma cara que una calculada es peor que
 * no enseñarle ninguna: se organiza confiando en ella. Cuando no se sabe, se
 * dice que no se sabe.
 */

import { diasEntre, sumarDias } from './fechas';
import type { DiaCiclo, Fecha } from './tipos';

/** Lo que dicen los libros para una adolescente. Solo se usa como referencia
 *  para avisar de algo raro, nunca para predecir sin datos. */
export const CICLO_TIPICO = 28;
export const CICLO_MINIMO = 21;
export const CICLO_MAXIMO = 45;

export interface Periodo {
  inicio: Fecha;
  fin: Fecha;
  dias: number;
}

/**
 * Los días sueltos, agrupados en períodos.
 *
 * Dos días de sangrado seguidos son el mismo período; un hueco los separa. Un
 * hueco de **un solo día** no separa: un día flojo en medio es normal y
 * partirlo en dos períodos estropearía la media.
 */
export function periodos(dias: DiaCiclo[]): Periodo[] {
  const marcados = dias
    .filter((d) => d.sangrado)
    .map((d) => d.fecha)
    .sort();

  const salida: Periodo[] = [];
  for (const fecha of marcados) {
    const ultimo = salida[salida.length - 1];
    if (ultimo && diasEntre(ultimo.fin, fecha) <= 2) {
      ultimo.fin = fecha;
      ultimo.dias = diasEntre(ultimo.inicio, ultimo.fin) + 1;
    } else {
      salida.push({ inicio: fecha, fin: fecha, dias: 1 });
    }
  }
  return salida;
}

/** Los días entre el principio de un período y el del siguiente. */
export function intervalos(ps: Periodo[]): number[] {
  const salida: number[] = [];
  for (let i = 1; i < ps.length; i++) {
    salida.push(diasEntre(ps[i - 1].inicio, ps[i].inicio));
  }
  return salida;
}

/**
 * Cuánto dura su ciclo, según lo que ella ha apuntado. `null` mientras no haya
 * al menos un intervalo.
 *
 * Se usan **los tres últimos** y no todos: un ciclo cambia con los años, y una
 * media de dos años atrás no dice nada de este mes.
 */
export function duracionMedia(ps: Periodo[]): number | null {
  const todos = intervalos(ps);
  if (todos.length === 0) return null;
  const ultimos = todos.slice(-3);
  const suma = ultimos.reduce((a, b) => a + b, 0);
  return Math.round(suma / ultimos.length);
}

export type Confianza = 'ninguna' | 'poca' | 'buena';

/** Cuánto se puede fiar de lo que la app diga. */
export function confianza(ps: Periodo[]): Confianza {
  const n = intervalos(ps).length;
  if (n === 0) return 'ninguna';
  return n >= 3 ? 'buena' : 'poca';
}

export interface Prediccion {
  /** Cuándo se espera el próximo. `null` cuando no se puede saber. */
  fecha: Fecha | null;
  /** Días que faltan. Negativo si ya se pasó la fecha esperada. */
  enCuantos: number | null;
  confianza: Confianza;
  /** En qué día de su ciclo está hoy, contando desde el último período. */
  diaDelCiclo: number | null;
  /** true mientras está con el período, según lo apuntado. */
  ahora: boolean;
}

export function predecir(dias: DiaCiclo[], hoy: Fecha): Prediccion {
  const ps = periodos(dias);
  const fiabilidad = confianza(ps);
  const ultimo = ps[ps.length - 1];

  if (!ultimo) {
    return {
      fecha: null, enCuantos: null, confianza: 'ninguna',
      diaDelCiclo: null, ahora: false,
    };
  }

  // «Ahora» es lo apuntado, no lo calculado: si marcó hoy o ayer, está.
  const ahora = diasEntre(ultimo.fin, hoy) <= 1 && hoy >= ultimo.inicio;
  const diaDelCiclo = hoy >= ultimo.inicio ? diasEntre(ultimo.inicio, hoy) + 1 : null;

  const media = duracionMedia(ps);
  if (media === null) {
    // Un solo período. No se inventa una fecha a 28 días: se dice que falta
    // apuntar el siguiente.
    return { fecha: null, enCuantos: null, confianza: 'ninguna', diaDelCiclo, ahora };
  }

  const fecha = sumarDias(ultimo.inicio, media);
  return {
    fecha,
    enCuantos: diasEntre(hoy, fecha),
    confianza: fiabilidad,
    diaDelCiclo,
    ahora,
  };
}

/**
 * Lo que se le enseña, en su idioma.
 *
 * Nunca dice una fecha sin decir de dónde sale. «Más o menos» cuando hay poca
 * historia, y «no puedo saberlo todavía» cuando no hay ninguna.
 */
export function enPalabras(p: Prediccion): string {
  if (p.ahora) return 'Estás con el período';
  if (p.fecha === null || p.enCuantos === null) {
    return p.diaDelCiclo === null
      ? 'Marca los días que te venga y aquí te digo cuándo toca el siguiente'
      : 'Apunta un período más y ya te puedo decir cuándo toca el siguiente';
  }
  const casi = p.confianza === 'poca' ? ' más o menos' : '';
  if (p.enCuantos < 0) return `Se pasó por ${-p.enCuantos} días de lo esperado`;
  if (p.enCuantos === 0) return `Podría venirte hoy${casi}`;
  if (p.enCuantos === 1) return `Podría venirte mañana${casi}`;
  return `Te tocaría en ${p.enCuantos} días${casi}`;
}

/**
 * ¿Hay algo que valga la pena mirar con alguien?
 *
 * No diagnostica nada y no lo pretende: solo señala lo que cualquier libro
 * dice que conviene consultar, y **con quién**. Una app no le dice a una niña
 * de 13 años que algo va mal.
 */
export function vaLaPenaContarlo(ps: Periodo[]): string | null {
  const todos = intervalos(ps);
  if (todos.length < 2) return null;
  const ultimos = todos.slice(-3);
  if (ultimos.some((d) => d > CICLO_MAXIMO)) {
    return 'Han pasado bastantes semanas entre uno y otro. No suele ser nada, '
      + 'pero cuéntaselo a tu mamá o a tu doctora.';
  }
  if (ultimos.some((d) => d < CICLO_MINIMO)) {
    return 'Te están viniendo muy seguidos. No suele ser nada, pero cuéntaselo '
      + 'a tu mamá o a tu doctora.';
  }
  return null;
}

/** Si se le ofrece o no el calendario. Es la única cosa para la que se usa
 *  el sexo en toda la app. */
export function seLeOfrece(sexo: string | undefined, edad: number | null): boolean {
  return sexo === 'mujer' && edad !== null && edad >= 12;
}
