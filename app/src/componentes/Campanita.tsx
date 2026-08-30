import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { usarPaleta } from '@/lib/tema';

/**
 * La campanita, con su número rojo.
 *
 * El número cuenta lo que **no se ha abierto**, no lo que no se ha hecho: un
 * recado ya leído sigue en la lista pero deja de gritar. Si no hay nada nuevo,
 * la campana sigue ahí —apagarla escondería los recados de ayer.
 */
export function Campanita({ sinLeer }: { sinLeer: number }) {
  const p = usarPaleta();
  const router = useRouter();
  const etiqueta = sinLeer === 0
    ? 'Recados. No tienes ninguno sin abrir'
    : `Recados. Tienes ${sinLeer} sin abrir`;

  return (
    <Pressable
      role="button"
      aria-label={etiqueta}
      onPress={() => router.push('/campanita')}
      style={({ pressed }) => [
        e.boton,
        {
          backgroundColor: p.tarjeta,
          borderColor: sinLeer > 0 ? p.fuego : p.linea,
          opacity: pressed ? 0.6 : 1,
        },
      ]}
    >
      <Text style={e.emoji}>🔔</Text>
      {sinLeer > 0 && (
        <View style={[e.globo, { backgroundColor: p.fuego, borderColor: p.papel }]}>
          <Text style={e.globoTexto}>{sinLeer > 9 ? '9+' : sinLeer}</Text>
        </View>
      )}
    </Pressable>
  );
}

const e = StyleSheet.create({
  boton: {
    width: 42, height: 42, borderRadius: 13, borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center', justifyContent: 'center',
  },
  emoji: { fontSize: 19 },
  globo: {
    position: 'absolute', top: -5, right: -5, minWidth: 19, height: 19,
    borderRadius: 10, borderWidth: 2, paddingHorizontal: 4,
    alignItems: 'center', justifyContent: 'center',
  },
  globoTexto: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
});
