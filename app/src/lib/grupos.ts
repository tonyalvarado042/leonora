/**
 * Los grupos: la familia, las amigas, la iglesia.
 *
 * Puro. Aquí vive la única pregunta que de verdad importa en un grupo:
 * **¿quién puede ver lo mío, y quién puede mandarme algo?** La respuesta no
 * puede depender de la pantalla que se esté dibujando, así que está en un solo
 * sitio y se prueba sola.
 */

import type { Grupo, MiembroGrupo, Persona, RolGrupo, TipoGrupo } from './tipos';

export const NOMBRE_TIPO_GRUPO: Record<TipoGrupo, string> = {
  familia: 'Familia', amigos: 'Amigos', iglesia: 'Iglesia', otro: 'Grupo',
};

export const EMOJI_TIPO_GRUPO: Record<TipoGrupo, string> = {
  familia: '🏠', amigos: '💬', iglesia: '⛪', otro: '👥',
};

export const NOMBRE_ROL: Record<RolGrupo, string> = {
  tutor: 'Papá o mamá', miembro: 'Miembro',
};

/** Los miembros que cuentan: los que dijeron que sí y no se han ido. */
export function activos(miembros: MiembroGrupo[], grupoId: string): MiembroGrupo[] {
  return miembros.filter((m) => m.grupo_id === grupoId && m.estado === 'activo');
}

/** Mis grupos, los que ya acepté. */
export function misGrupos(
  grupos: Grupo[], miembros: MiembroGrupo[], personaId: string,
): Grupo[] {
  const mios = new Set(
    miembros
      .filter((m) => m.persona_id === personaId && m.estado === 'activo')
      .map((m) => m.grupo_id),
  );
  return grupos.filter((g) => mios.has(g.id));
}

/** Las invitaciones que todavía no he contestado. */
export function invitacionesPendientes(
  grupos: Grupo[], miembros: MiembroGrupo[], personaId: string,
): Grupo[] {
  const invitado = new Set(
    miembros
      .filter((m) => m.persona_id === personaId && m.estado === 'invitado')
      .map((m) => m.grupo_id),
  );
  return grupos.filter((g) => invitado.has(g.id));
}

export function miRolEn(
  miembros: MiembroGrupo[], grupoId: string, personaId: string,
): RolGrupo | null {
  const m = miembros.find(
    (x) => x.grupo_id === grupoId && x.persona_id === personaId && x.estado === 'activo',
  );
  return m ? m.rol : null;
}

/**
 * ¿Puedo administrar este grupo —invitar, renombrar, sacar a alguien?
 *
 * Puede quien lo creó y puede un tutor. Son dos cosas distintas a propósito:
 * una niña de 13 años puede montar el grupo de su familia sin que eso la
 * convierta en la mamá de nadie.
 */
export function mandaEn(
  grupos: Grupo[], miembros: MiembroGrupo[], grupoId: string, personaId: string,
): boolean {
  const g = grupos.find((x) => x.id === grupoId);
  if (!g) return false;
  const rol = miRolEn(miembros, grupoId, personaId);
  if (rol === null) return false;
  return g.creado_por === personaId || rol === 'tutor';
}

/**
 * ¿Puedo meter a alguien en este grupo?
 *
 * **Cualquier miembro puede.** Una familia no se arma pidiéndole permiso a un
 * administrador: si Leonora quiere meter a su hermana, la mete.
 */
export function puedoAnadirA(miembros: MiembroGrupo[], grupoId: string, personaId: string): boolean {
  return miRolEn(miembros, grupoId, personaId) !== null;
}

/**
 * ¿Puedo meterlo **como tutor**?
 *
 * Eso sí lo reserva quien administra. Un tutor ve el calendario de todos los
 * hijos de la casa y les puede mandar tareas: si cualquiera pudiera fabricar
 * uno, cualquiera podría darle esa vista a quien quisiera. Quien no pueda,
 * mete a la persona como miembro y **la app se lo dice**, en vez de esconder
 * la opción sin explicar por qué.
 */
