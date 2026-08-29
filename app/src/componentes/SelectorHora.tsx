import { Pressable, StyleSheet, Text, View } from 'react-native';

import { aHora, aMinutos } from '@/lib/fechas';
import { usarPaleta } from '@/lib/tema';
import type { Hora } from '@/lib/tipos';

/** Elegir una hora sin depender de un selector nativo: funciona igual en
 *  iPhone, Android y navegador, y se puede usar con lector de pantalla. */
export function SelectorHora({ etiqueta, valor, onCambiar }: {
  etiqueta: string; valor: Hora; onCambiar: (h: Hora) => void;
}) {
  const p = usarPaleta();
  const mover = (min: number) => onCambiar(aHora(aMinutos(valor) + min));

  const Boton = ({ texto, min, nombre }: { texto: string; min: number; nombre: string }) => (
    <Pressable
      role="button"
      aria-label={nombre}
      onPress={() => mover(min)}
      style={({ pressed }) => [
        e.boton,
        { borderColor: p.linea, backgroundColor: p.tarjeta, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <Text style={[e.botonTexto, { color: p.tinta }]}>{texto}</Text>
    </Pressable>
  );

  return (
    <View style={e.fila}>
      <Text style={[e.etiqueta, { color: p.tintaSuave }]}>{etiqueta}</Text>
      <View style={e.controles}>
        <Boton texto="−1h" min={-60} nombre={`${etiqueta}: una hora antes`} />
        <Boton texto="−15" min={-15} nombre={`${etiqueta}: quince minutos antes`} />
        <Text style={[e.valor, { color: p.tinta, backgroundColor: p.tarjeta2 }]}>{valor}</Text>
        <Boton texto="+15" min={15} nombre={`${etiqueta}: quince minutos después`} />
        <Boton texto="+1h" min={60} nombre={`${etiqueta}: una hora después`} />
      </View>
    </View>
  );
}

const e = StyleSheet.create({
  fila: { gap: 7 },
  etiqueta: { fontSize: 13.5, fontWeight: '600' },
  controles: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  boton: {
    minWidth: 44, height: 38, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  botonTexto: { fontSize: 13, fontWeight: '600' },
  valor: {
    flex: 1, textAlign: 'center', fontSize: 19, fontWeight: '700',
    paddingVertical: 8, borderRadius: 10, fontVariant: ['tabular-nums'],
  },
});
