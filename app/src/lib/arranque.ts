/**
 * El asistente de arranque: cinco preguntas → una semana entera.
 *
 * Puro y determinista. Con las mismas respuestas sale siempre la misma
 * semana, así que se puede probar sin bundler y la persona puede volver atrás
 * sin miedo a que le cambie lo que ya vio.
 *
 * Hoy coloca las cosas con reglas. Cuando entre la IA, sustituye a
 * `armarSemana` y devuelve la misma forma: el resto de la app no se entera.
 */

import { seLeOfrece } from './ciclo';
import { aHora, aMinutos } from './fechas';
import type {
  Actividad, Ajustes, BloqueRutina, Hora, Ocupacion, Sexo, TipoActividad,
} from './tipos';

export interface Respuestas {
  nombre: string;
  edad: number | null;
  /** Se usa para una sola cosa: ofrecer el calendario del ciclo. */
  sexo: Sexo;
  /** Si aceptó ese calendario. Solo se pregunta cuando toca. */
  ciclo_activo: boolean;
  hora_despertar: Hora;
  hora_dormir: Hora;
  devocional_min: number;
  devocional_momento: 'mañana' | 'noche' | 'ambas';
  ocupacion: Ocupacion;
  ocupacion_nombre: string;
  ocupacion_inicio: Hora;
  ocupacion_fin: Hora;
  /** 0 = domingo … 6 = sábado. */
  dias_ocupados: number[];
  quehaceres: string[];
  gustos: string[];
}

export const RESPUESTAS_EN_BLANCO: Respuestas = {
  nombre: '',
  edad: null,
  sexo: 'sin_decir',
  ciclo_activo: false,
  hora_despertar: '06:00',
  hora_dormir: '21:30',
  devocional_min: 60,
  devocional_momento: 'mañana',
  ocupacion: 'colegio',
  ocupacion_nombre: '',
  ocupacion_inicio: '08:00',
  ocupacion_fin: '14:00',
  dias_ocupados: [1, 2, 3, 4, 5],
  quehaceres: [],
  gustos: [],
};

interface Plantilla {
  id: string;
  nombre: string;
  emoji: string;
  tipo: TipoActividad;
  minutos: number;
}

/** Cómo se llama y se dibuja cada ocupación. Es lo que trae de fábrica: la
 *  persona le puede poner el nombre que quiera. */
export const OCUPACIONES: { id: Ocupacion; nombre: string; emoji: string }[] = [
  { id: 'colegio',     nombre: 'Colegio',     emoji: '📘' },
  { id: 'escuela',     nombre: 'Escuela',     emoji: '🎒' },
  { id: 'universidad', nombre: 'Universidad', emoji: '🎓' },
  { id: 'trabajo',     nombre: 'Trabajo',     emoji: '💼' },
  { id: 'otro',        nombre: 'Otra cosa',   emoji: '📌' },
  { id: 'ninguno',     nombre: 'Ninguno',     emoji: '—' },
];

export const QUEHACERES: Plantilla[] = [
  { id: 'cama',    nombre: 'Tender la cama',   emoji: '🛏️', tipo: 'casa', minutos: 5 },
  { id: 'cuarto',  nombre: 'Ordenar el cuarto', emoji: '🧹', tipo: 'casa', minutos: 30 },
  { id: 'platos',  nombre: 'Lavar los platos',  emoji: '🍽️', tipo: 'casa', minutos: 20 },
  { id: 'basura',  nombre: 'Sacar la basura',   emoji: '🗑️', tipo: 'casa', minutos: 10 },
  { id: 'ropa',    nombre: 'Doblar la ropa',    emoji: '👕', tipo: 'casa', minutos: 20 },
  { id: 'mascota', nombre: 'Cuidar la mascota', emoji: '🐶', tipo: 'casa', minutos: 20 },
];

