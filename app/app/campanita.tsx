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
  comoSeLee, EMOJI_TIPO_ENCARGO, NOMBRE_TIPO_ENCARGO, paraMi, queMande, sinLeer,
} from '@/lib/encargos';
import { aQuienPuedoMandar } from '@/lib/grupos';
import { fechaLarga, fechaLocal } from '@/lib/fechas';
import { repositorio } from '@/lib/repositorio';
import { usarPaleta } from '@/lib/tema';
import type { Encargo, Grupo, MiembroGrupo, Persona, TipoEncargo } from '@/lib/tipos';

const TIPOS: TipoEncargo[] = ['tarea', 'recordatorio', 'consejo'];

const QUE_HACE: Record<TipoEncargo, string> = {
  tarea: 'Entra en su horario de ese día y se puede marcar.',
  recordatorio: 'Solo le avisa. No le pone nada en el horario.',
  consejo: 'Un mensaje para leer. Puede contestarte.',
};

export default function Campanita() {
  const p = usarPaleta();
  const [yo, setYo] = useState<Persona | null>(null);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [miembros, setMiembros] = useState<MiembroGrupo[]>([]);
  const [encargos, setEncargos] = useState<Encargo[]>([]);
  const [pestana, setPestana] = useState<'recibidos' | 'mandados'>('recibidos');

  const [contestando, setContestando] = useState<Encargo | null>(null);
  const [respuesta, setRespuesta] = useState('');
  const [faltaRespuesta, setFaltaRespuesta] = useState<string | null>(null);

  const [mandando, setMandando] = useState(false);
  const [aQuien, setAQuien] = useState<string | null>(null);
  const [titulo, setTitulo] = useState('');
  const [nota, setNota] = useState('');
  const [hora, setHora] = useState('17:00');
  const [conHora, setConHora] = useState(false);
  const [tipo, setTipo] = useState<TipoEncargo>('tarea');
  const [faltaMandar, setFaltaMandar] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const [pe, ps, gs, ms, es] = await Promise.all([
      repositorio.persona(), repositorio.personas(), repositorio.grupos(),
      repositorio.miembros(), repositorio.encargos(),
    ]);
    setYo(pe); setPersonas(ps); setGrupos(gs); setMiembros(ms); setEncargos(es);
  }, []);

  useFocusEffect(useCallback(() => { void cargar(); }, [cargar]));

  const nombreDe = useCallback(
    (id: string) => personas.find((x) => x.id === id)?.nombre ?? 'Alguien',
    [personas],
  );

  const puedoMandarA = useMemo(
    () => (yo ? aQuienPuedoMandar(grupos, miembros, personas, yo.id) : []),
    [grupos, miembros, personas, yo],
  );

  const recibidos = useMemo(() => (yo ? paraMi(encargos, yo.id) : []), [encargos, yo]);
  const mandados = useMemo(() => (yo ? queMande(encargos, yo.id) : []), [encargos, yo]);

  if (!yo) {
    return (
      <SafeAreaView style={[e.pantalla, e.centrado, { backgroundColor: p.papel }]}>
        <ActivityIndicator color={p.alba} />
      </SafeAreaView>
    );
  }

  const zona = yo.zona_horaria;
  const hoy = fechaLocal(new Date(), zona);
  const nuevos = sinLeer(encargos, yo.id);

  async function abrir(en: Encargo) {
    if (en.visto_en === null) {
      await repositorio.verEncargo(en.id);
      setEncargos(await repositorio.encargos());
    }
    setRespuesta(en.respuesta ?? '');
    setFaltaRespuesta(null);
    setContestando(en);
  }

  async function guardarRespuesta() {
    if (!contestando) return;
    if (respuesta.trim() === '') {
      setFaltaRespuesta('Escribe qué le quieres contestar.');
      return;
    }
    await repositorio.responderEncargo(contestando.id, respuesta);
    setEncargos(await repositorio.encargos());
    setContestando(null);
  }

  async function mandar() {
    if (aQuien === null) { setFaltaMandar('Elige a quién se lo mandas.'); return; }
    if (titulo.trim() === '') { setFaltaMandar('Escribe qué le quieres mandar.'); return; }
    try {
      await repositorio.mandarEncargo({
        para_persona_id: aQuien,
        titulo,
        nota: nota.trim() === '' ? null : nota,
        fecha: hoy,
        hora_sugerida: conHora && tipo === 'tarea' ? hora : null,
        tipo,
      });
    } catch (err) {
      setFaltaMandar(err instanceof Error ? err.message : 'No se pudo mandar.');
      return;
    }
    setEncargos(await repositorio.encargos());
    setMandando(false);
    setTitulo(''); setNota(''); setConHora(false); setPestana('mandados');
  }

  const lista = pestana === 'recibidos' ? recibidos : mandados;

  return (
    <SafeAreaView style={[e.pantalla, { backgroundColor: p.papel }]} edges={['top']}>
      <Cabecera titulo="Recados" />

      <ScrollView contentContainerStyle={e.cuerpo}>
        <View style={[e.pestanas, { backgroundColor: p.tarjeta2, borderColor: p.linea }]}>
          {(['recibidos', 'mandados'] as const).map((x) => (
            <Pressable
              key={x}
              role="tab"
              aria-selected={pestana === x}
              onPress={() => setPestana(x)}
              style={[e.pestana, pestana === x && { backgroundColor: p.tarjeta }]}
            >
              <Text style={[e.pestanaTexto, { color: pestana === x ? p.tinta : p.tintaSuave }]}>
                {x === 'recibidos' ? 'Para mí' : 'Que mandé'}
                {x === 'recibidos' && nuevos > 0 ? ` · ${nuevos}` : ''}
              </Text>
            </Pressable>
          ))}
        </View>

        {puedoMandarA.length > 0 && (
          <Pressable
            role="button"
            onPress={() => {
              setFaltaMandar(null);
              setAQuien(puedoMandarA.length === 1 ? puedoMandarA[0].id : null);
              setMandando(true);
            }}
            style={[e.mandar, { borderColor: p.alba, backgroundColor: p.albaPiso }]}
          >
            <Text style={[e.mandarTexto, { color: p.alba }]}>+ Mandar un recado</Text>
          </Pressable>
        )}

        {lista.length === 0 ? (
          <View style={[e.vacio, { backgroundColor: p.tarjeta, borderColor: p.linea }]}>
            <Text style={[e.vacioTitulo, { color: p.tinta }]}>
              {pestana === 'recibidos' ? 'No tienes recados' : 'No has mandado nada'}
            </Text>
            <Text style={[e.vacioTexto, { color: p.tintaSuave }]}>
              {pestana === 'recibidos'
                ? 'Aquí llega lo que te manden de tu familia: una tarea, un recordatorio o un mensaje.'
                : puedoMandarA.length === 0
                  ? 'Solo un papá o una mamá puede mandar recados. Si eres tú, cámbialo en Familia.'
                  : 'Manda el primero con el botón de arriba.'}
            </Text>
          </View>
        ) : (
          lista.map((en) => (
            <Pressable
              key={en.id}
              role="button"
              aria-label={
                pestana === 'recibidos'
                  ? `${en.titulo}. Recado de ${nombreDe(en.de_persona_id)}` +
                    (en.visto_en === null ? '. Sin abrir' : '')
                  : `${en.titulo}. Recado para ${nombreDe(en.para_persona_id)}`
              }
              onPress={() => abrir(en)}
              style={[
                e.tarjeta,
                {
                  backgroundColor: p.tarjeta,
                  borderColor: en.visto_en === null && pestana === 'recibidos' ? p.fuego : p.linea,
                },
              ]}
            >
              <View style={e.filaTitulo}>
                <Text style={e.emoji}>{EMOJI_TIPO_ENCARGO[en.tipo]}</Text>
                <Text style={[e.titulo, { color: p.tinta }]}>{en.titulo}</Text>
                {en.estado === 'hecho' && (
                  <Text style={[e.hecho, { color: p.verde }]}>hecho ✓</Text>
                )}
              </View>

              <Text style={[e.de, { color: p.tintaSuave }]}>
                {pestana === 'recibidos'
                  ? comoSeLee(en, nombreDe(en.de_persona_id))
                  : `Para ${nombreDe(en.para_persona_id)} · ${NOMBRE_TIPO_ENCARGO[en.tipo]}`}
                {' · '}
                {en.fecha === hoy ? 'hoy' : fechaLarga(en.fecha, zona)}
                {en.hora_sugerida ? ` a las ${en.hora_sugerida}` : ''}
              </Text>

              {en.nota && <Text style={[e.nota, { color: p.tintaSuave }]}>{en.nota}</Text>}

              {en.respuesta ? (
                <View style={[e.respuesta, { backgroundColor: p.tarjeta2, borderColor: p.linea }]}>
                  <Text style={[e.respuestaQuien, { color: p.tintaTenue }]}>
                    {pestana === 'recibidos'
                      ? 'Tú contestaste'
                      : `${nombreDe(en.para_persona_id)} contestó`}
                  </Text>
                  <Text style={[e.respuestaTexto, { color: p.tinta }]}>{en.respuesta}</Text>
                </View>
              ) : (
                <Text style={[e.pendiente, { color: p.tintaTenue }]}>
                  {pestana === 'recibidos'
                    ? 'Toca para contestar'
                    : en.visto_en
                      ? 'Lo abrió, todavía no contesta'
                      : 'Todavía no lo ha abierto'}
                </Text>
              )}
            </Pressable>
          ))
        )}
      </ScrollView>

      {/* ------------------------------------------------------ contestar */}
      <Modal
        visible={contestando !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setContestando(null)}
      >
        <View style={e.fondo}>
          <View style={[e.hoja, { backgroundColor: p.papel }]}>
            <Text style={[e.hojaTitulo, { color: p.tinta }]}>{contestando?.titulo}</Text>
            <Text style={[e.hojaAyuda, { color: p.tintaSuave }]}>
              {contestando && comoSeLee(contestando, nombreDe(contestando.de_persona_id))}.
              Lo que escribas aquí lo ve quien te lo mandó.
            </Text>

            <CampoTexto
              etiqueta="Tu respuesta"
              obligatorio
              ayuda="Por ejemplo: «Ya lo hice» o «Lo hago al volver del cole»."
              error={faltaRespuesta}
              value={respuesta}
              onChangeText={(t) => { setRespuesta(t); setFaltaRespuesta(null); }}
              placeholder="Escribe aquí"
              multiline
            />

            <Aviso texto={faltaRespuesta} />

            <View style={e.hojaBotones}>
              <Pressable
                role="button"
                onPress={() => setContestando(null)}
                style={[e.secundario, { borderColor: p.linea }]}
              >
                <Text style={[e.secundarioTexto, { color: p.tintaSuave }]}>Cerrar</Text>
              </Pressable>
              <Pressable
                role="button"
                onPress={guardarRespuesta}
                style={[e.principal, { backgroundColor: p.alba }]}
              >
                <Text style={e.principalTexto}>Contestar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* --------------------------------------------------------- mandar */}
      <Modal
        visible={mandando}
        transparent
        animationType="slide"
        onRequestClose={() => setMandando(false)}
      >
        <View style={e.fondo}>
          <ScrollView style={[e.hoja, { backgroundColor: p.papel }]}>
            <Text style={[e.hojaTitulo, { color: p.tinta }]}>Mandar un recado</Text>

            <Text style={[e.etiqueta, { color: p.tintaSuave }]}>
              ¿A quién? <Text style={{ color: p.tintaTenue }}>obligatorio</Text>
            </Text>
            <View style={e.opciones}>
              {puedoMandarA.map((x) => (
                <Pressable
                  key={x.id}
                  role="radio"
                  aria-checked={aQuien === x.id}
                  onPress={() => { setAQuien(x.id); setFaltaMandar(null); }}
                  style={[
                    e.opcion,
                    {
                      borderColor: aQuien === x.id ? p.alba : p.linea,
                      backgroundColor: aQuien === x.id ? p.albaPiso : p.tarjeta,
                    },
                  ]}
                >
                  <Text style={[e.opcionTexto, { color: aQuien === x.id ? p.alba : p.tinta }]}>
                    {x.avatar_valor} {x.nombre}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[e.etiqueta, { color: p.tintaSuave, marginTop: 18 }]}>¿Qué tipo?</Text>
            <View style={e.opciones}>
              {TIPOS.map((t) => (
                <Pressable
                  key={t}
                  role="radio"
                  aria-checked={tipo === t}
                  onPress={() => setTipo(t)}
                  style={[
                    e.opcion,
                    {
                      borderColor: tipo === t ? p.alba : p.linea,
                      backgroundColor: tipo === t ? p.albaPiso : p.tarjeta,
                    },
                  ]}
                >
                  <Text style={[e.opcionTexto, { color: tipo === t ? p.alba : p.tinta }]}>
                    {EMOJI_TIPO_ENCARGO[t]} {NOMBRE_TIPO_ENCARGO[t]}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={[e.ayuda, { color: p.tintaTenue }]}>{QUE_HACE[tipo]}</Text>

            <View style={{ height: 18 }} />
            <CampoTexto
              etiqueta="¿Qué le mandas?"
              obligatorio
              ayuda="Por ejemplo: «Sacar la basura» o «Acuérdate del abrigo»."
              error={faltaMandar && titulo.trim() === '' ? faltaMandar : null}
              value={titulo}
              onChangeText={(t) => { setTitulo(t); setFaltaMandar(null); }}
              placeholder="Escribe aquí"
            />

            <View style={{ height: 14 }} />
            <CampoTexto
              etiqueta="Una nota (opcional)"
              ayuda="Algo más que quieras decirle."
              value={nota}
              onChangeText={setNota}
              placeholder="Sin nota"
              multiline
            />

            {tipo === 'tarea' && (
              <>
                <Pressable
                  role="switch"
                  aria-checked={conHora}
                  onPress={() => setConHora(!conHora)}
                  style={[e.interruptor, { borderColor: p.linea, backgroundColor: p.tarjeta }]}
                >
                  <Text style={[e.interruptorTexto, { color: p.tinta }]}>
                    {conHora ? '☑︎' : '☐'}  Ponerle una hora
                  </Text>
                </Pressable>
                {conHora ? (
                  <SelectorHora etiqueta="¿A qué hora?" valor={hora} onCambiar={setHora} />
                ) : (
                  <Text style={[e.ayuda, { color: p.tintaTenue }]}>
                    Sin hora le aparece por la tarde, como «hoy, cuando puedas».
                  </Text>
                )}
              </>
            )}

            <Aviso texto={faltaMandar} />

            <View style={e.hojaBotones}>
              <Pressable
                role="button"
                onPress={() => setMandando(false)}
                style={[e.secundario, { borderColor: p.linea }]}
              >
                <Text style={[e.secundarioTexto, { color: p.tintaSuave }]}>Cancelar</Text>
              </Pressable>
              <Pressable
                role="button"
                onPress={mandar}
                style={[e.principal, { backgroundColor: p.alba }]}
              >
                <Text style={e.principalTexto}>Mandar</Text>
              </Pressable>
            </View>
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
  cuerpo: { padding: 16, gap: 12, paddingBottom: 40 },

  pestanas: {
    flexDirection: 'row', borderRadius: 13, padding: 4, gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pestana: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center' },
  pestanaTexto: { fontSize: 14, fontWeight: '700' },

  mandar: {
    borderWidth: 1.5, borderRadius: 13, borderStyle: 'dashed',
    paddingVertical: 14, alignItems: 'center',
  },
  mandarTexto: { fontSize: 15, fontWeight: '700' },

  tarjeta: { borderWidth: 1, borderRadius: 15, padding: 15, gap: 7 },
  filaTitulo: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  emoji: { fontSize: 17 },
  titulo: { flex: 1, fontSize: 16.5, fontWeight: '700' },
  hecho: { fontSize: 12.5, fontWeight: '700' },
  de: { fontSize: 13, lineHeight: 18 },
  nota: { fontSize: 14, lineHeight: 20 },
  pendiente: { fontSize: 12.5, fontStyle: 'italic' },
  respuesta: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 11, padding: 11, gap: 3 },
  respuestaQuien: { fontSize: 11.5, fontWeight: '700' },
  respuestaTexto: { fontSize: 14.5, lineHeight: 20 },

  vacio: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 15, padding: 20, gap: 8 },
  vacioTitulo: { fontSize: 17, fontWeight: '700' },
  vacioTexto: { fontSize: 14, lineHeight: 20 },

  fondo: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  hoja: { borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, maxHeight: '90%' },
  hojaTitulo: { fontSize: 20, fontWeight: '800', marginBottom: 6 },
  hojaAyuda: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  hojaBotones: { flexDirection: 'row', gap: 10, marginTop: 20 },
  secundario: {
    flex: 1, borderWidth: StyleSheet.hairlineWidth, borderRadius: 13,
    paddingVertical: 15, alignItems: 'center',
  },
  secundarioTexto: { fontSize: 15, fontWeight: '600' },
  principal: { flex: 1, borderRadius: 13, paddingVertical: 15, alignItems: 'center' },
  principalTexto: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },

  etiqueta: { fontSize: 13.5, fontWeight: '700', marginBottom: 9 },
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  opcion: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11 },
  opcionTexto: { fontSize: 14.5, fontWeight: '600' },
  ayuda: { fontSize: 12.5, lineHeight: 17, marginTop: 8 },
  interruptor: {
    borderWidth: StyleSheet.hairlineWidth, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13, marginTop: 16,
  },
  interruptorTexto: { fontSize: 15, fontWeight: '600' },
});
