import { StyleSheet, Text, View } from 'react-native';

import { usarPaleta } from '@/lib/tema';

/**
 * El aviso de que falta algo, junto al botón que no pudo seguir.
 *
 * Va aquí y no en un cartel que tapa la pantalla: la persona tiene que ver a
 * la vez qué falta y dónde arreglarlo.
 */
export function Aviso({ texto }: { texto: string | null }) {
  const p = usarPaleta();
  if (!texto) return null;
  return (
    <View
      role="alert"
      style={[e.caja, { backgroundColor: p.fuegoPiso, borderColor: p.fuego }]}
    >
      <Text style={[e.texto, { color: p.fuego }]}>⚠︎  {texto}</Text>
    </View>
  );
}

const e = StyleSheet.create({
  caja: { borderWidth: 1, borderRadius: 12, padding: 13, marginTop: 16 },
  texto: { fontSize: 14, fontWeight: '600', lineHeight: 19 },
});
