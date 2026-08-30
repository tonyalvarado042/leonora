/**
 * Metro resuelve `./fechas` y `@/lib/tipos` sin más; Node no.
 *
 * Este gancho le enseña a Node esas reglas para poder correr las pruebas sin
 * bundler, y así el código de la app se queda escrito como se escribe
 * normalmente en React Native. También cambia el único módulo nativo que usa
 * el repositorio por uno en memoria, para poder probarlo sin teléfono.
 */
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '..');

/** El módulo nativo que no existe fuera del teléfono, y por qué se cambia. */
const FALSOS = {
  '@react-native-async-storage/async-storage': 'almacen-falso.mjs',
};

export async function resolve(especificador, contexto, siguiente) {
  let spec = especificador;

  const falso = FALSOS[spec];
  if (falso) {
    return siguiente(pathToFileURL(path.join(import.meta.dirname, falso)).href, contexto);
  }

  if (spec.startsWith('@/')) {
    spec = pathToFileURL(path.join(RAIZ, 'src', spec.slice(2))).href;
  }

  const relativo = spec.startsWith('.') || spec.startsWith('file:');
  if (relativo && !/\.[cm]?[jt]sx?$/.test(spec)) {
    const base = spec.startsWith('file:')
      ? fileURLToPath(spec)
      : path.resolve(path.dirname(fileURLToPath(contexto.parentURL)), spec);

    for (const candidato of [`${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')]) {
      if (existsSync(candidato)) return siguiente(pathToFileURL(candidato).href, contexto);
    }
  }

  return siguiente(spec, contexto);
}
