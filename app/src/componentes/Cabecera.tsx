import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';

import { usarPaleta } from '@/lib/tema';

interface Props {
  titulo: string;
  /** A dónde ir al tocar atrás. Por defecto, la pantalla anterior. */
  atras?: () => void;
  derecha?: ReactNode;
}

/**
 * La cabecera de toda pantalla que no sea Hoy.
 *
 * Es propia y no la del navegador porque esa **no pinta el botón de volver en
 * web**: la app se quedaba sin salida en el calendario, la rutina y los
 * ajustes. Además así se ve igual en iPhone, Android y navegador.
 */
export function Cabecera({ titulo, atras, derecha }: Props) {
  const p = usarPaleta();
  const router = useRouter();
  const arriba = useSafeAreaInsets().top;

  return (
    <View style={[e.barra, { paddingTop: arriba + 10, backgroundColor: p.papel, borderBottomColor: p.linea }]}>
      <Pressable
        role="button"
        aria-label="Volver"
        hitSlop={12}
        onPress={() => (atras ? atras() : router.canGoBack() ? router.back() : router.replace('/'))}
        style={({ pressed }) => [
          e.atras,
          { borderColor: p.linea, backgroundColor: p.tarjeta, opacity: pressed ? 0.6 : 1 },
        ]}
      >
        <Text style={[e.flecha, { color: p.tinta }]}>‹</Text>
      </Pressable>

      <Text numberOfLines={1} style={[e.titulo, { color: p.tinta }]}>{titulo}</Text>

      <View style={e.derecha}>{derecha}</View>
    </View>
  );
}

const e = StyleSheet.create({
  barra: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  atras: {
    width: 38, height: 38, borderRadius: 11, borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center', justifyContent: 'center',
  },
  flecha: { fontSize: 22, lineHeight: 26, marginTop: -3 },
  titulo: { flex: 1, fontSize: 18, fontWeight: '700' },
  derecha: { minWidth: 38, alignItems: 'flex-end' },
});
