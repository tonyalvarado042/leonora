import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { repositorio } from '@/lib/repositorio';
import {
  EMOJI_VIA, LOGROS, NOMBRE_VIA, proximoLogro, type Racha, type Via,
} from '@/lib/rachas';
import { usarPaleta } from '@/lib/tema';

const COLOR_VIA: Record<Via, keyof ReturnType<typeof usarPaleta>> = {
  devocional: 'alba', dia: 'verde', apertura: 'dia', oracion: 'fuego',
};

export default function Rachas() {
  const p = usarPaleta();
  const [rachas, setRachas] = useState<Racha[]>([]);
  const [ganados, setGanados] = useState<string[]>([]);
  const [chispas, setChispas] = useState(0);

  const cargar = useCallback(async () => {
    setRachas(await repositorio.rachas());
    setGanados(await repositorio.logrosGanados());
    setChispas(await repositorio.chispasTotales());
  }, []);
  useFocusEffect(useCallback(() => { void cargar(); }, [cargar]));

  const fuerte = [...rachas].sort((a, b) => b.racha_actual - a.racha_actual)[0];
  const siguiente = fuerte ? proximoLogro(fuerte.via, fuerte.racha_actual) : null;

  return (
    <ScrollView style={{ backgroundColor: p.papel }} contentContainerStyle={e.cuerpo}>
      <View style={[e.grande, { backgroundColor: p.fuegoPiso, borderColor: p.fuego }]}>
        <Text style={e.llama}>🔥</Text>
        <Text style={[e.numero, { color: p.fuego }]}>{fuerte?.racha_actual ?? 0}</Text>
        <Text style={[e.subtitulo, { color: p.tintaSuave }]}>
          {fuerte && fuerte.racha_actual > 0
            ? `${fuerte.racha_actual === 1 ? 'día seguido' : 'días seguidos'} · ${NOMBRE_VIA[fuerte.via].toLowerCase()}`
            : 'Marca algo hoy y empieza tu racha'}
        </Text>
        {siguiente && fuerte && (
          <Text style={[e.proximo, { color: p.tintaTenue }]}>
            {siguiente.dias - fuerte.racha_actual === 1
              ? `Falta 1 día para ${siguiente.nombre} ${siguiente.emoji}`
              : `Faltan ${siguiente.dias - fuerte.racha_actual} días para ${siguiente.nombre} ${siguiente.emoji}`}
          </Text>
        )}
      </View>

      {rachas.map((r) => {
        const color = p[COLOR_VIA[r.via]] as string;
        const prox = proximoLogro(r.via, r.racha_actual);
        const parte = prox ? Math.min(1, r.racha_actual / prox.dias) : 1;
        const insignias = LOGROS.filter((l) => l.via === r.via);

        return (
          <View key={r.via} style={[e.via, { backgroundColor: p.tarjeta, borderColor: p.linea }]}>
            <View style={e.viaTop}>
              <Text style={e.viaEmoji}>{EMOJI_VIA[r.via]}</Text>
              <Text style={[e.viaNombre, { color: p.tinta }]}>{NOMBRE_VIA[r.via]}</Text>
              <Text style={[e.viaDias, { color }]}>
                {r.racha_actual} {r.racha_actual === 1 ? 'día' : 'días'}
              </Text>
            </View>

            <View style={[e.riel, { backgroundColor: p.linea }]}>
              <View style={[e.relleno, { width: `${parte * 100}%`, backgroundColor: color }]} />
            </View>

            <Text style={[e.meta, { color: p.tintaTenue }]}>
              {prox
                ? `Siguiente: ${prox.nombre} a los ${prox.dias}`
                : 'Todas las insignias conseguidas'}
              {r.racha_mejor > r.racha_actual ? ` · tu récord: ${r.racha_mejor}` : ''}
            </Text>

            <View style={e.insignias}>
              {insignias.map((l) => {
                const tengo = ganados.includes(l.id);
                return (
                  <View
                    key={l.id}
                    accessible
                    aria-label={`${l.nombre}, ${l.dias} días, ${tengo ? 'conseguida' : 'bloqueada'}`}
                    style={[
                      e.insignia,
                      tengo
                        ? { backgroundColor: p.albaPiso, borderColor: p.alba }
                        : { backgroundColor: p.tarjeta2, borderColor: p.linea, opacity: 0.35 },
                    ]}
                  >
                    <Text style={e.insigniaEmoji}>{l.emoji}</Text>
                    <Text style={[e.insigniaDias, { color: p.tintaTenue }]}>{l.dias}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        );
      })}

      <View style={[e.pie, { backgroundColor: p.tarjeta2, borderColor: p.linea }]}>
        <Text style={[e.pieTexto, { color: p.tinta }]}>
          ⚡ {chispas} chispas · {ganados.length} de {LOGROS.length} insignias
        </Text>
        <Text style={[e.pieAyuda, { color: p.tintaSuave }]}>
          Son cuatro rachas separadas a propósito: puedes ir fuerte en una y floja
          en otra sin perderlo todo. Y una vez al mes, fallar un día no rompe nada.
        </Text>
      </View>
    </ScrollView>
  );
}

const e = StyleSheet.create({
  cuerpo: { padding: 18, paddingBottom: 48, maxWidth: 620, width: '100%', alignSelf: 'center' },
  grande: { borderWidth: 2, borderRadius: 18, padding: 20, alignItems: 'center', marginBottom: 16 },
  llama: { fontSize: 30 },
  numero: { fontSize: 56, fontWeight: '800', lineHeight: 62 },
  subtitulo: { fontSize: 14, marginTop: 2 },
  proximo: { fontSize: 12.5, marginTop: 10 },
  via: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 15, padding: 15, marginBottom: 10 },
  viaTop: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 9 },
  viaEmoji: { fontSize: 18 },
  viaNombre: { fontSize: 15.5, fontWeight: '700', flex: 1 },
  viaDias: { fontSize: 14, fontWeight: '700' },
  riel: { height: 6, borderRadius: 3, overflow: 'hidden' },
  relleno: { height: '100%', borderRadius: 3 },
  meta: { fontSize: 12, marginTop: 7 },
  insignias: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 11 },
  insignia: {
    width: 46, height: 50, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center', justifyContent: 'center',
  },
  insigniaEmoji: { fontSize: 19 },
  insigniaDias: { fontSize: 9.5, marginTop: 1 },
  pie: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 15, padding: 16, marginTop: 8 },
  pieTexto: { fontSize: 15, fontWeight: '700', marginBottom: 6 },
  pieAyuda: { fontSize: 13.5, lineHeight: 19 },
});
