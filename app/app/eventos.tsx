import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';

import { Aviso } from '@/componentes/Aviso';
import { Cabecera } from '@/componentes/Cabecera';
import { CampoTexto } from '@/componentes/CampoTexto';
import { SelectorHora } from '@/componentes/SelectorHora';
import {
  anosQueCumple, EFECTO_POR_TIPO, EMOJI_TIPO_EVENTO, enPalabras, eventosDeFecha,
  NOMBRE_TIPO_EVENTO, proximos,
} from '@/lib/eventos';
import { fechaLarga, fechaLocal, sumarDias } from '@/lib/fechas';
import { repositorio } from '@/lib/repositorio';
import { usarPaleta } from '@/lib/tema';
import type { Evento, Persona, TipoEvento } from '@/lib/tipos';

const TIPOS: TipoEvento[] = [
  'feriado', 'escolar', 'examen', 'entrega', 'cumpleanos', 'cita', 'viaje', 'personal',
];

const QUE_HACE: Record<TipoEvento, string> = {
  feriado: 'Ese día no hay colegio ni trabajo. El devocional y la cena se quedan.',
  escolar: 'Solo te avisa. Tu horario no cambia.',
  examen: 'Solo te avisa, para que lo veas venir.',
  entrega: 'Solo te avisa del día que hay que entregarlo.',
  cumpleanos: 'Vuelve todos los años y te avisa unos días antes.',
  cita: 'Con hora, te tapa lo flexible que caiga encima.',
  viaje: 'Esos días no hay colegio ni trabajo.',
  personal: 'Solo te avisa.',
};

/** Cuántos días hacia delante se enseñan. Un mes cabe en la cabeza; un año no. */
const VENTANA = 60;