export const GUSTOS: Plantilla[] = [
  { id: 'leer',     nombre: 'Leer',          emoji: '📖', tipo: 'descanso', minutos: 30 },
  { id: 'dibujar',  nombre: 'Dibujar',       emoji: '🎨', tipo: 'descanso', minutos: 45 },
  { id: 'musica',   nombre: 'Tocar música',  emoji: '🎸', tipo: 'descanso', minutos: 45 },
  { id: 'deporte',  nombre: 'Hacer deporte', emoji: '⚽', tipo: 'deporte',  minutos: 45 },
  { id: 'caminar',  nombre: 'Salir a caminar', emoji: '🚶', tipo: 'deporte', minutos: 30 },
  { id: 'amigos',   nombre: 'Ver a mis amigos', emoji: '💬', tipo: 'familia', minutos: 60 },
];

export interface Propuesta {
  actividades: Actividad[];
  rutina: BloqueRutina[];
  ajustes: Partial<Ajustes>;
  /** Qué se colocó y por qué, para enseñárselo antes de guardar. */
  resumen: string[];
}

/** La cena y dormir son anclas: nada flexible se pone encima. */
const CENA_INICIO = '19:00';
const CENA_MIN = 45;

export function armarSemana(r: Respuestas, personaId: string): Propuesta {
  const act = new Map<string, Actividad>();
  const bloques: BloqueRutina[] = [];
  const resumen: string[] = [];

  const crear = (
    id: string, nombre: string, emoji: string, tipo: TipoActividad,
    minutos: number, fijo = false, avisarAntes: number | null = null,
  ): Actividad => {
    const a: Actividad = {
      id: `act-${id}`, persona_id: personaId, nombre, emoji, tipo,
      duracion_min: minutos, es_habito: tipo === 'fe' || tipo === 'casa',
      es_fijo: fijo, avisar: true, avisar_antes_min: avisarAntes, activa: true,
    };
    act.set(a.id, a);
    return a;
  };

  const poner = (a: Actividad, dia: number, inicio: Hora, minutos = a.duracion_min) => {
    bloques.push({
      id: `rut-${dia}-${a.id}`,
      persona_id: personaId,
      actividad_id: a.id,
      modo: 'escolar',
      repeticion: 'semanal',
      dia_semana: dia,
      cada_n: null, dia_mes: null, mes: null,
      desde: '2020-01-01', hasta: null,
      hora_inicio: inicio,
      hora_fin: aHora(aMinutos(inicio) + minutos),
      activo: true,
    });
  };

  // --- el catálogo ---
  const manana = r.devocional_momento !== 'noche';
  const noche = r.devocional_momento !== 'mañana';
  const devMin = Math.max(5, r.devocional_min);

  const devMananaAct = manana
    ? crear('devocional', 'Devocional', '💜', 'fe', devMin, true, 15) : null;
  const devNocheAct = noche
    ? crear('devocional-noche', 'Devocional de la noche', '💜', 'fe',
        manana ? Math.min(20, devMin) : devMin, true, 10) : null;

  const trabaja = r.ocupacion !== 'ninguno';
  const deFabrica = OCUPACIONES.find((o) => o.id === r.ocupacion);
  const etiquetaOcupacion = r.ocupacion_nombre.trim() || deFabrica?.nombre || 'Colegio';
  const ocupacionAct = trabaja
    ? crear('ocupacion', etiquetaOcupacion, deFabrica?.emoji ?? '📘',
        'estudio', aMinutos(r.ocupacion_fin) - aMinutos(r.ocupacion_inicio), true, 20)
    : null;
  // Solo quien estudia necesita un rato para terminar la tarea al llegar.
  const estudia = ['colegio', 'escuela', 'universidad'].includes(r.ocupacion);
  const estudioAct = estudia
    ? crear('estudiar', 'Terminar de estudiar', '📘', 'estudio', 45) : null;

  const cenaAct = crear('cena', 'Cena', '🍽️', 'familia', CENA_MIN, true);
  const dormirAct = crear('dormir', 'Dormir', '🌙', 'descanso', 30, true, 30);

  const quehaceres = QUEHACERES.filter((q) => r.quehaceres.includes(q.id))
    .map((q) => crear(q.id, q.nombre, q.emoji, q.tipo, q.minutos));
  const gustos = GUSTOS.filter((g) => r.gustos.includes(g.id))
    .map((g) => crear(g.id, g.nombre, g.emoji, g.tipo, g.minutos));

  // --- colocar cada día ---
  for (let dia = 0; dia <= 6; dia++) {
    const ocupado = trabaja && r.dias_ocupados.includes(dia);
    // El fin de semana se empieza una hora más tarde: nadie madruga el sábado
    // igual que el martes, y una rutina que no se cumple no sirve.
    const despierta = ocupado ? r.hora_despertar : aHora(aMinutos(r.hora_despertar) + 60);
    let cursor = aMinutos(despierta);

    if (devMananaAct) {
      poner(devMananaAct, dia, aHora(cursor));
      cursor += devMananaAct.duracion_min;
    }

    if (ocupado && ocupacionAct) {
      poner(ocupacionAct, dia, r.ocupacion_inicio);
      cursor = aMinutos(r.ocupacion_fin);
      if (estudioAct) {
        poner(estudioAct, dia, aHora(cursor));
        cursor += estudioAct.duracion_min;
      }
    }

    // Los quehaceres van después de lo obligatorio, y solo si caben antes de
    // la cena: apilarlos encima haría un día que no se puede cumplir.
    for (const q of quehaceres) {
      if (cursor + q.duracion_min > aMinutos(CENA_INICIO)) break;
      poner(q, dia, aHora(cursor));
      cursor += q.duracion_min;
    }

    // Un gusto al día, rotando, para que la semana no sea toda deberes.
    if (gustos.length > 0) {
      const g = gustos[dia % gustos.length];
      if (cursor + g.duracion_min <= aMinutos(CENA_INICIO)) {
        poner(g, dia, aHora(cursor));
        cursor += g.duracion_min;
      }
    }

    poner(cenaAct, dia, CENA_INICIO);

    const dormir = aMinutos(r.hora_dormir);
    if (devNocheAct) {
      poner(devNocheAct, dia, aHora(dormir - devNocheAct.duracion_min - 10));
    }
    poner(dormirAct, dia, r.hora_dormir);
  }

  // --- el resumen que se le enseña ---
  if (devMananaAct) resumen.push(`${devMin} min de devocional al despertar, antes que nada`);
  if (devNocheAct) resumen.push(`Otro devocional antes de dormir, de ${devNocheAct.duracion_min} min`);
  if (ocupacionAct) {
    resumen.push(`${etiquetaOcupacion} de ${r.ocupacion_inicio} a ${r.ocupacion_fin}, ${r.dias_ocupados.length} días a la semana`);
  }
  if (estudioAct) resumen.push(`45 min para terminar de estudiar al salir`);
  if (quehaceres.length > 0) {
    resumen.push(`${quehaceres.length} ${quehaceres.length === 1 ? 'quehacer' : 'quehaceres'}: ${quehaceres.map((q) => q.nombre.toLowerCase()).join(', ')}`);
  }
  if (gustos.length > 0) resumen.push(`Un rato para ti cada día, rotando entre lo que te gusta`);
  resumen.push(`Cena a las ${CENA_INICIO} y a dormir a las ${r.hora_dormir}`);
  if (!trabaja) resumen.push('Sin colegio ni trabajo puesto: puedes añadirlo después');

  return {
    actividades: [...act.values()],
    rutina: bloques,
    ajustes: {
      hora_despertar: r.hora_despertar,
      hora_dormir: r.hora_dormir,
      ocupacion: r.ocupacion,
      ocupacion_nombre: r.ocupacion_nombre,
      hora_fin_ocupacion: r.ocupacion_fin,
      dias_ocupados: r.dias_ocupados,
      // Solo se enciende si de verdad se le ofreció y dijo que sí: si no, un
      // «sí» de hace tres preguntas quedaría encendido al cambiar la edad.
      ciclo_activo: seLeOfrece(r.sexo, r.edad) && r.ciclo_activo,
    },
    resumen,
  };
}
