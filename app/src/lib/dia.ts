/**
 * El generador del día: capa 1 (rutina) → capa 3 (tareas de una fecha).
 *
 * Todo aquí es puro y sin fechas del sistema, así que se puede probar sin
 * simular relojes. Guardar el resultado es trabajo del repositorio.
 */

import { aMinutos, diasEntre, diaSemana, sumarDias } from './fechas';
import type {
  Actividad, Ajustes, BloqueRutina, Fecha, Hora, ModoRutina, Tarea,
} from './tipos';

/** Cuántos días tiene el mes de una fecha. */
function diasDelMes(fecha: Fecha): number {
  const [a, m] = fecha.split('-').map(Number);
  return new Date(Date.UTC(a, m, 0)).getUTCDate();
}

/**
 * ¿Le toca a este bloque en esta fecha?
 *
 * Una sola función para todas las repeticiones, en vez de un sistema para la
 * semana y otro para el resto. Los casos raros —el día 31 en un mes de 30, el
 * 29 de febrero en un año que no es bisiesto— **caen en el último día del
 * mes** en lugar de saltarse: quien puso «el 31» quiere decir «el último».
 */
export function tocaEsteDia(b: BloqueRutina, fecha: Fecha, zonaHoraria: string): boolean {
  if (!b.activo) return false;
  if (fecha < b.desde) return false;
  if (b.hasta !== null && fecha > b.hasta) return false;

  const [, mes, dia] = fecha.split('-').map(Number);

  switch (b.repeticion) {
    case 'diaria':
      return true;

    case 'semanal':
      return b.dia_semana !== null && diaSemana(fecha, zonaHoraria) === b.dia_semana;

    case 'cada_n_dias': {
      if (b.cada_n === null || b.cada_n < 1) return false;
      return diasEntre(b.desde, fecha) % b.cada_n === 0;
    }

    case 'mensual': {
      if (b.dia_mes === null) return false;
      const ultimo = diasDelMes(fecha);
      return dia === Math.min(b.dia_mes, ultimo);
    }

    case 'anual': {
      if (b.dia_mes === null || b.mes === null) return false;
      if (mes !== b.mes) return false;
      const ultimo = diasDelMes(fecha);
      return dia === Math.min(b.dia_mes, ultimo);
    }
  }
}

/** Una tarea recién generada, antes de que la base de datos le ponga id. */
export type TareaNueva = Omit<Tarea, 'id' | 'dia_id'>;

export interface DiaGenerado {
  fecha: Fecha;
  dia_semana: number;
  tipo: 'escolar' | 'fin_de_semana' | 'feriado' | 'vacaciones' | 'especial';
  modo_usado: ModoRutina;
  tareas: TareaNueva[];
}

export interface OpcionesGenerar {
  fecha: Fecha;
  zonaHoraria: string;
  ajustes: Ajustes;
  actividades: Actividad[];
  rutina: BloqueRutina[];
  modo?: ModoRutina;
}

/**
 * Arma el plan de una fecha a partir de la rutina.
 *
 * Es una copia: cambiar una tarea de hoy no toca la rutina. Y es determinista
 * — con los mismos datos sale el mismo día, así que se puede volver a generar
 * sin miedo.
 */
export function generarDia(o: OpcionesGenerar): DiaGenerado {
  const dow = diaSemana(o.fecha, o.zonaHoraria);
  const modo = o.modo ?? 'escolar';
  const esDiaDeOcupacion = o.ajustes.dias_ocupados.includes(dow);

  const porId = new Map(o.actividades.filter((a) => a.activa).map((a) => [a.id, a]));

  const tareas = o.rutina
    .filter((b) => b.modo === modo && tocaEsteDia(b, o.fecha, o.zonaHoraria))
    .flatMap<TareaNueva>((b) => {
      const act = porId.get(b.actividad_id);
      // Un bloque que apunta a una actividad borrada o apagada no produce nada.
      if (!act) return [];
      return [{
        actividad_id: act.id,
        titulo: act.nombre,
        emoji: act.emoji,
        tipo: act.tipo,
        hora_inicio: b.hora_inicio,
        hora_fin: b.hora_fin,
        orden: 0,
        es_fijo: act.es_fijo,
        origen: 'rutina',
        estado: 'pendiente',
        completado_en: null,
        nota: null,
        minutos_reales: null,
        termino_de_verdad: null,
        puntos: 0,
        metodo_devocional: null,
      }];
    })
    .sort(ordenarTareas)
    .map((t, i) => ({ ...t, orden: i }));

  return {
    fecha: o.fecha,
    dia_semana: dow,
    tipo: esDiaDeOcupacion ? 'escolar' : 'fin_de_semana',
    modo_usado: modo,
    tareas,
  };
}

