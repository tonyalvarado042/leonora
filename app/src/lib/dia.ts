/**
 * El generador del día: capa 1 (rutina) → capa 3 (tareas de una fecha).
 *
 * Todo aquí es puro y sin fechas del sistema, así que se puede probar sin
 * simular relojes. Guardar el resultado es trabajo del repositorio.
 */

import { encargosDeFecha, tareaDeEncargo } from './encargos';
import { EMOJI_TIPO_EVENTO, eventosDeFecha } from './eventos';
import { aMinutos, diasEntre, diaSemana, sumarDias } from './fechas';
import type {
  Actividad, Ajustes, BloqueRutina, Encargo, Evento, Fecha, Hora, ModoRutina,
  Tarea, TareaNueva, TipoActividad, TipoEvento,
} from './tipos';

export type { TareaNueva };

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

export interface DiaGenerado {
  fecha: Fecha;
  dia_semana: number;
  tipo: 'escolar' | 'fin_de_semana' | 'feriado' | 'vacaciones' | 'especial';
  modo_usado: ModoRutina;
  tareas: TareaNueva[];
  /** Lo que hay hoy en el calendario, ya filtrado para esta persona. La
   *  pantalla lo enseña arriba: un feriado se anuncia, no se adivina. */
  eventos: Evento[];
  /** El evento que libró el día, si lo hay. Sirve para decir por qué hoy no
   *  hay colegio en vez de dejar el hueco sin explicación. */
  libre: Evento | null;
}

export interface OpcionesGenerar {
  fecha: Fecha;
  zonaHoraria: string;
  ajustes: Ajustes;
  actividades: Actividad[];
  rutina: BloqueRutina[];
  modo?: ModoRutina;
  /** Feriados, exámenes, cumpleaños y citas. Sin ellos el día sale igual que
   *  antes, así que quien todavía no los tiene no nota nada. */
  eventos?: Evento[];
  /** Lo que papá o mamá mandó para esa fecha. Un feriado no lo borra: el
   *  colegio se cancela, sacar la basura no. */
  encargos?: Encargo[];
}

/** Con qué color se pinta cada evento cuando entra al día como tarea. */
const TIPO_DE_EVENTO: Record<TipoEvento, TipoActividad> = {
  feriado: 'descanso', escolar: 'estudio', examen: 'estudio',
  entrega: 'estudio', cumpleanos: 'familia', cita: 'familia',
  viaje: 'descanso', personal: 'descanso',
};

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

  const eventos = eventosDeFecha(o.eventos ?? [], o.fecha, o.ajustes.persona_id);
  const libre = eventos.find((e) => e.efecto === 'libra_el_dia') ?? null;
  // Solo las citas con hora bloquean horas: una que dura todo el día no tapa
  // nada en concreto, así que se anuncia y ya.
  const ocupadas = eventos.flatMap((e) =>
    e.efecto === 'bloquea_horas' && !e.todo_el_dia
      && e.hora_inicio !== null && e.hora_fin !== null
      ? [{ inicio: aMinutos(e.hora_inicio), fin: aMinutos(e.hora_fin) }]
      : []);

  const porId = new Map(o.actividades.filter((a) => a.activa).map((a) => [a.id, a]));

  const deRutina = o.rutina
    .filter((b) => b.modo === modo && tocaEsteDia(b, o.fecha, o.zonaHoraria))
    .flatMap<TareaNueva>((b) => {
      const act = porId.get(b.actividad_id);
      // Un bloque que apunta a una actividad borrada o apagada no produce nada.
      if (!act) return [];
      // Un feriado cancela el colegio y la tarea del colegio. El devocional,
      // la cena y el cuarto siguen: se cancela el colegio, no la vida.
      if (libre && act.tipo === 'estudio') return [];
      if (chocaConUnaCita(b.hora_inicio, b.hora_fin, ocupadas) && !act.es_fijo) return [];
      return [{
        actividad_id: act.id,
        encargo_id: null,
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
    });

  const deEncargos = encargosDeFecha(o.encargos ?? [], o.fecha, o.ajustes.persona_id)
    .map((e) => tareaDeEncargo(e));

  const tareas = [...deRutina, ...tareasDeEventos(eventos), ...deEncargos]
    .sort(ordenarTareas)
    .map((t, i) => ({ ...t, orden: i }));

  return {
    fecha: o.fecha,
    dia_semana: dow,
    tipo: tipoDeDia(modo, libre, esDiaDeOcupacion),
    modo_usado: modo,
    tareas,
    eventos,
    libre,
  };
}

function tipoDeDia(
  modo: ModoRutina, libre: Evento | null, esDiaDeOcupacion: boolean,
): DiaGenerado['tipo'] {
  if (modo === 'vacaciones') return 'vacaciones';
  if (libre) return libre.tipo === 'feriado' ? 'feriado' : 'especial';
  return esDiaDeOcupacion ? 'escolar' : 'fin_de_semana';
}

/** Un evento con hora entra al día como una tarea más, para que se vea en su
 *  sitio del horario. Los de todo el día se anuncian arriba y no ocupan hora:
 *  un cumpleaños no es algo que se marque a las 3 de la tarde. */
function tareasDeEventos(eventos: Evento[]): TareaNueva[] {
  return eventos.flatMap<TareaNueva>((e) => {
    if (e.todo_el_dia || e.hora_inicio === null || e.hora_fin === null) return [];
    return [{
      actividad_id: null,
      encargo_id: null,
      titulo: e.titulo,
      emoji: EMOJI_TIPO_EVENTO[e.tipo],
      tipo: TIPO_DE_EVENTO[e.tipo],
      hora_inicio: e.hora_inicio,
      hora_fin: e.hora_fin,
      orden: 0,
      es_fijo: true,
      origen: 'evento',
      estado: 'pendiente',
      completado_en: null,
      nota: e.descripcion,
      minutos_reales: null,
      termino_de_verdad: null,
      puntos: 0,
      metodo_devocional: null,
    }];
  });
}

/** Se solapan si una empieza antes de que la otra termine, por los dos lados.
 *  Tocarse de punta no es chocar: 14:00–15:00 y 15:00–16:00 caben las dos. */
function chocaConUnaCita(
  inicio: Hora, fin: Hora, citas: { inicio: number; fin: number }[],
): boolean {
  const a = aMinutos(inicio);
  const b = aMinutos(fin);
  return citas.some((c) => a < c.fin && c.inicio < b);
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
