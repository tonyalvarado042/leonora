import { Pressable, View, Text, StyleSheet } from 'react-native';

import { colorDeTipo, usarPaleta } from '@/lib/tema';
import type { Tarea } from '@/lib/tipos';

interface Props {
  tarea: Tarea;
  esFoco: boolean;
  onMarcar: () => void;
  onOmitir: () => void;
}

export function FilaTarea({ tarea, esFoco, onMarcar, onOmitir }: Props) {
  const p = usarPaleta();
  const hecha = tarea.estado === 'hecha';
  const omitida = tarea.estado === 'omitida';
  const color = colorDeTipo(tarea.tipo, p);

  return (
    <Pressable
      onPress={onMarcar}
      onLongPress={onOmitir}
      // Se usan `role` y `aria-*` en vez de las props `accessibility*`:
      // react-native-web no traduce `accessibilityState.checked`, y un
      // checkbox sin `aria-checked` no dice nada a un lector de pantalla.
      role="checkbox"
      aria-checked={hecha}
      aria-label={`${tarea.titulo}, ${tarea.hora_inicio}`}
      accessibilityHint="Toca para marcar. Mantén pulsado para saltártela."
      style={({ pressed }) => [
        e.fila,
        {
          backgroundColor: p.tarjeta,
          borderColor: esFoco ? p.alba : p.linea,
          borderWidth: esFoco ? 2 : StyleSheet.hairlineWidth,
          opacity: pressed ? 0.7 : hecha || omitida ? 0.55 : 1,
        },
      ]}
    >
      <View style={[e.raya, { backgroundColor: color }]} />
      <Text style={[e.hora, { color: p.tintaTenue }]}>{tarea.hora_inicio}</Text>

      <View style={e.centro}>
        <Text
          style={[
            e.titulo,
            { color: p.tinta, textDecorationLine: hecha || omitida ? 'line-through' : 'none' },
          ]}
        >
          {tarea.emoji}  {tarea.titulo}
        </Text>
        <Text style={[e.sub, { color: p.tintaTenue }]}>
          {omitida ? 'Te la saltaste' : `hasta las ${tarea.hora_fin}`}
        </Text>
      </View>

      <View
        style={[
          e.casilla,
          hecha
            ? { backgroundColor: p.verde, borderColor: p.verde }
            : { borderColor: p.lineaFuerte },
        ]}
      >
        {hecha && <Text style={e.tic}>✓</Text>}
      </View>
    </Pressable>
  );
}

const e = StyleSheet.create({
  fila: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 14, padding: 12, marginBottom: 8, overflow: 'hidden',
  },
  raya: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  hora: { fontSize: 12, width: 42, marginLeft: 4 , fontVariant: ['tabular-nums'] },
  centro: { flex: 1 },
  titulo: { fontSize: 16, fontWeight: '600' },
  sub: { fontSize: 12, marginTop: 2 },
  casilla: {
    width: 28, height: 28, borderRadius: 14, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  tic: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
