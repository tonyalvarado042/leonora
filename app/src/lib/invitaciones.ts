/**
 * Invitar a alguien a un grupo.
 *
 * Puro. Dos maneras, y la diferencia importa:
 *
 * - **Solo con su nombre.** Entra ya, en este teléfono. Sirve para la casa:
 *   mamá toca su nombre arriba y ya está usando la app. No hace falta correo,
 *   ni cuenta, ni esperar a nada.
 * - **Con su correo.** Le llega una invitación con un código. Entra cuando la
 *   acepte desde su propio teléfono, y entonces ve el grupo y los horarios de
 *   quien los comparta.
 *
 * El código no es un secreto criptográfico y no pretende serlo: es lo que se
 * escribe a mano cuando el enlace no se puede tocar. Lo que de verdad protege
 * el grupo son las políticas de la base de datos, no este texto.
 */

import type { Grupo, Invitacion, Persona, TipoGrupo } from './tipos';

/** Sin letras ni números que se confundan al copiarlos a mano: 0/O, 1/I/L. */
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

const PREFIJO: Record<TipoGrupo, string> = {
  familia: 'CASA', amigos: 'AMIS', iglesia: 'IGLE', otro: 'GRUP',
};

/** El código es **de una invitación y de un solo uso**, no del grupo: un
 *  código de grupo que sirviera siempre acabaría dando vueltas por ahí, y
 *  quien lo encontrara un año después entraría igual.
 *
 *  `azar` se inyecta para poder probar el resultado sin depender de la suerte. */
export function nuevoCodigo(tipo: TipoGrupo, azar: () => number = Math.random): string {
  let cola = '';
  for (let i = 0; i < 4; i++) {
    cola += ALFABETO[Math.floor(azar() * ALFABETO.length) % ALFABETO.length];
  }
  return `${PREFIJO[tipo]}-${cola}`;
}

/** Lo que escribió la persona, dejado como se guarda: mayúsculas y un guion. */
export function limpiarCodigo(escrito: string): string {
  const solo = escrito.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (solo.length <= 4) return solo;
  return `${solo.slice(0, 4)}-${solo.slice(4, 8)}`;
}

export function esCodigoValido(escrito: string): boolean {
  return /^[A-Z]{4}-[A-Z0-9]{4}$/.test(limpiarCodigo(escrito));
}

/**
 * ¿Es un correo? A propósito no se valida a fondo.
 *
 * Las reglas de verdad de un correo son mucho más raras de lo que parece, y
 * una validación estricta acaba rechazando direcciones que existen. Se
 * comprueba lo que un dedo se equivoca de verdad: que haya algo, una arroba y
 * un punto detrás.
 */
export function pareceCorreo(texto: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(texto.trim());
}

export interface Mensaje {
  para: string;
  codigo: string;
  enlace: string;
  asunto: string;
  cuerpo: string;
}

/** De dónde se baja la app. Cuando esté en las tiendas, cambia aquí y ya. */
export const DONDE_BAJARLA = 'https://graceday.app';

/**
 * El texto que se manda. Se escribe una vez y sirve igual para el correo, para
 * WhatsApp y para copiarlo a mano: si cada sitio tuviera el suyo, tres textos
 * distintos se irían separando con cada cambio.
 */
export function armarMensaje(
  invitacion: Invitacion, grupo: Grupo, dequien: Persona,
): Mensaje {
  const quien = dequien.nombre.trim() === '' ? 'Alguien de tu familia' : dequien.nombre.trim();
  const nombre = invitacion.nombre.trim() === ''
    ? 'Hola' : `Hola, ${invitacion.nombre.trim()}`;
  const enlace = `${DONDE_BAJARLA}/unirse?codigo=${invitacion.codigo}`;

  return {
    para: invitacion.email,
    codigo: invitacion.codigo,
    enlace,
    asunto: `${quien} te invita a «${grupo.nombre}» en GraceDay`,
    cuerpo: [
      `${nombre}.`,
      '',
      `${quien} te invitó a «${grupo.nombre}» en GraceDay, una app para organizar`,
      'el día, los devocionales y las fechas importantes de la familia.',
      '',
      `Tu código para entrar: ${invitacion.codigo}`,
      '',
      `Baja la app aquí y escribe el código: ${enlace}`,
      '',
      'Cuando entres verás el grupo y los horarios de quien los comparta. Lo tuyo',
      'lo decides tú: puedes enseñar tu calendario o no, y cambiarlo cuando quieras.',
    ].join('\n'),
  };
}

/** El enlace `mailto:` con todo puesto, para abrir la app de correo. */
export function comoCorreo(i: Mensaje): string {
  return `mailto:${encodeURIComponent(i.para)}`
    + `?subject=${encodeURIComponent(i.asunto)}`
    + `&body=${encodeURIComponent(i.cuerpo)}`;
}

/** El enlace de WhatsApp. Sin número: lo elige la persona en su agenda. */
export function comoWhatsApp(i: Mensaje): string {
  return `https://wa.me/?text=${encodeURIComponent(i.cuerpo)}`;
}
