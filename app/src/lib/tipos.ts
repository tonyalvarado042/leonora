/** Los tipos de la Fase 1, en el mismo vocabulario que la base de datos. */

export type TipoActividad =
  | 'fe' | 'estudio' | 'casa' | 'deporte' | 'familia' | 'descanso';

export type ModoRutina = 'escolar' | 'vacaciones';
export type EstadoTarea = 'pendiente' | 'hecha' | 'omitida' | 'movida';
export type OrigenTarea = 'rutina' | 'evento' | 'encargo' | 'ia' | 'manual';
export type Ocupacion =
  | 'colegio' | 'escuela' | 'universidad' | 'trabajo' | 'otro' | 'ninguno';
export type Tema = 'claro' | 'oscuro' | 'auto';
export type Sexo = 'mujer' | 'hombre' | 'sin_decir';

/** "HH:MM", 24 horas. */
export type Hora = string;
/** "AAAA-MM-DD" en la zona horaria de la persona. */
export type Fecha = string;

// ------------------------------------------------------------------ grupos

/** Una familia es un grupo de tipo familia. No hay tabla `familias` aparte:
 *  así todo lo que sirve para la familia sirve igual para las amigas. */
export type TipoGrupo = 'familia' | 'amigos' | 'iglesia' | 'otro';

/** Solo dos: quien cuida y quien es cuidado. Quién creó el grupo no es un rol
 *  —está en `Grupo.creado_por`—, porque si lo fuera, la niña que monta la app
 *  para su familia sería la jefa y su mamá no podría mandarle nada. */
export type RolGrupo = 'tutor' | 'miembro';

export interface Grupo {
  id: string;
  nombre: string;
  tipo: TipoGrupo;
  emoji: string;
  creado_por: string;
}

/**
 * Una invitación a un grupo, para alguien que **todavía no tiene la app**.
 *
 * El código es de una sola invitación y de un solo uso, no del grupo: un
 * código de grupo que sirviera siempre acabaría dando vueltas por ahí, y
 * quien lo encontrara un año después entraría igual.
 */
export interface Invitacion {
  id: string;
  grupo_id: string;
  /** A dónde se manda. Es lo que de verdad cierra la puerta: en la nube solo
   *  entra quien inicia sesión con este correo. */
  email: string;
  /** Como la llamó quien la invitó, para poder saludarla por su nombre. */
  nombre: string;
  rol: RolGrupo;
  codigo: string;
  creada_por: string;
  creada_en: string;
  aceptada_en: string | null;
}

export interface MiembroGrupo {
  grupo_id: string;
  persona_id: string;
  rol: RolGrupo;
  /** Lo decide cada quien, por grupo, y se puede quitar cuando quiera. */
  ve_mi_calendario: boolean;
  estado: 'invitado' | 'activo' | 'salio';
}

// ---------------------------------------------------------------- encargos

/** Lo que papá o mamá le manda a un hijo. */
export type TipoEncargo = 'tarea' | 'recordatorio' | 'consejo';

export interface Encargo {
  id: string;
  de_persona_id: string;
  para_persona_id: string;
  titulo: string;
  nota: string | null;
  fecha: Fecha;
  hora_sugerida: Hora | null;
  tipo: TipoEncargo;
  estado: 'pendiente' | 'hecho' | 'archivado';
  /** Lo que contesta el hijo. Lo ve quien lo mandó. */
  respuesta: string | null;
  respondido_en: string | null;
  visto_en: string | null;
  creado_en: string;
}

// ----------------------------------------------------------------- eventos

export type TipoEvento =
  | 'feriado' | 'escolar' | 'examen' | 'entrega' | 'cumpleanos' | 'cita' | 'viaje' | 'personal';

/** Qué le hace un evento al día. */
export type EfectoEvento = 'libra_el_dia' | 'bloquea_horas' | 'solo_avisa';

export interface Evento {
  id: string;
  grupo_id: string | null;
  /** null = es de todo el grupo. */
  persona_id: string | null;
  tipo: TipoEvento;
  titulo: string;
  descripcion: string | null;
  fecha_inicio: Fecha;
  fecha_fin: Fecha;
  todo_el_dia: boolean;
  hora_inicio: Hora | null;
  hora_fin: Hora | null;
  /** `anual` es lo que hace que un cumpleaños vuelva cada año. */
  repeticion: 'ninguna' | 'anual';
  efecto: EfectoEvento;
  origen: 'manual' | 'foto' | 'sistema';
  confianza: number | null;
  /** Nada leído de una foto entra al horario sin que un humano lo apruebe. */
  confirmado: boolean;
}

export interface Persona {
  id: string;
  nombre: string;
  /** Solo se usa para una cosa: ofrecer el calendario del ciclo. No cambia
   *  nada más de la app, y «prefiero no decir» es una respuesta entera. */
  sexo?: Sexo;
  /** Solo si se le invitó por correo. Sin correo también se puede añadir a
   *  alguien: entra ya en este teléfono y cambia de usuario desde arriba. */
  email?: string | null;
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
  /** El calendario del ciclo. Se ofrece al arrancar y se puede encender o
   *  apagar cuando sea desde Ajustes. Apagarlo **no borra** lo apuntado. */
  ciclo_activo: boolean;
  /** false hasta que se contesta el asistente de arranque. */
  arranque_hecho: boolean;
}

// ------------------------------------------------------------------- ciclo

export type Intensidad = 'poco' | 'normal' | 'mucho';

/**
 * Un día del ciclo.
 *
 * **Es lo único de toda la app que no ve nadie más.** Ni un tutor, ni quien
 * comparte grupo, ni quien mira el horario: nadie. Un papá puede necesitar ver
 * el día de su hija; su ciclo no es información suya.
 */
export interface DiaCiclo {
  persona_id: string;
  fecha: Fecha;
  /** Si ese día hubo sangrado. Lo demás es opcional. */
  sangrado: boolean;
  intensidad: Intensidad | null;
  animo: string | null;
  nota: string | null;
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

/** Cada cuánto se repite algo. Cubre lo mismo que un calendario normal. */
export type TipoRepeticion =
  | 'diaria' | 'semanal' | 'cada_n_dias' | 'mensual' | 'anual';

export interface BloqueRutina {
  id: string;
  persona_id: string;
  actividad_id: string;
  modo: ModoRutina;
  repeticion: TipoRepeticion;
  /** Solo en `semanal`. 0 = domingo … 6 = sábado. */
  dia_semana: number | null;
  /** Solo en `cada_n_dias`. Se cuenta desde `desde`. */
  cada_n: number | null;
  /** En `mensual` y `anual`. 1-31; si el mes es más corto, cae en el último día. */
  dia_mes: number | null;
  /** Solo en `anual`. 1-12. */
  mes: number | null;
  /** Desde cuándo vale la regla. Es también el ancla de `cada_n_dias`. */
  desde: Fecha;
  /** Hasta cuándo, o null para siempre. */
  hasta: Fecha | null;
  hora_inicio: Hora;
  hora_fin: Hora;
  activo: boolean;
}

/** Una tarea recién generada, antes de que la base de datos le ponga id. */
export type TareaNueva = Omit<Tarea, 'id' | 'dia_id'>;

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
  /** De qué encargo salió, si salió de uno. Es lo que hace que marcar la
   *  tarea aquí se vea allá: el que la mandó se entera de que ya está. */
  encargo_id: string | null;
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
