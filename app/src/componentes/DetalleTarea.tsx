import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import type { Devocional } from '@/datos/devocionales';
import { METODOS, type MetodoDevocional } from '@/datos/metodos';
import { duracionMin } from '@/lib/fechas';
import { colorDeTipo, NOMBRE_TIPO, usarPaleta } from '@/lib/tema';
import type { EstadoTarea, Tarea } from '@/lib/tipos';

interface Props {
  tarea: Tarea | null;
  /** Solo llega en las tareas de tipo fe. */
  devocional?: Devocional | null;
  onCerrar: () => void;
  onGuardar: (nota: string, metodo: MetodoDevocional | null) => void;
  onEstado: (estado: EstadoTarea) => void;
  onBorrar: () => void;
}

/**
 * El detalle de una tarea: cuánto duró, cuántas chispas dio, y sobre todo un
 * sitio donde apuntar lo que pasó — «hoy sí me concentré», «me costó», lo que
 * sea. El devocional sin dónde escribir es una casilla vacía.
 */
export function DetalleTarea({ tarea, devocional, onCerrar, onGuardar, onEstado, onBorrar }: Props) {
  const p = usarPaleta();
  const [nota, setNota] = useState('');
  const [metodo, setMetodo] = useState<MetodoDevocional | null>(null);

  // Cada vez que se abre otra tarea hay que traer SU nota, no dejar la anterior.
  useEffect(() => {
    setNota(tarea?.nota ?? '');
    setMetodo(tarea?.metodo_devocional ?? null);
  }, [tarea]);

  if (!tarea) return null;
  const color = colorDeTipo(tarea.tipo, p);
  const planeados = duracionMin(tarea.hora_inicio, tarea.hora_fin);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onCerrar}>
      <View style={e.fondo}>
        <View style={[e.hoja, { backgroundColor: p.papel }]}>
          <ScrollView contentContainerStyle={e.cuerpo}>
            <View style={e.cabeza}>
              <View style={[e.punto, { backgroundColor: color }]} />
              <Text style={[e.tipo, { color }]}>{NOMBRE_TIPO[tarea.tipo].toUpperCase()}</Text>
            </View>
            <Text style={[e.titulo, { color: p.tinta }]}>{tarea.emoji}  {tarea.titulo}</Text>
            <Text style={[e.horas, { color: p.tintaSuave }]}>
              {tarea.hora_inicio} — {tarea.hora_fin} · {planeados} min
              {tarea.es_fijo ? ' · no se mueve' : ''}
            </Text>

            {(tarea.minutos_reales !== null || tarea.puntos > 0) && (
              <View style={[e.cifras, { backgroundColor: p.tarjeta2, borderColor: p.linea }]}>
                {tarea.minutos_reales !== null && (
                  <Text style={[e.cifra, { color: p.tinta }]}>
                    Te tomó {tarea.minutos_reales} min
                  </Text>
                )}
                {tarea.puntos > 0 && (
                  <Text style={[e.cifra, { color: p.fuego }]}>⚡ {tarea.puntos} chispas</Text>
                )}
              </View>
            )}

            {tarea.tipo === 'fe' && (
              <View style={e.metodos}>
                <Text style={[e.etiqueta, { color: p.tintaSuave, marginTop: 18 }]}>
                  ¿Cómo lo hiciste hoy?
                </Text>
                <Text style={[e.metodoAyuda, { color: p.tintaTenue }]}>
                  Cuenta igual lo hagas como lo hagas. Esto es solo para poder
                  mirar atrás y acordarte.
                </Text>
                <View style={e.metodoChips}>
                  {METODOS.map((m) => {
                    const puesto = metodo === m.id;
                    return (
                      <Pressable
                        key={m.id}
                        role="radio"
                        aria-checked={puesto}
                        aria-label={m.nombre}
                        onPress={() => setMetodo(puesto ? null : m.id)}
                        style={[
                          e.metodoChip,
                          puesto
                            ? { backgroundColor: p.alba, borderColor: p.alba }
                            : { backgroundColor: p.tarjeta, borderColor: p.linea },
                        ]}
                      >
                        <Text style={[e.metodoTexto, { color: puesto ? '#FFF' : p.tintaSuave }]}>
                          {m.emoji} {m.nombre}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {tarea.tipo === 'fe' && devocional && metodo === 'app' && (
              <View style={[e.devocional, { backgroundColor: p.albaPiso, borderColor: p.alba }]}>
                <Text style={[e.devRotulo, { color: p.alba }]}>DEVOCIONAL DE HOY</Text>
                <Text style={[e.devTitulo, { color: p.tinta }]}>{devocional.titulo}</Text>
                <Text style={[e.devPasaje, { color: p.alba }]}>{devocional.pasaje}</Text>
                <Text style={[e.devTexto, { color: p.tinta }]}>{devocional.texto}</Text>
                <View style={[e.devPregunta, { borderTopColor: p.alba }]}>
                  <Text style={[e.devPreguntaRotulo, { color: p.alba }]}>PARA PENSAR</Text>
                  <Text style={[e.devPreguntaTexto, { color: p.tinta }]}>{devocional.pregunta}</Text>
                </View>
              </View>
            )}

            <Text style={[e.etiqueta, { color: p.tintaSuave }]}>
              {tarea.tipo === 'fe' && devocional && metodo === 'app'
                ? 'Tu respuesta' : 'Tu nota'}
            </Text>
            <TextInput
              value={nota}
              onChangeText={setNota}
              placeholder={tarea.tipo !== 'fe'
                ? 'Cómo te fue, qué aprendiste, qué te costó…'
                : metodo === 'app'
                  ? 'Contesta la pregunta, o escribe lo que quieras…'
                  : 'Qué leíste, con quién, qué te quedó…'}
              placeholderTextColor={p.tintaTenue}
              aria-label="Nota de la tarea"
              multiline
              style={[e.entrada, { color: p.tinta, backgroundColor: p.tarjeta, borderColor: p.linea }]}
            />

            <Pressable
              role="button"
              onPress={() => onGuardar(nota, metodo)}
              style={[e.principal, { backgroundColor: p.alba }]}
            >
              <Text style={e.principalTexto}>Guardar</Text>
            </Pressable>

            <View style={e.acciones}>
              <Pressable
                role="button"
                onPress={() => onEstado(tarea.estado === 'hecha' ? 'pendiente' : 'hecha')}
                style={[e.accion, { borderColor: p.verde }]}
              >
                <Text style={[e.accionTexto, { color: p.verde }]}>
                  {tarea.estado === 'hecha' ? 'Desmarcar' : 'Marcar hecha'}
                </Text>
              </Pressable>
              <Pressable
                role="button"
                onPress={() => onEstado(tarea.estado === 'omitida' ? 'pendiente' : 'omitida')}
                style={[e.accion, { borderColor: p.linea }]}
              >
                <Text style={[e.accionTexto, { color: p.tintaSuave }]}>
                  {tarea.estado === 'omitida' ? 'Ya no la salto' : 'Saltármela hoy'}
                </Text>
              </Pressable>
            </View>

            {tarea.origen === 'manual' && (
              <Pressable role="button" onPress={onBorrar} style={e.borrar}>
                <Text style={[e.borrarTexto, { color: p.fuego }]}>Borrarla de hoy</Text>
              </Pressable>
            )}

            <Pressable role="button" onPress={onCerrar} style={e.cerrar}>
              <Text style={[e.cerrarTexto, { color: p.tintaSuave }]}>Cerrar</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const e = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: 'rgba(20,16,36,0.55)', justifyContent: 'flex-end' },
  hoja: { borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '88%' },
  cuerpo: { padding: 22, paddingBottom: 34 },
  cabeza: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 7 },
  punto: { width: 9, height: 9, borderRadius: 5 },
  tipo: { fontSize: 10.5, fontWeight: '700', letterSpacing: 1 },
  titulo: { fontSize: 23, fontWeight: '800', letterSpacing: -0.3 },
  horas: { fontSize: 13.5, marginTop: 5 },
  cifras: {
    flexDirection: 'row', gap: 16, borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12, padding: 13, marginTop: 14,
  },
  cifra: { fontSize: 14, fontWeight: '600' },
  metodos: { gap: 0 },
  metodoAyuda: { fontSize: 12.5, lineHeight: 17, marginBottom: 9, marginTop: -3 },
  metodoChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  metodoChip: {
    paddingVertical: 9, paddingHorizontal: 12, borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  metodoTexto: { fontSize: 13.5, fontWeight: '600' },
  devocional: { borderWidth: 1, borderRadius: 15, padding: 17, marginTop: 18 },
  devRotulo: { fontSize: 10, fontWeight: '700', letterSpacing: 1.1 },
  devTitulo: { fontSize: 18, fontWeight: '700', marginTop: 7 },
  devPasaje: { fontSize: 13, fontWeight: '700', marginTop: 3 },
  devTexto: { fontSize: 14.5, lineHeight: 22, marginTop: 12 },
  devPregunta: { marginTop: 15, paddingTop: 13, borderTopWidth: StyleSheet.hairlineWidth },
  devPreguntaRotulo: { fontSize: 10, fontWeight: '700', letterSpacing: 1.1, marginBottom: 5 },
  devPreguntaTexto: { fontSize: 15.5, fontWeight: '600', lineHeight: 22 },
  etiqueta: { fontSize: 13.5, fontWeight: '700', marginTop: 20, marginBottom: 8 },
  entrada: {
    borderWidth: StyleSheet.hairlineWidth, borderRadius: 13, padding: 14,
    fontSize: 16, minHeight: 100, textAlignVertical: 'top',
  },
  principal: { marginTop: 16, borderRadius: 13, paddingVertical: 15, alignItems: 'center' },
  principalTexto: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  acciones: { flexDirection: 'row', gap: 8, marginTop: 10 },
  accion: {
    flex: 1, borderWidth: 1.5, borderRadius: 12, paddingVertical: 13, alignItems: 'center',
  },
  accionTexto: { fontSize: 14, fontWeight: '700' },
  borrar: { marginTop: 10, paddingVertical: 12, alignItems: 'center' },
  borrarTexto: { fontSize: 14, fontWeight: '600' },
  cerrar: { marginTop: 4, paddingVertical: 12, alignItems: 'center' },
  cerrarTexto: { fontSize: 15, fontWeight: '600' },
});
