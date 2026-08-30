import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { usarPaleta } from '@/lib/tema';

/** Lo primero que ve alguien que acaba de bajar la app. No un formulario:
 *  qué es esto y por qué le va a servir. */
export default function Bienvenida() {
  const p = usarPaleta();
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.papel }}>
      <ScrollView contentContainerStyle={e.cuerpo}>
        <View style={e.marca}>
          <Text style={[e.nombre, { color: p.tinta }]}>GraceDay</Text>
          <Text style={[e.lema, { color: p.tintaSuave }]}>Tu día, tu fe y tu gente</Text>
        </View>

        <Pressable
          role="button"
          aria-label="Ver el video de cómo funciona"
          style={[e.video, { backgroundColor: p.alba }]}
        >
          <View style={e.play}><Text style={e.playTexto}>▶</Text></View>
          <Text style={e.videoPie}>Cómo funciona · 1:40</Text>
        </Pressable>

        <View style={e.puntos}>
          <Punto emoji="⏰" titulo="Te avisa lo que toca"
            texto="Sin que tengas que acordarte de nada." />
          <Punto emoji="💜" titulo="Te acompaña en el devocional"
            texto="A la hora que tú elijas, todos los días." />
          <Punto emoji="🔥" titulo="Cuenta tus días seguidos"
            texto="Cuatro rachas y veinticuatro insignias por ganar." />
        </View>

        <Pressable
          role="button"
          onPress={() => router.replace('/arranque')}
          style={[e.empezar, { backgroundColor: p.alba }]}
        >
          <Text style={e.empezarTexto}>Empezar</Text>
        </Pressable>

        <Text style={[e.letraChica, { color: p.tintaTenue }]}>
          Son cinco preguntas. Menos de dos minutos.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Punto({ emoji, titulo, texto }: { emoji: string; titulo: string; texto: string }) {
  const p = usarPaleta();
  return (
    <View style={e.punto}>
      <Text style={e.puntoEmoji}>{emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[e.puntoTitulo, { color: p.tinta }]}>{titulo}</Text>
        <Text style={[e.puntoTexto, { color: p.tintaSuave }]}>{texto}</Text>
      </View>
    </View>
  );
}

const e = StyleSheet.create({
  cuerpo: {
    padding: 24, paddingTop: 40, paddingBottom: 40,
    maxWidth: 560, width: '100%', alignSelf: 'center', flexGrow: 1,
  },
  marca: { alignItems: 'center', marginBottom: 26 },
  nombre: { fontSize: 34, fontWeight: '800', letterSpacing: -0.5 },
  lema: { fontSize: 15, marginTop: 4 },
  video: {
    borderRadius: 18, aspectRatio: 16 / 10, alignItems: 'center',
    justifyContent: 'center', marginBottom: 30, overflow: 'hidden',
  },
  play: {
    width: 62, height: 62, borderRadius: 31, backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center', justifyContent: 'center',
  },
  playTexto: { fontSize: 22, color: '#6C5CD4', marginLeft: 4 },
  videoPie: {
    position: 'absolute', bottom: 12, color: 'rgba(255,255,255,0.9)', fontSize: 12.5,
  },
  puntos: { gap: 20, marginBottom: 34 },
  punto: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  puntoEmoji: { fontSize: 26, lineHeight: 32 },
  puntoTitulo: { fontSize: 17, fontWeight: '700' },
  puntoTexto: { fontSize: 14.5, marginTop: 2, lineHeight: 20 },
  empezar: { borderRadius: 14, paddingVertical: 17, alignItems: 'center' },
  empezarTexto: { color: '#FFF', fontWeight: '700', fontSize: 17 },
  letraChica: { fontSize: 13, textAlign: 'center', marginTop: 14 },
});
