import { Pressable, StyleSheet, Text, View } from 'react-native';

import { textoEn } from '@/lib/fe';
import { usarPaleta } from '@/lib/tema';
import type { Versiculo } from '@/datos/versiculos';

/** El versículo del día, arriba en Hoy. Corto: si es largo, se abre entero. */
export function TarjetaVersiculo({ versiculo, onAbrir }: {
  versiculo: Versiculo | null;
  onAbrir: () => void;
}) {
  const p = usarPaleta();
  if (!versiculo) return null;
  const t = textoEn(versiculo);

  return (
    <Pressable
      role="button"
      aria-label={`Versículo del día: ${versiculo.referencia}`}
      onPress={onAbrir}
      style={({ pressed }) => [
        e.caja,
        {
          backgroundColor: p.albaPiso,
          borderColor: p.alba,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <Text style={[e.rotulo, { color: p.alba }]}>VERSÍCULO DE HOY</Text>
      <Text numberOfLines={3} style={[e.texto, { color: p.tinta }]}>«{t.texto}»</Text>
      <Text style={[e.pie, { color: p.tintaSuave }]}>
        {versiculo.referencia} · tocar para verlo y compartirlo
      </Text>
    </Pressable>
  );
}

const e = StyleSheet.create({
  caja: { borderWidth: 1, borderRadius: 15, padding: 15, marginBottom: 16 },
  rotulo: { fontSize: 10.5, fontWeight: '700', letterSpacing: 1.1, marginBottom: 7 },
  texto: { fontSize: 15.5, fontStyle: 'italic', lineHeight: 22 },
  pie: { fontSize: 11.5, marginTop: 9 },
});
