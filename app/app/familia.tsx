import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';

import { Aviso } from '@/componentes/Aviso';
import { Cabecera } from '@/componentes/Cabecera';
import { CampoTexto } from '@/componentes/CampoTexto';
import {
  activos, EMOJI_TIPO_GRUPO, invitacionesPendientes, miRolEn, misGrupos,
  NOMBRE_ROL, NOMBRE_TIPO_GRUPO, puedoAnadirA, puedoAnadirTutor, puedoVerElCalendarioDe,
  quienVeMiCalendario,
} from '@/lib/grupos';
import { armarMensaje, comoCorreo, comoWhatsApp, type Mensaje } from '@/lib/invitaciones';
import { repositorio } from '@/lib/repositorio';
import { usarPaleta } from '@/lib/tema';
import type {
  Grupo, Invitacion, MiembroGrupo, Persona, RolGrupo, TipoGrupo,
} from '@/lib/tipos';

const AVATARES = ['👧', '👦', '👩', '👨', '🧑', '👵', '👴', '🙂', '🦊', '🐼', '🌻', '⭐'];
const TIPOS: TipoGrupo[] = ['familia', 'amigos', 'iglesia', 'otro'];

export default function Familia() {
  const p = usarPaleta();
  const [yo, setYo] = useState<Persona | null>(null);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [miembros, setMiembros] = useState<MiembroGrupo[]>([]);

  /** Las que se mandaron por correo y todavía no ha usado nadie. */
  const [porCorreo, setPorCorreo] = useState<Invitacion[]>([]);
  const router = useRouter();

  const [anadiendo, setAnadiendo] = useState<string | null>(null); // id del grupo
  const [comoEntra, setComoEntra] = useState<'aqui' | 'correo'>('aqui');
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [rol, setRol] = useState<RolGrupo>('miembro');
  const [avatar, setAvatar] = useState('🙂');
  const [faltaPersona, setFaltaPersona] = useState<string | null>(null);

  /** La invitación recién hecha, para poder mandarla ahí mismo. */
  const [mandando, setMandando] = useState<Mensaje | null>(null);

  const [entrando, setEntrando] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [faltaCodigo, setFaltaCodigo] = useState<string | null>(null);
  const [entro, setEntro] = useState<string | null>(null);

  const [creando, setCreando] = useState(false);
  const [nombreGrupo, setNombreGrupo] = useState('');
  const [tipoGrupo, setTipoGrupo] = useState<TipoGrupo>('amigos');
  const [faltaGrupo, setFaltaGrupo] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const [pe, ps, gs, ms, inv] = await Promise.all([
      repositorio.persona(), repositorio.personas(),
      repositorio.grupos(), repositorio.miembros(), repositorio.invitaciones(),
    ]);
    setYo(pe); setPersonas(ps); setGrupos(gs); setMiembros(ms); setPorCorreo(inv);
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
  const puedoPonerTutor = anadiendo !== null
    && puedoAnadirTutor(grupos, miembros, anadiendo, yo.id);
  const nombreDe = (id: string) => personas.find((x) => x.id === id)?.nombre ?? 'Alguien';
  const personaDe = (id: string) => personas.find((x) => x.id === id);

  async function anadir() {
    if (anadiendo === null) return;
    if (nombre.trim() === '') {
      setFaltaPersona('Escribe cómo se llama.');
      return;
    }
    if (comoEntra === 'correo' && correo.trim() === '') {
      setFaltaPersona('Escribe su correo, o elige «Entra en este teléfono».');
      return;
    }

    try {
      if (comoEntra === 'correo') {
        const inv = await repositorio.invitarPorCorreo(anadiendo, nombre, correo, rol);
        const grupo = grupos.find((g) => g.id === anadiendo);
        await cargar();
        setAnadiendo(null);
        // La invitación ya existe; ahora hay que mandarla de verdad.
        if (grupo && yo) setMandando(armarMensaje(inv, grupo, yo));
      } else {
        await repositorio.anadirPersona({
          nombre, rol, avatar, grupoId: anadiendo,
        });
        await cargar();
        setAnadiendo(null);
      }
    } catch (err) {
      setFaltaPersona(err instanceof Error ? err.message : 'No se pudo añadir.');
      return;
    }
    setNombre(''); setCorreo(''); setRol('miembro'); setAvatar('🙂');
  }

  /** Abre la app de correo o WhatsApp con la invitación ya escrita.
   *  Si el teléfono no puede abrirla, se dice: un botón que no hace nada y no
   *  lo cuenta es peor que no tener el botón. */
  async function mandarPor(enlace: string, donde: string) {
    try {
      await Linking.openURL(enlace);
    } catch {
      setFaltaCodigo(`No se pudo abrir ${donde}. Copia el código y mándaselo tú.`);
    }
  }

  async function entrarConCodigo() {
    if (codigo.trim() === '') {
      setFaltaCodigo('Escribe el código que te mandaron.');
      return;
    }
    try {
      const grupo = await repositorio.unirseConCodigo(codigo);
      await cargar();
      setEntrando(false);
      setCodigo('');
      setEntro(grupo.nombre);
    } catch (err) {
      setFaltaCodigo(err instanceof Error ? err.message : 'No se pudo entrar.');
    }
  }

  async function cancelarInvitacion(id: string) {
    await repositorio.cancelarInvitacion(id);
    await cargar();
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
          const puedoInvitar = puedoAnadirA(miembros, g.id, soyYo.id);
          const esperando = porCorreo.filter(
            (x) => x.grupo_id === g.id && x.aceptada_en === null,
          );

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
                const veo = puedoVerElCalendarioDe(grupos, miembros, soyYo.id, m.persona_id);
                return (
                  <Pressable
                    key={m.persona_id}
                    role="button"
                    aria-label={veo
                      ? `Ver el día de ${nombreDe(m.persona_id)}`
                      : `${nombreDe(m.persona_id)} no comparte su calendario`}
                    disabled={!veo}
                    onPress={() => router.push({
                      pathname: '/horario', params: { persona: m.persona_id },
                    })}
                    style={e.miembro}
                  >
                    <Text style={e.miembroAvatar}>{quien?.avatar_valor ?? '🙂'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[e.miembroNombre, { color: p.tinta }]}>
                        {nombreDe(m.persona_id)}
                        {m.persona_id === soyYo.id ? ' (tú)' : ''}
                      </Text>
                      <Text style={[e.miembroRol, { color: p.tintaTenue }]}>
                        {NOMBRE_ROL[m.rol]}
                        {veo ? ' · toca para ver su día' : ' · no comparte su calendario'}
                      </Text>
                    </View>
                    {veo && <Text style={[e.flecha, { color: p.tintaTenue }]}>›</Text>}
                  </Pressable>
                );
              })}

              {esperando.map((x) => (
                <View key={x.id} style={e.miembro}>
                  <Text style={e.miembroAvatar}>✉️</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[e.miembroNombre, { color: p.tintaSuave }]}>{x.nombre}</Text>
                    <Text style={[e.miembroRol, { color: p.tintaTenue }]}>
                      Invitada a {x.email} · código {x.codigo}
                    </Text>
                  </View>
                  <Pressable
                    role="button"
                    aria-label={`Volver a mandar la invitación de ${x.nombre}`}
                    onPress={() => setMandando(armarMensaje(x, g, soyYo))}
                    style={[e.chico, { borderColor: p.linea }]}
                  >
                    <Text style={[e.chicoTexto, { color: p.alba }]}>Mandar</Text>
                  </Pressable>
                  <Pressable
                    role="button"
                    aria-label={`Cancelar la invitación de ${x.nombre}`}
                    onPress={() => cancelarInvitacion(x.id)}
                    style={[e.chico, { borderColor: p.linea }]}
                  >
                    <Text style={[e.chicoTexto, { color: p.tintaTenue }]}>Quitar</Text>
                  </Pressable>
                </View>
              ))}

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
                      setComoEntra('aqui');
                      setRol('miembro');
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

        <Pressable
          role="button"
          onPress={() => { setFaltaCodigo(null); setEntro(null); setEntrando(true); }}
          style={[e.anadir, { borderColor: p.linea, backgroundColor: p.tarjeta }]}
        >
          <Text style={[e.anadirTexto, { color: p.tintaSuave }]}>
            Entrar con un código
          </Text>
        </Pressable>

        {entro && (
          <View style={[e.aviso, { backgroundColor: p.verdePiso, borderColor: p.verde }]}>
            <Text style={[e.avisoTitulo, { color: p.verde }]}>Ya estás en «{entro}»</Text>
            <Text style={[e.avisoTexto, { color: p.tintaSuave }]}>
              Ahí abajo tienes a su gente y sus horarios.
            </Text>
          </View>
        )}

        <Text style={[e.pista, { color: p.tintaTenue }]}>
          Un grupo sirve para compartir el calendario y mandarse mensajes. La
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
              Entra en «{grupos.find((g) => g.id === anadiendo)?.nombre}».
            </Text>

            <CampoTexto
              etiqueta="¿Cómo se llama?"
              obligatorio
              ayuda="Como le llames tú: Mamá, Papá, Emma…"
              error={faltaPersona && nombre.trim() === '' ? faltaPersona : null}
              value={nombre}
              onChangeText={(t) => { setNombre(t); setFaltaPersona(null); }}
              placeholder="Escribe aquí"
            />

            <Text style={[e.etiqueta, { color: p.tintaSuave }]}>¿Cómo entra?</Text>
            <View style={e.opciones}>
              {([
                ['aqui', '📱 Entra en este teléfono'],
                ['correo', '✉️ Le mando una invitación'],
              ] as const).map(([id, texto]) => (
                <Pressable
                  key={id}
                  role="radio"
                  aria-checked={comoEntra === id}
                  onPress={() => { setComoEntra(id); setFaltaPersona(null); }}
                  style={[
                    e.opcion,
                    {
                      borderColor: comoEntra === id ? p.alba : p.linea,
                      backgroundColor: comoEntra === id ? p.albaPiso : p.tarjeta,
                    },
                  ]}
                >
                  <Text style={[e.opcionTexto, { color: comoEntra === id ? p.alba : p.tinta }]}>
                    {texto}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={[e.ayuda, { color: p.tintaTenue }]}>
              {comoEntra === 'aqui'
                ? 'Aparece ya arriba, y se cambia de persona tocando el dibujo. Es lo que sirve para un teléfono de casa.'
                : 'Le llega un correo con un código. Entra desde su propio teléfono, con su cuenta.'}
            </Text>

            {comoEntra === 'correo' && (
              <>
                <View style={{ height: 16 }} />
                <CampoTexto
                  etiqueta="Su correo"
                  obligatorio
                  ayuda="Ahí le llega la invitación con el código."
                  error={faltaPersona && nombre.trim() !== '' ? faltaPersona : null}
                  value={correo}
                  onChangeText={(t) => { setCorreo(t); setFaltaPersona(null); }}
                  placeholder="nombre@correo.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </>
            )}

            {comoEntra === 'aqui' && (
              <Text style={[e.etiqueta, { color: p.tintaSuave }]}>Su dibujo</Text>
            )}
            <View style={[e.opciones, comoEntra !== 'aqui' && e.escondido]}>
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
                  onPress={() => {
                    // El botón no se apaga: se pulsa y dice por qué no (R2).
                    if (r === 'tutor' && !puedoPonerTutor) {
                      setFaltaPersona(
                        'Solo quien creó el grupo, o un papá o mamá, puede añadir a otro papá o mamá.',
                      );
                      return;
                    }
                    setFaltaPersona(null);
                    setRol(r);
                  }}
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
                ? 'Un papá o una mamá ve el calendario de los hijos y les puede poner tareas.'
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

      {/* -------------------------------------------- mandar la invitación */}
      <Modal
        visible={mandando !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setMandando(null)}
      >
        <View style={e.fondo}>
          <ScrollView style={[e.hoja, { backgroundColor: p.papel }]}>
            <Text style={[e.hojaTitulo, { color: p.tinta }]}>Mándale la invitación</Text>
            <Text style={[e.hojaAyuda, { color: p.tintaSuave }]}>
              Ya está apuntada. Ahora hay que hacérsela llegar: se abre tu correo
              o tu WhatsApp con el mensaje escrito.
            </Text>

            <View style={[e.codigoCaja, { backgroundColor: p.albaPiso, borderColor: p.alba }]}>
              <Text style={[e.codigoRotulo, { color: p.alba }]}>SU CÓDIGO</Text>
              <Text selectable style={[e.codigoTexto, { color: p.tinta }]}>
                {mandando?.codigo}
              </Text>
              <Text style={[e.codigoPara, { color: p.tintaSuave }]}>
                Para {mandando?.para}
              </Text>
            </View>

            <View style={e.botones}>
              <Pressable
                role="button"
                onPress={() => mandando && mandarPor(comoCorreo(mandando), 'el correo')}
                style={[e.principal, { backgroundColor: p.alba }]}
              >
                <Text style={e.principalTexto}>✉️  Por correo</Text>
              </Pressable>
              <Pressable
                role="button"
                onPress={() => mandando && mandarPor(comoWhatsApp(mandando), 'WhatsApp')}
                style={[e.principal, { backgroundColor: p.verde }]}
              >
                <Text style={e.principalTexto}>💬  Por WhatsApp</Text>
              </Pressable>
            </View>

            <Text style={[e.etiqueta, { color: p.tintaSuave }]}>O cópialo tú</Text>
            <Text selectable style={[e.mensaje, { color: p.tintaSuave, backgroundColor: p.tarjeta2 }]}>
              {mandando?.cuerpo}
            </Text>

            <Aviso texto={faltaCodigo} />

            <Pressable
              role="button"
              onPress={() => { setMandando(null); setFaltaCodigo(null); }}
              style={[e.secundarioSolo, { borderColor: p.linea }]}
            >
              <Text style={[e.secundarioTexto, { color: p.tintaSuave }]}>Listo</Text>
            </Pressable>
            <View style={{ height: 30 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* ------------------------------------------- entrar con un código */}
      <Modal
        visible={entrando}
        transparent
        animationType="slide"
        onRequestClose={() => setEntrando(false)}
      >
        <View style={e.fondo}>
          <View style={[e.hoja, { backgroundColor: p.papel }]}>
            <Text style={[e.hojaTitulo, { color: p.tinta }]}>Entrar con un código</Text>
            <Text style={[e.hojaAyuda, { color: p.tintaSuave }]}>
              Si te invitaron a un grupo, te llegó un código a tu correo. Escríbelo
              aquí y entras.
            </Text>

            <CampoTexto
              etiqueta="El código"
              obligatorio
              ayuda="Así: CASA-4F2A. Da igual mayúsculas o minúsculas."
              error={faltaCodigo}
              value={codigo}
              onChangeText={(t) => { setCodigo(t); setFaltaCodigo(null); }}
              placeholder="CASA-4F2A"
              autoCapitalize="characters"
            />

            <Aviso texto={faltaCodigo} />

            <View style={e.hojaBotones}>
              <Pressable
                role="button"
                onPress={() => setEntrando(false)}
                style={[e.secundario, { borderColor: p.linea }]}
              >
                <Text style={[e.secundarioTexto, { color: p.tintaSuave }]}>Cancelar</Text>
              </Pressable>
              <Pressable
                role="button"
                onPress={entrarConCodigo}
                style={[e.principal, { backgroundColor: p.alba }]}
              >
                <Text style={e.principalTexto}>Entrar</Text>
              </Pressable>
            </View>
          </View>
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
  escondido: { display: 'none' },
  flecha: { fontSize: 20 },
  chico: {
    borderWidth: StyleSheet.hairlineWidth, borderRadius: 9,
    paddingHorizontal: 10, paddingVertical: 7,
  },
  chicoTexto: { fontSize: 12.5, fontWeight: '600' },
  codigoCaja: {
    borderWidth: 1.5, borderRadius: 15, padding: 18, alignItems: 'center', gap: 5,
  },
  codigoRotulo: { fontSize: 11.5, fontWeight: '800', letterSpacing: 0.7 },
  codigoTexto: { fontSize: 28, fontWeight: '800', letterSpacing: 2 },
  codigoPara: { fontSize: 13 },
  mensaje: {
    fontSize: 12.5, lineHeight: 18, padding: 13, borderRadius: 12, marginTop: 4,
  },
  secundarioSolo: {
    borderWidth: StyleSheet.hairlineWidth, borderRadius: 13,
    paddingVertical: 15, alignItems: 'center', marginTop: 18,
  },
});
