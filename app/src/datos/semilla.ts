/** La rutina con la que arranca una cuenta nueva. Se edita entera desde la app. */

import type { Actividad, Ajustes, BloqueRutina, Grupo, MiembroGrupo, Persona } from '@/lib/tipos';

export const PERSONA_LOCAL = 'local';
export const FAMILIA_LOCAL = 'grupo-familia';

export const personaInicial: Persona = {
  id: PERSONA_LOCAL,
  nombre: '',
  avatar_tipo: 'emoji',
  avatar_valor: '👧',
  zona_horaria: 'America/Guatemala',
};

export const ajustesIniciales: Ajustes = {
  persona_id: PERSONA_LOCAL,
  hora_despertar: '06:00',
  hora_dormir: '21:30',
  ocupacion: 'colegio',
  ocupacion_nombre: '',
  hora_fin_ocupacion: '14:00',
  dias_ocupados: [1, 2, 3, 4, 5],
  avisos_activos: true,
  avisar_antes_min: 10,
  sonido_aviso: 'campana',
  sonido_devocional: 'arpa',
  vibrar: true,
  silencio_desde: '22:00',
  silencio_hasta: '06:00',
  tema: 'auto',
  celebraciones: true,
  arranque_hecho: false,
};

/** La casa, creada de fábrica. Una cuenta nueva ya tiene familia: así se puede
 *  añadir a mamá sin pasar antes por una pantalla de «crear un grupo». */
export const familiaInicial: Grupo = {
  id: FAMILIA_LOCAL,
  nombre: 'Mi familia',
  tipo: 'familia',
  emoji: '🏠',
  creado_por: PERSONA_LOCAL,
};

/** Quien instala la app entra como miembro, no como tutor: montar la app para
 *  tu casa no te hace la mamá. Si eres papá, lo cambias en Familia. */
export const miembroInicial: MiembroGrupo = {
  grupo_id: FAMILIA_LOCAL,
  persona_id: PERSONA_LOCAL,
  rol: 'miembro',
  ve_mi_calendario: true,
  estado: 'activo',
};

type ActividadSemilla = Omit<Actividad, 'persona_id'>;

export const actividadesIniciales: ActividadSemilla[] = [
  { id: 'act-devocional', nombre: 'Devocional', tipo: 'fe', emoji: '💜',
    duracion_min: 60, es_habito: true, es_fijo: true, activa: true,
    avisar: true, avisar_antes_min: 15 },
  { id: 'act-cama', nombre: 'Tender la cama', tipo: 'casa', emoji: '🛏️',
    duracion_min: 5, es_habito: true, es_fijo: false, activa: true,
    avisar: false, avisar_antes_min: null },
  { id: 'act-colegio', nombre: 'Colegio', tipo: 'estudio', emoji: '📘',
    duracion_min: 330, es_habito: false, es_fijo: true, activa: true,
    avisar: true, avisar_antes_min: 20 },
  { id: 'act-estudiar', nombre: 'Terminar de estudiar', tipo: 'estudio', emoji: '📘',
    duracion_min: 30, es_habito: true, es_fijo: false, activa: true,
    avisar: true, avisar_antes_min: null },
  { id: 'act-cuarto', nombre: 'Ordenar tu cuarto', tipo: 'casa', emoji: '🧹',
    duracion_min: 30, es_habito: true, es_fijo: false, activa: true,
    avisar: true, avisar_antes_min: null },
  { id: 'act-cena', nombre: 'Cena', tipo: 'familia', emoji: '🍽️',
    duracion_min: 45, es_habito: false, es_fijo: true, activa: true,
    avisar: true, avisar_antes_min: null },
  { id: 'act-devocional-noche', nombre: 'Devocional de la noche', tipo: 'fe', emoji: '💜',
    duracion_min: 20, es_habito: true, es_fijo: true, activa: true,
    avisar: true, avisar_antes_min: 10 },
  { id: 'act-dormir', nombre: 'Dormir', tipo: 'descanso', emoji: '🌙',
    duracion_min: 30, es_habito: false, es_fijo: true, activa: true,
    avisar: true, avisar_antes_min: 30 },
];

/** Lo mínimo de un bloque de la semilla: el resto lo pone `rutinaInicial`. */
type BloqueSemilla = Pick<BloqueRutina, 'actividad_id' | 'hora_inicio' | 'hora_fin'>
  & { dia_semana: number };

const ENTRE_SEMANA: Omit<BloqueSemilla, 'dia_semana'>[] = [
  { actividad_id: 'act-devocional', hora_inicio: '06:30', hora_fin: '07:30' },
  { actividad_id: 'act-cama', hora_inicio: '07:30', hora_fin: '07:35' },
  { actividad_id: 'act-colegio', hora_inicio: '08:00', hora_fin: '13:30' },
  { actividad_id: 'act-estudiar', hora_inicio: '14:00', hora_fin: '14:30' },
  { actividad_id: 'act-cuarto', hora_inicio: '14:30', hora_fin: '15:00' },
  { actividad_id: 'act-cena', hora_inicio: '19:00', hora_fin: '19:45' },
  { actividad_id: 'act-devocional-noche', hora_inicio: '21:00', hora_fin: '21:20' },
  { actividad_id: 'act-dormir', hora_inicio: '21:30', hora_fin: '22:00' },
];

const FIN_DE_SEMANA: Omit<BloqueSemilla, 'dia_semana'>[] = [
  { actividad_id: 'act-devocional', hora_inicio: '08:00', hora_fin: '09:00' },
  { actividad_id: 'act-cama', hora_inicio: '09:00', hora_fin: '09:05' },
  { actividad_id: 'act-cuarto', hora_inicio: '10:00', hora_fin: '10:30' },
  { actividad_id: 'act-cena', hora_inicio: '19:00', hora_fin: '19:45' },
  { actividad_id: 'act-devocional-noche', hora_inicio: '21:00', hora_fin: '21:20' },
  { actividad_id: 'act-dormir', hora_inicio: '22:00', hora_fin: '22:30' },
];

/** 0 = domingo … 6 = sábado. */
export function rutinaInicial(): Omit<BloqueRutina, 'persona_id'>[] {
  const bloques: Omit<BloqueRutina, 'persona_id'>[] = [];
  for (let dia = 0; dia <= 6; dia++) {
    const plantilla = dia >= 1 && dia <= 5 ? ENTRE_SEMANA : FIN_DE_SEMANA;
    for (const b of plantilla) {
      bloques.push({
        id: `rut-${dia}-${b.actividad_id}`,
        actividad_id: b.actividad_id,
        modo: 'escolar',
        repeticion: 'semanal',
        dia_semana: dia,
        cada_n: null, dia_mes: null, mes: null,
        desde: '2020-01-01', hasta: null,
        hora_inicio: b.hora_inicio,
        hora_fin: b.hora_fin,
        activo: true,
      });
    }
  }
  return bloques;
}
