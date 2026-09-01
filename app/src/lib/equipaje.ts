/**
 * Lo que se lleva del teléfono a la nube al crear la cuenta.
 *
 * Alguien puede usar GraceDay semanas sin cuenta: contesta el asistente, arma
 * su rutina, apunta sus días. El día que se hace una cuenta, **eso no se
 * pierde**.
 *
 * Aquí solo se decide qué viaja y cómo se reescriben los identificadores. El
 * que lo sube es `supabase.ts`; el que lo entrega, `repositorio.ts`. Se prueba
 * sin red.
 *
 * ## Qué viaja y qué no, y por qué
 *
 * **Viaja:** la persona (nombre, cumpleaños, sexo, zona horaria, avatar), sus
 * ajustes, su catálogo de actividades, sus reglas de rutina, sus eventos
 * propios, su ciclo y sus rachas con los logros ganados.
 *
 * **No viaja:**
 *
 * - **Los días ya armados** (`dias`, `tareas_dia`). Se vuelven a generar solos
 *   desde la rutina, que sí viaja. Lo que se perdería es lo marcado de días
 *   pasados; las rachas —que es lo que de verdad duele perder— viajan aparte.
 * - **Las otras personas del teléfono.** En la nube una persona **es** una
 *   cuenta (`graceday_personas.id` apunta a `auth.users`), así que mamá no
 *   puede existir en la nube hasta que tenga la suya. Se la invita por correo
 *   desde Familia, que es justo para lo que está.
 * - **Los grupos y los recados.** La familia la crea el disparador de alta, y
 *   un recado necesita a las dos personas con cuenta. Volver a mandarlos sin
 *   destinatario sería inventarse a quién.
 *
 * Nada de esto se calla: `loQueNoViaja()` lo dice con números, para que la
 * pantalla lo enseñe antes de subir.
 */

import type { Racha } from './rachas';
import type {
  Actividad, Ajustes, BloqueRutina, DiaCiclo, Evento, Persona,
} from './tipos';

/** Los datos de la persona que sí tienen sentido en una cuenta nueva. */
export type PersonaDeMudanza = Pick<
  Persona, 'nombre' | 'sexo' | 'fecha_nacimiento' | 'zona_horaria' | 'avatar_tipo' | 'avatar_valor'
>;

export interface Equipaje {
  persona: PersonaDeMudanza;
  /** Sin `persona_id`: en la nube es el de la cuenta, no el del teléfono. */
  ajustes: Omit<Ajustes, 'persona_id'>;
  actividades: Actividad[];
  rutina: BloqueRutina[];
  /** Solo los suyos. Los de un grupo son del grupo, y el grupo no viaja. */
  eventos: Evento[];
  ciclo: DiaCiclo[];
  rachas: Racha[];
  logros: string[];
  /** Para poder decir qué se queda, con números y no «puede que algo». */
  se_quedan: { dias: number; personas: number; grupos: number; encargos: number };
}

/** Un equipaje que no lleva nada: el de quien acaba de instalar la app. */
export function equipajeVacio(persona: PersonaDeMudanza, ajustes: Omit<Ajustes, 'persona_id'>): Equipaje {
  return {
    persona, ajustes,
    actividades: [], rutina: [], eventos: [], ciclo: [], rachas: [], logros: [],
    se_quedan: { dias: 0, personas: 0, grupos: 0, encargos: 0 },
  };
}

/** ¿Hay algo que subir, o la cuenta se crea sobre una app recién instalada? */
export function traeAlgo(e: Equipaje): boolean {
  return e.actividades.length > 0 || e.rutina.length > 0 || e.eventos.length > 0
    || e.ciclo.length > 0 || e.rachas.some((r) => r.total_dias > 0);
}

/**
 * Lo que se sube, contado en frases.
 *
 * Se enseña **antes** de subir. Un «sincronizando…» y luego un tick verde no
 * dice si viajaron las cuatro cosas o las cuarenta.
 */