export function puedoAnadirTutor(
  grupos: Grupo[], miembros: MiembroGrupo[], grupoId: string, personaId: string,
): boolean {
  return mandaEn(grupos, miembros, grupoId, personaId);
}

/**
 * ¿Puedo ver el calendario de esta persona?
 *
 * Dos reglas, y la diferencia entre ellas es deliberada:
 *
 * - **En la familia manda el tutor.** Papá y mamá ven el día de sus hijos sin
 *   pedir permiso: para eso son los papás, y la app se lo dice al hijo en su
 *   pantalla en vez de mirarlo a escondidas.
 * - **En los demás grupos manda cada quien.** Una amiga enseña su calendario
 *   solo si ella lo enciende, y lo puede apagar cuando quiera.
 *
 * Lo mío siempre lo veo yo.
 */
export function puedoVerElCalendarioDe(
  grupos: Grupo[], miembros: MiembroGrupo[], yo: string, otra: string,
): boolean {
  if (yo === otra) return true;

  for (const g of grupos) {
    const mio = miembros.find(
      (m) => m.grupo_id === g.id && m.persona_id === yo && m.estado === 'activo',
    );
    const suyo = miembros.find(
      (m) => m.grupo_id === g.id && m.persona_id === otra && m.estado === 'activo',
    );
    if (!mio || !suyo) continue;

    const soyTutorDeSuFamilia =
      g.tipo === 'familia' && mio.rol === 'tutor' && suyo.rol === 'miembro';
    if (soyTutorDeSuFamilia) return true;
    if (suyo.ve_mi_calendario) return true;
  }
  return false;
}

/** Quién ve mi calendario, para poder decírselo a la persona por su nombre. */
export function quienVeMiCalendario(
  grupos: Grupo[], miembros: MiembroGrupo[], personas: Persona[], yo: string,
): Persona[] {
  return personas
    .filter((p) => p.id !== yo && puedoVerElCalendarioDe(grupos, miembros, p.id, yo))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

/**
 * A quién le puedo poner una **tarea**, de las que entran en su horario.
 *
 * Solo un tutor, solo en la familia y solo a quien no es tutor. Una amiga no
 * le pone tareas a otra, y un hijo no le manda deberes a su papá.
 *
 * Escribirle un mensaje o recordarle algo es otra cosa y lo puede hacer
 * cualquiera: para eso está `conQuienComparto`. Meterle algo en el horario a
 * otra persona sí tiene que estar reservado.
 */
export function aQuienPuedoMandar(
  grupos: Grupo[], miembros: MiembroGrupo[], personas: Persona[], yo: string,
): Persona[] {
  const ids = new Set<string>();
  for (const g of grupos.filter((x) => x.tipo === 'familia')) {
    if (miRolEn(miembros, g.id, yo) !== 'tutor') continue;
    for (const m of activos(miembros, g.id)) {
      if (m.persona_id !== yo && m.rol === 'miembro') ids.add(m.persona_id);
    }
  }
  return personas
    .filter((p) => ids.has(p.id))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

/** Con quién comparto grupo, para el chat y para invitar al devocional. */
export function conQuienComparto(
  grupos: Grupo[], miembros: MiembroGrupo[], personas: Persona[], yo: string,
): Persona[] {
  const mios = new Set(misGrupos(grupos, miembros, yo).map((g) => g.id));
  const ids = new Set<string>();
  for (const m of miembros) {
    if (mios.has(m.grupo_id) && m.estado === 'activo' && m.persona_id !== yo) {
      ids.add(m.persona_id);
    }
  }
  return personas
    .filter((p) => ids.has(p.id))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

/** Los que entraron por correo y todavía no han aceptado. */
export function invitados(miembros: MiembroGrupo[], grupoId: string): MiembroGrupo[] {
  return miembros.filter((m) => m.grupo_id === grupoId && m.estado === 'invitado');
}
