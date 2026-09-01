import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname, useRouter } from 'expo-router';
import type { ReactNode } from 'react';

import { BotonMenu, MenuLateral } from '@/componentes/MenuLateral';
import { sinLeer } from '@/lib/encargos';
import { repositorio } from '@/lib/repositorio';
import { usarPaleta } from '@/lib/tema';
import type { Persona } from '@/lib/tipos';

interface Props {
  titulo: string;
  /** A dónde ir al tocar atrás. Por defecto, la pantalla anterior. */
  atras?: () => void;
  derecha?: ReactNode;
  /** El menú de las tres rayas. Se apaga donde estorbaría: en el asistente de
   *  arranque, salirse a otra pantalla a media pregunta pierde lo escrito. */
  conMenu?: boolean;
}

/**
 * La cabecera de toda pantalla que no sea Hoy.
 *
 * Es propia y no la del navegador porque esa **no pinta el botón de volver en
 * web**: la app se quedaba sin salida en el calendario, la rutina y los
 * ajustes. Además así se ve igual en iPhone, Android y navegador.
 */
export function Cabecera({ titulo, atras, derecha, conMenu = true }: Props) {
  const p = usarPaleta();
  const router = useRouter();
  const aqui = usePathname();
  const arriba = useSafeAreaInsets().top;
  const [menu, setMenu] = useState(false);
  const [persona, setPersona] = useState<Persona | null>(null);
  const [nuevos, setNuevos] = useState(0);
  const [conCiclo, setConCiclo] = useState(false);

  // Solo se lee al abrir el menú: cargarlo en cada pantalla que lleva cabecera
  // sería leer el almacén entero para pintar un botón.
  const cargar = useCallback(async () => {
    const [pe, encargos, ajustes] = await Promise.all([
      repositorio.persona(), repositorio.encargos(), repositorio.ajustes(),
    ]);
    setPersona(pe);
    setNuevos(sinLeer(encargos, pe.id));
    setConCiclo(ajustes.ciclo_activo);
  }, []);

  useEffect(() => { if (menu) void cargar(); }, [menu, cargar]);

  return (
    <View style={[e.barra, { paddingTop: arriba + 10, backgroundColor: p.papel, borderBottomColor: p.linea }]}>
      <Pressable
        role="button"
        aria-label="Volver"
        hitSlop={12}
        onPress={() => (atras ? atras() : router.canGoBack() ? router.back() : router.replace('/'))}
        style={({ pressed }) => [
          e.atras,
          { borderColor: p.linea, backgroundColor: p.tarjeta, opacity: pressed ? 0.6 : 1 },
        ]}
      >
        <Text style={[e.flecha, { color: p.tinta }]}>‹</Text>
      </Pressable>

      <Text numberOfLines={1} style={[e.titulo, { color: p.tinta }]}>{titulo}</Text>

      <View style={e.derecha}>{derecha}</View>
      {conMenu && <BotonMenu onPress={() => setMenu(true)} />}

      <MenuLateral
        visible={menu}
        onCerrar={() => setMenu(false)}
        aqui={aqui}
        persona={persona}
        sinLeer={nuevos}
        conCiclo={conCiclo}
      />
    </View>
  );
}

const e = StyleSheet.create({
  barra: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  atras: {
    width: 38, height: 38, borderRadius: 11, borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center', justifyContent: 'center',
  },
  flecha: { fontSize: 22, lineHeight: 26, marginTop: -3 },
  titulo: { flex: 1, fontSize: 18, fontWeight: '700' },
  derecha: { minWidth: 38, alignItems: 'flex-end' },
});
