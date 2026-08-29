/**
 * Los avisos: cuándo suena qué.
 *
 * Aquí no se importa nada de React Native ni de Expo a propósito. Decidir qué
 * suena y cuándo es lógica de negocio y se prueba sin bundler ni teléfono;
 * ponerlo en la agenda del sistema es trabajo de `avisosTelefono.ts`.
 */

import { aMinutos, instante } from './fechas';
import type { Actividad, Ajustes, Fecha, Hora, Tarea } from './tipos';

export interface AvisoProgramable {
  tarea_id: string;
  momento: Date;
  titulo: string;
  cuerpo: string;
  sonido: string;
}

/**
 * ¿La hora cae dentro del silencio? Cubre el caso normal (13:00–15:00) y el
 * que cruza medianoche (22:00–06:00), que es el que la gente usa de verdad.
 */
export function enSilencio(hora: Hora, desde: Hora | null, hasta: Hora | null): boolean {
  if (!desde || !hasta) return false;
  const m = aMinutos(hora), d = aMinutos(desde), h = aMinutos(hasta);
  return d <= h ? m >= d && m < h : m >= d || m < h;
}

export interface OpcionesAvisos {
  fecha: Fecha;
  zonaHoraria: string;
  ajustes: Ajustes;
  actividades: Actividad[];
  tareas: Tarea[];
  /** Los avisos que ya pasaron no se programan. */
  ahora: Date;
}

/**
 * Qué avisos hay que programar para un día.
 *
 * La regla de ajustes es la general; una actividad con su propio
 * `avisar_antes_min` le lleva la contraria. El devocional suena distinto para
 * poder reconocerlo sin sacar el teléfono del bolsillo.
 */
export function avisosDelDia(o: OpcionesAvisos): AvisoProgramable[] {
  if (!o.ajustes.avisos_activos) return [];

  const porId = new Map(o.actividades.map((a) => [a.id, a]));

  return o.tareas
    .filter((t) => t.estado === 'pendiente')
    .flatMap<AvisoProgramable>((t) => {
      const act = t.actividad_id ? porId.get(t.actividad_id) : undefined;
      if (act && !act.avisar) return [];

      const antes = act?.avisar_antes_min ?? o.ajustes.avisar_antes_min;
      const momento = new Date(
        instante(o.fecha, t.hora_inicio, o.zonaHoraria).getTime() - antes * 60_000,
      );
      if (momento.getTime() <= o.ahora.getTime()) return [];

      // El silencio se mide en la hora del aviso, no en la de la tarea: no
      // sirve callar una alarma que suena a las 5:50 por una tarea de las 6:00.
      const horaAviso = restarMinutos(t.hora_inicio, antes);
      if (enSilencio(horaAviso, o.ajustes.silencio_desde, o.ajustes.silencio_hasta)) return [];

      return [{
        tarea_id: t.id,
        momento,
        titulo: antes === 0 ? `Ahora: ${t.titulo}` : `En ${antes} min: ${t.titulo}`,
        cuerpo: `${t.hora_inicio} — ${t.hora_fin}`,
        sonido: t.tipo === 'fe' ? o.ajustes.sonido_devocional : o.ajustes.sonido_aviso,
      }];
    })
    .sort((a, b) => a.momento.getTime() - b.momento.getTime());
}

function restarMinutos(hora: Hora, minutos: number): Hora {
  const m = ((aMinutos(hora) - minutos) % 1440 + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}
