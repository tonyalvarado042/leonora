/**
 * Leer un horario de clases de una foto.
 *
 * TODAVÍA NO LEE NADA DE VERDAD. Devuelve un horario de ejemplo para poder
 * recorrer el flujo entero —revisar, corregir, aceptar— antes de que exista el
 * modelo de visión. Cuando llegue, sustituye a `leerHorario` y devuelve la
 * misma forma: el resto de la app no se entera.
 *
 * Lo importante del diseño ya está aquí: cada materia trae la confianza con
 * que se leyó, y **nada entra al horario sin que la persona lo apruebe**.
 */

import { aHora, aMinutos } from './fechas';
import type { BloqueRutina, Hora } from './tipos';

export interface MateriaLeida {
  id: string;
  nombre: string;
  emoji: string;
  /** 0 = domingo … 6 = sábado. */
  dias: number[];
  hora_inicio: Hora;
  hora_fin: Hora;
  /** 0 a 1. Por debajo de 0.8 se marca para que la persona la mire. */
  confianza: number;
  /** Lo que literalmente se leyó, para poder auditar un error. */
  texto_leido: string;
}

export interface HorarioLeido {
  materias: MateriaLeida[];
  /** Lo que el modelo dedujo del encabezado de la foto. */
  aviso: string | null;
}

const EJEMPLO: Omit<MateriaLeida, 'id'>[] = [
  { nombre: 'Matemática', emoji: '📐', dias: [1, 2, 3, 4, 5],
    hora_inicio: '07:30', hora_fin: '08:20', confianza: 0.97, texto_leido: 'MATEMATICA 7:30-8:20' },
  { nombre: 'Lenguaje', emoji: '📖', dias: [1, 3, 5],
    hora_inicio: '08:20', hora_fin: '09:10', confianza: 0.95, texto_leido: 'LENGUAJE 8:20-9:10' },
  { nombre: 'Ciencias Naturales', emoji: '🔬', dias: [2, 4],
    hora_inicio: '08:20', hora_fin: '09:10', confianza: 0.93, texto_leido: 'CS. NATURALES 8:20-9:10' },
  { nombre: 'Recreo', emoji: '🥪', dias: [1, 2, 3, 4, 5],
    hora_inicio: '09:10', hora_fin: '09:30', confianza: 0.99, texto_leido: 'RECREO' },
  { nombre: 'Estudios Sociales', emoji: '🌎', dias: [1, 2, 3, 4, 5],
    hora_inicio: '09:30', hora_fin: '10:20', confianza: 0.96, texto_leido: 'EST. SOCIALES 9:30-10:20' },
  { nombre: 'Inglés', emoji: '🇬🇧', dias: [1, 3, 5],
    hora_inicio: '10:20', hora_fin: '11:10', confianza: 0.94, texto_leido: 'INGLES 10:20-11:10' },
  { nombre: 'Computación', emoji: '💻', dias: [2, 4],
    hora_inicio: '10:20', hora_fin: '11:10', confianza: 0.71, texto_leido: 'COMPUTAClON 10:20-11:1O' },
  { nombre: 'Educación Física', emoji: '⚽', dias: [2, 4],
    hora_inicio: '11:10', hora_fin: '12:00', confianza: 0.89, texto_leido: 'ED. FISICA 11:10-12:00' },
  { nombre: 'Arte', emoji: '🎨', dias: [1, 5],
    hora_inicio: '11:10', hora_fin: '12:00', confianza: 0.68, texto_leido: 'ARTE / MUSlCA 11:1O-12:OO' },
];

/** Simula leer la foto. Tarda a propósito, para que se vea el «leyendo…». */
export async function leerHorario(): Promise<HorarioLeido> {
  await new Promise((r) => setTimeout(r, 1600));
  return {
    materias: EJEMPLO.map((m, i) => ({ ...m, id: `mat-${i}` })),
    aviso: 'Dos materias salieron borrosas. Míralas antes de aceptar.',
  };
}

/** Las que hay que mirar sí o sí antes de aceptar. */
export const CONFIANZA_MINIMA = 0.8;

export function dudosas(h: HorarioLeido): MateriaLeida[] {
  return h.materias.filter((m) => m.confianza < CONFIANZA_MINIMA);
}

/** De materias aprobadas a bloques de la rutina. */
export function aBloques(
  materias: MateriaLeida[], personaId: string, actividadPorMateria: Map<string, string>,
): BloqueRutina[] {
  const bloques: BloqueRutina[] = [];
  for (const m of materias) {
    const actividad_id = actividadPorMateria.get(m.id);
    if (!actividad_id) continue;
    for (const dia of m.dias) {
      bloques.push({
        id: `rut-${dia}-${actividad_id}`,
        persona_id: personaId,
        actividad_id,
        modo: 'escolar',
        repeticion: 'semanal',
        dia_semana: dia,
        cada_n: null, dia_mes: null, mes: null,
        desde: '2020-01-01', hasta: null,
        hora_inicio: m.hora_inicio,
        hora_fin: m.hora_fin,
        activo: true,
      });
    }
  }
  return bloques;
}

/** De qué hora a qué hora va el colegio, según lo leído. Es lo que necesita el
 *  resto de la app para saber cuándo termina de estudiar. */
export function jornada(materias: MateriaLeida[]): { inicio: Hora; fin: Hora; dias: number[] } | null {
  if (materias.length === 0) return null;
  const inicio = Math.min(...materias.map((m) => aMinutos(m.hora_inicio)));
  const fin = Math.max(...materias.map((m) => aMinutos(m.hora_fin)));
  const dias = [...new Set(materias.flatMap((m) => m.dias))].sort();
  return { inicio: aHora(inicio), fin: aHora(fin), dias };
}
