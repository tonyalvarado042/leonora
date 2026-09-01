/**
 * El mismo repositorio, contra la base de datos real.
 *
 * Cumple la interfaz de `repositorio.ts`, así que las pantallas no cambian:
 * se pone `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY` y la
 * app deja de guardar en el teléfono y pasa a guardar en la nube.
 *
 * Las políticas de seguridad de la migración 0001 hacen que cada quien solo
 * vea lo suyo, así que aquí no hace falta filtrar por persona en cada consulta:
 * la base de datos ya lo hace, y ese es el sitio correcto para hacerlo.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

import type { Propuesta } from './arranque';
import {
  actividadesParaSubir, eventosParaSubir, traducirRutina, type Equipaje,
} from './equipaje';
import { limpiarCodigo, pareceCorreo } from './invitaciones';
import { generarDia, porcentajeCumplido } from './dia';
import { duracionMin } from './fechas';
import {
  avanzar, celebracionPor, chispas, CHISPAS_BASE, CHISPAS_DIA_PERFECTO,
  cumplioHoy, rachaVacia,
  type Logro, type Marcado, type Racha, type Via,
} from './rachas';
import type {
  DetalleGuardable, DiaCompleto, EncargoNuevo, Premio, ReglaNueva, Repositorio,
  ResumenDia, TareaLigera, TareaSuelta,
} from './repositorio';
import type {
  Actividad, Ajustes, BloqueRutina, Dia, Encargo, EstadoTarea, Evento, Fecha,
  DiaCiclo, Grupo, Invitacion as InvitacionGuardada, MiembroGrupo, Persona,
  RolGrupo, Tarea, TipoGrupo,
} from './tipos';

const VIAS = ['devocional', 'dia', 'apertura', 'oracion'] as const;

const EMOJI_GRUPO: Record<TipoGrupo, string> = {
  familia: '🏠', amigos: '💬', iglesia: '⛪', otro: '👥',
};

/**
 * Los nombres de las tablas, en un solo sitio.
 *
 * GraceDay comparte proyecto de Supabase con el CRM de Tony Alvarado, así que
 * todo lo suyo lleva `graceday_` delante — la regla R7, para que dos proyectos
 * en la misma base de datos se distingan de un vistazo.
 *
 * Está aquí y no repetido en cada consulta porque son sesenta y siete: si un
 * día cambia el prefijo, se cambia una línea y no sesenta y siete, y no queda
 * ninguna a medio renombrar.
 */
const TABLA = {
  personas:        'graceday_personas',
  ajustes:         'graceday_ajustes',
  actividades:     'graceday_actividades',
  rutina:          'graceday_rutina',
  dias:            'graceday_dias',
  tareas_dia:      'graceday_tareas_dia',
  avisos:          'graceday_avisos',
  rachas:          'graceday_rachas',
  logros:          'graceday_logros',
  logros_ganados:  'graceday_logros_ganados',
  devocionales:    'graceday_devocionales',
  versiculos:      'graceday_versiculos',
  grupos:          'graceday_grupos',
  miembros_grupo:  'graceday_miembros_grupo',
  invitaciones:    'graceday_invitaciones',
  encargos:        'graceday_encargos',
  eventos:         'graceday_eventos',
  ciclo:           'graceday_ciclo',
} as const;

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const CLAVE = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const hayNube = Boolean(URL && CLAVE);

export function crearCliente(): SupabaseClient {
  if (!URL || !CLAVE) {
    throw new Error(
      'Faltan EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Copia .env.example a .env y ponlos.',
    );
  }
  return createClient(URL, CLAVE, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      // En una app nativa no hay barra de direcciones de la que leer la sesión.
      detectSessionInUrl: false,
    },
  });
}

/** Si la consulta falló, se corta aquí: seguir con datos a medias sería peor. */
function pedir<T>(r: { data: T | null; error: { message: string } | null }, que: string): T {
  if (r.error) throw new Error(`${que}: ${r.error.message}`);
  if (r.data === null) throw new Error(`${que}: no devolvió nada`);
  return r.data;
}

export class RepositorioSupabase implements Repositorio {
  constructor(private readonly sb: SupabaseClient = crearCliente()) {}

  /**
   * A quién estoy mirando.
   *
   * Normalmente soy yo. Un papá puede ponerlo en un hijo para ver su día; lo
   * que pueda leer o escribir de ahí lo decide la base de datos, no esta
   * variable: aquí solo se dice a quién se pregunta.
   */
  private viendoA: string | null = null;

  private async miId(): Promise<string> {
    const { data } = await this.sb.auth.getUser();
    if (!data.user) throw new Error('No hay sesión iniciada.');
    return data.user.id;
  }

