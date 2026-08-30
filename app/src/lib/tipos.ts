/** Los tipos de la Fase 1, en el mismo vocabulario que la base de datos. */

export type TipoActividad =
  | 'fe' | 'estudio' | 'casa' | 'deporte' | 'familia' | 'descanso';

export type ModoRutina = 'escolar' | 'vacaciones';
export type EstadoTarea = 'pendiente' | 'hecha' | 'omitida' | 'movida';
export type OrigenTarea = 'rutina' | 'evento' | 'encargo' | 'ia' | 'manual';
export type Ocupacion =
  | 'colegio' | 'escuela' | 'universidad' | 'trabajo' | 'otro' | 'ninguno';
export type Tema = 'claro' | 'oscuro' | 'auto';

/** "HH:MM", 24 horas. */
export type Hora = string;
/** "AAAA-MM-DD" en la zona horaria de la persona. */
export type Fecha = string;

export interface Persona {
  id: string;
  nombre: string;
  fecha_nacimiento?: string | null;
  avatar_tipo: 'emoji' | 'ilustracion' | 'foto';
  avatar_valor: string;
  foto_url?: string | null;
  zona_horaria: string;
}

export interface Ajustes {
  persona_id: string;
  hora_despertar: Hora;
  hora_dormir: Hora;
  ocupacion: Ocupacion;
  /** Cómo lo llama la persona. Vacío = la etiqueta que toque por el tipo. */
  ocupacion_nombre: string;
  hora_fin_ocupacion: Hora;
  /** 0 = domingo … 6 = sábado, igual que Date.getDay(). */
  dias_ocupados: number[];
  avisos_activos: boolean;
  avisar_antes_min: number;
  sonido_aviso: string;
  sonido_devocional: string;
  vibrar: boolean;
  silencio_desde: Hora | null;
  silencio_hasta: Hora | null;
  tema: Tema;
  celebraciones: boolean;
  /** false hasta que se contesta el asistente de arranque. */
  arranque_hecho: boolean;
}

export interface Actividad {
  id: string;
  persona_id: string;
  nombre: string;
  tipo: TipoActividad;
  emoji: string;
  duracion_min: number;
  es_habito: boolean;
  es_fijo: boolean;
  avisar: boolean;
  /** null = usar el de ajustes. Un valor propio le lleva la contraria. */
  avisar_antes_min: number | null;
  activa: boolean;
}

export interface BloqueRutina {
  id: string;
  persona_id: string;
  actividad_id: string;
  modo: ModoRutina;
  dia_semana: number;
  hora_inicio: Hora;
  hora_fin: Hora;
  activo: boolean;
}

export interface Dia {
  id: string;
  persona_id: string;
  fecha: Fecha;
  tipo: 'escolar' | 'fin_de_semana' | 'feriado' | 'vacaciones' | 'especial';
  modo_usado: ModoRutina;
  nota_ia: string | null;
  porcentaje_cumplido: number;
}

export interface Tarea {
  id: string;
  dia_id: string;
  actividad_id: string | null;
  titulo: string;
  emoji: string;
  tipo: TipoActividad;
  hora_inicio: Hora;
  hora_fin: Hora;
  orden: number;
  es_fijo: boolean;
  origen: OrigenTarea;
  estado: EstadoTarea;
  completado_en: string | null;
  nota: string | null;
  minutos_reales: number | null;
  termino_de_verdad: boolean | null;
  puntos: number;
  /** Solo en las de tipo fe: cómo se hizo el devocional hoy. */
  metodo_devocional: import('@/datos/metodos').MetodoDevocional | null;
}

export interface Aviso {
  id: string;
  persona_id: string;
  tipo: 'tarea' | 'recado' | 'invitacion' | 'oracion' | 'evento' | 'ciclo';
  referencia_id: string | null;
  /** ISO 8601 con zona. */
  momento: string;
  titulo: string;
  cuerpo: string | null;
  sonido: string | null;
  estado: 'pendiente' | 'programado' | 'enviado' | 'cancelado' | 'fallido';
  id_local: string | null;
}
