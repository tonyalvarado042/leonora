import { Pressable, View, Text, StyleSheet } from 'react-native';

import { colorDeTipo, usarPaleta } from '@/lib/tema';
import type { Tarea } from '@/lib/tipos';

interface Props {
  tarea: Tarea;
  esFoco: boolean;
  onMarcar: () => void;
  onOmitir: () => void;
  onAbrir: () => void;
}

/**
 * Una tarea del día.
 *
 * Tres gestos distintos y separados a propósito:
 *   la casilla marca y desmarca, el cuerpo abre el detalle, y dejar apretado
 *   la salta. Antes todo el bloque marcaba, y saltarse una tarea la dejaba
 *   tachada igual que una hecha pero con la casilla vacía — parecía un fallo.
 */
export function FilaTarea({ tarea, esFoco, onMarcar, onOmitir, onAbrir }: Props) {
  const p = usarPaleta();
  const hecha = tarea.estado === 'hecha';
  const omitida = tarea.estado === 'omitida';
  const color = colorDeTipo(tarea.tipo, p);

  return (
    <Pressable
      onPress={onAbrir}
      onLongPress={onOmitir}
      role="button"
      aria-label={`${tarea.titulo}, ${tarea.hora_inicio}${tarea.nota ? ', con nota' : ''}`}
      accessibilityHint="Toca para ver el detalle. Mantén pulsado para saltártela."
      style={({ pressed }) => [
        e.fila,
        {
          backgroundColor: omitida ? p.tarjeta2 : p.tarjeta,
          borderColor: esFoco ? p.alba : p.linea,
          borderWidth: esFoco ? 2 : StyleSheet.hairlineWidth,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <View style={[e.raya, { backgroundColor: omitida ? p.tintaTenue : color }]} />
      <Text style={[e.hora, { color: p.tintaTenue }]}>{tarea.hora_inicio}</Text>

      <View style={e.centro}>
        <Text
          numberOfLines={2}
          style={[
            e.titulo,
            hecha
              ? { color: p.tintaSuave, textDecorationLine: 'line-through' }
              : omitida
                ? { color: p.tintaTenue }
                : { color: p.tinta },
          ]}
        >
          {tarea.emoji}  {tarea.titulo}
        </Text>
        <View style={e.pie}>
          {omitida ? (
            <Text style={[e.saltada, { color: p.tintaTenue, backgroundColor: p.linea }]}>
              SALTADA
            </Text>
          ) : (
            <Text style={[e.sub, { color: p.tintaTenue }]}>hasta las {tarea.hora_fin}</Text>
          )}
          {tarea.nota ? <Text style={[e.nota, { color: p.alba }]}>📝</Text> : null}
          {tarea.puntos > 0 ? (
            <Text style={[e.chispas, { color: p.fuego }]}>+{tarea.puntos}</Text>
          ) : null}
        </View>
      </View>

      {/* La casilla es su propio botón: tocarla marca, tocar el resto abre. */}
      <Pressable
        onPress={onMarcar}
        role="checkbox"
        aria-checked={hecha}
        aria-label={`Marcar ${tarea.titulo}`}
        hitSlop={10}
        style={[
          e.casilla,
          hecha
            ? { backgroundColor: p.verde, borderColor: p.verde }
            : omitida
              ? { borderColor: p.linea, backgroundColor: 'transparent' }
              : { borderColor: p.lineaFuerte },
        ]}
      >
        <Text style={[e.marca, { color: hecha ? '#FFF' : p.tintaTenue }]}>
          {hecha ? '\u2713' : omitida ? '\u2013' : ''}
        </Text>
      </Pressable>
    </Pressable>
  );
}

const e = StyleSheet.create({
  fila: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 14, padding: 12, marginBottom: 8, overflow: 'hidden',
  },
  raya: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  hora: { fontSize: 12, width: 42, marginLeft: 4, fontVariant: ['tabular-nums'] },
  centro: { flex: 1 },
  titulo: { fontSize: 16, fontWeight: '600' },
  pie: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 3 },
  sub: { fontSize: 12 },
  saltada: {
    fontSize: 9.5, fontWeight: '700', letterSpacing: 0.8,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, overflow: 'hidden',
  },
  nota: { fontSize: 11 },
  chispas: { fontSize: 11.5, fontWeight: '700' },
  casilla: {
    width: 30, height: 30, borderRadius: 15, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  marca: { fontSize: 15, fontWeight: '700' },
});
