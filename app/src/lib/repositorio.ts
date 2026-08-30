/**
 * Guardar y leer.
 *
 * La Fase 1 corre contra el teléfono (AsyncStorage) para poder usarse sin
 * montar nada. `supabase.ts` implementa esta misma interfaz contra la base de
 * datos real; se cambia de una sin tocar las pantallas.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Propuesta } from './arranque';
import { generarDia, porcentajeCumplido, type TareaNueva } from './dia';
import {
  avanzar, celebracionPor, chispas, CHISPAS_BASE, CHISPAS_DIA_PERFECTO,
  cumplioHoy, rachaVacia,
  type Celebracion, type Logro, type Marcado, type Racha, type Via,
} from './rachas';
import type {
  Actividad, Ajustes, BloqueRutina, Dia, EstadoTarea, Fecha, Persona, Tarea,
} from './tipos';
import {
  actividadesIniciales, ajustesIniciales, personaInicial, PERSONA_LOCAL, rutinaInicial,
} from '@/datos/semilla';

export interface TareaSuelta {
  titulo: string;
  emoji: string;
  tipo: Tarea['tipo'];
  hora_inicio: string;
  hora_fin: string;
}

export interface DiaCompleto {
  dia: Dia;
  tareas: Tarea[];
  /** Vías que ya se contaron hoy. Un día contado no se descuenta: si lo
   *  hiciste, lo hiciste, aunque después desmarques. */
  vias_contadas: Via[];
}

/** Lo que hay que enseñar después de marcar una tarea. */
export interface Premio {
  chispas: number;
  logros: Logro[];
  rachas_avanzadas: Via[];
  dia_perfecto: boolean;
  celebracion: Celebracion | null;
}

export interface Repositorio {
  persona(): Promise<Persona>;
  guardarPersona(cambios: Partial<Persona>): Promise<Persona>;
  ajustes(): Promise<Ajustes>;
  guardarAjustes(cambios: Partial<Ajustes>): Promise<Ajustes>;
  actividades(): Promise<Actividad[]>;
  guardarActividad(actividad: Actividad): Promise<Actividad>;
  borrarActividad(id: string): Promise<void>;
  rutina(): Promise<BloqueRutina[]>;
  guardarBloque(bloque: BloqueRutina): Promise<void>;
  borrarBloque(id: string): Promise<void>;
  /** Una tarea que solo existe hoy y no toca la rutina. */
  anadirTareaHoy(fecha: Fecha, tarea: TareaSuelta): Promise<DiaCompleto>;
  borrarTarea(fecha: Fecha, tareaId: string): Promise<DiaCompleto>;
  /** Devuelve el día. Si no existía, lo genera desde la rutina y lo guarda. */
  dia(fecha: Fecha): Promise<DiaCompleto>;
  /** Vuelve a generarlo desde la rutina, perdiendo lo marcado ese día. */
  regenerarDia(fecha: Fecha): Promise<DiaCompleto>;
  marcarTarea(
    fecha: Fecha, tareaId: string, estado: EstadoTarea, marcado?: Marcado,
  ): Promise<{ dia: DiaCompleto; premio: Premio }>;
  rachas(): Promise<Racha[]>;
  logrosGanados(): Promise<string[]>;
  chispasTotales(): Promise<number>;
  /** Suma el día a la racha de abrir la app. Se llama una vez al arrancar. */
  registrarApertura(fecha: Fecha): Promise<Premio>;
  /** Sustituye catálogo y rutina de golpe con lo que armó el asistente. */
  aplicarArranque(p: Propuesta, nombre: string, fecha: Fecha): Promise<void>;
  /** Deja la cuenta como recién instalada. Vuelve a salir la bienvenida. */
  empezarDeNuevo(): Promise<void>;
}

const CLAVE = 'graceday.v1';

interface Almacen {
  persona: Persona;
  ajustes: Ajustes;
  actividades: Actividad[];
  rutina: BloqueRutina[];
  dias: Record<Fecha, DiaCompleto>;
  rachas: Record<Via, Racha>;
  logros_ganados: string[];
  chispas: number;
}

