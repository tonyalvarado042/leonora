/**
 * Guardar y leer.
 *
 * La Fase 1 corre contra el teléfono (AsyncStorage) para poder usarse sin
 * montar nada. `supabase.ts` implementa esta misma interfaz contra la base de
 * datos real; se cambia de una sin tocar las pantallas.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { generarDia, porcentajeCumplido, type TareaNueva } from './dia';
import type {
  Actividad, Ajustes, BloqueRutina, Dia, EstadoTarea, Fecha, Persona, Tarea,
} from './tipos';
import {
  actividadesIniciales, ajustesIniciales, personaInicial, PERSONA_LOCAL, rutinaInicial,
} from '@/datos/semilla';

export interface DiaCompleto {
  dia: Dia;
  tareas: Tarea[];
}

export interface Repositorio {
  persona(): Promise<Persona>;
  guardarPersona(cambios: Partial<Persona>): Promise<Persona>;
  ajustes(): Promise<Ajustes>;
  guardarAjustes(cambios: Partial<Ajustes>): Promise<Ajustes>;
  actividades(): Promise<Actividad[]>;
  rutina(): Promise<BloqueRutina[]>;
  guardarBloque(bloque: BloqueRutina): Promise<void>;
  borrarBloque(id: string): Promise<void>;
  /** Devuelve el día. Si no existía, lo genera desde la rutina y lo guarda. */
  dia(fecha: Fecha): Promise<DiaCompleto>;
  /** Vuelve a generarlo desde la rutina, perdiendo lo marcado ese día. */
  regenerarDia(fecha: Fecha): Promise<DiaCompleto>;
  marcarTarea(fecha: Fecha, tareaId: string, estado: EstadoTarea): Promise<DiaCompleto>;
}

const CLAVE = 'graceday.v1';

interface Almacen {
  persona: Persona;
  ajustes: Ajustes;
  actividades: Actividad[];
  rutina: BloqueRutina[];
  dias: Record<Fecha, DiaCompleto>;
}

function almacenInicial(): Almacen {
  return {
    persona: personaInicial,
    ajustes: ajustesIniciales,
    actividades: actividadesIniciales.map((a) => ({ ...a, persona_id: PERSONA_LOCAL })),
    rutina: rutinaInicial().map((b) => ({ ...b, persona_id: PERSONA_LOCAL })),
    dias: {},
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

  marcarTarea(fecha: Fecha, tareaId: string, estado: EstadoTarea) {
    return this.escribir((a) => {
      const antes = a.dias[fecha] ?? construirDia(a, fecha);

      const tareas = antes.tareas.map((t) =>
        t.id !== tareaId ? t : {
          ...t,
          estado,
          // La restricción `completado_coherente` de la base de datos dice lo
          // mismo: hecha lleva fecha, cualquier otro estado no.
          completado_en: estado === 'hecha' ? new Date().toISOString() : null,
        },
      );

      const despues: DiaCompleto = {
        dia: { ...antes.dia, porcentaje_cumplido: porcentajeCumplido(tareas) },
        tareas,
      };
      a.dias[fecha] = despues;
      return copia(despues);
    });
  }

  /** Solo para pruebas y para el botón de «empezar de nuevo». */
  async borrarTodo(): Promise<void> {
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
  return { dia: { ...d.dia }, tareas: d.tareas.map((t) => ({ ...t })) };
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

  const completo: DiaCompleto = { dia, tareas };
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