export function loQueViaja(e: Equipaje): string[] {
  const l: string[] = [];
  const n = (cuantos: number, una: string, varias: string) =>
    `${cuantos} ${cuantos === 1 ? una : varias}`;

  if (e.actividades.length) l.push(n(e.actividades.length, 'actividad', 'actividades'));
  if (e.rutina.length) l.push(n(e.rutina.length, 'bloque de tu rutina', 'bloques de tu rutina'));
  if (e.eventos.length) l.push(n(e.eventos.length, 'evento tuyo', 'eventos tuyos'));
  if (e.ciclo.length) l.push(n(e.ciclo.length, 'día apuntado del ciclo', 'días apuntados del ciclo'));

  const viva = e.rachas.filter((r) => r.total_dias > 0);
  if (viva.length) {
    const mejor = Math.max(...viva.map((r) => r.racha_actual));
    l.push(mejor > 0
      ? `tus rachas (la más larga va por ${mejor})`
      : 'tus rachas');
  }
  if (e.logros.length) l.push(n(e.logros.length, 'logro ganado', 'logros ganados'));
  return l;
}

/**
 * Lo que **no** viaja, dicho antes de subir y no después.
 *
 * Devuelve frases, no una cifra: «2 personas» no explica nada, y «Mamá y
 * Sofía siguen en este teléfono» sí.
 */
export function loQueNoViaja(e: Equipaje): string[] {
  const l: string[] = [];
  const { dias, personas, grupos, encargos } = e.se_quedan;

  if (dias > 0) {
    l.push(dias === 1
      ? 'El día que ya viviste se vuelve a armar desde tu rutina. Lo que '
        + 'marcaste en él se queda aquí; tus rachas sí viajan.'
      : `Los ${dias} días que ya viviste se vuelven a armar desde tu rutina. `
        + 'Lo que marcaste en días pasados se queda aquí; tus rachas sí viajan.');
  }
  if (personas > 0) {
    l.push(personas === 1
      ? 'La otra persona de este teléfono necesita su propia cuenta. Invítala '
        + 'por correo desde Familia y entra con la suya.'
      : `Las otras ${personas} personas de este teléfono necesitan su propia `
        + 'cuenta. Invítalas por correo desde Familia y entran con la suya.');
  }
  if (grupos > 0 || encargos > 0) {
    // «Con ellas» solo se entiende si antes se habló de ellas. Sin más gente
    // en el teléfono, la frase se quedaba sin a quién referirse.
    l.push(personas > 0
      ? 'Los grupos y los recados se rehacen con ellas: un recado necesita a '
        + 'las dos personas con cuenta.'
      : 'Los grupos y los recados de este teléfono se quedan aquí: un recado '
        + 'necesita a las dos personas con cuenta.');
  }
  return l;
}

/**
 * Reescribe los identificadores para la cuenta nueva.
 *
 * En el teléfono una actividad es `act-k3f-2`; en la nube es un uuid que pone
 * Postgres. La rutina apunta a la actividad por su id, así que si se suben las
 * actividades y luego la rutina con los ids viejos, **la rutina apunta a la
 * nada** y el día sale vacío.
 *
 * Por eso las actividades se suben primero, se recogen los ids nuevos, y esta
 * función traduce la rutina antes de subirla. Un bloque cuya actividad no
 * llegó **se cae aquí**, en vez de guardarse roto.
 */
export function traducirRutina(
  rutina: BloqueRutina[],
  deVieja: Map<string, string>,
  personaId: string,
): { suben: Omit<BloqueRutina, 'id'>[]; perdidos: number } {
  const suben: Omit<BloqueRutina, 'id'>[] = [];
  let perdidos = 0;

  for (const b of rutina) {
    const nueva = deVieja.get(b.actividad_id);
    if (!nueva) { perdidos += 1; continue; }
    const { id: _id, ...resto } = b;
    suben.push({ ...resto, persona_id: personaId, actividad_id: nueva });
  }
  return { suben, perdidos };
}

/** Las actividades listas para insertar: sin id —lo pone Postgres— y con dueña. */
export function actividadesParaSubir(
  actividades: Actividad[], personaId: string,
): Omit<Actividad, 'id'>[] {
  return actividades.map(({ id: _id, ...resto }) => ({ ...resto, persona_id: personaId }));
}

/**
 * Los eventos que puede subir alguien que acaba de crear su cuenta.
 *
 * Solo los suyos: uno de grupo pertenece al grupo, y el grupo del teléfono no
 * existe en la nube. Subirlo colgado de la persona lo convertiría en otra cosa.
 */
export function eventosParaSubir(
  eventos: Evento[], personaId: string,
): Omit<Evento, 'id'>[] {
  return eventos
    .filter((e) => !e.grupo_id)
    .map(({ id: _id, ...resto }) => ({ ...resto, persona_id: personaId, grupo_id: null }));
}
