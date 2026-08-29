/**
 * Rachas, niveles y premios.
 *
 * Cuatro rachas separadas, no una. Una racha única castiga demasiado: perder
 * cuarenta días de devocional por no ordenar el cuarto un día desanima tanto
 * que la gente deja la app. Con cuatro vías se puede ir fuerte en una y floja
 * en otra, que es como funciona la vida real.
 *
 * Todo aquí es puro: se prueba sin bundler, sin teléfono y sin relojes falsos.
 */

import { diasEntre, mesDe } from './fechas';
import type { Actividad, Fecha, Tarea, TipoActividad } from './tipos';

export type Via = 'apertura' | 'dia' | 'devocional' | 'oracion';

export interface Logro {
  id: string;
  via: Via;
  dias: number;
  nombre: string;
  emoji: string;
}

/**
 * Las 24 insignias: cuatro escaleras iguales, de 3 días a un año.
 *
 * Los nombres viven en datos, no en código: cambiar uno o mover un umbral no
 * debería obligar a tocar la lógica. Y son todos neutros a propósito — la app
 * se va a vender a familias enteras, y a un papá no le puede salir
 * «Disciplinada».
 */
export const LOGROS: Logro[] = [
  { id: 'fe-3',    via: 'devocional', dias: 3,   nombre: 'Semilla', emoji: '🌱' },
  { id: 'fe-7',    via: 'devocional', dias: 7,   nombre: 'Raíz',    emoji: '🪴' },
  { id: 'fe-14',   via: 'devocional', dias: 14,  nombre: 'Brote',   emoji: '🌿' },
  { id: 'fe-30',   via: 'devocional', dias: 30,  nombre: 'Árbol',   emoji: '🌳' },
  { id: 'fe-100',  via: 'devocional', dias: 100, nombre: 'Fruto',   emoji: '🍎' },
  { id: 'fe-365',  via: 'devocional', dias: 365, nombre: 'Cosecha', emoji: '🌾' },

  { id: 'dia-3',   via: 'dia', dias: 3,   nombre: 'En marcha',  emoji: '🚶' },
  { id: 'dia-7',   via: 'dia', dias: 7,   nombre: 'Constante',  emoji: '🎯' },
  { id: 'dia-14',  via: 'dia', dias: 14,  nombre: 'Sin fallar', emoji: '⚙️' },
  { id: 'dia-30',  via: 'dia', dias: 30,  nombre: 'Imparable',  emoji: '🚀' },
  { id: 'dia-100', via: 'dia', dias: 100, nombre: 'De hierro',  emoji: '🛡️' },
  { id: 'dia-365', via: 'dia', dias: 365, nombre: 'Leyenda',    emoji: '👑' },

  { id: 'ap-3',    via: 'apertura', dias: 3,   nombre: 'Presente',       emoji: '👋' },
  { id: 'ap-7',    via: 'apertura', dias: 7,   nombre: 'Fiel',           emoji: '🤝' },
  { id: 'ap-14',   via: 'apertura', dias: 14,  nombre: 'Sin faltar',     emoji: '📌' },
  { id: 'ap-30',   via: 'apertura', dias: 30,  nombre: 'Siempre aquí',   emoji: '🏠' },
  { id: 'ap-100',  via: 'apertura', dias: 100, nombre: 'Ancla',          emoji: '⚓' },
  { id: 'ap-365',  via: 'apertura', dias: 365, nombre: 'Un año contigo', emoji: '🎂' },

  { id: 'or-3',    via: 'oracion', dias: 3,   nombre: 'Primer amén', emoji: '🕊️' },
  { id: 'or-7',    via: 'oracion', dias: 7,   nombre: 'En oración',  emoji: '🙏' },
  { id: 'or-14',   via: 'oracion', dias: 14,  nombre: 'De rodillas', emoji: '🤲' },
  { id: 'or-30',   via: 'oracion', dias: 30,  nombre: 'Sin descanso', emoji: '🔥' },
  { id: 'or-100',  via: 'oracion', dias: 100, nombre: 'Centinela',   emoji: '⚔️' },
  { id: 'or-365',  via: 'oracion', dias: 365, nombre: 'Sin soltar',  emoji: '🕯️' },
];

export const NOMBRE_VIA: Record<Via, string> = {
  apertura: 'Abrir la app',
  dia: 'Cumplir tu día',
  devocional: 'Devocional',
  oracion: 'Orar por otros',
};

export const EMOJI_VIA: Record<Via, string> = {
  apertura: '👋', dia: '✅', devocional: '💜', oracion: '🙏',
};

export interface Racha {
  via: Via;
  racha_actual: number;
  racha_mejor: number;
  total_dias: number;
  ultimo_dia: Fecha | null;
  /** El primer día del mes en que se gastó el día de gracia, o null. */
  gracia_usada_mes: Fecha | null;
}

export function rachaVacia(via: Via): Racha {
  return {
    via, racha_actual: 0, racha_mejor: 0, total_dias: 0,
    ultimo_dia: null, gracia_usada_mes: null,
  };
}

export interface Avance {
  racha: Racha;
  /** true si este día ya estaba contado y no se hizo nada. */
  repetido: boolean;
  /** true si el día de gracia salvó la racha. */
  uso_gracia: boolean;
  /** Insignias que se acaban de desbloquear. */
  logros: Logro[];
}

