/**
 * Guardar y leer.
 *
 * La Fase 1 corre contra el teléfono (AsyncStorage) para poder usarse sin
 * montar nada. `supabase.ts` implementa esta misma interfaz contra la base de
 * datos real; se cambia de una sin tocar las pantallas.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Propuesta } from './arranque';
import { generarDia, porcentajeCumplido } from './dia';
import { faltanEnElDia, tareaDeEncargo } from './encargos';
import { duracionMin } from './fechas';
import {
  avanzar, celebracionPor, chispas, CHISPAS_BASE, CHISPAS_DIA_PERFECTO,
  cumplioHoy, rachaVacia,
  type Celebracion, type Logro, type Marcado, type Racha, type Via,
} from './rachas';
import type { MetodoDevocional } from '@/datos/metodos';
import type {
  Actividad, Ajustes, BloqueRutina, Dia, Encargo, EstadoTarea, Evento, Fecha,
  Grupo, MiembroGrupo, Persona, RolGrupo, Tarea, TareaNueva, TipoGrupo,
  TipoRepeticion,
} from './tipos';
import {
  actividadesIniciales, ajustesIniciales, familiaInicial, FAMILIA_LOCAL,
  miembroInicial, personaInicial, PERSONA_LOCAL, rutinaInicial,
} from '@/datos/semilla';

export interface TareaSuelta {
  titulo: string;
  emoji: string;
  tipo: Tarea['tipo'];
  hora_inicio: string;
  hora_fin: string;
}

/** Lo mínimo para dibujar un día en el calendario sin cargarlo entero. */
export interface TareaLigera {
  titulo: string;
  emoji: string;
  tipo: Tarea['tipo'];
  hora_inicio: string;
  estado: EstadoTarea;
}

export interface ResumenDia {
  fecha: Fecha;
  total: number;
  hechas: number;
  porcentaje: number;
  tipo_dia: Dia['tipo'];
  tareas: TareaLigera[];
}

/** Cada cuánto se repite, tal como lo eligió la persona. */
export interface ReglaNueva {
  repeticion: TipoRepeticion;
  /** Solo en `semanal`: uno o varios días. */
  dias_semana?: number[];
  cada_n?: number;
}

export interface DetalleGuardable {
  nota: string;
  metodo_devocional?: MetodoDevocional | null;
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

/** Lo que hace falta para mandar un encargo. El resto lo pone el repositorio. */
export interface EncargoNuevo {
  para_persona_id: string;
  titulo: string;
  nota: string | null;
  fecha: Fecha;
  hora_sugerida: string | null;
  tipo: Encargo['tipo'];
}

export interface Repositorio {
  /** Quién está usando la app ahora mismo. */
  persona(): Promise<Persona>;
  guardarPersona(cambios: Partial<Persona>): Promise<Persona>;
  /** Todas las personas de este teléfono, para el selector de arriba. */
  personas(): Promise<Persona[]>;
  /** Cambia de persona. Todo lo demás —el día, las rachas— cambia con ella. */
  cambiarPersona(id: string): Promise<Persona>;
  /** Añade a alguien y lo mete en un grupo. Sin decir cuál, en la familia. */
  anadirPersona(
    nombre: string, rol: RolGrupo, avatar?: string, grupoId?: string,
  ): Promise<Persona>;
  borrarPersona(id: string): Promise<void>;

  grupos(): Promise<Grupo[]>;
  miembros(): Promise<MiembroGrupo[]>;
  crearGrupo(nombre: string, tipo: TipoGrupo): Promise<Grupo>;
  guardarGrupo(cambios: Partial<Grupo> & { id: string }): Promise<Grupo>;
  /** Mete a una persona que ya existe en un grupo, como invitada. */
  invitarAGrupo(grupoId: string, personaId: string, rol: RolGrupo): Promise<void>;
  responderInvitacion(grupoId: string, acepta: boolean): Promise<void>;
  /** Enciende o apaga «que vean mi calendario» en un grupo. */
  verMiCalendario(grupoId: string, ve: boolean): Promise<void>;
  salirDelGrupo(grupoId: string): Promise<void>;

  /** Todo lo que se ha mandado en esta casa: la campanita filtra lo suyo. */
  encargos(): Promise<Encargo[]>;
  mandarEncargo(e: EncargoNuevo): Promise<Encargo>;
  /** Apaga el número rojo de ese encargo. */
  verEncargo(id: string): Promise<void>;
  responderEncargo(id: string, texto: string): Promise<Encargo>;
  archivarEncargo(id: string): Promise<void>;

