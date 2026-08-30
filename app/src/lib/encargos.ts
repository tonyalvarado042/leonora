/**
 * Los encargos y la campanita.
 *
 * Un encargo es lo que papá o mamá le manda a un hijo: una tarea, un
 * recordatorio o un consejo. Puro.
 *
 * La regla que gobierna todo esto: **un encargo no es una orden que se cuela
 * en el horario sin avisar.** Llega a la campanita, se ve quién lo mandó, y el
 * que lo recibe puede contestar. Una app que le mete tareas a una niña sin que
 * ella las vea llegar no es una agenda, es un vigilante.
 */

import type { Encargo, Fecha, Tarea, TareaNueva, TipoEncargo } from './tipos';

export const NOMBRE_TIPO_ENCARGO: Record<TipoEncargo, string> = {
  tarea: 'Tarea', recordatorio: 'Recordatorio', consejo: 'Mensaje',
};

export const EMOJI_TIPO_ENCARGO: Record<TipoEncargo, string> = {
  tarea: '✅', recordatorio: '⏰', consejo: '💬',
};

/** Solo las tareas entran al horario. Un consejo se lee, no se marca. */
export function entraAlHorario(e: Encargo): boolean {
  return e.tipo === 'tarea' && e.estado !== 'archivado';
}

/** Lo que me han mandado a mí, lo más nuevo arriba. */
export function paraMi(encargos: Encargo[], personaId: string): Encargo[] {
  return encargos
    .filter((e) => e.para_persona_id === personaId && e.estado !== 'archivado')
    .sort((a, b) => b.creado_en.localeCompare(a.creado_en));
}

/** Lo que yo he mandado, para ver si ya lo leyeron y qué contestaron. */
export function queMande(encargos: Encargo[], personaId: string): Encargo[] {
  return encargos
    .filter((e) => e.de_persona_id === personaId && e.estado !== 'archivado')
    .sort((a, b) => b.creado_en.localeCompare(a.creado_en));
}

/**
 * El número rojo de la campanita: lo que me mandaron y todavía no he abierto.
 *
 * Cuenta lo *no visto*, no lo *no hecho*. Un recado leído y aún sin hacer ya
 * no es una novedad: sigue en la lista, pero deja de gritar.
 */
export function sinLeer(encargos: Encargo[], personaId: string): number {
  return encargos.filter(
    (e) => e.para_persona_id === personaId && e.estado !== 'archivado' && e.visto_en === null,
  ).length;
}

/** Lo que espera respuesta mía: quien lo mandó preguntó y aún no contesté. */
export function esperanRespuesta(encargos: Encargo[], personaId: string): Encargo[] {
  return queMande(encargos, personaId).filter((e) => e.respuesta === null);
}

/** Los encargos de una fecha que se convierten en tareas de ese día. */
export function encargosDeFecha(
  encargos: Encargo[], fecha: Fecha, personaId: string,
): Encargo[] {
  return encargos
    .filter((e) => e.para_persona_id === personaId && e.fecha === fecha && entraAlHorario(e))
    .sort((a, b) => (a.hora_sugerida ?? '99:99').localeCompare(b.hora_sugerida ?? '99:99'));
}

/**
 * Un encargo, puesto como tarea del día.
 *
 * Sin hora sugerida cae al final de la tarde, no a medianoche: un recado sin
 * hora es «hoy, cuando puedas», y ponerlo a las 00:00 lo deja fuera del día.
 */
export const HORA_SIN_HORA = '18:00';

export function tareaDeEncargo(e: Encargo, duracionMin = 30): TareaNueva {
  const inicio = e.hora_sugerida ?? HORA_SIN_HORA;
  const [h, m] = inicio.split(':').map(Number);
  const fin = h * 60 + m + duracionMin;
  const finHora = `${String(Math.floor(fin / 60) % 24).padStart(2, '0')}:${String(fin % 60).padStart(2, '0')}`;
  return {
    actividad_id: null,
    encargo_id: e.id,
    titulo: e.titulo,
    emoji: EMOJI_TIPO_ENCARGO[e.tipo],
    tipo: 'casa',
    hora_inicio: inicio,
    hora_fin: finHora,
    orden: 0,
    es_fijo: false,
    origen: 'encargo',
    estado: e.estado === 'hecho' ? 'hecha' : 'pendiente',
    completado_en: null,
    nota: e.nota,
    minutos_reales: null,
    termino_de_verdad: null,
    puntos: 0,
    metodo_devocional: null,
  };
}

/** Cómo se presenta en la campanita: «Mamá te mandó una tarea». */
export function comoSeLee(e: Encargo, deQuien: string): string {
  const quien = deQuien.trim() === '' ? 'Alguien de tu familia' : deQuien;
  if (e.tipo === 'consejo') return `${quien} te escribió`;
  if (e.tipo === 'recordatorio') return `${quien} te recordó algo`;
  return `${quien} te mandó una tarea`;
}

/**
 * Los encargos que llegaron después de armar el día.
 *
 * El día se genera una vez y se guarda. Si mamá manda un recado a media tarde,
 * ese día ya está escrito: sin esto, el recado se quedaría fuera del horario
 * hasta el día siguiente. Se comparan por `encargo_id`, así que volver a
 * llamarlo no duplica nada.
 */
export function faltanEnElDia(
  tareas: Tarea[], encargos: Encargo[], fecha: Fecha, personaId: string,
): Encargo[] {
  const puestos = new Set(tareas.map((t) => t.encargo_id).filter((x): x is string => x !== null));
  return encargosDeFecha(encargos, fecha, personaId).filter((e) => !puestos.has(e.id));
}
