import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { duracionMin } from '@/lib/fechas';
import { colorDeTipo, NOMBRE_TIPO, usarPaleta } from '@/lib/tema';
import type { EstadoTarea, Tarea } from '@/lib/tipos';

interface Props {
  tarea: Tarea | null;
  onCerrar: () => void;
  onGuardar: (nota: string) => void;
  onEstado: (estado: EstadoTarea) => void;
  onBorrar: () => void;
}

/**
 * El detalle de una tarea: cuánto duró, cuántas chispas dio, y sobre todo un
 * sitio donde apuntar lo que pasó — «hoy sí me concentré», «me costó», lo que
 * sea. El devocional sin dónde escribir es una casilla vacía.
 */
export function DetalleTarea({ tarea, onCerrar, onGuardar, onEstado, onBorrar }: Props) {
  const p = usarPaleta();
  const [nota, setNota] = useState('');

  // Cada vez que se abre otra tarea hay que traer SU nota, no dejar la anterior.
  useEffect(() => { setNota(tarea?.nota ?? ''); }, [tarea]);

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

            <Text style={[e.etiqueta, { color: p.tintaSuave }]}>Tu nota</Text>
            <TextInput
              value={nota}
              onChangeText={setNota}
              placeholder="Cómo te fue, qué aprendiste, qué te costó…"
              placeholderTextColor={p.tintaTenue}
              aria-label="Nota de la tarea"
              multiline
              style={[e.entrada, { color: p.tinta, backgroundColor: p.tarjeta, borderColor: p.linea }]}
            />

            <Pressable
              role="button"
              onPress={() => onGuardar(nota)}
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
