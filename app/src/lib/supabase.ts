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

import { generarDia, porcentajeCumplido } from './dia';
import {
  avanzar, celebracionPor, chispas, CHISPAS_BASE, CHISPAS_DIA_PERFECTO,
  cumplioHoy, rachaVacia,
  type Logro, type Marcado, type Racha, type Via,
} from './rachas';
import type { DiaCompleto, Premio, Repositorio, TareaSuelta } from './repositorio';
import type {
  Actividad, Ajustes, BloqueRutina, Dia, EstadoTarea, Fecha, Persona, Tarea,
} from './tipos';

const VIAS = ['devocional', 'dia', 'apertura', 'oracion'] as const;

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

  private async miId(): Promise<string> {
    const { data } = await this.sb.auth.getUser();
    if (!data.user) throw new Error('No hay sesión iniciada.');
    return data.user.id;
  }

  async persona(): Promise<Persona> {
    return pedir(await this.sb.from('personas').select('*').single(), 'leer la persona');
  }

  async guardarPersona(cambios: Partial<Persona>): Promise<Persona> {
    return pedir(
      await this.sb.from('personas').update(cambios).eq('id', await this.miId()).select().single(),
      'guardar la persona',
    );
  }

  async ajustes(): Promise<Ajustes> {
    return pedir(await this.sb.from('ajustes').select('*').single(), 'leer los ajustes');
  }

  async guardarAjustes(cambios: Partial<Ajustes>): Promise<Ajustes> {
    return pedir(
      await this.sb.from('ajustes')
        .update({ ...cambios, actualizado_en: new Date().toISOString() })
        .eq('persona_id', await this.miId()).select().single(),
      'guardar los ajustes',
    );
  }

  async actividades(): Promise<Actividad[]> {
    return pedir(
      await this.sb.from('actividades').select('*').eq('activa', true).order('nombre'),
      'leer las actividades',
    );
  }

  async rutina(): Promise<BloqueRutina[]> {
    return pedir(
      await this.sb.from('rutina').select('*').eq('activo', true)
        .order('dia_semana').order('hora_inicio'),
      'leer la rutina',
    );
  }

  async guardarActividad(actividad: Actividad): Promise<Actividad> {
    return pedir(
      await this.sb.from('actividades').upsert(actividad).select().single(),
      'guardar la actividad',
    );
  }

  async borrarActividad(id: string): Promise<void> {
    // `rutina.actividad_id` borra en cascada, así que los bloques se van solos.
    const { error } = await this.sb.from('actividades').delete().eq('id', id);
    if (error) throw new Error(`borrar la actividad: ${error.message}`);
  }

  async anadirTareaHoy(fecha: Fecha, t: TareaSuelta): Promise<DiaCompleto> {
    const d = await this.dia(fecha);
    const { error } = await this.sb.from('tareas_dia').insert({
      dia_id: d.dia.id, titulo: t.titulo, emoji: t.emoji, tipo: t.tipo,
      hora_inicio: t.hora_inicio, hora_fin: t.hora_fin, origen: 'manual',
    });
    if (error) throw new Error(`añadir la tarea: ${error.message}`);
    return this.dia(fecha);
  }

  async borrarTarea(fecha: Fecha, tareaId: string): Promise<DiaCompleto> {
    const { error } = await this.sb.from('tareas_dia').delete().eq('id', tareaId);
    if (error) throw new Error(`borrar la tarea: ${error.message}`);
    return this.dia(fecha);
  }

  async guardarBloque(bloque: BloqueRutina): Promise<void> {
    const { error } = await this.sb.from('rutina').upsert(bloque);
    if (error) throw new Error(`guardar el bloque: ${error.message}`);
  }

  async borrarBloque(id: string): Promise<void> {
    const { error } = await this.sb.from('rutina').delete().eq('id', id);
    if (error) throw new Error(`borrar el bloque: ${error.message}`);
  }

  async dia(fecha: Fecha): Promise<DiaCompleto> {
    const { data: existente } = await this.sb
      .from('dias').select('*').eq('fecha', fecha).maybeSingle();

    if (existente) {
      const tareas = pedir(
        await this.sb.from('tareas_dia').select('*')
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
    const { error } = await this.sb.from('dias').delete().eq('fecha', fecha);
    if (error) throw new Error(`regenerar el día: ${error.message}`);
    return this.crear(fecha);
  }

  private async crear(fecha: Fecha): Promise<DiaCompleto> {
    const [persona, ajustes, actividades, rutina] = await Promise.all([
      this.persona(), this.ajustes(), this.actividades(), this.rutina(),
    ]);

    const generado = generarDia({
      fecha, zonaHoraria: persona.zona_horaria, ajustes, actividades, rutina,
    });

    const dia = pedir(
      await this.sb.from('dias').insert({
        persona_id: persona.id,
        fecha,
        tipo: generado.tipo,
        modo_usado: generado.modo_usado,
      }).select().single(),
      'crear el día',
    ) as Dia;

    if (generado.tareas.length === 0) return { dia, tareas: [], vias_contadas: [] };

    const tareas = pedir(
      await this.sb.from('tareas_dia')
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

    const { error } = await this.sb.from('tareas_dia').update({
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
    await this.sb.from('dias')
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
    const filas = pedir(await this.sb.from('rachas').select('*'), 'leer las rachas') as Racha[];
    const porVia = new Map(filas.map((r) => [r.via, r]));
    // Una vía sin fila todavía es una racha en cero, no un error.
    return VIAS.map((v) => porVia.get(v) ?? rachaVacia(v));
  }

  async logrosGanados(): Promise<string[]> {
    const filas = pedir(
      await this.sb.from('logros_ganados').select('logro_id'), 'leer las insignias',
    ) as { logro_id: string }[];
    return filas.map((f) => f.logro_id);
  }

  async chispasTotales(): Promise<number> {
    const filas = pedir(
      await this.sb.from('tareas_dia').select('puntos'), 'sumar las chispas',
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

  private async guardarRacha(racha: Racha, logros: Logro[]): Promise<void> {
    const persona_id = await this.miId();
    const { error } = await this.sb.from('rachas').upsert({ ...racha, persona_id });
    if (error) throw new Error(`guardar la racha: ${error.message}`);

    if (logros.length === 0) return;
    const { error: e2 } = await this.sb.from('logros_ganados')
      .upsert(logros.map((l) => ({ persona_id, logro_id: l.id })), { onConflict: 'persona_id,logro_id' });
    if (e2) throw new Error(`guardar las insignias: ${e2.message}`);
  }
}
