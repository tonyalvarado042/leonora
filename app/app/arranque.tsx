import { useState } from 'react';
import {
  Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { SelectorHora } from '@/componentes/SelectorHora';
import {
  armarSemana, GUSTOS, QUEHACERES, RESPUESTAS_EN_BLANCO,
  type Propuesta, type Respuestas,
} from '@/lib/arranque';
import { fechaLocal } from '@/lib/fechas';
import { repositorio } from '@/lib/repositorio';
import { usarPaleta } from '@/lib/tema';
import type { Ocupacion } from '@/lib/tipos';

const DIAS = [
  { n: 1, corto: 'L' }, { n: 2, corto: 'M' }, { n: 3, corto: 'X' },
  { n: 4, corto: 'J' }, { n: 5, corto: 'V' }, { n: 6, corto: 'S' }, { n: 0, corto: 'D' },
];
const PASOS = 5;

export default function Arranque() {
  const p = usarPaleta();
  const router = useRouter();
  const [paso, setPaso] = useState(1);
  const [r, setR] = useState<Respuestas>(RESPUESTAS_EN_BLANCO);
  const [propuesta, setPropuesta] = useState<Propuesta | null>(null);

  const cambiar = (c: Partial<Respuestas>) => setR((v) => ({ ...v, ...c }));
  const alternar = (lista: 'quehaceres' | 'gustos', id: string) =>
    cambiar({ [lista]: r[lista].includes(id) ? r[lista].filter((x) => x !== id) : [...r[lista], id] } as Partial<Respuestas>);

  // Solo el nombre es obligatorio: todo lo demás trae un valor razonable, y
  // obligar a decidirlo todo antes de ver nada es como se pierde a la gente.
  const puedeSeguir = paso !== 1 || r.nombre.trim().length > 0;

  function siguiente() {
    if (paso < PASOS) { setPaso(paso + 1); return; }
    setPropuesta(armarSemana(r, 'local'));
  }

  async function aceptar() {
    if (!propuesta) return;
    const persona = await repositorio.persona();
    await repositorio.aplicarArranque(
      propuesta, r.nombre.trim(), fechaLocal(new Date(), persona.zona_horaria),
    );
    router.replace('/');
  }

  // ---------------------------------------------------------- la propuesta
  if (propuesta) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: p.papel }}>
        <ScrollView contentContainerStyle={e.cuerpo}>
          <Text style={[e.titulo, { color: p.tinta }]}>
            Listo, {r.nombre.trim()}. Te armé tu semana.
          </Text>
          <Text style={[e.ayuda, { color: p.tintaSuave }]}>
            Así queda. Puedes cambiar lo que quieras después, cuando quieras.
          </Text>

          <View style={[e.tarjeta, { backgroundColor: p.tarjeta, borderColor: p.linea }]}>
            {propuesta.resumen.map((linea, i) => (
              <View key={i} style={e.lineaResumen}>
                <Text style={[e.vineta, { color: p.alba }]}>•</Text>
                <Text style={[e.textoResumen, { color: p.tinta }]}>{linea}</Text>
              </View>
            ))}
          </View>

          <View style={[e.cifras, { backgroundColor: p.albaPiso, borderColor: p.alba }]}>
            <Text style={[e.cifrasTexto, { color: p.alba }]}>
              {propuesta.actividades.length} cosas · {propuesta.rutina.length} bloques en la semana
            </Text>
          </View>

          <Pressable role="button" onPress={aceptar} style={[e.principal, { backgroundColor: p.alba }]}>
            <Text style={e.principalTexto}>Me gusta, empezar</Text>
          </Pressable>
          <Pressable role="button" onPress={() => { setPropuesta(null); setPaso(1); }} style={e.secundario}>
            <Text style={[e.secundarioTexto, { color: p.tintaSuave }]}>Cambiar mis respuestas</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ------------------------------------------------------------ las preguntas
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.papel }}>
      <ScrollView contentContainerStyle={e.cuerpo}>
        <View style={e.progreso}>
          {Array.from({ length: PASOS }, (_, i) => (
            <View
              key={i}
              style={[e.tramo, { backgroundColor: i < paso ? p.alba : p.linea }]}
            />
          ))}
        </View>
        <Text style={[e.contador, { color: p.tintaTenue }]}>Pregunta {paso} de {PASOS}</Text>

        {paso === 1 && (
          <>
            <Text style={[e.titulo, { color: p.tinta }]}>¿Cómo te llamas?</Text>
            <Text style={[e.ayuda, { color: p.tintaSuave }]}>
              Es como te va a saludar la app cada mañana.
            </Text>
            <TextInput
              value={r.nombre}
              onChangeText={(t) => cambiar({ nombre: t })}
              placeholder="Tu nombre"
              placeholderTextColor={p.tintaTenue}
              aria-label="Tu nombre"
              autoFocus
              style={[e.entrada, { color: p.tinta, backgroundColor: p.tarjeta, borderColor: p.linea }]}
            />
            <Text style={[e.etiqueta, { color: p.tintaSuave }]}>¿Cuántos años tienes?</Text>
            <View style={e.opciones}>
              {[8, 10, 12, 13, 15, 18, 30, 45].map((n) => (
                <Chip key={n} texto={`${n}`} puesto={r.edad === n} onPress={() => cambiar({ edad: n })} />
              ))}
            </View>
          </>
        )}

        {paso === 2 && (
          <>
            <Text style={[e.titulo, { color: p.tinta }]}>¿A qué hora vives?</Text>
            <Text style={[e.ayuda, { color: p.tintaSuave }]}>
              Entre estas dos horas cabe todo tu día. Nada se pone fuera.
            </Text>
            <View style={e.horas}>
              <SelectorHora etiqueta="☀️  Me levanto a las"
                valor={r.hora_despertar} onCambiar={(h) => cambiar({ hora_despertar: h })} />
              <SelectorHora etiqueta="🌙  Me acuesto a las"
                valor={r.hora_dormir} onCambiar={(h) => cambiar({ hora_dormir: h })} />
            </View>
          </>
        )}

        {paso === 3 && (
          <>
            <Text style={[e.titulo, { color: p.tinta }]}>Tu devocional</Text>
            <Text style={[e.ayuda, { color: p.tintaSuave }]}>
              Es lo único que se coloca primero, antes que el colegio y que todo lo demás.
            </Text>
            <Text style={[e.etiqueta, { color: p.tintaSuave }]}>¿Cuántos minutos al día?</Text>
            <View style={e.opciones}>
              {[15, 30, 45, 60].map((m) => (
                <Chip key={m} texto={m === 60 ? '1 hora' : `${m} min`}
                  puesto={r.devocional_min === m} onPress={() => cambiar({ devocional_min: m })} />
              ))}
            </View>
            <Text style={[e.etiqueta, { color: p.tintaSuave }]}>¿Cuándo?</Text>
            <View style={e.opciones}>
              <Chip texto="En la mañana" puesto={r.devocional_momento === 'mañana'}
                onPress={() => cambiar({ devocional_momento: 'mañana' })} />
              <Chip texto="En la noche" puesto={r.devocional_momento === 'noche'}
                onPress={() => cambiar({ devocional_momento: 'noche' })} />
              <Chip texto="Los dos" puesto={r.devocional_momento === 'ambas'}
                onPress={() => cambiar({ devocional_momento: 'ambas' })} />
            </View>
          </>
        )}

        {paso === 4 && (
          <>
            <Text style={[e.titulo, { color: p.tinta }]}>Tu colegio o tu trabajo</Text>
            <View style={e.opciones}>
              {(['colegio', 'trabajo', 'ninguno'] as Ocupacion[]).map((o) => (
                <Chip
                  key={o}
                  texto={o === 'colegio' ? '📘 Colegio' : o === 'trabajo' ? '💼 Trabajo' : 'Ninguno'}
                  puesto={r.ocupacion === o}
                  onPress={() => cambiar({ ocupacion: o })}
                />
              ))}
            </View>

            {r.ocupacion !== 'ninguno' && (
              <>
                <View style={[e.foto, { borderColor: p.linea, backgroundColor: p.tarjeta2 }]}>
                  <Text style={[e.fotoTitulo, { color: p.tintaSuave }]}>📷  ¿Tienes foto de tu horario?</Text>
                  <Text style={[e.fotoTexto, { color: p.tintaTenue }]}>
                    Leer la foto llega más adelante. Por ahora se escribe a mano,
                    que son dos toques.
                  </Text>
                </View>

                <View style={e.horas}>
                  <SelectorHora etiqueta="Entro a las" valor={r.ocupacion_inicio}
                    onCambiar={(h) => cambiar({ ocupacion_inicio: h })} />
                  <SelectorHora etiqueta="Salgo a las" valor={r.ocupacion_fin}
                    onCambiar={(h) => cambiar({ ocupacion_fin: h })} />
                </View>

                <Text style={[e.etiqueta, { color: p.tintaSuave }]}>¿Qué días?</Text>
                <View style={e.dias}>
                  {DIAS.map((d) => {
                    const puesto = r.dias_ocupados.includes(d.n);
                    return (
                      <Pressable
                        key={d.n}
                        role="checkbox"
                        aria-checked={puesto}
                        aria-label={`Día ${d.corto}`}
                        onPress={() => cambiar({
                          dias_ocupados: puesto
                            ? r.dias_ocupados.filter((x) => x !== d.n)
                            : [...r.dias_ocupados, d.n],
                        })}
                        style={[
                          e.dia,
                          puesto
                            ? { backgroundColor: p.alba, borderColor: p.alba }
                            : { backgroundColor: p.tarjeta, borderColor: p.linea },
                        ]}
                      >
                        <Text style={[e.diaTexto, { color: puesto ? '#FFF' : p.tintaSuave }]}>
                          {d.corto}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}
          </>
        )}

        {paso === 5 && (
          <>
            <Text style={[e.titulo, { color: p.tinta }]}>¿Qué más hay en tu día?</Text>
            <Text style={[e.etiqueta, { color: p.tintaSuave }]}>Lo que te toca en casa</Text>
            <View style={e.opciones}>
              {QUEHACERES.map((q) => (
                <Chip key={q.id} texto={`${q.emoji} ${q.nombre}`}
                  puesto={r.quehaceres.includes(q.id)} onPress={() => alternar('quehaceres', q.id)} />
              ))}
            </View>
            <Text style={[e.etiqueta, { color: p.tintaSuave }]}>Y lo que te gusta</Text>
            <Text style={[e.ayuda, { color: p.tintaTenue }]}>
              Un horario sin nada que te guste no se cumple. Esto también entra.
            </Text>
            <View style={e.opciones}>
              {GUSTOS.map((g) => (
                <Chip key={g.id} texto={`${g.emoji} ${g.nombre}`}
                  puesto={r.gustos.includes(g.id)} onPress={() => alternar('gustos', g.id)} />
              ))}
            </View>
          </>
        )}

        <Pressable
          role="button"
          onPress={siguiente}
          disabled={!puedeSeguir}
          style={[e.principal, { backgroundColor: puedeSeguir ? p.alba : p.linea }]}
        >
          <Text style={e.principalTexto}>
            {paso === PASOS ? 'Armar mi semana' : 'Siguiente'}
          </Text>
        </Pressable>

        {paso > 1 && (
          <Pressable role="button" onPress={() => setPaso(paso - 1)} style={e.secundario}>
            <Text style={[e.secundarioTexto, { color: p.tintaSuave }]}>Atrás</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Chip({ texto, puesto, onPress }: { texto: string; puesto: boolean; onPress: () => void }) {
  const p = usarPaleta();
  return (
    <Pressable
      role="checkbox"
      aria-checked={puesto}
      onPress={onPress}
      style={[
        e.chip,
        puesto
          ? { backgroundColor: p.alba, borderColor: p.alba }
          : { backgroundColor: p.tarjeta, borderColor: p.linea },
      ]}
    >
      <Text style={[e.chipTexto, { color: puesto ? '#FFF' : p.tintaSuave }]}>{texto}</Text>
    </Pressable>
  );
}

const e = StyleSheet.create({
  cuerpo: {
    padding: 22, paddingTop: 28, paddingBottom: 40,
    maxWidth: 560, width: '100%', alignSelf: 'center',
  },
  progreso: { flexDirection: 'row', gap: 5, marginBottom: 8 },
  tramo: { flex: 1, height: 4, borderRadius: 2 },
  contador: { fontSize: 12, marginBottom: 20 },
  titulo: { fontSize: 26, fontWeight: '800', letterSpacing: -0.4, marginBottom: 6 },
  ayuda: { fontSize: 14.5, lineHeight: 20, marginBottom: 16 },
  etiqueta: { fontSize: 13.5, fontWeight: '700', marginTop: 18, marginBottom: 8 },
  entrada: {
    borderWidth: StyleSheet.hairlineWidth, borderRadius: 13,
    paddingHorizontal: 16, paddingVertical: 15, fontSize: 18,
  },
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 11, paddingHorizontal: 15, borderRadius: 11,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipTexto: { fontSize: 14.5, fontWeight: '600' },
  horas: { gap: 20, marginTop: 8 },
  dias: { flexDirection: 'row', gap: 6 },
  dia: {
    flex: 1, height: 44, borderRadius: 11, borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center', justifyContent: 'center',
  },
  diaTexto: { fontSize: 15, fontWeight: '700' },
  foto: {
    borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 13,
    padding: 15, marginTop: 16, marginBottom: 4,
  },
  fotoTitulo: { fontSize: 14.5, fontWeight: '700' },
  fotoTexto: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  tarjeta: {
    borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, padding: 18, gap: 11,
  },
  lineaResumen: { flexDirection: 'row', gap: 10 },
  vineta: { fontSize: 17, lineHeight: 22 },
  textoResumen: { flex: 1, fontSize: 15, lineHeight: 22 },
  cifras: { borderWidth: 1, borderRadius: 13, padding: 13, alignItems: 'center', marginTop: 14 },
  cifrasTexto: { fontSize: 14, fontWeight: '700' },
  principal: { marginTop: 28, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  principalTexto: { color: '#FFF', fontWeight: '700', fontSize: 16.5 },
  secundario: { marginTop: 10, paddingVertical: 13, alignItems: 'center' },
  secundarioTexto: { fontSize: 15, fontWeight: '600' },
});