  eventos(): Promise<Evento[]>;
  guardarEvento(e: Evento): Promise<Evento>;
  borrarEvento(id: string): Promise<void>;
  ajustes(): Promise<Ajustes>;
  guardarAjustes(cambios: Partial<Ajustes>): Promise<Ajustes>;
  actividades(): Promise<Actividad[]>;
  guardarActividad(actividad: Actividad): Promise<Actividad>;
  borrarActividad(id: string): Promise<void>;
  rutina(): Promise<BloqueRutina[]>;
  guardarBloque(bloque: BloqueRutina): Promise<void>;
  borrarBloque(id: string): Promise<void>;
  /** Una tarea que solo existe ese día y no toca la rutina. */
  anadirTareaHoy(fecha: Fecha, tarea: TareaSuelta): Promise<DiaCompleto>;
  /** Una tarea que se repite: crea la actividad y su regla, y rehace el día. */
  anadirRepetida(fecha: Fecha, t: TareaSuelta, cada: ReglaNueva): Promise<DiaCompleto>;
  borrarTarea(fecha: Fecha, tareaId: string): Promise<DiaCompleto>;
  /** La nota y, en las de fe, cómo se hizo el devocional. */
  guardarDetalle(fecha: Fecha, tareaId: string, d: DetalleGuardable): Promise<DiaCompleto>;
  /** Resumen de los días ya vividos entre dos fechas, para el calendario.
   *  No genera los que faltan: el pasado no se inventa, y el futuro se genera
   *  cuando llegue. */
  resumenDias(desde: Fecha, hasta: Fecha): Promise<ResumenDia[]>;
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

const CLAVE = 'graceday.v2';
/** El almacén de una sola persona, anterior a la Fase 5. Se lee una vez para
 *  no perder lo que ya había, y se deja quieto por si hiciera falta. */
const CLAVE_V1 = 'graceday.v1';

/** Todo lo que es de una persona. Cambiar de persona cambia este bloque
 *  entero: el día, la rutina, las rachas y las chispas son suyos. */
interface DatosPersona {
  ajustes: Ajustes;
  actividades: Actividad[];
  rutina: BloqueRutina[];
  dias: Record<Fecha, DiaCompleto>;
  rachas: Record<Via, Racha>;
  logros_ganados: string[];
  chispas: number;
}

interface Almacen {
  personas: Persona[];
  persona_activa: string;
  por_persona: Record<string, DatosPersona>;
  grupos: Grupo[];
  miembros: MiembroGrupo[];
  encargos: Encargo[];
  eventos: Evento[];
}

/** El almacén de antes de la Fase 5, para poder convertirlo. */
interface AlmacenV1 {
  persona: Persona;
  ajustes: Ajustes;
  actividades: Actividad[];
  rutina: BloqueRutina[];
  dias: Record<Fecha, DiaCompleto>;
  rachas: Record<Via, Racha>;
  logros_ganados: string[];
  chispas: number;
}

function rachasVacias(): Record<Via, Racha> {
  return {
    apertura: rachaVacia('apertura'), dia: rachaVacia('dia'),
    devocional: rachaVacia('devocional'), oracion: rachaVacia('oracion'),
  };
}

/** Una persona recién creada arranca con la rutina de fábrica, igual que la
 *  primera: nadie empieza mirando una pantalla vacía. */
function datosIniciales(personaId: string): DatosPersona {
  return {
    ajustes: { ...ajustesIniciales, persona_id: personaId },
    actividades: actividadesIniciales.map((a) => ({ ...a, persona_id: personaId })),
    rutina: rutinaInicial().map((b) => ({ ...b, persona_id: personaId })),
    dias: {},
    rachas: rachasVacias(),
    logros_ganados: [],
    chispas: 0,
  };
}

function almacenInicial(): Almacen {
  return {
    personas: [personaInicial],
    persona_activa: PERSONA_LOCAL,
    por_persona: { [PERSONA_LOCAL]: datosIniciales(PERSONA_LOCAL) },
    grupos: [familiaInicial],
    miembros: [miembroInicial],
    encargos: [],
    eventos: [],
  };
}

/** Lo guardado antes de la Fase 5, convertido a la forma nueva. Lo que había
 *  era de una sola persona: pasa a ser la primera de la casa. */
function desdeV1(v: AlmacenV1): Almacen {
  const persona = { ...personaInicial, ...v.persona };
  return {
    personas: [persona],
    persona_activa: persona.id,
    por_persona: {
      [persona.id]: {
        ajustes: { ...ajustesIniciales, ...v.ajustes, persona_id: persona.id },
        actividades: v.actividades ?? [],
        rutina: v.rutina ?? [],
        dias: v.dias ?? {},
        rachas: { ...rachasVacias(), ...v.rachas },
        logros_ganados: v.logros_ganados ?? [],
        chispas: v.chispas ?? 0,
      },
    },
    grupos: [{ ...familiaInicial, creado_por: persona.id }],
    miembros: [{ ...miembroInicial, persona_id: persona.id }],
    encargos: [],
    eventos: [],
  };
}

export class RepositorioLocal implements Repositorio {
  private cache: Almacen | null = null;
  /** Las escrituras se encadenan: dos toques seguidos no se pisan. */
  private cola: Promise<unknown> = Promise.resolve();