/**
 * Suma un día a una racha.
 *
 * El día de gracia: una vez al mes, fallar un solo día no rompe la racha. Sin
 * esto, quien falla una vez abandona la app entera — y perder cuarenta días
 * por una noche de fiebre no enseña nada bueno.
 */
export function avanzar(racha: Racha, hoy: Fecha, ganados: Set<string> = new Set()): Avance {
  if (racha.ultimo_dia === hoy) {
    return { racha, repetido: true, uso_gracia: false, logros: [] };
  }

  const hueco = racha.ultimo_dia === null ? Infinity : diasEntre(racha.ultimo_dia, hoy);
  const mes = mesDe(hoy);
  const graciaDisponible = racha.gracia_usada_mes !== mes;

  let actual: number;
  let uso_gracia = false;

  if (hueco === 1) {
    actual = racha.racha_actual + 1;              // día seguido
  } else if (hueco === 2 && graciaDisponible) {
    actual = racha.racha_actual + 1;              // falló uno, la gracia lo salva
    uso_gracia = true;
  } else {
    actual = 1;                                   // se rompió: vuelta a empezar
  }

  const nueva: Racha = {
    ...racha,
    racha_actual: actual,
    racha_mejor: Math.max(racha.racha_mejor, actual),
    total_dias: racha.total_dias + 1,
    ultimo_dia: hoy,
    gracia_usada_mes: uso_gracia ? mes : racha.gracia_usada_mes,
  };

  return { racha: nueva, repetido: false, uso_gracia, logros: logrosAl(racha.via, actual, ganados) };
}

/** Las insignias que se cruzan al llegar a `dias`, sin repetir las ya ganadas. */
export function logrosAl(via: Via, dias: number, ganados: Set<string>): Logro[] {
  return LOGROS.filter((l) => l.via === via && l.dias <= dias && !ganados.has(l.id));
}

/** El siguiente peldaño de una vía, o null si ya están todos. */
export function proximoLogro(via: Via, dias: number): Logro | null {
  return LOGROS.filter((l) => l.via === via && l.dias > dias)
    .sort((a, b) => a.dias - b.dias)[0] ?? null;
}

// ------------------------------------------------------------------ el día

/** ¿La vía se cumplió hoy? `apertura` y `oracion` no salen de las tareas. */
export function cumplioHoy(via: 'dia' | 'devocional', tareas: Tarea[]): boolean {
  if (via === 'devocional') {
    const fe = tareas.filter((t) => t.tipo === 'fe' && t.estado !== 'omitida');
    return fe.length > 0 && fe.every((t) => t.estado === 'hecha');
  }
  const cuentan = tareas.filter((t) => t.estado !== 'omitida');
  return cuentan.length > 0 && cuentan.every((t) => t.estado === 'hecha');
}

// ------------------------------------------------------------------ chispas

export const CHISPAS_BASE = 10;
export const CHISPAS_DIA_PERFECTO = 50;

export interface Marcado {
  /** Cuántos minutos duró de verdad, si se sabe. */
  minutos_reales: number | null;
  /** Respuesta a «¿terminaste, o lo dejas para después?». */
  termino_de_verdad: boolean | null;
}

/**
 * Las chispas de una tarea, según su tipo.
 *
 * Premiar la velocidad en el estudio enseña lo contrario de lo que se busca:
 * si dejaste una hora y la app te felicita por parar a los treinta minutos, te
 * está pagando por estudiar menos. Y una racha de devocionales de dos minutos
 * no le sirve a nadie. Así que la velocidad solo se premia donde de verdad es
 * un logro — los quehaceres.
 */
export function chispas(tipo: TipoActividad, planeados: number, m: Marcado): number {
  switch (tipo) {
    case 'casa': {
      // Rapidez: hasta 15 extra, proporcional al tiempo ahorrado.
      if (m.minutos_reales === null || planeados <= 0) return CHISPAS_BASE;
      const ahorrado = Math.max(0, planeados - m.minutos_reales);
      return CHISPAS_BASE + Math.min(15, Math.round((ahorrado / planeados) * 15));
    }
    case 'estudio':
      // Haber terminado la tarea, no haber parado el reloj.
      return CHISPAS_BASE + (m.termino_de_verdad === true ? 10 : 0);
    case 'fe':
    case 'deporte':
      // El tiempo completo. Aquí correr no tiene sentido.
      return CHISPAS_BASE + (m.minutos_reales !== null && m.minutos_reales >= planeados ? 10 : 0);
    default:
      return CHISPAS_BASE;
  }
}

/** ¿Hay que preguntar «¿terminaste, o lo dejas para después?»? Solo cuando la
 *  respuesta cambia el premio: al marcar estudio antes de tiempo. */
export function preguntarSiTermino(t: Tarea, act: Actividad | undefined, minutosReales: number): boolean {
  if (t.tipo !== 'estudio') return false;
  const planeados = act?.duracion_min ?? 0;
  return planeados > 0 && minutosReales < planeados;
}

// ------------------------------------------------------------ celebración

export type Celebracion = 'fuego' | 'confeti' | 'estrellas';

/** Cada premio tiene su forma, así se sabe qué pasó sin leer nada. */
export function celebracionPor(o: {
  logros: Logro[]; diaPerfecto: boolean; rachaAvanzo: boolean; chispasExtra: boolean;
}): Celebracion | null {
  if (o.logros.length > 0) return 'confeti';
  if (o.diaPerfecto) return 'estrellas';
  if (o.rachaAvanzo || o.chispasExtra) return 'fuego';
  return null;
}