function almacenInicial(): Almacen {
  return {
    persona: personaInicial,
    ajustes: ajustesIniciales,
    actividades: actividadesIniciales.map((a) => ({ ...a, persona_id: PERSONA_LOCAL })),
    rutina: rutinaInicial().map((b) => ({ ...b, persona_id: PERSONA_LOCAL })),
    dias: {},
    rachas: {
      apertura: rachaVacia('apertura'), dia: rachaVacia('dia'),
      devocional: rachaVacia('devocional'), oracion: rachaVacia('oracion'),
    },
    logros_ganados: [],
    chispas: 0,
  };
}

export class RepositorioLocal implements Repositorio {
  private cache: Almacen | null = null;
  /** Las escrituras se encadenan: dos toques seguidos no se pisan. */
  private cola: Promise<unknown> = Promise.resolve();

  private async cargar(): Promise<Almacen> {
    if (this.cache) return this.cache;
    let cargado: Almacen;
    try {
      const crudo = await AsyncStorage.getItem(CLAVE);
      // Se rellenan las claves que falten, para que un almacén guardado antes
      // de añadir un campo no rompa la app.
      cargado = crudo ? { ...almacenInicial(), ...JSON.parse(crudo) } : almacenInicial();
    } catch {
      cargado = almacenInicial();
    }
    this.cache = cargado;
    return cargado;
  }

  private async escribir<T>(cambio: (a: Almacen) => T | Promise<T>): Promise<T> {
    const paso = this.cola.then(async () => {
      const a = await this.cargar();
      const salida = await cambio(a);
      await AsyncStorage.setItem(CLAVE, JSON.stringify(a));
      return salida;
    });
    this.cola = paso.catch(() => undefined);
    return paso;
  }

  // Todos los lectores devuelven copias. Si entregaran el objeto guardado,
  // React vería siempre la misma referencia y no volvería a pintar aunque el
  // dato hubiera cambiado.
  async persona() { return { ...(await this.cargar()).persona }; }
  async ajustes() { return { ...(await this.cargar()).ajustes }; }
  async actividades() { return (await this.cargar()).actividades.map((a) => ({ ...a })); }
  async rutina() { return (await this.cargar()).rutina.map((b) => ({ ...b })); }

  guardarPersona(cambios: Partial<Persona>) {
    return this.escribir((a) => { a.persona = { ...a.persona, ...cambios }; return a.persona; });
  }

  guardarAjustes(cambios: Partial<Ajustes>) {
    return this.escribir((a) => { a.ajustes = { ...a.ajustes, ...cambios }; return a.ajustes; });
  }

  guardarActividad(actividad: Actividad) {
    return this.escribir((a) => {
      const conocida = a.actividades.some((x) => x.id === actividad.id);
      a.actividades = conocida
        ? a.actividades.map((x) => (x.id === actividad.id ? actividad : x))
        : [...a.actividades, actividad];
      return { ...actividad };
    });
  }

  borrarActividad(id: string) {
    return this.escribir<void>((a) => {
      a.actividades = a.actividades.filter((x) => x.id !== id);
      // Un bloque huérfano no produce nada, pero dejarlo ensucia la rutina.
      a.rutina = a.rutina.filter((b) => b.actividad_id !== id);
    });
  }

  anadirTareaHoy(fecha: Fecha, t: TareaSuelta) {
    return this.escribir((a) => {
      const d = a.dias[fecha] ?? construirDia(a, fecha);
      const tareas = [...d.tareas, {
        id: `${d.dia.id}-suelta-${Date.now()}`,
        dia_id: d.dia.id,
        actividad_id: null,
        titulo: t.titulo, emoji: t.emoji, tipo: t.tipo,
        hora_inicio: t.hora_inicio, hora_fin: t.hora_fin,
        orden: 0, es_fijo: false, origen: 'manual' as const,
        estado: 'pendiente' as const, completado_en: null, nota: null,
        minutos_reales: null, termino_de_verdad: null, puntos: 0,
      }].sort((x, y) => x.hora_inicio.localeCompare(y.hora_inicio))
        .map((x, i) => ({ ...x, orden: i }));

      const despues: DiaCompleto = { ...d, tareas };
      a.dias[fecha] = despues;
      return copia(despues);
    });
  }

