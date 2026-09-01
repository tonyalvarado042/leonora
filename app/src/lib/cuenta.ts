/**
 * Entrar, crear cuenta y salir.
 *
 * Es el único sitio que junta las tres piezas: `sesion.ts` dice qué está mal,
 * `supabase.ts` habla con la base, y `repositorio.ts` guarda contra el
 * teléfono o contra la nube. Aquí se decide **cuándo** se cambia de uno a otro
 * y **qué se sube** por el camino.
 *
 * La app funciona sin cuenta, y eso no es un modo degradado: es como se usa el
 * primer día. Entrar es algo que se hace después, y lo que ya había **se sube
 * con la persona** en vez de perderse.
 */

import type { Session, SupabaseClient } from '@supabase/supabase-js';

import { loQueNoViaja, loQueViaja, traeAlgo, type Equipaje } from './equipaje';
import {
  enElTelefono, guardarEnElTelefono, guardarEnLaNube, repositorio,
} from './repositorio';
import { correoLimpio, enCristiano, trasCrear } from './sesion';
import { crearCliente, hayNube, RepositorioSupabase } from './supabase';

/** El cliente se crea una sola vez: dos clientes = dos sesiones distintas. */
let cliente: SupabaseClient | null = null;

export function nube(): SupabaseClient {
  cliente ??= crearCliente();
  return cliente;
}

export { hayNube };

export interface Cuenta {
  correo: string;
  /** Lo que se guardó en los metadatos del alta. */
  nombre: string;
}

function deLaSesion(s: Session): Cuenta {
  return {
    correo: s.user.email ?? '',
    nombre: (s.user.user_metadata?.nombre as string | undefined) ?? '',
  };
}

/**
 * ¿Hay una sesión abierta de antes?
 *
 * Se llama al arrancar la app. Si la hay, se pasa a guardar en la nube antes
 * de que se pinte nada: si no, la primera pantalla saldría con los datos del
 * teléfono y cambiaría sola un segundo después.
 */
export async function recuperarSesion(): Promise<Cuenta | null> {
  if (!hayNube) return null;
  const { data } = await nube().auth.getSession();
  if (!data.session) return null;
  guardarEnLaNube(new RepositorioSupabase(nube()));
  return deLaSesion(data.session);
}

/**
 * La maleta de este teléfono, para poder enseñarla **antes** de subir nada.
 *
 * Un «sincronizando…» y luego un tick verde no dice si viajaron las cuatro
 * cosas o las cuarenta, ni qué se queda atrás.
 */
export async function verLaMaleta(): Promise<{
  equipaje: Equipaje; trae: boolean; viaja: string[]; noViaja: string[];
}> {
  const equipaje = await enElTelefono.exportar();
  return {
    equipaje,
    trae: traeAlgo(equipaje),
    viaja: loQueViaja(equipaje),
    noViaja: loQueNoViaja(equipaje),
  };
}

export interface Resultado {
  cuenta: Cuenta | null;
  /** Lo que hay que decirle a la persona. Nunca vacío. */
  mensaje: string;
  /** true = ya está dentro; false = falta confirmar el correo. */
  dentro: boolean;
}

/** Entrar con una cuenta que ya existe. Lo de este teléfono no se toca. */
export async function entrar(correo: string, clave: string): Promise<Resultado> {
  const { data, error } = await nube().auth.signInWithPassword({
    email: correoLimpio(correo), password: clave,
  });
  if (error) throw new Error(enCristiano(error.message));
  if (!data.session) throw new Error('Se entró pero no llegó la sesión. Vuelve a probar.');

  guardarEnLaNube(new RepositorioSupabase(nube()));
  await asegurarPersona(data.session, data.session.user.email ?? correo);
  return { cuenta: deLaSesion(data.session), dentro: true, mensaje: 'Ya estás dentro.' };
}

/**
 * Crear la cuenta y llevarse lo que ya había.
 *
 * El `app: 'graceday'` de los metadatos **no es adorno**: es lo que hace que el
 * disparador de alta cree la persona (migración 0012) y lo que deja pasar la
 * puerta del proyecto compartido (migración 0014).
 */
export async function crearCuenta(
  nombre: string, correo: string, clave: string, equipaje: Equipaje | null,
): Promise<Resultado> {
  const email = correoLimpio(correo);
  const { data, error } = await nube().auth.signUp({
    email, password: clave,
    options: { data: { app: 'graceday', nombre: nombre.trim() } },
  });
  if (error) throw new Error(enCristiano(error.message));

  const { dentro, mensaje } = trasCrear(Boolean(data.session), email);
  // Sin sesión no se puede subir nada: las políticas responden sobre
  // `auth.uid()`, y todavía no hay ninguno. La maleta se queda en el teléfono
  // y sube cuando entre, que es lo que hace `entrar`.
  if (!dentro || !data.session) return { cuenta: null, dentro: false, mensaje };

  guardarEnLaNube(new RepositorioSupabase(nube()));
  const cuenta = deLaSesion(data.session);
  if (!equipaje || !traeAlgo(equipaje)) return { cuenta, dentro: true, mensaje };

  const nueva = new RepositorioSupabase(nube());
  await nueva.recibirEquipaje(equipaje);
  return {
    cuenta, dentro: true,
    mensaje: `${mensaje} Se subió lo que tenías: ${loQueViaja(equipaje).join(', ')}.`,
  };
}

/**
 * Sube al entrar lo que se quedó sin subir al crear la cuenta.
 *
 * Pasa siempre que el proyecto pide confirmar el correo: se crea la cuenta,
 * no hay sesión, la maleta se queda, y la persona vuelve días después a
 * entrar. Solo sube **si la cuenta está vacía**: si ya tiene rutina, subir la
 * del teléfono encima la duplicaría.
 */
export async function subirSiEstaVacia(equipaje: Equipaje): Promise<string | null> {
  if (!traeAlgo(equipaje)) return null;
  const nueva = new RepositorioSupabase(nube());
  const suyas = await nueva.actividades();
  const suRutina = await nueva.rutina();
  if (suyas.length > 0 || suRutina.length > 0) return null;

  await nueva.recibirEquipaje(equipaje);
  return `Se subió lo que tenías en este teléfono: ${loQueViaja(equipaje).join(', ')}.`;
}

/**
 * Quien ya tenía cuenta en el proyecto de antes no pasó por el disparador de
 * alta, así que no tiene fila en `personas`. Se la crea al entrar.
 *
 * La política de `personas` deja que cada quien cree la suya, así que esto no
 * abre nada: es la misma fila que habría creado el disparador.
 */
async function asegurarPersona(sesion: Session, correo: string): Promise<void> {
  const sb = nube();
  const { data } = await sb.from('graceday_personas').select('id').eq('id', sesion.user.id).maybeSingle();
  if (data) return;

  const nombre = (sesion.user.user_metadata?.nombre as string | undefined)?.trim();
  const { error } = await sb.from('graceday_personas').insert({
    id: sesion.user.id, email: correo, nombre: nombre || correo.split('@')[0] || 'Tú',
  });
  if (error) throw new Error(`crear tu ficha: ${enCristiano(error.message)}`);
}

/**
 * Salir. Vuelve a guardarse en el teléfono.
 *
 * **No se borra nada de la nube ni del teléfono.** Salir y borrar son dos
 * cosas distintas, y la app no puede hacer la segunda cuando le piden la
 * primera.
 */
export async function salir(): Promise<void> {
  await nube().auth.signOut();
  guardarEnElTelefono();
}

/** Para las pantallas, sin que tengan que importar tres módulos. */
export { repositorio };
