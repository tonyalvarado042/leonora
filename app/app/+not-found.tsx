import Hoy from './index';

/**
 * Cualquier ruta desconocida enseña Hoy.
 *
 * No es solo cortesía: la app se puede hospedar en una ruta que no sea la raíz
 * (una vista previa, un artefacto, una subcarpeta), y ahí el enrutador no
 * encuentra nada y saca «Unmatched Route». Renderizar Hoy —sin redirigir, sin
 * tocar la URL— hace que arranque igual la sirvan donde la sirvan.
 */
export default function NoEncontrada() {
  return <Hoy />;
}