  borrarTarea(fecha: Fecha, tareaId: string) {
    return this.escribir((a) => {
      const d = a.dias[fecha] ?? construirDia(a, fecha);
      const tareas = d.tareas.filter((t) => t.id !== tareaId);
      const despues: DiaCompleto = {
        ...d, tareas,
        dia: { ...d.dia, porcentaje_cumplido: porcentajeCumplido(tareas) },
      };
      a.dias[fecha] = despues;
      return copia(despues);
    });
  }

  guardarBloque(bloque: BloqueRutina) {
    return this.escribir<void>((a) => {
      const conocido = a.rutina.some((b) => b.id === bloque.id);
      a.rutina = conocido
        ? a.rutina.map((b) => (b.id === bloque.id ? bloque : b))
        : [...a.rutina, bloque];
    });
  }

  borrarBloque(id: string) {
    return this.escribir<void>((a) => { a.rutina = a.rutina.filter((b) => b.id !== id); });
  }

  dia(fecha: Fecha) {
    return this.escribir((a) => copia(a.dias[fecha] ?? construirDia(a, fecha)));
  }

  regenerarDia(fecha: Fecha) {
    return this.escribir((a) => {
      delete a.dias[fecha];
      return copia(construirDia(a, fecha));
    });
  }

  marcarTarea(fecha: Fecha, tareaId: string, estado: EstadoTarea, marcado?: Marcado) {
    return this.escribir((a) => {
      const antes = a.dias[fecha] ?? construirDia(a, fecha);
      const original = antes.tareas.find((t) => t.id === tareaId);
      const act = a.actividades.find((x) => x.id === original?.actividad_id);

      const m: Marcado = marcado ?? { minutos_reales: null, termino_de_verdad: null };
      const gana = estado === 'hecha' && original?.estado !== 'hecha';
      const puntos = gana && original
        ? chispas(original.tipo, act?.duracion_min ?? 0, m)
        : 0;

      const tareas = antes.tareas.map((t) =>
        t.id !== tareaId ? t : {
          ...t,
          estado,
          // La restricción `completado_coherente` de la base de datos dice lo
          // mismo: hecha lleva fecha, cualquier otro estado no.
          completado_en: estado === 'hecha' ? new Date().toISOString() : null,
          minutos_reales: gana ? m.minutos_reales : t.minutos_reales,
          termino_de_verdad: gana ? m.termino_de_verdad : t.termino_de_verdad,
          puntos: gana ? puntos : t.puntos,
        },
      );

      a.chispas += puntos;

      // Las rachas del día se miran después de marcar, no antes.
      const contadas = new Set(antes.vias_contadas);
      const logros: Logro[] = [];
      const avanzadas: Via[] = [];
      for (const via of ['dia', 'devocional'] as const) {
        if (contadas.has(via) || !cumplioHoy(via, tareas)) continue;
        const av = avanzar(a.rachas[via], fecha, new Set(a.logros_ganados));
        a.rachas[via] = av.racha;
        a.logros_ganados.push(...av.logros.map((l) => l.id));
        logros.push(...av.logros);
        avanzadas.push(via);
        contadas.add(via);
      }

      const pct = porcentajeCumplido(tareas);
      const despues: DiaCompleto = {
        dia: { ...antes.dia, porcentaje_cumplido: pct },
        tareas,
        vias_contadas: [...contadas],
      };
      a.dias[fecha] = despues;

      const diaPerfecto = avanzadas.includes('dia');
      if (diaPerfecto) a.chispas += CHISPAS_DIA_PERFECTO;

      const premio: Premio = {
        chispas: puntos + (diaPerfecto ? CHISPAS_DIA_PERFECTO : 0),
        logros,
        rachas_avanzadas: avanzadas,
        dia_perfecto: diaPerfecto,
        celebracion: celebracionPor({
          logros, diaPerfecto,
          rachaAvanzo: avanzadas.length > 0,
          chispasExtra: puntos > CHISPAS_BASE,
        }),
      };

      return { dia: copia(despues), premio };
    });
  }