  private async cargar(): Promise<Almacen> {
    if (this.cache) return this.cache;
    this.cache = await leerAlmacen();
    return this.cache;
  }

  /** Los datos de quien está usando la app. Si le falta el bloque —una persona
   *  añadida antes de que existiera algo— se le crea al vuelo en vez de
   *  reventar: perder el día de alguien por una clave que falta sería peor. */
  private mios(a: Almacen): DatosPersona {
    const id = a.persona_activa;
    if (!a.por_persona[id]) a.por_persona[id] = datosIniciales(id);
    return a.por_persona[id];
  }

  private yo(a: Almacen): Persona {
    return a.personas.find((p) => p.id === a.persona_activa) ?? personaInicial;
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
  async persona() { const a = await this.cargar(); return { ...this.yo(a) }; }
  async personas() { return (await this.cargar()).personas.map((p) => ({ ...p })); }
  async ajustes() { const a = await this.cargar(); return { ...this.mios(a).ajustes }; }
  async actividades() {
    const a = await this.cargar();
    return this.mios(a).actividades.map((x) => ({ ...x }));
  }
  async rutina() {
    const a = await this.cargar();
    return this.mios(a).rutina.map((b) => ({ ...b }));
  }
  async grupos() { return (await this.cargar()).grupos.map((g) => ({ ...g })); }
  async miembros() { return (await this.cargar()).miembros.map((m) => ({ ...m })); }
  async encargos() { return (await this.cargar()).encargos.map((e) => ({ ...e })); }
  async eventos() { return (await this.cargar()).eventos.map((e) => ({ ...e })); }

  guardarPersona(cambios: Partial<Persona>) {
    return this.escribir((a) => {
      const id = a.persona_activa;
      a.personas = a.personas.map((p) => (p.id === id ? { ...p, ...cambios, id } : p));
      return { ...this.yo(a) };
    });
  }

  cambiarPersona(id: string) {
    return this.escribir((a) => {
      if (!a.personas.some((p) => p.id === id)) {
        throw new Error('Esa persona ya no está en este teléfono.');
      }
      a.persona_activa = id;
      this.mios(a);
      return { ...this.yo(a) };
    });
  }

  anadirPersona(nombre: string, rol: RolGrupo, avatar = '🙂', grupoId?: string) {
    return this.escribir((a) => {
      const limpio = nombre.trim();
      if (limpio === '') throw new Error('Escribe el nombre de la persona.');

      // Entra ya en un grupo: añadir a mamá y que no aparezca en la familia
      // sería pedir dos pasos para una sola cosa.
      const familia = a.grupos.find((g) => g.tipo === 'familia') ?? familiaInicial;
      if (!a.grupos.some((g) => g.id === familia.id)) a.grupos = [...a.grupos, familia];
      const grupo = grupoId ? a.grupos.find((g) => g.id === grupoId) : familia;
      if (!grupo) throw new Error('Ese grupo ya no existe.');

      const persona: Persona = {
        id: `p-${Date.now()}`,
        nombre: limpio,
        avatar_tipo: 'emoji',
        avatar_valor: avatar,
        zona_horaria: this.yo(a).zona_horaria,
      };
      a.personas = [...a.personas, persona];
      a.por_persona[persona.id] = datosIniciales(persona.id);
      a.miembros = [...a.miembros, {
        grupo_id: grupo.id, persona_id: persona.id, rol,
        // En casa se comparte de entrada; fuera de casa lo enciende cada quien.
        ve_mi_calendario: grupo.tipo === 'familia',
        estado: 'activo',
      }];
      return { ...persona };
    });
  }

  borrarPersona(id: string) {
    return this.escribir<void>((a) => {
      if (a.personas.length <= 1) {
        throw new Error('No se puede quitar a la única persona de la app.');
      }
      a.personas = a.personas.filter((p) => p.id !== id);
      delete a.por_persona[id];
      a.miembros = a.miembros.filter((m) => m.persona_id !== id);
      // Lo que se le mandó o mandó se archiva: borrarlo dejaría al otro lado
      // con una conversación a medias.
      a.encargos = a.encargos.map((e) =>
        e.para_persona_id === id || e.de_persona_id === id
          ? { ...e, estado: 'archivado' as const } : e);
      a.eventos = a.eventos.map((e) => (e.persona_id === id ? { ...e, persona_id: null } : e));
      if (a.persona_activa === id) a.persona_activa = a.personas[0].id;
    });
  }

  guardarAjustes(cambios: Partial<Ajustes>) {
    return this.escribir((a) => {
      const d = this.mios(a);
      d.ajustes = { ...d.ajustes, ...cambios, persona_id: a.persona_activa };
      return { ...d.ajustes };
    });
  }

  guardarActividad(actividad: Actividad) {
    return this.escribir((a) => {
      const d = this.mios(a);
      const conocida = d.actividades.some((x) => x.id === actividad.id);
      d.actividades = conocida
        ? d.actividades.map((x) => (x.id === actividad.id ? actividad : x))
        : [...d.actividades, actividad];
      return { ...actividad };
    });
  }

  borrarActividad(id: string) {
    return this.escribir<void>((a) => {
      const d = this.mios(a);
      d.actividades = d.actividades.filter((x) => x.id !== id);
      // Un bloque huérfano no produce nada, pero dejarlo ensucia la rutina.
      d.rutina = d.rutina.filter((b) => b.actividad_id !== id);
    });
  }

  anadirTareaHoy(fecha: Fecha, t: TareaSuelta) {
    return this.escribir((a) => {
      const mios = this.mios(a);
      const d = mios.dias[fecha] ?? construirDia(a, this.yo(a), mios, fecha);
      const tareas = [...d.tareas, {
        id: `${d.dia.id}-suelta-${Date.now()}`,
        dia_id: d.dia.id,
        actividad_id: null,
        encargo_id: null,
        titulo: t.titulo, emoji: t.emoji, tipo: t.tipo,
        hora_inicio: t.hora_inicio, hora_fin: t.hora_fin,
        orden: 0, es_fijo: false, origen: 'manual' as const,
        estado: 'pendiente' as const, completado_en: null, nota: null,
        minutos_reales: null, termino_de_verdad: null, puntos: 0,
        metodo_devocional: null,
      }].sort((x, y) => x.hora_inicio.localeCompare(y.hora_inicio))
        .map((x, i) => ({ ...x, orden: i }));

      const despues: DiaCompleto = { ...d, tareas };
      mios.dias[fecha] = despues;
      return copia(despues);
    });
  }

  async resumenDias(desde: Fecha, hasta: Fecha): Promise<ResumenDia[]> {
    const a = await this.cargar();
    return Object.values(this.mios(a).dias)
      .filter((d) => d.dia.fecha >= desde && d.dia.fecha <= hasta)
      .map((d) => {
        const cuentan = d.tareas.filter((t) => t.estado !== 'omitida');
        return {
          fecha: d.dia.fecha,
          total: cuentan.length,
          hechas: cuentan.filter((t) => t.estado === 'hecha').length,
          porcentaje: d.dia.porcentaje_cumplido,
          tipo_dia: d.dia.tipo,
          tareas: d.tareas.map((t) => ({
            titulo: t.titulo, emoji: t.emoji, tipo: t.tipo,
            hora_inicio: t.hora_inicio, estado: t.estado,
          })),
        };
      })
      .sort((x, y) => x.fecha.localeCompare(y.fecha));
  }

  guardarDetalle(fecha: Fecha, tareaId: string, det: DetalleGuardable) {
    return this.escribir((a) => {
      const mios = this.mios(a);
      const d = mios.dias[fecha] ?? construirDia(a, this.yo(a), mios, fecha);
      const limpia = det.nota.trim();
      const despues: DiaCompleto = {
        ...d,
        tareas: d.tareas.map((t) => t.id !== tareaId ? t : {
          ...t,
          nota: limpia === '' ? null : limpia,
          metodo_devocional: det.metodo_devocional !== undefined
            ? det.metodo_devocional : t.metodo_devocional,
        }),
      };
      mios.dias[fecha] = despues;
      return copia(despues);
    });
  }

  anadirRepetida(fecha: Fecha, t: TareaSuelta, cada: ReglaNueva) {
    return this.escribir((a) => {
      const mios = this.mios(a);
      const marca = Date.now();
      const actividad: Actividad = {
        id: `act-${marca}`,
        persona_id: a.persona_activa,
        nombre: t.titulo, emoji: t.emoji, tipo: t.tipo,
        duracion_min: Math.max(5, duracionMin(t.hora_inicio, t.hora_fin)),
        es_habito: cada.repeticion === 'diaria' || cada.repeticion === 'semanal',
        es_fijo: false, avisar: true, avisar_antes_min: null, activa: true,
      };
      mios.actividades = [...mios.actividades, actividad];

      const [, mes, dia] = fecha.split('-').map(Number);
      const comun = {
        persona_id: a.persona_activa,
        actividad_id: actividad.id,
        modo: 'escolar' as const,
        cada_n: null as number | null,
        dia_mes: null as number | null,
        mes: null as number | null,
        desde: fecha,
        hasta: null,
        hora_inicio: t.hora_inicio,
        hora_fin: t.hora_fin,
        activo: true,
      };

      // «Cada semana» puede ser varios días: una regla por día, para que la
      // pantalla de la rutina las pueda mover y quitar una a una.
      const nuevas: BloqueRutina[] =
        cada.repeticion === 'semanal'
          ? (cada.dias_semana ?? []).map((d) => ({
              ...comun, id: `rut-${marca}-${d}`,
              repeticion: 'semanal' as const, dia_semana: d,
            }))
          : [{
              ...comun,
              id: `rut-${marca}`,
              repeticion: cada.repeticion,
              dia_semana: null,
              cada_n: cada.repeticion === 'cada_n_dias' ? (cada.cada_n ?? 15) : null,
              dia_mes: cada.repeticion === 'mensual' || cada.repeticion === 'anual' ? dia : null,
              mes: cada.repeticion === 'anual' ? mes : null,
            }];

      mios.rutina = [...mios.rutina, ...nuevas];
      delete mios.dias[fecha];
      return copia(construirDia(a, this.yo(a), mios, fecha));
    });
  }

  borrarTarea(fecha: Fecha, tareaId: string) {
    return this.escribir((a) => {
      const mios = this.mios(a);
      const d = mios.dias[fecha] ?? construirDia(a, this.yo(a), mios, fecha);
      const tareas = d.tareas.filter((t) => t.id !== tareaId);
      const despues: DiaCompleto = {
        ...d, tareas,
        dia: { ...d.dia, porcentaje_cumplido: porcentajeCumplido(tareas) },
      };
      mios.dias[fecha] = despues;
      return copia(despues);
    });
  }

  guardarBloque(bloque: BloqueRutina) {
    return this.escribir<void>((a) => {
      const mios = this.mios(a);
      const conocido = mios.rutina.some((b) => b.id === bloque.id);
      mios.rutina = conocido
        ? mios.rutina.map((b) => (b.id === bloque.id ? bloque : b))
        : [...mios.rutina, bloque];
    });
  }

  borrarBloque(id: string) {
    return this.escribir<void>((a) => {
      const mios = this.mios(a);
      mios.rutina = mios.rutina.filter((b) => b.id !== id);
    });
  }

  dia(fecha: Fecha) {
    return this.escribir((a) => {
      const mios = this.mios(a);
      const d = mios.dias[fecha] ?? construirDia(a, this.yo(a), mios, fecha);
      return copia(alDia(a, mios, d, fecha));
    });
  }

  regenerarDia(fecha: Fecha) {
    return this.escribir((a) => {
      const mios = this.mios(a);
      delete mios.dias[fecha];
      return copia(construirDia(a, this.yo(a), mios, fecha));
    });
  }

  marcarTarea(fecha: Fecha, tareaId: string, estado: EstadoTarea, marcado?: Marcado) {
    return this.escribir((a) => {
      const mios = this.mios(a);
      const antes = mios.dias[fecha] ?? construirDia(a, this.yo(a), mios, fecha);
      const original = antes.tareas.find((t) => t.id === tareaId);
      const act = mios.actividades.find((x) => x.id === original?.actividad_id);

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

      mios.chispas += puntos;

      // Marcar aquí se ve allá: quien mandó el encargo ve que ya está hecho.
      if (original?.encargo_id) {
        a.encargos = a.encargos.map((e) => e.id !== original.encargo_id ? e : {
          ...e, estado: estado === 'hecha' ? 'hecho' as const : 'pendiente' as const,
          visto_en: e.visto_en ?? new Date().toISOString(),
        });
      }

      // Las rachas del día se miran después de marcar, no antes.
      const contadas = new Set(antes.vias_contadas);
      const logros: Logro[] = [];
      const avanzadas: Via[] = [];
      for (const via of ['dia', 'devocional'] as const) {
        if (contadas.has(via) || !cumplioHoy(via, tareas)) continue;
        const av = avanzar(mios.rachas[via], fecha, new Set(mios.logros_ganados));
        mios.rachas[via] = av.racha;
        mios.logros_ganados.push(...av.logros.map((l) => l.id));
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
      mios.dias[fecha] = despues;

      const diaPerfecto = avanzadas.includes('dia');
      if (diaPerfecto) mios.chispas += CHISPAS_DIA_PERFECTO;

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
    const mias = this.mios(a).rachas;
    return (['devocional', 'dia', 'apertura', 'oracion'] as const).map((v) => ({ ...mias[v] }));
  }

  async logrosGanados(): Promise<string[]> {
    const a = await this.cargar();
    return [...this.mios(a).logros_ganados];
  }

  async chispasTotales(): Promise<number> {
    const a = await this.cargar();
    return this.mios(a).chispas;
  }

  registrarApertura(fecha: Fecha) {
    return this.escribir<Premio>((a) => {
      const mios = this.mios(a);
      const av = avanzar(mios.rachas.apertura, fecha, new Set(mios.logros_ganados));
      mios.rachas.apertura = av.racha;
      mios.logros_ganados.push(...av.logros.map((l) => l.id));
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
      const id = a.persona_activa;
      const mios = this.mios(a);
      a.personas = a.personas.map((x) => (x.id === id ? { ...x, nombre } : x));
      mios.ajustes = { ...mios.ajustes, ...p.ajustes, persona_id: id, arranque_hecho: true };
      // Se sustituye entero, no se mezcla: mezclar con la rutina de fábrica
      // dejaría bloques que la persona nunca pidió.
      mios.actividades = p.actividades;
      mios.rutina = p.rutina;
      mios.dias = {};
      construirDia(a, this.yo(a), mios, fecha);
    });
  }

  // ------------------------------------------------------------- los grupos

  crearGrupo(nombre: string, tipo: TipoGrupo) {
    return this.escribir((a) => {
      const limpio = nombre.trim();
      if (limpio === '') throw new Error('Ponle un nombre al grupo.');
      const grupo: Grupo = {
        id: `g-${Date.now()}`, nombre: limpio, tipo,
        emoji: EMOJI_GRUPO[tipo], creado_por: a.persona_activa,
      };
      a.grupos = [...a.grupos, grupo];
      a.miembros = [...a.miembros, {
        grupo_id: grupo.id, persona_id: a.persona_activa,
        rol: 'miembro', ve_mi_calendario: true, estado: 'activo',
      }];
      return { ...grupo };
    });
  }

  guardarGrupo(cambios: Partial<Grupo> & { id: string }) {
    return this.escribir((a) => {
      const antes = a.grupos.find((g) => g.id === cambios.id);
      if (!antes) throw new Error('Ese grupo ya no existe.');
      const despues = { ...antes, ...cambios, id: antes.id };
      a.grupos = a.grupos.map((g) => (g.id === antes.id ? despues : g));
      return { ...despues };
    });
  }

  invitarAGrupo(grupoId: string, personaId: string, rol: RolGrupo) {
    return this.escribir<void>((a) => {
      if (!a.grupos.some((g) => g.id === grupoId)) throw new Error('Ese grupo ya no existe.');
      const yaEsta = a.miembros.some(
        (m) => m.grupo_id === grupoId && m.persona_id === personaId && m.estado !== 'salio',
      );
      if (yaEsta) throw new Error('Esa persona ya está en el grupo.');
      a.miembros = [
        ...a.miembros.filter((m) => !(m.grupo_id === grupoId && m.persona_id === personaId)),
        { grupo_id: grupoId, persona_id: personaId, rol, ve_mi_calendario: false, estado: 'invitado' },
      ];
    });
  }

  responderInvitacion(grupoId: string, acepta: boolean) {
    return this.escribir<void>((a) => {
      a.miembros = a.miembros.map((m) =>
        m.grupo_id === grupoId && m.persona_id === a.persona_activa
          ? { ...m, estado: acepta ? 'activo' as const : 'salio' as const }
          : m);
    });
  }

  verMiCalendario(grupoId: string, ve: boolean) {
    return this.escribir<void>((a) => {
      a.miembros = a.miembros.map((m) =>
        m.grupo_id === grupoId && m.persona_id === a.persona_activa
          ? { ...m, ve_mi_calendario: ve } : m);
    });
  }

  salirDelGrupo(grupoId: string) {
    return this.escribir<void>((a) => {
      a.miembros = a.miembros.map((m) =>
        m.grupo_id === grupoId && m.persona_id === a.persona_activa
          ? { ...m, estado: 'salio' as const } : m);
    });
  }

  // ---------------------------------------------------------- los encargos

  mandarEncargo(n: EncargoNuevo) {
    return this.escribir((a) => {
      const titulo = n.titulo.trim();
      if (titulo === '') throw new Error('Escribe qué le quieres mandar.');
      if (!a.personas.some((p) => p.id === n.para_persona_id)) {
        throw new Error('Elige a quién se lo mandas.');
      }
      const encargo: Encargo = {
        id: `enc-${Date.now()}`,
        de_persona_id: a.persona_activa,
        para_persona_id: n.para_persona_id,
        titulo,
        nota: n.nota?.trim() || null,
        fecha: n.fecha,
        hora_sugerida: n.hora_sugerida,
        tipo: n.tipo,
        estado: 'pendiente',
        respuesta: null, respondido_en: null, visto_en: null,
        creado_en: new Date().toISOString(),
      };
      a.encargos = [...a.encargos, encargo];
      // El día del que lo recibe se rehace, para que la tarea aparezca en su
      // horario y no solo en la campanita.
      const suyos = a.por_persona[n.para_persona_id];
      if (suyos) delete suyos.dias[n.fecha];
      return { ...encargo };
    });
  }

  verEncargo(id: string) {
    return this.escribir<void>((a) => {
      a.encargos = a.encargos.map((e) =>
        e.id === id && e.visto_en === null
          ? { ...e, visto_en: new Date().toISOString() } : e);
    });
  }

  responderEncargo(id: string, texto: string) {
    return this.escribir((a) => {
      const limpio = texto.trim();
      if (limpio === '') throw new Error('Escribe tu respuesta antes de mandarla.');
      const antes = a.encargos.find((e) => e.id === id);
      if (!antes) throw new Error('Ese recado ya no está.');
      const ahora = new Date().toISOString();
      const despues: Encargo = {
        ...antes, respuesta: limpio, respondido_en: ahora,
        visto_en: antes.visto_en ?? ahora,
      };
      a.encargos = a.encargos.map((e) => (e.id === id ? despues : e));
      return { ...despues };
    });
  }

  archivarEncargo(id: string) {
    return this.escribir<void>((a) => {
      const e = a.encargos.find((x) => x.id === id);
      a.encargos = a.encargos.map((x) =>
        x.id === id ? { ...x, estado: 'archivado' as const } : x);
      // La tarea que había puesto en el día se va con él.
      const suyos = e ? a.por_persona[e.para_persona_id] : undefined;
      const dia = suyos?.dias[e?.fecha ?? ''];
      if (suyos && e && dia) {
        suyos.dias[e.fecha] = { ...dia, tareas: dia.tareas.filter((t) => t.encargo_id !== id) };
      }
    });
  }

  // ----------------------------------------------------------- los eventos

  guardarEvento(evento: Evento) {
    return this.escribir((a) => {
      if (evento.titulo.trim() === '') throw new Error('Ponle un nombre al evento.');
      if (evento.fecha_fin < evento.fecha_inicio) {
        throw new Error('El evento no puede terminar antes de empezar.');
      }
      const conocido = a.eventos.some((e) => e.id === evento.id);
      a.eventos = conocido
        ? a.eventos.map((e) => (e.id === evento.id ? evento : e))
        : [...a.eventos, evento];
      // Un feriado nuevo cambia los días que toca: se rehacen al abrirlos.
      olvidarDias(a, evento);
      return { ...evento };
    });
  }

  borrarEvento(id: string) {
    return this.escribir<void>((a) => {
      const e = a.eventos.find((x) => x.id === id);
      a.eventos = a.eventos.filter((x) => x.id !== id);
      if (e) olvidarDias(a, e);
    });
  }

  async empezarDeNuevo(): Promise<void> {
    this.cola = Promise.resolve();
    this.cache = null;
    await AsyncStorage.multiRemove([CLAVE, CLAVE_V1]);
  }
}

const EMOJI_GRUPO: Record<TipoGrupo, string> = {
  familia: '🏠', amigos: '💬', iglesia: '⛪', otro: '👥',
};

/**
 * Tira los días guardados que un evento cambia, para que se vuelvan a armar.
 *
 * Un feriado añadido hoy tiene que quitar el colegio del día que ya estaba
 * escrito; si no, se ve el feriado arriba y el colegio abajo, a la vez.
 * Solo se olvidan los días **que aún no han pasado**: rehacer el martes
 * pasado borraría lo que la persona ya marcó ese día.
 */
function olvidarDias(a: Almacen, e: Evento): void {
  const hoy = new Date().toISOString().slice(0, 10);
  for (const [id, datos] of Object.entries(a.por_persona)) {
    if (e.persona_id !== null && e.persona_id !== id) continue;
    for (const fecha of Object.keys(datos.dias)) {
      if (fecha < hoy) continue;
      if (e.repeticion === 'anual' ? fecha.slice(5) === e.fecha_inicio.slice(5)
          : fecha >= e.fecha_inicio && fecha <= e.fecha_fin) {
        delete datos.dias[fecha];
      }
    }
  }
}

/**
 * Lee lo guardado, convirtiendo lo de antes de la Fase 5 si hace falta.
 *
 * Se rellenan las claves que falten, para que un almacén guardado antes de
 * añadir un campo no rompa la app.
 */
async function leerAlmacen(): Promise<Almacen> {
  try {
    const crudo = await AsyncStorage.getItem(CLAVE);
    if (crudo) return { ...almacenInicial(), ...JSON.parse(crudo) };
    const antiguo = await AsyncStorage.getItem(CLAVE_V1);
    if (antiguo) return desdeV1(JSON.parse(antiguo) as AlmacenV1);
  } catch {
    // Un almacén ilegible no puede dejar la app sin arrancar: se empieza de
    // cero. Lo viejo sigue en su clave por si se quisiera rescatar a mano.
  }
  return almacenInicial();
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

function construirDia(
  a: Almacen, persona: Persona, mios: DatosPersona, fecha: Fecha,
): DiaCompleto {
  const generado = generarDia({
    fecha,
    zonaHoraria: persona.zona_horaria,
    ajustes: mios.ajustes,
    actividades: mios.actividades,
    rutina: mios.rutina,
    eventos: a.eventos,
    encargos: a.encargos,
  });

  const diaId = `dia-${fecha}`;
  const dia: Dia = {
    id: diaId,
    persona_id: persona.id,
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
  mios.dias[fecha] = completo;
  return completo;
}

/**
 * El día guardado, más lo que llegó después de haberlo armado.
 *
 * Un recado de mamá a media tarde tiene que entrar en el horario de hoy, no en
 * el de mañana. Solo se añade lo que falta: lo que ya estaba —marcado o no— se
 * queda como está, porque rehacer el día entero borraría lo que ya se hizo.
 */
function alDia(
  a: Almacen, mios: DatosPersona, d: DiaCompleto, fecha: Fecha,
): DiaCompleto {
  const faltan = faltanEnElDia(d.tareas, a.encargos, fecha, mios.ajustes.persona_id);
  if (faltan.length === 0) return d;

  const tareas = [...d.tareas, ...faltan.map((e, i) => ({
    ...tareaDeEncargo(e), id: `${d.dia.id}-enc-${i}-${e.id}`, dia_id: d.dia.id,
  }))]
    .sort((x, y) => x.hora_inicio.localeCompare(y.hora_inicio))
    .map((t, i) => ({ ...t, orden: i }));

  const despues: DiaCompleto = {
    ...d, tareas,
    dia: { ...d.dia, porcentaje_cumplido: porcentajeCumplido(tareas) },
  };
  mios.dias[fecha] = despues;
  return despues;
}

/**
 * El repositorio que usa la app.
 *
 * Sin variables de entorno guarda en el teléfono, para poder abrirla sin
 * montar nada. Con ellas, `RepositorioSupabase` cumple esta misma interfaz.
 */
export const repositorio: Repositorio = new RepositorioLocal();
