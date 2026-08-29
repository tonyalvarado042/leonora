import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { repositorio } from '@/lib/repositorio';
import { colorDeTipo, NOMBRE_TIPO, usarPaleta } from '@/lib/tema';
import type { Actividad, TipoActividad } from '@/lib/tipos';

const TIPOS: TipoActividad[] = ['fe', 'estudio', 'casa', 'deporte', 'familia', 'descanso'];
const EMOJIS = ['💜', '🙏', '📖', '📘', '✏️', '🧹', '🛏️', '🍽️', '⚽', '🏃', '🎸', '🎨', '🌙', '☀️', '🐶', '⭐'];
const DURACIONES = [5, 15, 30, 45, 60, 90, 120];

/** Crear o cambiar una cosa del catálogo. Sin esto la app solo servía para la
 *  rutina que venía de fábrica. */
export default function EditarActividad() {
  const p = usarPaleta();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<TipoActividad>('casa');
  const [emoji, setEmoji] = useState('⭐');
  const [duracion, setDuracion] = useState(30);
  const [esFijo, setEsFijo] = useState(false);
  const [avisar, setAvisar] = useState(true);
  const [original, setOriginal] = useState<Actividad | null>(null);

  useFocusEffect(useCallback(() => {
    if (!id) return;
    void repositorio.actividades().then((todas) => {
      const a = todas.find((x) => x.id === id);
      if (!a) return;
      setOriginal(a);
      setNombre(a.nombre); setTipo(a.tipo); setEmoji(a.emoji);
      setDuracion(a.duracion_min); setEsFijo(a.es_fijo); setAvisar(a.avisar);
    });
  }, [id]));

  const puedeGuardar = nombre.trim().length > 0;

  async function guardar() {
    if (!puedeGuardar) return;
    const persona = await repositorio.persona();
    await repositorio.guardarActividad({
      id: original?.id ?? `act-${Date.now()}`,
      persona_id: persona.id,
      nombre: nombre.trim(),
      tipo, emoji,
      duracion_min: duracion,
      es_habito: original?.es_habito ?? (tipo === 'fe' || tipo === 'casa'),
      es_fijo: esFijo,
      avisar,
      avisar_antes_min: original?.avisar_antes_min ?? null,
      activa: true,
    });
    router.back();
  }

  async function borrar() {
    if (!original) return;
    await repositorio.borrarActividad(original.id);
    router.back();
  }

  return (
    <ScrollView style={{ backgroundColor: p.papel }} contentContainerStyle={e.cuerpo}>
      <Text style={[e.etiqueta, { color: p.tintaSuave }]}>¿Cómo se llama?</Text>
      <TextInput
        value={nombre}
        onChangeText={setNombre}
        placeholder="Leer un capítulo, entrenar, sacar al perro…"
        placeholderTextColor={p.tintaTenue}
        aria-label="Nombre de la actividad"
        style={[e.entrada, { color: p.tinta, backgroundColor: p.tarjeta, borderColor: p.linea }]}
      />

      <Text style={[e.etiqueta, { color: p.tintaSuave }]}>¿De qué tipo es?</Text>
      <View style={e.opciones}>
        {TIPOS.map((t) => {
          const puesto = t === tipo;
          return (
            <Pressable
              key={t}
              role="radio"
              aria-checked={puesto}
              onPress={() => setTipo(t)}
              style={[
                e.chip,
                puesto
                  ? { backgroundColor: colorDeTipo(t, p), borderColor: colorDeTipo(t, p) }
                  : { backgroundColor: p.tarjeta, borderColor: p.linea },
              ]}
            >
              <Text style={[e.chipTexto, { color: puesto ? '#FFF' : p.tintaSuave }]}>
                {NOMBRE_TIPO[t]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[e.etiqueta, { color: p.tintaSuave }]}>Un dibujito</Text>
      <View style={e.opciones}>
        {EMOJIS.map((x) => (
          <Pressable
            key={x}
            role="radio"
            aria-checked={x === emoji}
            aria-label={`Emoji ${x}`}
            onPress={() => setEmoji(x)}
            style={[
              e.emoji,
              x === emoji
                ? { backgroundColor: p.albaPiso, borderColor: p.alba, borderWidth: 2 }
                : { backgroundColor: p.tarjeta, borderColor: p.linea },
            ]}
          >
            <Text style={e.emojiTexto}>{x}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[e.etiqueta, { color: p.tintaSuave }]}>¿Cuánto dura?</Text>
      <View style={e.opciones}>
        {DURACIONES.map((d) => (
          <Pressable
            key={d}
            role="radio"
            aria-checked={d === duracion}
            onPress={() => setDuracion(d)}
            style={[
              e.chip,
              d === duracion
                ? { backgroundColor: p.alba, borderColor: p.alba }
                : { backgroundColor: p.tarjeta, borderColor: p.linea },
            ]}
          >
            <Text style={[e.chipTexto, { color: d === duracion ? '#FFF' : p.tintaSuave }]}>
              {d < 60 ? `${d} min` : `${d / 60} h`}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        role="checkbox"
        aria-checked={esFijo}
        onPress={() => setEsFijo(!esFijo)}
        style={[e.interruptor, { backgroundColor: p.tarjeta, borderColor: p.linea }]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[e.interTitulo, { color: p.tinta }]}>No se mueve de su hora</Text>
          <Text style={[e.interSub, { color: p.tintaTenue }]}>
            Como la cena o el devocional. Las demás se pueden reacomodar.
          </Text>
        </View>
        <View style={[e.tic, esFijo ? { backgroundColor: p.verde, borderColor: p.verde } : { borderColor: p.lineaFuerte }]}>
          {esFijo && <Text style={e.ticTexto}>✓</Text>}
        </View>
      </Pressable>

      <Pressable
        role="checkbox"
        aria-checked={avisar}
        onPress={() => setAvisar(!avisar)}
        style={[e.interruptor, { backgroundColor: p.tarjeta, borderColor: p.linea }]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[e.interTitulo, { color: p.tinta }]}>Avisarme antes</Text>
          <Text style={[e.interSub, { color: p.tintaTenue }]}>
            Con el tiempo que pusiste en Ajustes.
          </Text>
        </View>
        <View style={[e.tic, avisar ? { backgroundColor: p.verde, borderColor: p.verde } : { borderColor: p.lineaFuerte }]}>
          {avisar && <Text style={e.ticTexto}>✓</Text>}
        </View>
      </Pressable>

      <Pressable
        role="button"
        onPress={guardar}
        disabled={!puedeGuardar}
        style={[e.guardar, { backgroundColor: puedeGuardar ? p.alba : p.linea }]}
      >
        <Text style={e.guardarTexto}>{original ? 'Guardar cambios' : 'Crear'}</Text>
      </Pressable>

      {original && (
        <Pressable role="button" onPress={borrar} style={e.borrar}>
          <Text style={[e.borrarTexto, { color: p.fuego }]}>Borrar «{original.nombre}»</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const e = StyleSheet.create({
  cuerpo: { padding: 18, paddingBottom: 48, gap: 8, maxWidth: 620, width: '100%', alignSelf: 'center' },
  etiqueta: { fontSize: 13.5, fontWeight: '700', marginTop: 12 },
  entrada: {
    borderWidth: StyleSheet.hairlineWidth, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13, fontSize: 16,
  },
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: {
    paddingVertical: 9, paddingHorizontal: 14, borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipTexto: { fontSize: 13.5, fontWeight: '600' },
  emoji: {
    width: 46, height: 46, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center', justifyContent: 'center',
  },
  emojiTexto: { fontSize: 21 },
  interruptor: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12,
    padding: 14, borderRadius: 13, borderWidth: StyleSheet.hairlineWidth,
  },
  interTitulo: { fontSize: 15, fontWeight: '600' },
  interSub: { fontSize: 12.5, marginTop: 2 },
  tic: {
    width: 26, height: 26, borderRadius: 13, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  ticTexto: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  guardar: { marginTop: 22, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  guardarTexto: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  borrar: { marginTop: 10, paddingVertical: 13, alignItems: 'center' },
  borrarTexto: { fontSize: 14.5, fontWeight: '600' },
});
