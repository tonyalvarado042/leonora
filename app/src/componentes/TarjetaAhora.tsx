import { View, Text, StyleSheet } from 'react-native';

import type { Foco } from '@/lib/dia';
import { usarPaleta } from '@/lib/tema';

/** Lo que hay que hacer ahora, arriba y grande: es lo primero que se ve al
 *  abrir la app y ahorra tener que buscar en qué parte del día vas. */
export function TarjetaAhora({ foco, avisarAntes }: { foco: Foco; avisarAntes: number | null }) {
  const p = usarPaleta();

  if (!foco.actual) {
    return (
      <View style={[e.caja, { backgroundColor: p.verdePiso, borderColor: p.verde }]}>
        <Text style={[e.etiqueta, { color: p.verde }]}>TERMINASTE</Text>
        <Text style={[e.que, { color: p.tinta }]}>Ya no te queda nada 🎉</Text>
        <Text style={[e.cuando, { color: p.tintaSuave }]}>Descansa, que mañana hay más.</Text>
      </View>
    );
  }

  const t = foco.actual;
  return (
    <View style={[e.caja, { backgroundColor: p.albaPiso, borderColor: p.alba }]}>
      <Text style={[e.etiqueta, { color: p.alba }]}>
        {foco.enCurso ? 'AHORA TE TOCA' : 'LO SIGUIENTE'}
      </Text>
      <Text style={[e.que, { color: p.tinta }]}>{t.emoji}  {t.titulo}</Text>
      <Text style={[e.cuando, { color: p.tintaSuave }]}>{t.hora_inicio} — {t.hora_fin}</Text>
      {avisarAntes !== null && (
        <Text style={[e.alarma, { color: p.alba, borderTopColor: p.alba }]}>
          {avisarAntes === 0 ? '⏰ Te aviso a la hora' : `⏰ Te aviso ${avisarAntes} min antes`}
        </Text>
      )}
    </View>
  );
}

const e = StyleSheet.create({
  caja: { borderWidth: 2, borderRadius: 16, padding: 16, marginBottom: 18 },
  etiqueta: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 6 },
  que: { fontSize: 21, fontWeight: '700', lineHeight: 27 },
  cuando: { fontSize: 13, marginTop: 5 , fontVariant: ['tabular-nums'] },
  alarma: { fontSize: 12, marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
});