  private async aQuienMiro(): Promise<string> {
    return this.viendoA ?? await this.miId();
  }

  async persona(): Promise<Persona> {
    return pedir(
      await this.sb.from(TABLA.personas).select('*').eq('id', await this.aQuienMiro()).single(),
      'leer la persona',
    );
  }

  async guardarPersona(cambios: Partial<Persona>): Promise<Persona> {
    return pedir(
      await this.sb.from(TABLA.personas).update(cambios).eq('id', await this.miId()).select().single(),
      'guardar la persona',
    );
  }

  async ajustes(): Promise<Ajustes> {
    return pedir(
      await this.sb.from(TABLA.ajustes).select('*')
        .eq('persona_id', await this.aQuienMiro()).single(),
      'leer los ajustes',
    );
  }

  async guardarAjustes(cambios: Partial<Ajustes>): Promise<Ajustes> {
    return pedir(
      await this.sb.from(TABLA.ajustes)
        .update({ ...cambios, actualizado_en: new Date().toISOString() })
        .eq('persona_id', await this.miId()).select().single(),
      'guardar los ajustes',
    );
  }

  async actividades(): Promise<Actividad[]> {
    return pedir(
      await this.sb.from(TABLA.actividades).select('*')
        .eq('persona_id', await this.aQuienMiro()).eq('activa', true).order('nombre'),
      'leer las actividades',
    );
  }

  async rutina(): Promise<BloqueRutina[]> {
    return pedir(
      await this.sb.from(TABLA.rutina).select('*')
        .eq('persona_id', await this.aQuienMiro()).eq('activo', true)
        .order('dia_semana').order('hora_inicio'),
      'leer la rutina',
    );
  }

  async guardarActividad(actividad: Actividad): Promise<Actividad> {
    return pedir(
      await this.sb.from(TABLA.actividades).upsert(actividad).select().single(),
      'guardar la actividad',
    );
  }

  async borrarActividad(id: string): Promise<void> {
    // `rutina.actividad_id` borra en cascada, así que los bloques se van solos.
    const { error } = await this.sb.from(TABLA.actividades).delete().eq('id', id);
    if (error) throw new Error(`borrar la actividad: ${error.message}`);
  }

  async anadirTareaHoy(fecha: Fecha, t: TareaSuelta): Promise<DiaCompleto> {
    const d = await this.dia(fecha);
    const { error } = await this.sb.from(TABLA.tareas_dia).insert({
      dia_id: d.dia.id, titulo: t.titulo, emoji: t.emoji, tipo: t.tipo,
      hora_inicio: t.hora_inicio, hora_fin: t.hora_fin, origen: 'manual',
    });
    if (error) throw new Error(`añadir la tarea: ${error.message}`);
    return this.dia(fecha);
  }

