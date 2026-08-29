import { View, Text, StyleSheet } from 'react-native';
import { usarPaleta } from '@/lib/tema';

/** El avance del día. Un anillo de verdad necesitaría SVG; con dos capas se
 *  ve igual de claro y no añade dependencias. */
export function AnilloProgreso({ hechas, total }: { hechas: number; total: number }) {
  const p = usarPaleta();
  const parte = total === 0 ? 0 : hechas / total;

  return (
    <View style={e.fila}>
      <View style={[e.circulo, { backgroundColor: p.albaPiso, borderColor: p.alba }]}>
        <Text style={[e.cifra, { color: p.alba }]}>{hechas}/{total}</Text>
      </View>
      <View style={e.texto}>
        <Text style={[e.titulo, { color: p.tinta }]}>{titulo(hechas, total)}</Text>
        <View style={[e.riel, { backgroundColor: p.linea }]}>
          <View style={[e.relleno, { width: `${Math.round(parte * 100)}%`, backgroundColor: p.alba }]} />
        </View>
        <Text style={[e.pie, { color: p.tintaTenue }]}>{pie(hechas, total)}</Text>
      </View>
    </View>
  );
}

function pie(hechas: number, total: number): string {
  if (total === 0) return 'Hoy no tienes nada puesto';
  const faltan = total - hechas;
  if (faltan === 0) return 'No te queda nada 🎉';
  return `Te ${faltan === 1 ? 'falta' : 'faltan'} ${faltan} ${faltan === 1 ? 'cosa' : 'cosas'}`;
}

function titulo(hechas: number, total: number): string {
  if (total === 0) return 'Día libre';
  if (hechas === 0) return 'A empezar';
  if (hechas === total) return '¡Día completo!';
  return 'Vas bien';
}

const e = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 },
  circulo: {
    width: 58, height: 58, borderRadius: 29, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  cifra: { fontSize: 14, fontWeight: '700' , fontVariant: ['tabular-nums'] },
  texto: { flex: 1, gap: 6 },
  titulo: { fontSize: 17, fontWeight: '700' },
  riel: { height: 6, borderRadius: 3, overflow: 'hidden' },
  relleno: { height: '100%', borderRadius: 3 },
  pie: { fontSize: 13 },
});
