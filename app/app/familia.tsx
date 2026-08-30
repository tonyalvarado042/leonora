import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';

import { Aviso } from '@/componentes/Aviso';
import { Cabecera } from '@/componentes/Cabecera';
import { CampoTexto } from '@/componentes/CampoTexto';
import {
  activos, EMOJI_TIPO_GRUPO, invitacionesPendientes, mandaEn, miRolEn, misGrupos,
  NOMBRE_ROL, NOMBRE_TIPO_GRUPO, quienVeMiCalendario,
} from '@/lib/grupos';
import { repositorio } from '@/lib/repositorio';
import { usarPaleta } from '@/lib/tema';
import type { Grupo, MiembroGrupo, Persona, RolGrupo, TipoGrupo } from '@/lib/tipos';

const AVATARES = ['👧', '👦', '👩', '👨', '🧑', '👵', '👴', '🙂', '🦊', '🐼', '🌻', '⭐'];
const TIPOS: TipoGrupo[] = ['familia', 'amigos', 'iglesia', 'otro'];

export default function Familia() {
  const p = usarPaleta();
  const [yo, setYo] = useState<Persona | null>(null);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [miembros, setMiembros] = useState<MiembroGrupo[]>([]);

  const [anadiendo, setAnadiendo] = useState<string | null>(null); // id del grupo
  const [nombre, setNombre] = useState('');
  const [rol, setRol] = useState<RolGrupo>('miembro');
  const [avatar, setAvatar] = useState('🙂');
  const [faltaPersona, setFaltaPersona] = useState<string | null>(null);

  const [creando, setCreando] = useState(false);
  const [nombreGrupo, setNombreGrupo] = useState('');
  const [tipoGrupo, setTipoGrupo] = useState<TipoGrupo>('amigos');
  const [faltaGrupo, setFaltaGrupo] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const [pe, ps, gs, ms] = await Promise.all([
      repositorio.persona(), repositorio.personas(),
      repositorio.grupos(), repositorio.miembros(),
    ]);
    setYo(pe); setPersonas(ps); setGrupos(gs); setMiembros(ms);
  }, []);

  useFocusEffect(useCallback(() => { void cargar(); }, [cargar]));

  const mios = useMemo(
    () => (yo ? misGrupos(grupos, miembros, yo.id) : []),
    [grupos, miembros, yo],
  );
  const invitaciones = useMemo(
    () => (yo ? invitacionesPendientes(grupos, miembros, yo.id) : []),
    [grupos, miembros, yo],
  );
  const meVen = useMemo(
    () => (yo ? quienVeMiCalendario(grupos, miembros, personas, yo.id) : []),
    [grupos, miembros, personas, yo],
  );

  if (!yo) {
    return (
      <SafeAreaView style={[e.pantalla, e.centrado, { backgroundColor: p.papel }]}>
        <ActivityIndicator color={p.alba} />
      </SafeAreaView>
    );
  }

  const soyYo = yo;
  const nombreDe = (id: string) => personas.find((x) => x.id === id)?.nombre ?? 'Alguien';
  const personaDe = (id: string) => personas.find((x) => x.id === id);

  async function anadir() {
    if (anadiendo === null) return;
    if (nombre.trim() === '') {
      setFaltaPersona('Escribe cómo se llama.');
      return;
    }
    try {
      await repositorio.anadirPersona(nombre, rol, avatar, anadiendo);
    } catch (err) {
      setFaltaPersona(err instanceof Error ? err.message : 'No se pudo añadir.');
      return;
    }
    await cargar();
    setAnadiendo(null);
    setNombre(''); setRol('miembro'); setAvatar('🙂');
  }

  async function crearGrupo() {
    if (nombreGrupo.trim() === '') {
      setFaltaGrupo('Ponle un nombre al grupo.');
      return;
    }
    try {
      await repositorio.crearGrupo(nombreGrupo, tipoGrupo);
    } catch (err) {
      setFaltaGrupo(err instanceof Error ? err.message : 'No se pudo crear.');
      return;
    }
    await cargar();
    setCreando(false);
    setNombreGrupo('');
  }

  async function cambiarA(id: string) {
    await repositorio.cambiarPersona(id);
    await cargar();
  }

  async function alternarCalendario(grupoId: string, ve: boolean) {
    await repositorio.verMiCalendario(grupoId, ve);
    setMiembros(await repositorio.miembros());
  }

  async function contestar(grupoId: string, acepta: boolean) {
    await repositorio.responderInvitacion(grupoId, acepta);
    await cargar();
  }

  async function salir(grupoId: string) {
    await repositorio.salirDelGrupo(grupoId);
    await cargar();
  }

  return (
    <SafeAreaView style={[e.pantalla, { backgroundColor: p.papel }]} edges={['top']}>
      <Cabecera titulo="Mi familia y mis grupos" />

      <ScrollView contentContainerStyle={e.cuerpo}>
        {/* -------------------------------------------- quién está usando */}
        <Text style={[e.seccion, { color: p.tintaSuave }]}>QUIÉN ESTÁ USANDO LA APP</Text>
        <View style={e.personas}>
          {personas.map((x) => (
            <Pressable
              key={x.id}
              role="radio"
              aria-checked={x.id === soyYo.id}
              onPress={() => cambiarA(x.id)}
              style={[
                e.persona,
                {
                  borderColor: x.id === soyYo.id ? p.alba : p.linea,
                  backgroundColor: x.id === soyYo.id ? p.albaPiso : p.tarjeta,
                },
              ]}
            >
              <Text style={e.personaAvatar}>{x.avatar_valor}</Text>
              <Text
                numberOfLines={1}
                style={[e.personaNombre, { color: x.id === soyYo.id ? p.alba : p.tinta }]}
              >
                {x.nombre.trim() === '' ? 'Sin nombre' : x.nombre}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={[e.pista, { color: p.tintaTenue }]}>
          Toca a alguien para entrar como esa persona. Cada quien tiene su
          propio horario, sus rachas y sus chispas.
        </Text>

        {/* ------------------------------------------- quién ve mi calendario */}
        <View style={[e.aviso, { backgroundColor: p.tarjeta2, borderColor: p.linea }]}>
          <Text style={[e.avisoTitulo, { color: p.tinta }]}>Quién ve tu calendario</Text>
          <Text style={[e.avisoTexto, { color: p.tintaSuave }]}>
            {meVen.length === 0
              ? 'Ahora mismo no lo ve nadie más que tú.'
              : `Lo ven ${meVen.map((x) => x.nombre).join(', ')}.`}
            {'\n'}
            En casa, papá y mamá ven el día de sus hijos aunque esté apagado
            —para eso son los papás—, y la app te lo dice aquí en vez de
            mirarte a escondidas. En los demás grupos lo decides tú.
          </Text>
        </View>

        {/* --------------------------------------------------- invitaciones */}
        {invitaciones.length > 0 && (
          <>
            <Text style={[e.seccion, { color: p.tintaSuave }]}>TE HAN INVITADO</Text>
            {invitaciones.map((g) => (
              <View key={g.id} style={[e.grupo, { backgroundColor: p.tarjeta, borderColor: p.alba }]}>
                <Text style={[e.grupoNombre, { color: p.tinta }]}>
                  {g.emoji} {g.nombre}
                </Text>
                <Text style={[e.grupoTipo, { color: p.tintaSuave }]}>
                  {NOMBRE_TIPO_GRUPO[g.tipo]} · te invitaron a entrar
                </Text>
                <View style={e.botones}>
                  <Pressable
                    role="button"
                    onPress={() => contestar(g.id, false)}
                    style={[e.secundario, { borderColor: p.linea }]}
                  >
                    <Text style={[e.secundarioTexto, { color: p.tintaSuave }]}>Ahora no</Text>
                  </Pressable>
                  <Pressable
                    role="button"
                    onPress={() => contestar(g.id, true)}
                    style={[e.principal, { backgroundColor: p.alba }]}
                  >
                    <Text style={e.principalTexto}>Entrar</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </>
        )}

        {/* --------------------------------------------------------- grupos */}
        <Text style={[e.seccion, { color: p.tintaSuave }]}>MIS GRUPOS</Text>

        {mios.map((g) => {
          const suyos = activos(miembros, g.id);
          const miFila = suyos.find((m) => m.persona_id === soyYo.id);
          const puedoInvitar = mandaEn(grupos, miembros, g.id, soyYo.id);

          return (
            <View key={g.id} style={[e.grupo, { backgroundColor: p.tarjeta, borderColor: p.linea }]}>
              <Text style={[e.grupoNombre, { color: p.tinta }]}>
                {g.emoji} {g.nombre}
              </Text>
              <Text style={[e.grupoTipo, { color: p.tintaSuave }]}>
                {NOMBRE_TIPO_GRUPO[g.tipo]} · {suyos.length}{' '}
                {suyos.length === 1 ? 'persona' : 'personas'}
              </Text>

              {suyos.map((m) => {
                const quien = personaDe(m.persona_id);
                return (
                  <View key={m.persona_id} style={e.miembro}>
                    <Text style={e.miembroAvatar}>{quien?.avatar_valor ?? '🙂'}</Text>
                    <Text style={[e.miembroNombre, { color: p.tinta }]}>
                      {nombreDe(m.persona_id)}
                      {m.persona_id === soyYo.id ? ' (tú)' : ''}
                    </Text>
                    <Text style={[e.miembroRol, { color: p.tintaTenue }]}>
                      {NOMBRE_ROL[m.rol]}
                    </Text>
                  </View>
                );
              })}

              {miFila && (
                <Pressable
                  role="switch"
                  aria-checked={miFila.ve_mi_calendario}
                  onPress={() => alternarCalendario(g.id, !miFila.ve_mi_calendario)}
                  style={[e.interruptor, { borderColor: p.linea, backgroundColor: p.tarjeta2 }]}
                >
                  <Text style={[e.interruptorTexto, { color: p.tinta }]}>
                    {miFila.ve_mi_calendario ? '☑︎' : '☐'}  Que vean mi calendario en este grupo
                  </Text>
                </Pressable>
              )}

              <View style={e.botones}>
                {puedoInvitar && (
                  <Pressable
                    role="button"
                    onPress={() => {
                      setFaltaPersona(null);
                      setRol(g.tipo === 'familia' ? 'miembro' : 'miembro');
                      setAnadiendo(g.id);
                    }}
                    style={[e.secundario, { borderColor: p.alba }]}
                  >
                    <Text style={[e.secundarioTexto, { color: p.alba }]}>+ Añadir a alguien</Text>
                  </Pressable>
                )}
                {miRolEn(miembros, g.id, soyYo.id) !== null && g.tipo !== 'familia' && (
                  <Pressable
                    role="button"
                    onPress={() => salir(g.id)}
                    style={[e.secundario, { borderColor: p.linea }]}
                  >
                    <Text style={[e.secundarioTexto, { color: p.tintaSuave }]}>Salir</Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        })}

        <Pressable
          role="button"
          onPress={() => { setFaltaGrupo(null); setCreando(true); }}
          style={[e.anadir, { borderColor: p.alba, backgroundColor: p.albaPiso }]}
        >
          <Text style={[e.anadirTexto, { color: p.alba }]}>+ Crear un grupo</Text>
        </Pressable>

        <Text style={[e.pista, { color: p.tintaTenue }]}>
          Un grupo sirve para compartir el calendario y mandarse recados. La
          familia viene puesta; los demás los creas tú.
        </Text>
      </ScrollView>

      {/* -------------------------------------------------- añadir persona */}
      <Modal
        visible={anadiendo !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setAnadiendo(null)}
      >
        <View style={e.fondo}>
          <ScrollView style={[e.hoja, { backgroundColor: p.papel }]}>
            <Text style={[e.hojaTitulo, { color: p.tinta }]}>Añadir a alguien</Text>
            <Text style={[e.hojaAyuda, { color: p.tintaSuave }]}>
              Entra en «{grupos.find((g) => g.id === anadiendo)?.nombre}» y podrá
              usar la app en este teléfono con su propio horario.
            </Text>

            <CampoTexto
              etiqueta="¿Cómo se llama?"
              obligatorio
              ayuda="Como le llames tú: Mamá, Papá, Emma…"
              error={faltaPersona}
              value={nombre}
              onChangeText={(t) => { setNombre(t); setFaltaPersona(null); }}
              placeholder="Escribe aquí"
            />

            <Text style={[e.etiqueta, { color: p.tintaSuave }]}>Su dibujo</Text>
            <View style={e.opciones}>
              {AVATARES.map((a) => (
                <Pressable
                  key={a}
                  role="radio"
                  aria-checked={avatar === a}
                  aria-label={`Dibujo ${a}`}
                  onPress={() => setAvatar(a)}
                  style={[
                    e.avatarOpcion,
                    {
                      borderColor: avatar === a ? p.alba : p.linea,
                      backgroundColor: avatar === a ? p.albaPiso : p.tarjeta,
                    },
                  ]}
                >
                  <Text style={e.avatarTexto}>{a}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[e.etiqueta, { color: p.tintaSuave, marginTop: 18 }]}>¿Qué es?</Text>
            <View style={e.opciones}>
              {(['miembro', 'tutor'] as RolGrupo[]).map((r) => (
                <Pressable
                  key={r}
                  role="radio"
                  aria-checked={rol === r}
                  onPress={() => setRol(r)}
                  style={[
                    e.opcion,
                    {
                      borderColor: rol === r ? p.alba : p.linea,
                      backgroundColor: rol === r ? p.albaPiso : p.tarjeta,
                    },
                  ]}
                >
                  <Text style={[e.opcionTexto, { color: rol === r ? p.alba : p.tinta }]}>
                    {NOMBRE_ROL[r]}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={[e.ayuda, { color: p.tintaTenue }]}>
              {rol === 'tutor'
                ? 'Un papá o una mamá ve el calendario de los hijos y les puede mandar recados.'
                : 'Un miembro ve lo suyo, y comparte lo que quiera compartir.'}
            </Text>

            <Aviso texto={faltaPersona} />

            <View style={e.hojaBotones}>
              <Pressable
                role="button"
                onPress={() => setAnadiendo(null)}
                style={[e.secundario, { borderColor: p.linea }]}
              >
                <Text style={[e.secundarioTexto, { color: p.tintaSuave }]}>Cancelar</Text>
              </Pressable>
              <Pressable
                role="button"
                onPress={anadir}
                style={[e.principal, { backgroundColor: p.alba }]}
              >
                <Text style={e.principalTexto}>Añadir</Text>
              </Pressable>
            </View>
            <View style={{ height: 30 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* ---------------------------------------------------- crear grupo */}
      <Modal
        visible={creando}
        transparent
        animationType="slide"
        onRequestClose={() => setCreando(false)}
      >
        <View style={e.fondo}>
          <View style={[e.hoja, { backgroundColor: p.papel }]}>
            <Text style={[e.hojaTitulo, { color: p.tinta }]}>Un grupo nuevo</Text>

            <CampoTexto
              etiqueta="¿Cómo se llama el grupo?"
              obligatorio
              ayuda="Por ejemplo: «Las amigas» o «Jóvenes de la iglesia»."
              error={faltaGrupo}
              value={nombreGrupo}
              onChangeText={(t) => { setNombreGrupo(t); setFaltaGrupo(null); }}
              placeholder="Escribe aquí"
            />

            <Text style={[e.etiqueta, { color: p.tintaSuave }]}>¿De qué tipo?</Text>
            <View style={e.opciones}>
              {TIPOS.map((t) => (
                <Pressable
                  key={t}
                  role="radio"
                  aria-checked={tipoGrupo === t}
                  onPress={() => setTipoGrupo(t)}
                  style={[
                    e.opcion,
                    {
                      borderColor: tipoGrupo === t ? p.alba : p.linea,
                      backgroundColor: tipoGrupo === t ? p.albaPiso : p.tarjeta,
                    },
                  ]}
                >
                  <Text style={[e.opcionTexto, { color: tipoGrupo === t ? p.alba : p.tinta }]}>
                    {EMOJI_TIPO_GRUPO[t]} {NOMBRE_TIPO_GRUPO[t]}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Aviso texto={faltaGrupo} />

            <View style={e.hojaBotones}>
              <Pressable
                role="button"
                onPress={() => setCreando(false)}
                style={[e.secundario, { borderColor: p.linea }]}
              >
                <Text style={[e.secundarioTexto, { color: p.tintaSuave }]}>Cancelar</Text>
              </Pressable>
              <Pressable
                role="button"
                onPress={crearGrupo}
                style={[e.principal, { backgroundColor: p.alba }]}
              >
                <Text style={e.principalTexto}>Crear</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const e = StyleSheet.create({
  pantalla: { flex: 1 },
  centrado: { alignItems: 'center', justifyContent: 'center' },
  cuerpo: { padding: 16, gap: 12, paddingBottom: 40 },

  seccion: { fontSize: 12, fontWeight: '800', letterSpacing: 0.6, marginTop: 8 },

  personas: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  persona: {
    borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 13, paddingVertical: 11,
    alignItems: 'center', gap: 4, minWidth: 84,
  },
  personaAvatar: { fontSize: 26 },
  personaNombre: { fontSize: 13.5, fontWeight: '700', maxWidth: 90 },

  aviso: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, padding: 15, gap: 6 },
  avisoTitulo: { fontSize: 15, fontWeight: '700' },
  avisoTexto: { fontSize: 13.5, lineHeight: 19 },

  grupo: { borderWidth: 1, borderRadius: 15, padding: 15, gap: 6 },
  grupoNombre: { fontSize: 17, fontWeight: '700' },
  grupoTipo: { fontSize: 13 },
  miembro: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 4 },
  miembroAvatar: { fontSize: 19 },
  miembroNombre: { flex: 1, fontSize: 15, fontWeight: '600' },
  miembroRol: { fontSize: 12 },

  interruptor: {
    borderWidth: StyleSheet.hairlineWidth, borderRadius: 12,
    paddingHorizontal: 13, paddingVertical: 12, marginTop: 10,
  },
  interruptorTexto: { fontSize: 14, fontWeight: '600' },

  botones: { flexDirection: 'row', gap: 9, marginTop: 12 },
  anadir: {
    borderWidth: 1.5, borderRadius: 13, borderStyle: 'dashed',
    paddingVertical: 14, alignItems: 'center',
  },
  anadirTexto: { fontSize: 15, fontWeight: '700' },
  pista: { fontSize: 12.5, lineHeight: 18 },

  fondo: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  hoja: { borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, maxHeight: '90%' },
  hojaTitulo: { fontSize: 20, fontWeight: '800', marginBottom: 6 },
  hojaAyuda: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  hojaBotones: { flexDirection: 'row', gap: 10, marginTop: 20 },
  secundario: {
    flex: 1, borderWidth: 1, borderRadius: 13,
    paddingVertical: 14, alignItems: 'center',
  },
  secundarioTexto: { fontSize: 14.5, fontWeight: '600' },
  principal: { flex: 1, borderRadius: 13, paddingVertical: 14, alignItems: 'center' },
  principalTexto: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },

  etiqueta: { fontSize: 13.5, fontWeight: '700', marginTop: 18, marginBottom: 9 },
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  opcion: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11 },
  opcionTexto: { fontSize: 14.5, fontWeight: '600' },
  avatarOpcion: {
    width: 46, height: 46, borderRadius: 12, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarTexto: { fontSize: 22 },
  ayuda: { fontSize: 12.5, lineHeight: 17, marginTop: 8 },
});
