/**
 * Entrar y crear cuenta, sin la plataforma.
 *
 * Aquí solo se decide **qué está mal y cómo se dice**. Quien habla con Supabase
 * es `supabase.ts`; quien lo pinta, `app/entrar.tsx`. Así se prueba sin
 * navegador y sin red.
 *
 * La regla R2 manda en todo el archivo: ningún campo se queda callado y el
 * botón no se apaga. Por eso `queFalta` devuelve **todos** los avisos a la vez
 * —no el primero— y por eso los mensajes dicen qué hacer, no solo qué pasó.
 */

import { pareceCorreo } from './invitaciones';

/** Entrar con una cuenta que ya existe, o crear una nueva. */
export type Modo = 'entrar' | 'crear';

/**
 * Ocho caracteres, no seis.
 *
 * Supabase acepta seis. Se piden ocho porque esta cuenta guarda el día de una
 * niña, sus rachas y su calendario del ciclo, y porque el aviso tiene que salir
 * **aquí** —donde se está escribiendo— y no como un error del servidor después
 * de pulsar.
 */
export const LARGO_CLAVE = 8;

export interface Campos {
  nombre: string;
  correo: string;
  clave: string;
}

export interface Avisos {
  nombre: string | null;
  correo: string | null;
  clave: string | null;
}

export const SIN_AVISOS: Avisos = { nombre: null, correo: null, clave: null };

/** Solo se pide al crear la cuenta: es como la va a saludar la app. */
export function revisarNombre(nombre: string, modo: Modo): string | null {
  if (modo === 'entrar') return null;
  const limpio = nombre.trim();
  if (!limpio) return 'Escribe tu nombre, que es como te va a saludar la app.';
  if (limpio.length > 60) return 'El nombre es muy largo: hasta 60 letras.';
  return null;
}

export function revisarCorreo(correo: string): string | null {
  const limpio = correo.trim();
  if (!limpio) return 'Escribe tu correo.';
  if (!pareceCorreo(limpio)) return 'Ese correo no está bien escrito. Ejemplo: nombre@correo.com';
  return null;
}

export function revisarClave(clave: string, modo: Modo): string | null {
  if (!clave) return 'Escribe tu contraseña.';
  // Al entrar no se mide el largo: la cuenta puede ser vieja, y decirle a
  // alguien que su contraseña es corta cuando lo que pasa es que se equivocó
  // manda a cambiarla sin necesidad.
  if (modo === 'crear' && clave.length < LARGO_CLAVE) {
    return `La contraseña necesita al menos ${LARGO_CLAVE} caracteres. Llevas ${clave.length}.`;
  }
  return null;
}

/** Todo lo que falta, de una vez. Nunca solo el primero. */
export function queFalta(modo: Modo, c: Campos): Avisos {
  return {
    nombre: revisarNombre(c.nombre, modo),
    correo: revisarCorreo(c.correo),
    clave: revisarClave(c.clave, modo),
  };
}

export function todoBien(a: Avisos): boolean {
  return !a.nombre && !a.correo && !a.clave;
}

/** El correo como lo guarda la base: sin espacios y en minúsculas. */
export function correoLimpio(correo: string): string {
  return correo.trim().toLowerCase();
}

/**
 * Lo que dice Supabase, dicho en español y sin jerga.
 *
 * Los mensajes vienen en inglés y hablan de «credentials» y de «rate limits».
 * Una niña de trece años que se equivocó de contraseña tiene que leer que se
 * equivocó de contraseña.
 */
export function enCristiano(mensaje: string): string {
  const m = mensaje.toLowerCase();

  if (m.includes('invalid login credentials')) {
    return 'El correo o la contraseña no coinciden. Míralos otra vez.';
  }
  if (m.includes('already registered') || m.includes('already been registered')) {
    return 'Ya hay una cuenta con ese correo. Entra en vez de crearla.';
  }
  if (m.includes('email not confirmed')) {
    return 'Falta confirmar el correo. Busca el mensaje que te mandamos y abre su enlace.';
  }
  if (m.includes('password should be at least')) {
    return `La contraseña es muy corta: necesita al menos ${LARGO_CLAVE} caracteres.`;
  }
  if (m.includes('unable to validate email') || m.includes('invalid email')) {
    return 'Ese correo no está bien escrito. Ejemplo: nombre@correo.com';
  }
  if (m.includes('rate limit') || m.includes('you can only request this after')) {
    return 'Demasiados intentos seguidos. Espera un minuto y vuelve a probar.';
  }
  if (m.includes('failed to fetch') || m.includes('network') || m.includes('fetch failed')) {
    return 'No se pudo conectar. Mira que tengas internet y vuelve a probar.';
  }
  if (m.includes('ese correo no esta autorizado') || m.includes('crm tony alvarado')) {
    // Si esto sale, es que el alta no llegó marcada como de GraceDay y la
    // puerta del CRM la paró. Es un fallo de la app, no de quien se registra.
    return 'No se pudo crear la cuenta por un problema de configuración. Avísanos.';
  }
  return mensaje;
}

/**
 * Qué hacer después de crear la cuenta.
 *
 * Supabase puede dejar la sesión abierta o pedir que se confirme el correo,
 * según cómo esté el proyecto. Se sabe por si vino sesión o no, y **hay que
 * decirlo**: quedarse callado después de un «Crear cuenta» que sí funcionó
 * parece que no funcionó.
 */
export function trasCrear(haySesion: boolean, correo: string): {
  dentro: boolean;
  mensaje: string;
} {
  return haySesion
    ? { dentro: true, mensaje: '¡Listo! Tu cuenta está creada y ya estás dentro.' }
    : {
      dentro: false,
      mensaje: `Te mandamos un correo a ${correoLimpio(correo)}. `
        + 'Abre su enlace para confirmar la cuenta y luego entra aquí.',
    };
}