/** Por hora de inicio; a igual hora, primero las ancladas, luego alfabético.
 *  El desempate importa: sin él, dos tareas a la misma hora bailan de posición
 *  entre generaciones. */
function ordenarTareas(a: TareaNueva, b: TareaNueva): number {
  const d = aMinutos(a.hora_inicio) - aMinutos(b.hora_inicio);
  if (d !== 0) return d;
  if (a.es_fijo !== b.es_fijo) return a.es_fijo ? -1 : 1;
  return a.titulo.localeCompare(b.titulo, 'es');
}

const NOMBRE_DIA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/**
 * El próximo día con colegio o trabajo, a partir de mañana.
 *
 * Sirve para explicar por qué hoy está vacío. Un día sin escuela y sin decir
 * por qué se lee como si la app no hubiera guardado el horario.
 */
export function proximaOcupacion(
  fecha: Fecha, diasOcupados: number[], zonaHoraria: string,
): { fecha: Fecha; nombre: string; enCuantos: number } | null {
  if (diasOcupados.length === 0) return null;
  for (let i = 1; i <= 7; i++) {
    const f = sumarDias(fecha, i);
    const dow = diaSemana(f, zonaHoraria);
    if (diasOcupados.includes(dow)) {
      return { fecha: f, nombre: NOMBRE_DIA[dow], enCuantos: i };
    }
  }
  return null;
}

export interface Foco {
  /** Lo que resaltar en grande al abrir la app. */
  actual: Tarea | null;
  /** true si la hora de ahora cae dentro de esa tarea. */
  enCurso: boolean;
  /** Lo que viene después de `actual`. */
  siguiente: Tarea | null;
}

/**
 * Qué toca ahora. Si el reloj cae dentro de una tarea pendiente, esa; si no,
 * la siguiente que empieza. Cuando ya no queda nada, `actual` es null y la
 * pantalla enseña que el día está cerrado.
 */
export function foco(tareas: Tarea[], ahora: Hora): Foco {
  const min = aMinutos(ahora);
  const pendientes = tareas
    .filter((t) => t.estado === 'pendiente')
    .sort((a, b) => aMinutos(a.hora_inicio) - aMinutos(b.hora_inicio));

  const enCurso = pendientes.find(
    (t) => aMinutos(t.hora_inicio) <= min && min < aMinutos(t.hora_fin),
  );
  if (enCurso) {
    const resto = pendientes.filter((t) => t.id !== enCurso.id);
    return { actual: enCurso, enCurso: true, siguiente: resto[0] ?? null };
  }

  const porVenir = pendientes.filter((t) => aMinutos(t.hora_inicio) > min);
  return {
    actual: porVenir[0] ?? null,
    enCurso: false,
    siguiente: porVenir[1] ?? null,
  };
}

/** Cuánto del día está hecho, de 0 a 100. Las omitidas no cuentan como hechas
 *  ni penalizan: salen del total. */
export function porcentajeCumplido(tareas: Tarea[]): number {
  const cuentan = tareas.filter((t) => t.estado !== 'omitida');
  if (cuentan.length === 0) return 0;
  const hechas = cuentan.filter((t) => t.estado === 'hecha').length;
  return Math.round((hechas / cuentan.length) * 100);
}

export function resumenAvance(tareas: Tarea[]): { hechas: number; total: number } {
  const cuentan = tareas.filter((t) => t.estado !== 'omitida');
  return {
    hechas: cuentan.filter((t) => t.estado === 'hecha').length,
    total: cuentan.length,
  };
}
