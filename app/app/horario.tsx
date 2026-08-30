import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';

import { Aviso } from '@/componentes/Aviso';
import { Cabecera } from '@/componentes/Cabecera';
import { EMOJI_TIPO_EVENTO, eventosDeFecha } from '@/lib/eventos';
import { fechaLarga, fechaLocal, sumarDias } from '@/lib/fechas';
import { resumenAvance } from '@/lib/dia';
import { repositorio, type DiaCompleto } from '@/lib/repositorio';
import { colorDeTipo, usarPaleta } from '@/lib/tema';
import type { Evento, Persona } from '@/lib/tipos';

/**
 * El día de otra persona del grupo.
 *
 * Es **solo de mirar**: no hay casillas que marcar. El día de alguien lo marca
 * quien lo vive; un papá que pudiera tachar las tareas de su hija desde su
 * teléfono estaría llevándole la agenda, no acompañándola.
 */
export default function Horario() {
  const p = usarPaleta();
  const { persona: quienId } = useLocalSearchParams<{ persona?: string }>();
  const [quien, setQuien] = useState<Persona | null>(null);
  const [dia, setDia] = useState<DiaCompleto | null>(null);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [salto, setSalto] = useState(0);
  const [falta, setFalta] = useState<string | null>(null);
  const [zona, setZona] = useState('America/Guatemala');

  const cargar = useCallback(async () => {
    if (!quienId) { setFalta('No se dijo de quién es el horario.'); return; }
    try {
      const personas = await repositorio.personas();
      const suya = personas.find((x) => x.id === quienId);
      if (!suya) { setFalta('Esa persona ya no está en tus grupos.'); return; }
      setQuien(suya);
      setZona(suya.zona_horaria);
      const fecha = sumarDias(fechaLocal(new Date(), suya.zona_horaria), salto);
      setDia(await repositorio.horarioDe(suya.id, fecha));
      setEventos(await repositorio.eventos());
      setFalta(null);
    } catch (err) {
      setFalta(err instanceof Error ? err.message : 'No se pudo abrir su horario.');
    }
  }, [quienId, salto]);

  useFocusEffect(useCallback(() => { void cargar(); }, [cargar]));

  if (falta) {
    return (
      <SafeAreaView style={[e.pantalla, { backgroundColor: p.papel }]} edges={['top']}>
        <Cabecera titulo="Su horario" />
        <View style={e.cuerpo}><Aviso texto={falta} /></View>
      </SafeAreaView>
    );
  }

  if (!quien || !dia) {
    return (
      <SafeAreaView style={[e.pantalla, e.centrado, { backgroundColor: p.papel }]}>
        <ActivityIndicator color={p.alba} />
      </SafeAreaView>
    );
  }

  const fecha = dia.dia.fecha;
  const hoy = fechaLocal(new Date(), zona);
  const avance = resumenAvance(dia.tareas);
  const suyos = eventosDeFecha(eventos, fecha, quien.id).filter((x) => x.todo_el_dia);

  return (
    <SafeAreaView style={[e.pantalla, { backgroundColor: p.papel }]} edges={['top']}>
      <Cabecera titulo={`El día de ${quien.nombre}`} />

      <ScrollView contentContainerStyle={e.cuerpo}>
        <View style={e.barra}>
          <Pressable
            role="button" aria-label="El día anterior"
            onPress={() => setSalto(salto - 1)}
            style={[e.flecha, { borderColor: p.linea, backgroundColor: p.tarjeta }]}
          >
            <Text style={{ color: p.tinta, fontSize: 17 }}>‹</Text>
          </Pressable>
          <Text style={[e.dia, { color: p.tinta }]}>
            {fecha === hoy ? 'Hoy' : fechaLarga(fecha, zona)}
          </Text>
          <Pressable
            role="button" aria-label="El día siguiente"
            onPress={() => setSalto(salto + 1)}
            style={[e.flecha, { borderColor: p.linea, backgroundColor: p.tarjeta }]}
          >
            <Text style={{ color: p.tinta, fontSize: 17 }}>›</Text>
          </Pressable>
        </View>

        {salto !== 0 && (
          <Pressable role="button" onPress={() => setSalto(0)} style={e.volver}>
            <Text style={[e.volverTexto, { color: p.alba }]}>Volver a hoy</Text>
          </Pressable>
        )}

        {suyos.map((x) => (
          <View
            key={x.id}
            style={[
              e.evento,
              {
                backgroundColor: x.efecto === 'libra_el_dia' ? p.verdePiso : p.tarjeta2,
                borderColor: x.efecto === 'libra_el_dia' ? p.verde : p.linea,
              },
            ]}
          >
            <Text style={[e.eventoTexto, { color: p.tinta }]}>
              {EMOJI_TIPO_EVENTO[x.tipo]}  {x.titulo}
            </Text>
          </View>
        ))}

        {dia.tareas.length === 0 ? (
          <View style={[e.vacio, { backgroundColor: p.tarjeta, borderColor: p.linea }]}>
            <Text style={[e.vacioTitulo, { color: p.tinta }]}>
              {quien.nombre} no tiene nada este día
            </Text>
          </View>
        ) : (
          <>
            <Text style={[e.cuenta, { color: p.tintaSuave }]}>
              {avance.hechas} de {avance.total} hechas
            </Text>

            {dia.tareas.map((t) => (
              <View
                key={t.id}
                style={[
                  e.tarea,
                  {
                    backgroundColor: p.tarjeta,
                    borderColor: p.linea,
                    borderLeftColor: t.estado === 'omitida' ? p.tintaTenue : colorDeTipo(t.tipo, p),
                  },
                ]}
              >
                <Text style={[e.hora, { color: p.tintaTenue }]}>{t.hora_inicio}</Text>
                <Text
                  style={[
                    e.titulo,
                    {
                      color: t.estado === 'omitida' ? p.tintaTenue : p.tinta,
                      textDecorationLine: t.estado === 'hecha' ? 'line-through' : 'none',
                    },
                  ]}
                >
                  {t.emoji}  {t.titulo}
                </Text>
                <Text style={[e.estado, { color: t.estado === 'hecha' ? p.verde : p.tintaTenue }]}>
                  {t.estado === 'hecha' ? '✓' : t.estado === 'omitida' ? 'saltada' : ''}
                </Text>
              </View>
            ))}
          </>
        )}

        <Text style={[e.pista, { color: p.tintaTenue }]}>
          Esto es solo para mirar. Su día lo marca {quien.nombre}.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const e = StyleSheet.create({
  pantalla: { flex: 1 },
  centrado: { alignItems: 'center', justifyContent: 'center' },
  cuerpo: { padding: 16, gap: 9, paddingBottom: 40 },

  barra: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  flecha: {
    width: 40, height: 40, borderRadius: 11, borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center', justifyContent: 'center',
  },
  dia: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700' },
  volver: { alignItems: 'center', paddingVertical: 4 },
  volverTexto: { fontSize: 14, fontWeight: '600' },

  evento: {
    borderWidth: StyleSheet.hairlineWidth, borderRadius: 11,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  eventoTexto: { fontSize: 14, fontWeight: '600' },

  cuenta: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  tarea: {
    flexDirection: 'row', alignItems: 'center', gap: 11,
    borderWidth: StyleSheet.hairlineWidth, borderLeftWidth: 4,
    borderRadius: 12, paddingHorizontal: 13, paddingVertical: 12,
  },
  hora: { fontSize: 13, fontVariant: ['tabular-nums'], minWidth: 42 },
  titulo: { flex: 1, fontSize: 15, fontWeight: '600' },
  estado: { fontSize: 13, fontWeight: '700' },

  vacio: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 15, padding: 20 },
  vacioTitulo: { fontSize: 16, fontWeight: '700' },
  pista: { fontSize: 12.5, lineHeight: 18, marginTop: 10 },
});