  async resumenDias(desde: Fecha, hasta: Fecha): Promise<ResumenDia[]> {
    const filas = pedir(
      await this.sb.from(TABLA.dias)
        .select(`fecha, tipo, porcentaje_cumplido, tareas:${TABLA.tareas_dia}(titulo, emoji, tipo, hora_inicio, estado)`)
        .eq('persona_id', await this.aQuienMiro())
        .gte('fecha', desde).lte('fecha', hasta).order('fecha'),
      'leer el historial',
    ) as {
      fecha: Fecha; tipo: Dia['tipo']; porcentaje_cumplido: number;
      tareas: TareaLigera[];
    }[];

    return filas.map((f) => {
      const cuentan = f.tareas.filter((t) => t.estado !== 'omitida');
      return {
        fecha: f.fecha,
        total: cuentan.length,
        hechas: cuentan.filter((t) => t.estado === 'hecha').length,
        porcentaje: f.porcentaje_cumplido,
        tipo_dia: f.tipo,
        tareas: [...f.tareas].sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio)),
      };
    });
  }

  async guardarDetalle(
    fecha: Fecha, tareaId: string, det: DetalleGuardable,
  ): Promise<DiaCompleto> {
    const limpia = det.nota.trim();
    const { error } = await this.sb.from(TABLA.tareas_dia).update({
      nota: limpia === '' ? null : limpia,
      ...(det.metodo_devocional !== undefined
        ? { metodo_devocional: det.metodo_devocional } : {}),
    }).eq('id', tareaId);
    if (error) throw new Error(`guardar el detalle: ${error.message}`);
    return this.dia(fecha);
  }

  async anadirRepetida(
    fecha: Fecha, t: TareaSuelta, cada: ReglaNueva,
  ): Promise<DiaCompleto> {
    const persona_id = await this.miId();
    const actividad = pedir(
      await this.sb.from(TABLA.actividades).insert({
        persona_id, nombre: t.titulo, emoji: t.emoji, tipo: t.tipo,
        duracion_min: Math.max(5, duracionMin(t.hora_inicio, t.hora_fin)),
        es_habito: cada.repeticion === 'diaria' || cada.repeticion === 'semanal',
      }).select().single(),
      'crear la actividad',
    ) as Actividad;

    const [, mes, dia] = fecha.split('-').map(Number);
    const comun = {
      persona_id, actividad_id: actividad.id, modo: 'escolar',
      desde: fecha, hasta: null,
      hora_inicio: t.hora_inicio, hora_fin: t.hora_fin, activo: true,
    };
    // Las dos ramas devuelven la misma forma a propósito: si una lleva menos
    // campos, el cliente infiere el tipo de la primera y rechaza la otra.
    const base = {
      ...comun,
      repeticion: cada.repeticion,
      dia_semana: null as number | null,
      cada_n: cada.repeticion === 'cada_n_dias' ? (cada.cada_n ?? 15) : null,
      dia_mes: cada.repeticion === 'mensual' || cada.repeticion === 'anual' ? dia : null,
      mes: cada.repeticion === 'anual' ? mes : null,
    };
    const filas = cada.repeticion === 'semanal'
      ? (cada.dias_semana ?? []).map((d) => ({ ...base, dia_semana: d }))
      : [base];

    const { error } = await this.sb.from(TABLA.rutina).insert(filas);
    if (error) throw new Error(`guardar la repetición: ${error.message}`);
    return this.regenerarDia(fecha);
  }

  async borrarTarea(fecha: Fecha, tareaId: string): Promise<DiaCompleto> {
    const { error } = await this.sb.from(TABLA.tareas_dia).delete().eq('id', tareaId);
    if (error) throw new Error(`borrar la tarea: ${error.message}`);
    return this.dia(fecha);
  }

  async guardarBloque(bloque: BloqueRutina): Promise<void> {
    const { error } = await this.sb.from(TABLA.rutina).upsert(bloque);
    if (error) throw new Error(`guardar el bloque: ${error.message}`);
  }

  async borrarBloque(id: string): Promise<void> {
    const { error } = await this.sb.from(TABLA.rutina).delete().eq('id', id);
    if (error) throw new Error(`borrar el bloque: ${error.message}`);
  }

  async dia(fecha: Fecha): Promise<DiaCompleto> {
    const { data: existente } = await this.sb
      .from(TABLA.dias).select('*').eq('persona_id', await this.aQuienMiro())
      .eq('fecha', fecha).maybeSingle();

    if (existente) {
      const tareas = pedir(
        await this.sb.from(TABLA.tareas_dia).select('*')
          .eq('dia_id', existente.id).order('hora_inicio').order('orden'),
        'leer las tareas',
      );
      return {
        dia: existente as Dia,
        tareas: tareas as Tarea[],
        vias_contadas: (existente.vias_contadas ?? []) as Via[],
      };
    }
    return this.crear(fecha);
  }

  async regenerarDia(fecha: Fecha): Promise<DiaCompleto> {
    // `tareas_dia` cuelga de `dias` con borrado en cascada, así que basta con
    // quitar el día.
    const { error } = await this.sb.from(TABLA.dias).delete()
      .eq('persona_id', await this.aQuienMiro()).eq('fecha', fecha);
    if (error) throw new Error(`regenerar el día: ${error.message}`);
    return this.crear(fecha);
  }

  private async crear(fecha: Fecha): Promise<DiaCompleto> {
    const [persona, ajustes, actividades, rutina, eventos, encargos] = await Promise.all([
      this.persona(), this.ajustes(), this.actividades(), this.rutina(),
      this.eventos(), this.encargos(),
    ]);

    const generado = generarDia({
      fecha, zonaHoraria: persona.zona_horaria, ajustes, actividades, rutina,
      eventos, encargos,
    });

    const dia = pedir(
      await this.sb.from(TABLA.dias).insert({
        persona_id: persona.id,
        fecha,
        tipo: generado.tipo,
        modo_usado: generado.modo_usado,
      }).select().single(),
      'crear el día',
    ) as Dia;

    if (generado.tareas.length === 0) return { dia, tareas: [], vias_contadas: [] };

    const tareas = pedir(
      await this.sb.from(TABLA.tareas_dia)
        .insert(generado.tareas.map((t) => ({ ...t, dia_id: dia.id })))
        .select().order('hora_inicio').order('orden'),
      'crear las tareas',
    ) as Tarea[];

    return { dia, tareas, vias_contadas: [] };
  }

  async marcarTarea(
    fecha: Fecha, tareaId: string, estado: EstadoTarea, marcado?: Marcado,
  ): Promise<{ dia: DiaCompleto; premio: Premio }> {
    const antes = await this.dia(fecha);
    const original = antes.tareas.find((t) => t.id === tareaId);
    const actividades = await this.actividades();
    const act = actividades.find((x) => x.id === original?.actividad_id);

    const m: Marcado = marcado ?? { minutos_reales: null, termino_de_verdad: null };
    const gana = estado === 'hecha' && original?.estado !== 'hecha';
    const puntos = gana && original ? chispas(original.tipo, act?.duracion_min ?? 0, m) : 0;

    const { error } = await this.sb.from(TABLA.tareas_dia).update({
      estado,
      // Igual que la restricción `completado_coherente` de la migración.
      completado_en: estado === 'hecha' ? new Date().toISOString() : null,
      ...(gana ? { minutos_reales: m.minutos_reales, termino_de_verdad: m.termino_de_verdad, puntos } : {}),
    }).eq('id', tareaId);
    if (error) throw new Error(`marcar la tarea: ${error.message}`);

    const tareas = (await this.dia(fecha)).tareas;
    const pct = porcentajeCumplido(tareas);

    const [rachas, ganados] = await Promise.all([this.rachas(), this.logrosGanados()]);
    const porVia = new Map(rachas.map((r) => [r.via, r]));
    const contadas = new Set(antes.vias_contadas);
    const logros: Logro[] = [];
    const avanzadas: Via[] = [];

    for (const via of ['dia', 'devocional'] as const) {
      if (contadas.has(via) || !cumplioHoy(via, tareas)) continue;
      const av = avanzar(porVia.get(via) ?? rachaVacia(via), fecha, new Set(ganados));
      await this.guardarRacha(av.racha, av.logros);
      logros.push(...av.logros);
      avanzadas.push(via);
      contadas.add(via);
    }

    const diaPerfecto = avanzadas.includes('dia');
    await this.sb.from(TABLA.dias)
      .update({ porcentaje_cumplido: pct, vias_contadas: [...contadas] })
      .eq('id', antes.dia.id);

    return {
      dia: { dia: { ...antes.dia, porcentaje_cumplido: pct }, tareas, vias_contadas: [...contadas] },
      premio: {
        chispas: puntos + (diaPerfecto ? CHISPAS_DIA_PERFECTO : 0),
        logros,
        rachas_avanzadas: avanzadas,
        dia_perfecto: diaPerfecto,
        celebracion: celebracionPor({
          logros, diaPerfecto,
          rachaAvanzo: avanzadas.length > 0,
          chispasExtra: puntos > CHISPAS_BASE,
        }),
      },
    };
  }

  async rachas(): Promise<Racha[]> {
    const filas = pedir(
      await this.sb.from(TABLA.rachas).select('*').eq('persona_id', await this.aQuienMiro()),
      'leer las rachas',
    ) as Racha[];
    const porVia = new Map(filas.map((r) => [r.via, r]));
    // Una vía sin fila todavía es una racha en cero, no un error.
    return VIAS.map((v) => porVia.get(v) ?? rachaVacia(v));
  }

  async logrosGanados(): Promise<string[]> {
    const filas = pedir(
      await this.sb.from(TABLA.logros_ganados).select('logro_id')
        .eq('persona_id', await this.aQuienMiro()),
      'leer las insignias',
    ) as { logro_id: string }[];
    return filas.map((f) => f.logro_id);
  }

  async chispasTotales(): Promise<number> {
    const filas = pedir(
      await this.sb.from(TABLA.tareas_dia)
        .select(`puntos, dia:${TABLA.dias}!inner(persona_id)`)
        .eq('dia.persona_id', await this.aQuienMiro()),
      'sumar las chispas',
    ) as { puntos: number }[];
    return filas.reduce((t, f) => t + f.puntos, 0);
  }

  async registrarApertura(fecha: Fecha): Promise<Premio> {
    const [rachas, ganados] = await Promise.all([this.rachas(), this.logrosGanados()]);
    const actual = rachas.find((r) => r.via === 'apertura') ?? rachaVacia('apertura');
    const av = avanzar(actual, fecha, new Set(ganados));
    if (!av.repetido) await this.guardarRacha(av.racha, av.logros);

    return {
      chispas: 0,
      logros: av.logros,
      rachas_avanzadas: av.repetido ? [] : ['apertura'],
      dia_perfecto: false,
      // Abrir la app no merece confeti todos los días; solo si desbloqueó algo.
      celebracion: av.logros.length > 0 ? 'confeti' : null,
    };
  }

  async aplicarArranque(p: Propuesta, quien: Partial<Persona>, fecha: Fecha): Promise<void> {
    const persona_id = await this.miId();
    // Se borra lo anterior y se pone lo nuevo: `rutina.actividad_id` cae en
    // cascada, así que basta con quitar las actividades.
    await this.sb.from(TABLA.dias).delete().eq('persona_id', persona_id);
    await this.sb.from(TABLA.actividades).delete().eq('persona_id', persona_id);

    const conDueno = <T extends { persona_id: string }>(xs: T[]) =>
      xs.map((x) => ({ ...x, persona_id }));

    const e1 = (await this.sb.from(TABLA.actividades).insert(conDueno(p.actividades))).error;
    if (e1) throw new Error(`guardar las actividades: ${e1.message}`);
    const e2 = (await this.sb.from(TABLA.rutina).insert(conDueno(p.rutina))).error;
    if (e2) throw new Error(`guardar la rutina: ${e2.message}`);

    await this.guardarPersona(quien);
    await this.guardarAjustes({ ...p.ajustes, arranque_hecho: true });
    await this.dia(fecha);
  }

  // --------------------------------------------------------- las personas

  /** Las personas que puedo ver: yo y con quien comparto grupo. Las políticas
   *  de la migración 0007 deciden cuáles son; aquí no se filtra a mano. */
  async personas(): Promise<Persona[]> {
    return pedir(
      await this.sb.from(TABLA.personas).select('*').order('nombre'),
      'leer las personas',
    );
  }

  /** Mirar el día de otra persona —un papá el de su hija. Lo que se pueda leer
   *  lo decide la base de datos: si no toca, la consulta no devuelve nada. */
  async cambiarPersona(id: string): Promise<Persona> {
    const yo = await this.miId();
    if (id === yo) {
      this.viendoA = null;
      return this.persona();
    }
    const quien = pedir(
      await this.sb.from(TABLA.personas).select('*').eq('id', id).maybeSingle(),
      'buscar a esa persona',
    ) as Persona | null;
    if (!quien) throw new Error('No puedes ver el calendario de esa persona.');
    this.viendoA = id;
    return quien;
  }

  async anadirPersona(): Promise<Persona> {
    // En la nube cada quien entra con su propio correo: crearle la cuenta a
    // otro desde aquí sería crearle una contraseña que no eligió. Lo que se
    // manda es la invitación con el código del grupo.
    throw new Error(
      'En la nube cada persona entra con su correo. Mándale la invitación con ' +
      'el código del grupo y entra desde su teléfono.',
    );
  }

  /** El día de otra persona. Si no toca, la base de datos no devuelve nada y
   *  se dice; no se inventa un día vacío que parecería el suyo. */
  async horarioDe(personaId: string, fecha: Fecha): Promise<DiaCompleto> {
    const { data: dia } = await this.sb
      .from(TABLA.dias).select('*').eq('persona_id', personaId).eq('fecha', fecha).maybeSingle();
    if (!dia) throw new Error('Esa persona no comparte su calendario contigo.');

    const tareas = pedir(
      await this.sb.from(TABLA.tareas_dia).select('*')
        .eq('dia_id', dia.id).order('hora_inicio').order('orden'),
      'leer su horario',
    ) as Tarea[];
    return { dia: dia as Dia, tareas, vias_contadas: (dia.vias_contadas ?? []) as Via[] };
  }

  /**
   * Las invitaciones que **me** han mandado a mi correo, y las que yo mandé.
   *
   * La política de la migración 0009 es lo que hace que esto no filtre nada:
   * se ve una invitación si va a tu correo o si la mandaste tú. Sin eso, para
   * poder entrar con un código habría que dejar leer la lista de grupos, y eso
   * publicaría el nombre de la casa de todo el mundo.
   */
  async invitaciones(): Promise<InvitacionGuardada[]> {
    return pedir(
      await this.sb.from(TABLA.invitaciones).select('*').order('creada_en', { ascending: false }),
      'leer las invitaciones',
    );
  }

  async invitarPorCorreo(
    grupoId: string, nombre: string, email: string, rol: RolGrupo,
  ): Promise<InvitacionGuardada> {
    const limpioNombre = nombre.trim();
    const correo = email.trim().toLowerCase();
    if (limpioNombre === '') throw new Error('Escribe cómo se llama.');
    if (!pareceCorreo(correo)) {
      throw new Error('Ese correo no se ve bien. Revisa que tenga @ y un punto.');
    }
    // El código lo pone la base de datos, para que sea único de verdad.
    return pedir(
      await this.sb.from(TABLA.invitaciones).insert({
        grupo_id: grupoId, email: correo, nombre: limpioNombre, rol,
        creada_por: await this.miId(),
      }).select().single(),
      'crear la invitación',
    );
  }

  async cancelarInvitacion(id: string): Promise<void> {
    const { error } = await this.sb.from(TABLA.invitaciones).delete().eq('id', id);
    if (error) throw new Error(`cancelar la invitación: ${error.message}`);
  }

  async unirseConCodigo(codigo: string): Promise<Grupo> {
    const limpio = limpiarCodigo(codigo);
    if (limpio === '') throw new Error('Escribe el código que te mandaron.');

    // Solo salen las invitaciones dirigidas a mi correo, así que un código
    // acertado a ciegas no sirve de nada: hace falta ser la persona invitada.
    const inv = pedir(
      await this.sb.from(TABLA.invitaciones).select('*')
        .eq('codigo', limpio).is('aceptada_en', null).maybeSingle(),
      'buscar la invitación',
    ) as InvitacionGuardada | null;
    if (!inv) {
      throw new Error(
        'Ese código no vale para tu correo. Entra con el correo al que te llegó ' +
        'la invitación.',
      );
    }

    const yo = await this.miId();
    const { error } = await this.sb.from(TABLA.miembros_grupo).upsert({
      grupo_id: inv.grupo_id, persona_id: yo,
      rol: inv.rol, ve_mi_calendario: true, estado: 'activo',
    });
    if (error) throw new Error(`entrar al grupo: ${error.message}`);

    await this.sb.from(TABLA.invitaciones)
      .update({ aceptada_en: new Date().toISOString() }).eq('id', inv.id);

    return pedir(
      await this.sb.from(TABLA.grupos).select('*').eq('id', inv.grupo_id).single(),
      'leer el grupo',
    );
  }

  async borrarPersona(): Promise<void> {
    throw new Error(
      'Una cuenta se borra desde sus propios ajustes. Aquí puedes sacarla del ' +
      'grupo con «Salir del grupo».',
    );
  }

  // ----------------------------------------------------------- los grupos

  async grupos(): Promise<Grupo[]> {
    return pedir(await this.sb.from(TABLA.grupos).select('*').order('nombre'), 'leer los grupos');
  }

  async miembros(): Promise<MiembroGrupo[]> {
    return pedir(await this.sb.from(TABLA.miembros_grupo).select('*'), 'leer los miembros');
  }

  async crearGrupo(nombre: string, tipo: TipoGrupo): Promise<Grupo> {
    const limpio = nombre.trim();
    if (limpio === '') throw new Error('Ponle un nombre al grupo.');
    const yo = await this.miId();
    // El código lo pone la base de datos por defecto, para que sea único de
    // verdad y no dependa de que dos teléfonos no coincidan.
    const grupo = pedir(
      await this.sb.from(TABLA.grupos)
        .insert({ nombre: limpio, tipo, emoji: EMOJI_GRUPO[tipo], creado_por: yo })
        .select().single(),
      'crear el grupo',
    ) as Grupo;
    const { error } = await this.sb.from(TABLA.miembros_grupo).insert({
      grupo_id: grupo.id, persona_id: yo, rol: 'miembro',
      ve_mi_calendario: true, estado: 'activo',
    });
    if (error) throw new Error(`entrar al grupo: ${error.message}`);
    return grupo;
  }

  async guardarGrupo(cambios: Partial<Grupo> & { id: string }): Promise<Grupo> {
    const { id, ...resto } = cambios;
    return pedir(
      await this.sb.from(TABLA.grupos).update(resto).eq('id', id).select().single(),
      'guardar el grupo',
    );
  }

  async invitarAGrupo(grupoId: string, personaId: string, rol: RolGrupo): Promise<void> {
    const { error } = await this.sb.from(TABLA.miembros_grupo).upsert({
      grupo_id: grupoId, persona_id: personaId, rol,
      ve_mi_calendario: false, estado: 'invitado',
    });
    if (error) throw new Error(`invitar: ${error.message}`);
  }

  async responderInvitacion(grupoId: string, acepta: boolean): Promise<void> {
    const { error } = await this.sb.from(TABLA.miembros_grupo)
      .update({ estado: acepta ? 'activo' : 'salio' })
      .eq('grupo_id', grupoId).eq('persona_id', await this.miId());
    if (error) throw new Error(`contestar la invitación: ${error.message}`);
  }

  async verMiCalendario(grupoId: string, ve: boolean): Promise<void> {
    const { error } = await this.sb.from(TABLA.miembros_grupo)
      .update({ ve_mi_calendario: ve })
      .eq('grupo_id', grupoId).eq('persona_id', await this.miId());
    if (error) throw new Error(`cambiar quién ve tu calendario: ${error.message}`);
  }

  async salirDelGrupo(grupoId: string): Promise<void> {
    const { error } = await this.sb.from(TABLA.miembros_grupo)
      .update({ estado: 'salio' })
      .eq('grupo_id', grupoId).eq('persona_id', await this.miId());
    if (error) throw new Error(`salir del grupo: ${error.message}`);
  }

  // --------------------------------------------------------- los encargos

  async encargos(): Promise<Encargo[]> {
    return pedir(
      await this.sb.from(TABLA.encargos).select('*').order('creado_en', { ascending: false }),
      'leer los recados',
    );
  }

  async mandarEncargo(n: EncargoNuevo): Promise<Encargo> {
    const titulo = n.titulo.trim();
    if (titulo === '') throw new Error('Escribe qué le quieres mandar.');
    const encargo = pedir(
      await this.sb.from(TABLA.encargos).insert({
        de_persona_id: await this.miId(),
        para_persona_id: n.para_persona_id,
        titulo, nota: n.nota?.trim() || null,
        fecha: n.fecha, hora_sugerida: n.hora_sugerida, tipo: n.tipo,
      }).select().single(),
      'mandar el recado',
    ) as Encargo;
    // El día del que lo recibe se rehace solo la próxima vez que lo abra: la
    // tarea entra por `generarDia`, no se inserta a mano aquí.
    return encargo;
  }

  async verEncargo(id: string): Promise<void> {
    const { error } = await this.sb.from(TABLA.encargos)
      .update({ visto_en: new Date().toISOString() })
      .eq('id', id).is('visto_en', null);
    if (error) throw new Error(`marcar el recado como visto: ${error.message}`);
  }

  async responderEncargo(id: string, texto: string): Promise<Encargo> {
    const limpio = texto.trim();
    if (limpio === '') throw new Error('Escribe tu respuesta antes de mandarla.');
    const ahora = new Date().toISOString();
    return pedir(
      await this.sb.from(TABLA.encargos)
        .update({ respuesta: limpio, respondido_en: ahora, visto_en: ahora })
        .eq('id', id).select().single(),
      'contestar el recado',
    );
  }

  async archivarEncargo(id: string): Promise<void> {
    const { error } = await this.sb.from(TABLA.encargos)
      .update({ estado: 'archivado' }).eq('id', id);
    if (error) throw new Error(`archivar el recado: ${error.message}`);
  }

  // ---------------------------------------------------------- los eventos

  // ------------------------------------------------------------ el ciclo
  //
  // Siempre con `miId()`, nunca con `aQuienMiro()`: mirar el día de una hija
  // es una cosa y mirar su ciclo es otra. La política de la migración 0011 dice
  // lo mismo, y ese es el sitio donde de verdad se cumple.

  async ciclo(): Promise<DiaCiclo[]> {
    return pedir(
      await this.sb.from(TABLA.ciclo).select('*')
        .eq('persona_id', await this.miId()).order('fecha'),
      'leer tu calendario',
    );
  }

  async marcarCiclo(
    fecha: Fecha, cambios: Partial<Omit<DiaCiclo, 'persona_id' | 'fecha'>>,
  ): Promise<DiaCiclo[]> {
    const { error } = await this.sb.from(TABLA.ciclo).upsert({
      persona_id: await this.miId(), fecha, ...cambios,
    });
    if (error) throw new Error(`guardar el día: ${error.message}`);
    return this.ciclo();
  }

  async borrarDiaCiclo(fecha: Fecha): Promise<DiaCiclo[]> {
    const { error } = await this.sb.from(TABLA.ciclo).delete()
      .eq('persona_id', await this.miId()).eq('fecha', fecha);
    if (error) throw new Error(`quitar el día: ${error.message}`);
    return this.ciclo();
  }

  async eventos(): Promise<Evento[]> {
    return pedir(
      await this.sb.from(TABLA.eventos).select('*').order('fecha_inicio'),
      'leer los eventos',
    );
  }

  async guardarEvento(evento: Evento): Promise<Evento> {
    if (evento.titulo.trim() === '') throw new Error('Ponle un nombre al evento.');
    if (evento.fecha_fin < evento.fecha_inicio) {
      throw new Error('El evento no puede terminar antes de empezar.');
    }
    return pedir(
      await this.sb.from(TABLA.eventos).upsert(evento).select().single(),
      'guardar el evento',
    );
  }

  async borrarEvento(id: string): Promise<void> {
    const { error } = await this.sb.from(TABLA.eventos).delete().eq('id', id);
    if (error) throw new Error(`borrar el evento: ${error.message}`);
  }

  async empezarDeNuevo(): Promise<void> {
    this.viendoA = null;
    const persona_id = await this.miId();
    // `rutina` y `tareas_dia` caen en cascada con sus padres.
    await this.sb.from(TABLA.dias).delete().eq('persona_id', persona_id);
    await this.sb.from(TABLA.actividades).delete().eq('persona_id', persona_id);
    await this.sb.from(TABLA.logros_ganados).delete().eq('persona_id', persona_id);
    await this.sb.from(TABLA.rachas).update({
      racha_actual: 0, racha_mejor: 0, total_dias: 0,
      ultimo_dia: null, gracia_usada_mes: null,
    }).eq('persona_id', persona_id);
    await this.guardarAjustes({ arranque_hecho: false });
  }

  /**
   * Recibe la maleta del teléfono, en el orden que hace falta.
   *
   * El orden **no** es un detalle: la rutina apunta a las actividades por su
   * id, y los ids nuevos los pone Postgres. Así que primero suben las
   * actividades, se recogen sus ids nuevos, y solo entonces sube la rutina ya
   * traducida (`traducirRutina`). Al revés, la rutina apuntaría a la nada y el
   * día saldría vacío sin que nadie supiera por qué.
   *
   * Si algo falla a mitad **se dice**, con lo que sí llegó: quedarse callado
   * dejaría a alguien creyendo que tiene su rutina arriba cuando no la tiene.
   */
  async recibirEquipaje(e: Equipaje): Promise<void> {
    const yo = await this.miId();

    await this.guardarPersona(e.persona);
    await this.guardarAjustes(e.ajustes);

    // 1. Las actividades, y con qué id quedó cada una.
    const deVieja = new Map<string, string>();
    if (e.actividades.length) {
      const nuevas = pedir(
        await this.sb.from(TABLA.actividades)
          .insert(actividadesParaSubir(e.actividades, yo)).select('id'),
        'subir tus actividades',
      ) as { id: string }[];
      e.actividades.forEach((vieja, i) => {
        const nueva = nuevas[i];
        if (nueva) deVieja.set(vieja.id, nueva.id);
      });
    }

    // 2. La rutina, ya reenganchada.
    const { suben, perdidos } = traducirRutina(e.rutina, deVieja, yo);
    if (suben.length) {
      const { error } = await this.sb.from(TABLA.rutina).insert(suben);
      if (error) throw new Error(`subir tu rutina: ${error.message}`);
    }
    if (perdidos > 0) {
      throw new Error(
        `Se subieron tus actividades, pero ${perdidos} ${perdidos === 1
          ? 'bloque de tu rutina se quedó' : 'bloques de tu rutina se quedaron'} `
        + 'sin su actividad. Revisa Mi rutina antes de seguir.',
      );
    }

    // 3. Lo que no depende de nada más.
    const eventos = eventosParaSubir(e.eventos, yo);
    if (eventos.length) {
      const { error } = await this.sb.from(TABLA.eventos).insert(eventos);
      if (error) throw new Error(`subir tus eventos: ${error.message}`);
    }

    if (e.ciclo.length) {
      const { error } = await this.sb.from(TABLA.ciclo)
        .upsert(e.ciclo.map((d) => ({ ...d, persona_id: yo })), { onConflict: 'persona_id,fecha' });
      if (error) throw new Error(`subir tu calendario del ciclo: ${error.message}`);
    }

    // Las rachas ya existen —las creó el disparador de alta en cero—, así que
    // se actualizan; nunca se insertan.
    const vivas = e.rachas.filter((r) => r.total_dias > 0);
    if (vivas.length) {
      const { error } = await this.sb.from(TABLA.rachas)
        .upsert(vivas.map((r) => ({ ...r, persona_id: yo })), { onConflict: 'persona_id,via' });
      if (error) throw new Error(`subir tus rachas: ${error.message}`);
    }

    if (e.logros.length) {
      const { error } = await this.sb.from(TABLA.logros_ganados).upsert(
        e.logros.map((logro_id) => ({ persona_id: yo, logro_id })),
        { onConflict: 'persona_id,logro_id' },
      );
      if (error) throw new Error(`subir tus logros: ${error.message}`);
    }
  }

  private async guardarRacha(racha: Racha, logros: Logro[]): Promise<void> {
    const persona_id = await this.miId();
    const { error } = await this.sb.from(TABLA.rachas).upsert({ ...racha, persona_id });
    if (error) throw new Error(`guardar la racha: ${error.message}`);

    if (logros.length === 0) return;
    const { error: e2 } = await this.sb.from(TABLA.logros_ganados)
      .upsert(logros.map((l) => ({ persona_id, logro_id: l.id })), { onConflict: 'persona_id,logro_id' });
    if (e2) throw new Error(`guardar las insignias: ${e2.message}`);
  }
}
