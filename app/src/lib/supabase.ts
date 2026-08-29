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

import { generarDia } from './dia';
import type { DiaCompleto, Repositorio } from './repositorio';
import type {
  Actividad, Ajustes, BloqueRutina, Dia, EstadoTarea, Fecha, Persona, Tarea,
} from './tipos';

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
      return { dia: existente as Dia, tareas: tareas as Tarea[] };
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

    if (generado.tareas.length === 0) return { dia, tareas: [] };

    const tareas = pedir(
      await this.sb.from('tareas_dia')
        .insert(generado.tareas.map((t) => ({ ...t, dia_id: dia.id })))
        .select().order('hora_inicio').order('orden'),
      'crear las tareas',
    ) as Tarea[];

    return { dia, tareas };
  }

  async marcarTarea(fecha: Fecha, tareaId: string, estado: EstadoTarea): Promise<DiaCompleto> {
    const { error } = await this.sb.from('tareas_dia').update({
      estado,
      // Igual que la restricción `completado_coherente` de la migración.
      completado_en: estado === 'hecha' ? new Date().toISOString() : null,
    }).eq('id', tareaId);
    if (error) throw new Error(`marcar la tarea: ${error.message}`);

    const d = await this.dia(fecha);
    const hechas = d.tareas.filter((t) => t.estado === 'hecha').length;
    const cuentan = d.tareas.filter((t) => t.estado !== 'omitida').length;
    const pct = cuentan === 0 ? 0 : Math.round((hechas / cuentan) * 100);

    await this.sb.from('dias').update({ porcentaje_cumplido: pct }).eq('id', d.dia.id);
    return { dia: { ...d.dia, porcentaje_cumplido: pct }, tareas: d.tareas };
  }
}