export default function Eventos() {
  const p = usarPaleta();
  const [yo, setYo] = useState<Persona | null>(null);
  const [eventos, setEventos] = useState<Evento[]>([]);

  const [editando, setEditando] = useState<Evento | null>(null);
  const [nuevo, setNuevo] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState<TipoEvento>('feriado');
  const [dias, setDias] = useState(0); // desde hoy
  const [cuantos, setCuantos] = useState(1); // cuántos días dura
  const [conHora, setConHora] = useState(false);
  const [desde, setDesde] = useState('16:00');
  const [hasta, setHasta] = useState('17:00');
  const [anual, setAnual] = useState(false);
  const [falta, setFalta] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const [pe, es] = await Promise.all([repositorio.persona(), repositorio.eventos()]);
    setYo(pe); setEventos(es);
  }, []);

  useFocusEffect(useCallback(() => { void cargar(); }, [cargar]));

  const zona = yo?.zona_horaria ?? 'America/Guatemala';
  const hoy = useMemo(() => fechaLocal(new Date(), zona), [zona]);

  const deHoy = useMemo(
    () => (yo ? eventosDeFecha(eventos, hoy, yo.id) : []),
    [eventos, hoy, yo],
  );
  const queVienen = useMemo(
    () => (yo ? proximos(eventos, hoy, yo.id, VENTANA) : []),
    [eventos, hoy, yo],
  );

  if (!yo) {
    return (
      <SafeAreaView style={[e.pantalla, e.centrado, { backgroundColor: p.papel }]}>
        <ActivityIndicator color={p.alba} />
      </SafeAreaView>
    );
  }

  function abrirNuevo() {
    setFalta(null);
    setTitulo(''); setTipo('feriado'); setDias(0); setCuantos(1);
    setConHora(false); setDesde('16:00'); setHasta('17:00'); setAnual(false);
    setEditando(null);
    setNuevo(true);
  }

  async function guardar() {
    if (titulo.trim() === '') { setFalta('Ponle un nombre al evento.'); return; }
    if (conHora && hasta <= desde) {
      setFalta('La hora de terminar tiene que ir después de la de empezar.');
      return;
    }

    const inicio = sumarDias(hoy, dias);
    const evento: Evento = {
      id: editando?.id ?? `ev-${Date.now()}`,
      grupo_id: null,
      // Se guarda a nombre de quien lo pone. Los del grupo llegan en la fase 9.
      persona_id: yo!.id,
      tipo,
      titulo: titulo.trim(),
      descripcion: null,
      fecha_inicio: inicio,
      fecha_fin: conHora ? inicio : sumarDias(inicio, Math.max(0, cuantos - 1)),
      todo_el_dia: !conHora,
      hora_inicio: conHora ? desde : null,
      hora_fin: conHora ? hasta : null,
      repeticion: anual ? 'anual' : 'ninguna',
      efecto: EFECTO_POR_TIPO[tipo],
      origen: 'manual',
      confianza: null,
      confirmado: true,
    };

    try {
      await repositorio.guardarEvento(evento);
    } catch (err) {
      setFalta(err instanceof Error ? err.message : 'No se pudo guardar.');
      return;
    }
    setEventos(await repositorio.eventos());
    setNuevo(false); setEditando(null);
  }

  async function borrar(id: string) {
    await repositorio.borrarEvento(id);
    setEventos(await repositorio.eventos());
    setEditando(null); setNuevo(false);
  }

  function abrirEditar(ev: Evento) {
    setFalta(null);
    setTitulo(ev.titulo);
    setTipo(ev.tipo);
    setDias(0);
    setCuantos(1);
    setConHora(!ev.todo_el_dia);
    setDesde(ev.hora_inicio ?? '16:00');
    setHasta(ev.hora_fin ?? '17:00');
    setAnual(ev.repeticion === 'anual');
    setEditando(ev);
  }

  function Tarjeta({ ev, cuando }: { ev: Evento; cuando: string }) {
    const anos = anosQueCumple(ev, hoy);
    return (
      <Pressable
        role="button"
        onPress={() => abrirEditar(ev)}
        style={[e.tarjeta, { backgroundColor: p.tarjeta, borderColor: p.linea }]}
      >
        <View style={e.fila}>
          <Text style={e.emoji}>{EMOJI_TIPO_EVENTO[ev.tipo]}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[e.titulo, { color: p.tinta }]}>
              {ev.titulo}
              {anos !== null ? ` · cumple ${anos}` : ''}
            </Text>
            <Text style={[e.cuando, { color: p.tintaSuave }]}>
              {NOMBRE_TIPO_EVENTO[ev.tipo]} · {cuando}
              {ev.hora_inicio ? ` · ${ev.hora_inicio}–${ev.hora_fin}` : ''}
            </Text>
          </View>
        </View>
        {ev.efecto === 'libra_el_dia' && (
          <Text style={[e.efecto, { color: p.verde }]}>Ese día no hay colegio ni trabajo</Text>
        )}
      </Pressable>
    );
  }

  const formulario = nuevo || editando !== null;

  return (
    <SafeAreaView style={[e.pantalla, { backgroundColor: p.papel }]} edges={['top']}>
      <Cabecera titulo="Fechas importantes" />

      <ScrollView contentContainerStyle={e.cuerpo}>
        <Pressable
          role="button"
          onPress={abrirNuevo}
          style={[e.anadir, { borderColor: p.alba, backgroundColor: p.albaPiso }]}
        >
          <Text style={[e.anadirTexto, { color: p.alba }]}>+ Añadir una fecha</Text>
        </Pressable>

        {deHoy.length > 0 && (
          <>
            <Text style={[e.seccion, { color: p.tintaSuave }]}>HOY</Text>
            {deHoy.map((ev) => <Tarjeta key={ev.id} ev={ev} cuando="hoy" />)}
          </>
        )}

        <Text style={[e.seccion, { color: p.tintaSuave }]}>LO QUE VIENE</Text>
        {queVienen.length === 0 ? (
          <View style={[e.vacio, { backgroundColor: p.tarjeta, borderColor: p.linea }]}>
            <Text style={[e.vacioTitulo, { color: p.tinta }]}>
              No hay nada apuntado en los próximos {VENTANA} días
            </Text>
            <Text style={[e.vacioTexto, { color: p.tintaSuave }]}>
              Apunta los feriados, los cumpleaños y los exámenes y la app te los
              recuerda. Un feriado además te libra el colegio ese día, sin que
              tengas que borrar nada.
            </Text>
          </View>
        ) : (
          queVienen.map(({ evento: ev, enCuantos }) => (
            <Tarjeta key={`${ev.id}-${enCuantos}`} ev={ev} cuando={enPalabras(enCuantos)} />
          ))
        )}
      </ScrollView>

      <Modal
        visible={formulario}
        transparent
        animationType="slide"
        onRequestClose={() => { setNuevo(false); setEditando(null); }}
      >
        <View style={e.fondo}>
          <ScrollView style={[e.hoja, { backgroundColor: p.papel }]}>
            <Text style={[e.hojaTitulo, { color: p.tinta }]}>
              {editando ? 'Esta fecha' : 'Una fecha nueva'}
            </Text>

            <CampoTexto
              etiqueta="¿Qué es?"
              obligatorio
              ayuda="Por ejemplo: «Día de la Independencia» o «Cumple de mamá»."
              error={falta && titulo.trim() === '' ? falta : null}
              value={titulo}
              onChangeText={(t) => { setTitulo(t); setFalta(null); }}
              placeholder="Escribe aquí"
            />

            <Text style={[e.etiqueta, { color: p.tintaSuave }]}>¿De qué tipo?</Text>
            <View style={e.opciones}>
              {TIPOS.map((t) => (
                <Pressable
                  key={t}
                  role="radio"
                  aria-checked={tipo === t}
                  onPress={() => {
                    setTipo(t);
                    if (t === 'cumpleanos') setAnual(true);
                  }}
                  style={[
                    e.opcion,
                    {
                      borderColor: tipo === t ? p.alba : p.linea,
                      backgroundColor: tipo === t ? p.albaPiso : p.tarjeta,
                    },
                  ]}
                >
                  <Text style={[e.opcionTexto, { color: tipo === t ? p.alba : p.tinta }]}>
                    {EMOJI_TIPO_EVENTO[t]} {NOMBRE_TIPO_EVENTO[t]}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={[e.ayuda, { color: p.tintaTenue }]}>{QUE_HACE[tipo]}</Text>

            {!editando && (
              <>
                <Text style={[e.etiqueta, { color: p.tintaSuave }]}>¿Qué día?</Text>
                <View style={e.contador}>
                  <Pressable
                    role="button"
                    aria-label="Un día antes"
                    onPress={() => setDias(Math.max(0, dias - 1))}
                    style={[e.paso, { borderColor: p.linea, backgroundColor: p.tarjeta }]}
                  >
                    <Text style={[e.pasoTexto, { color: p.tinta }]}>−</Text>
                  </Pressable>
                  <Text style={[e.valor, { color: p.tinta, backgroundColor: p.tarjeta2 }]}>
                    {fechaLarga(sumarDias(hoy, dias), zona)}
                  </Text>
                  <Pressable
                    role="button"
                    aria-label="Un día después"
                    onPress={() => setDias(dias + 1)}
                    style={[e.paso, { borderColor: p.linea, backgroundColor: p.tarjeta }]}
                  >
                    <Text style={[e.pasoTexto, { color: p.tinta }]}>+</Text>
                  </Pressable>
                </View>
                <Text style={[e.ayuda, { color: p.tintaTenue }]}>
                  {dias === 0 ? 'Hoy' : dias === 1 ? 'Mañana' : `Dentro de ${dias} días`}
                </Text>
              </>
            )}

            <Pressable
              role="switch"
              aria-checked={conHora}
              onPress={() => setConHora(!conHora)}
              style={[e.interruptor, { borderColor: p.linea, backgroundColor: p.tarjeta }]}
            >
              <Text style={[e.interruptorTexto, { color: p.tinta }]}>
                {conHora ? '☑︎' : '☐'}  Tiene una hora
              </Text>
            </Pressable>

            {conHora ? (
              <View style={{ gap: 12, marginTop: 12 }}>
                <SelectorHora etiqueta="Empieza" valor={desde} onCambiar={setDesde} />
                <SelectorHora etiqueta="Termina" valor={hasta} onCambiar={setHasta} />
              </View>
            ) : !editando ? (
              <>
                <Text style={[e.etiqueta, { color: p.tintaSuave }]}>¿Cuántos días dura?</Text>
                <View style={e.contador}>
                  <Pressable
                    role="button"
                    aria-label="Un día menos"
                    onPress={() => setCuantos(Math.max(1, cuantos - 1))}
                    style={[e.paso, { borderColor: p.linea, backgroundColor: p.tarjeta }]}
                  >
                    <Text style={[e.pasoTexto, { color: p.tinta }]}>−</Text>
                  </Pressable>
                  <Text style={[e.valor, { color: p.tinta, backgroundColor: p.tarjeta2 }]}>
                    {cuantos === 1 ? 'Un día' : `${cuantos} días`}
                  </Text>
                  <Pressable
                    role="button"
                    aria-label="Un día más"
                    onPress={() => setCuantos(cuantos + 1)}
                    style={[e.paso, { borderColor: p.linea, backgroundColor: p.tarjeta }]}
                  >
                    <Text style={[e.pasoTexto, { color: p.tinta }]}>+</Text>
                  </Pressable>
                </View>
              </>
            ) : null}

            <Pressable
              role="switch"
              aria-checked={anual}
              onPress={() => setAnual(!anual)}
              style={[e.interruptor, { borderColor: p.linea, backgroundColor: p.tarjeta }]}
            >
              <Text style={[e.interruptorTexto, { color: p.tinta }]}>
                {anual ? '☑︎' : '☐'}  Se repite todos los años
              </Text>
            </Pressable>
            <Text style={[e.ayuda, { color: p.tintaTenue }]}>
              Los cumpleaños y los feriados suelen volver cada año. Así lo
              apuntas una vez y ya está.
            </Text>

            <Aviso texto={falta} />

            <View style={e.hojaBotones}>
              <Pressable
                role="button"
                onPress={() => { setNuevo(false); setEditando(null); }}
                style={[e.secundario, { borderColor: p.linea }]}
              >
                <Text style={[e.secundarioTexto, { color: p.tintaSuave }]}>Cancelar</Text>
              </Pressable>
              <Pressable
                role="button"
                onPress={guardar}
                style={[e.principal, { backgroundColor: p.alba }]}
              >
                <Text style={e.principalTexto}>Guardar</Text>
              </Pressable>
            </View>

            {editando && (
              <Pressable
                role="button"
                onPress={() => borrar(editando.id)}
                style={[e.borrar, { borderColor: p.fuego }]}
              >
                <Text style={[e.borrarTexto, { color: p.fuego }]}>Quitar esta fecha</Text>
              </Pressable>
            )}
            <View style={{ height: 30 }} />
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const e = StyleSheet.create({
  pantalla: { flex: 1 },
  centrado: { alignItems: 'center', justifyContent: 'center' },
  cuerpo: { padding: 16, gap: 11, paddingBottom: 40 },

  seccion: { fontSize: 12, fontWeight: '800', letterSpacing: 0.6, marginTop: 10 },
  anadir: {
    borderWidth: 1.5, borderRadius: 13, borderStyle: 'dashed',
    paddingVertical: 14, alignItems: 'center',
  },
  anadirTexto: { fontSize: 15, fontWeight: '700' },

  tarjeta: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 15, padding: 14, gap: 7 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  emoji: { fontSize: 22 },
  titulo: { fontSize: 16, fontWeight: '700' },
  cuando: { fontSize: 13, marginTop: 2 },
  efecto: { fontSize: 12.5, fontWeight: '600' },

  vacio: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 15, padding: 20, gap: 8 },
  vacioTitulo: { fontSize: 16.5, fontWeight: '700' },
  vacioTexto: { fontSize: 14, lineHeight: 20 },

  fondo: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  hoja: { borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, maxHeight: '92%' },
  hojaTitulo: { fontSize: 20, fontWeight: '800', marginBottom: 16 },
  hojaBotones: { flexDirection: 'row', gap: 10, marginTop: 20 },
  secundario: {
    flex: 1, borderWidth: StyleSheet.hairlineWidth, borderRadius: 13,
    paddingVertical: 15, alignItems: 'center',
  },
  secundarioTexto: { fontSize: 15, fontWeight: '600' },
  principal: { flex: 1, borderRadius: 13, paddingVertical: 15, alignItems: 'center' },
  principalTexto: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  borrar: {
    borderWidth: 1, borderRadius: 13, paddingVertical: 14,
    alignItems: 'center', marginTop: 12,
  },
  borrarTexto: { fontSize: 14.5, fontWeight: '600' },

  etiqueta: { fontSize: 13.5, fontWeight: '700', marginTop: 18, marginBottom: 9 },
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  opcion: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 10 },
  opcionTexto: { fontSize: 14, fontWeight: '600' },
  ayuda: { fontSize: 12.5, lineHeight: 17, marginTop: 8 },
  contador: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  paso: {
    width: 46, height: 42, borderRadius: 11, borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center', justifyContent: 'center',
  },
  pasoTexto: { fontSize: 20, fontWeight: '700' },
  valor: {
    flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '700',
    paddingVertical: 11, borderRadius: 11,
  },
  interruptor: {
    borderWidth: StyleSheet.hairlineWidth, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13, marginTop: 18,
  },
  interruptorTexto: { fontSize: 15, fontWeight: '600' },
});