  async rachas(): Promise<Racha[]> {
    const a = await this.cargar();
    return (['devocional', 'dia', 'apertura', 'oracion'] as const).map((v) => ({ ...a.rachas[v] }));
  }

  async logrosGanados(): Promise<string[]> {
    return [...(await this.cargar()).logros_ganados];
  }

  async chispasTotales(): Promise<number> {
    return (await this.cargar()).chispas;
  }

  registrarApertura(fecha: Fecha) {
    return this.escribir<Premio>((a) => {
      const av = avanzar(a.rachas.apertura, fecha, new Set(a.logros_ganados));
      a.rachas.apertura = av.racha;
      a.logros_ganados.push(...av.logros.map((l) => l.id));
      return {
        chispas: 0,
        logros: av.logros,
        rachas_avanzadas: av.repetido ? [] : ['apertura'],
        dia_perfecto: false,
        // Abrir la app no merece confeti todos los días; solo si desbloqueó algo.
        celebracion: av.logros.length > 0 ? 'confeti' : null,
      };
    });
  }

  aplicarArranque(p: Propuesta, nombre: string, fecha: Fecha) {
    return this.escribir<void>((a) => {
      a.persona = { ...a.persona, nombre };
      a.ajustes = { ...a.ajustes, ...p.ajustes, arranque_hecho: true };
      // Se sustituye entero, no se mezcla: mezclar con la rutina de fábrica
      // dejaría bloques que la persona nunca pidió.
      a.actividades = p.actividades;
      a.rutina = p.rutina;
      a.dias = {};
      construirDia(a, fecha);
    });
  }

  async empezarDeNuevo(): Promise<void> {
    this.cola = Promise.resolve();
    this.cache = null;
    await AsyncStorage.removeItem(CLAVE);
  }
}

/**
 * Una copia para quien lo pida.
 *
 * Sin esto, el almacén y el estado de React apuntan al mismo objeto: marcar
 * una tarea lo cambia por dentro, la referencia no cambia, y la pantalla se
 * queda igual aunque el dato ya sea otro.
 */
function copia(d: DiaCompleto): DiaCompleto {
  return {
    dia: { ...d.dia },
    tareas: d.tareas.map((t) => ({ ...t })),
    vias_contadas: [...d.vias_contadas],
  };
}

function construirDia(a: Almacen, fecha: Fecha): DiaCompleto {
  const generado = generarDia({
    fecha,
    zonaHoraria: a.persona.zona_horaria,
    ajustes: a.ajustes,
    actividades: a.actividades,
    rutina: a.rutina,
  });

  const diaId = `dia-${fecha}`;
  const dia: Dia = {
    id: diaId,
    persona_id: a.persona.id,
    fecha,
    tipo: generado.tipo,
    modo_usado: generado.modo_usado,
    nota_ia: null,
    porcentaje_cumplido: 0,
  };
  const tareas: Tarea[] = generado.tareas.map((t: TareaNueva, i: number) => ({
    ...t, id: `${diaId}-${i}`, dia_id: diaId,
  }));

  const completo: DiaCompleto = { dia, tareas, vias_contadas: [] };
  a.dias[fecha] = completo;
  return completo;
}

/**
 * El repositorio que usa la app.
 *
 * Sin variables de entorno guarda en el teléfono, para poder abrirla sin
 * montar nada. Con ellas, `RepositorioSupabase` cumple esta misma interfaz.
 */
export const repositorio: Repositorio = new RepositorioLocal();
