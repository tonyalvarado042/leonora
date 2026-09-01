import { useEffect, useRef } from 'react';
import {
  Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { usarPaleta } from '@/lib/tema';
import type { Persona } from '@/lib/tipos';

interface Sitio {
  ruta: string;
  emoji: string;
  nombre: string;
  /** El número rojo, si lo lleva. */
  cuenta?: number;
}

/** Lo de arriba es el día a día; lo de abajo, lo que se abre de vez en cuando. */
const ARRIBA: Sitio[] = [
  { ruta: '/', emoji: '☀️', nombre: 'Hoy' },
  { ruta: '/mensajes', emoji: '💬', nombre: 'Mensajes' },
  { ruta: '/calendario', emoji: '📅', nombre: 'Mi semana y mi mes' },
  { ruta: '/rutina', emoji: '🗓️', nombre: 'Mi rutina' },
  { ruta: '/eventos', emoji: '🎂', nombre: 'Fechas importantes' },
];

const ABAJO: Sitio[] = [
  { ruta: '/familia', emoji: '🏠', nombre: 'Mi familia y mis grupos' },
  { ruta: '/rachas', emoji: '🔥', nombre: 'Rachas y chispas' },
  { ruta: '/versiculo', emoji: '📖', nombre: 'Versículo del día' },
];

/** Solo sale si ella lo encendió. No se le enseña a nadie más, y a ella
 *  tampoco si no lo quiso. */
const MI_CALENDARIO: Sitio = { ruta: '/ciclo', emoji: '🌸', nombre: 'Mi calendario' };

const AJUSTES: Sitio = { ruta: '/ajustes', emoji: '⚙️', nombre: 'Ajustes' };

/** Va abajo del todo, junto a Ajustes: la app se usa sin cuenta, y entrar es
 *  algo que se hace una vez, no todos los días. */
const CUENTA: Sitio = { ruta: '/entrar', emoji: '☁️', nombre: 'Mi cuenta' };

interface Props {
  visible: boolean;
  onCerrar: () => void;
  /** La ruta en la que se está, para marcarla. */
  aqui: string;
  persona: Persona | null;
  sinLeer: number;
  /** Abre el selector de persona. Si no se pasa, lleva a Familia. */
  onCambiarPersona?: () => void;
  /** Si ella encendió el calendario del ciclo. */
  conCiclo?: boolean;
}

/**
 * El menú de las tres rayas.
 *
 * Antes, las cinco maneras de ir a otro sitio estaban apiladas al final de
 * Hoy: había que bajar hasta abajo, y cuantas más tareas tenía el día, más
 * lejos quedaban. Aquí están siempre a un toque, desde cualquier pantalla.
 *
 * **Lo que no entra aquí a propósito:** la racha con las chispas y la
 * campanita. No son sitios a los que ir, son cosas que tienen que verse — una
 * racha escondida detrás de un botón deja de hacer que vuelvas.
 */
export function MenuLateral({
  visible, onCerrar, aqui, persona, sinLeer, onCambiarPersona, conCiclo = false,
}: Props) {
  const p = usarPaleta();
  const router = useRouter();
  const arriba = useSafeAreaInsets().top;
  const desplazar = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    Animated.timing(desplazar, {
      toValue: visible ? 0 : -1,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [visible, desplazar]);

  function ir(ruta: string) {
    onCerrar();
    if (ruta === aqui) return;
    // A Hoy se vuelve, no se apila: si no, se acumulan pantallas detrás.
    if (ruta === '/') router.replace('/');
    else router.push(ruta as never);
  }

  const conCuenta: Sitio[] = ARRIBA.map((s) =>
    s.ruta === '/mensajes' ? { ...s, cuenta: sinLeer } : s);

  const Fila = ({ sitio }: { sitio: Sitio }) => {
    const activo = sitio.ruta === aqui;
    return (
      <Pressable
        role="link"
        aria-label={sitio.nombre}
        aria-current={activo ? 'page' : undefined}
        onPress={() => ir(sitio.ruta)}
        style={({ pressed }) => [
          e.fila,
          activo && { backgroundColor: p.albaPiso },
          pressed && !activo && { backgroundColor: p.tarjeta2 },
        ]}
      >
        <Text style={e.emoji}>{sitio.emoji}</Text>
        <Text style={[e.nombre, { color: activo ? p.alba : p.tinta }]}>{sitio.nombre}</Text>
        {sitio.cuenta ? (
          <View style={[e.globo, { backgroundColor: p.fuego }]}>
            <Text style={e.globoTexto}>{sitio.cuenta > 9 ? '9+' : sitio.cuenta}</Text>
          </View>
        ) : null}
      </Pressable>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCerrar}>
      <View style={e.fondo}>
        <Animated.View
          style={[
            e.cajon,
            {
              backgroundColor: p.papel,
              borderRightColor: p.linea,
              paddingTop: arriba + 16,
              transform: [{
                translateX: desplazar.interpolate({
                  inputRange: [-1, 0], outputRange: [-320, 0],
                }),
              }],
            },
          ]}
        >
          <Pressable
            role="button"
            aria-label={`${persona?.nombre || 'Sin nombre'}. Cambiar de persona`}
            onPress={() => {
              onCerrar();
              if (onCambiarPersona) onCambiarPersona();
              else router.push('/familia');
            }}
            style={[e.quien, { borderBottomColor: p.linea }]}
          >
            <View style={[e.avatar, { backgroundColor: p.albaPiso }]}>
              <Text style={e.avatarTexto}>{persona?.avatar_valor ?? '🙂'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={[e.quienNombre, { color: p.tinta }]}>
                {persona?.nombre?.trim() || 'Sin nombre'}
              </Text>
              <Text style={[e.quienPista, { color: p.alba }]}>Cambiar de persona ›</Text>
            </View>
          </Pressable>

          <ScrollView contentContainerStyle={e.lista}>
            {conCuenta.map((s) => <Fila key={s.ruta} sitio={s} />)}
            <View style={[e.raya, { backgroundColor: p.linea }]} />
            {ABAJO.map((s) => <Fila key={s.ruta} sitio={s} />)}
            {conCiclo && <Fila sitio={MI_CALENDARIO} />}
            <View style={[e.raya, { backgroundColor: p.linea }]} />
            <Fila sitio={CUENTA} />
            <Fila sitio={AJUSTES} />
          </ScrollView>

          <Text style={[e.pie, { color: p.tintaTenue, borderTopColor: p.linea }]}>
            GraceDay · tu día, tu fe y tu gente
          </Text>
        </Animated.View>

        {/* El velo va **al lado** del cajón, no debajo: si lo tapara entero, un
            toque en el centro caería sobre el cajón en vez de cerrar. */}
        <Pressable
          role="button"
          aria-label="Cerrar el menú"
          onPress={onCerrar}
          style={e.velo}
        />
      </View>
    </Modal>
  );
}

/** El botón de las tres rayas, para la cabecera de cualquier pantalla. */
export function BotonMenu({ onPress }: { onPress: () => void }) {
  const p = usarPaleta();
  return (
    <Pressable
      role="button"
      aria-label="Abrir el menú"
      hitSlop={10}
      onPress={onPress}
      style={({ pressed }) => [
        e.boton,
        { borderColor: p.linea, backgroundColor: p.tarjeta, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <View style={[e.raya3, { backgroundColor: p.tinta }]} />
      <View style={[e.raya3, { backgroundColor: p.tinta }]} />
      <View style={[e.raya3, { backgroundColor: p.tinta }]} />
    </Pressable>
  );
}

const e = StyleSheet.create({
  fondo: { flex: 1, flexDirection: 'row' },
  velo: { flex: 1, backgroundColor: 'rgba(20,16,38,0.55)' },
  cajon: {
    width: 300, maxWidth: '85%', height: '100%',
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12, paddingBottom: 12,
  },
  quien: {
    flexDirection: 'row', alignItems: 'center', gap: 11,
    paddingBottom: 14, marginBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatarTexto: { fontSize: 22 },
  quienNombre: { fontSize: 17, fontWeight: '700' },
  quienPista: { fontSize: 12.5, fontWeight: '600', marginTop: 1 },

  lista: { gap: 2, paddingBottom: 10 },
  fila: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 12, paddingVertical: 13, borderRadius: 12,
  },
  emoji: { fontSize: 17, width: 22, textAlign: 'center' },
  nombre: { flex: 1, fontSize: 15.5, fontWeight: '600' },
  globo: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  globoTexto: { color: '#FFFFFF', fontSize: 11.5, fontWeight: '800' },
  raya: { height: StyleSheet.hairlineWidth, marginVertical: 8, marginHorizontal: 12 },
  pie: {
    fontSize: 12, paddingTop: 12, paddingHorizontal: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },

  boton: {
    width: 38, height: 38, borderRadius: 11, borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center', justifyContent: 'center', gap: 3.5,
  },
  raya3: { width: 16, height: 1.8, borderRadius: 2 },
});
