/**
 * AsyncStorage de mentira, en memoria.
 *
 * El repositorio es el sitio donde han vivido los dos peores fallos del
 * proyecto —devolver el mismo objeto y no repintar—, así que hay que poder
 * probarlo sin teléfono. El resolutor de `resolutor.mjs` cambia el módulo
 * nativo por este cuando corren las pruebas.
 */

const datos = new Map();

export function limpiar() {
  datos.clear();
}

/** Lo guardado tal cual, para poder mirar lo que de verdad se escribió. */
export function crudo(clave) {
  return datos.get(clave) ?? null;
}

export function sembrar(clave, valor) {
  datos.set(clave, valor);
}

const AsyncStorage = {
  async getItem(clave) {
    return datos.has(clave) ? datos.get(clave) : null;
  },
  async setItem(clave, valor) {
    datos.set(clave, valor);
  },
  async removeItem(clave) {
    datos.delete(clave);
  },
  async multiRemove(claves) {
    for (const c of claves) datos.delete(c);
  },
};

export default AsyncStorage;
