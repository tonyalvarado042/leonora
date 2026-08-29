import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';

import type { Celebracion as Tipo } from '@/lib/rachas';

/**
 * La celebración cae por encima de TODA la app, no dentro de una tarjeta.
 *
 * Por eso vive en la raíz del enrutador y se dispara con `useCelebrar()` desde
 * cualquier pantalla. Dura dos segundos y se va sola.
 *
 * Cada premio tiene su forma, así se sabe qué pasó sin leer nada:
 * 🔥 fuego para la rapidez y las rachas · 🎉 confeti para una insignia nueva ·
 * ⭐ estrellas para el día completo.
 */

const RECETAS: Record<Tipo, { n: number; emojis: string[]; desdeAbajo: boolean }> = {
  fuego:     { n: 26, emojis: ['🔥', '✨', '🔥'],           desdeAbajo: true },
  confeti:   { n: 34, emojis: ['🎉', '🎊', '💜', '⭐', '🩷'], desdeAbajo: false },
  estrellas: { n: 26, emojis: ['⭐', '🌟', '✨'],            desdeAbajo: false },
};

interface Ctx {
  celebrar: (tipo: Tipo | null, texto?: string) => void;
}
const Contexto = createContext<Ctx>({ celebrar: () => {} });

export function useCelebrar(): Ctx['celebrar'] {
  return useContext(Contexto).celebrar;
}

export function ProveedorCelebracion({
  children, activadas = true,
}: { children: ReactNode; activadas?: boolean }) {
  const [tanda, setTanda] = useState<{ id: number; tipo: Tipo; texto?: string } | null>(null);
  const [menosMovimiento, setMenosMovimiento] = useState(false);
  const contador = useRef(0);

  useEffect(() => {
    let vivo = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => { if (vivo) setMenosMovimiento(v); });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setMenosMovimiento);
    return () => { vivo = false; sub.remove(); };
  }, []);

  const celebrar = useCallback((tipo: Tipo | null, texto?: string) => {
    if (!tipo || !activadas) return;
    contador.current += 1;
    setTanda({ id: contador.current, tipo, texto });
  }, [activadas]);

  const valor = useMemo(() => ({ celebrar }), [celebrar]);

  return (
    <Contexto.Provider value={valor}>
      {children}
      {tanda && (
        <Lluvia
          key={tanda.id}
          tipo={tanda.tipo}
          texto={tanda.texto}
          quieta={menosMovimiento}
          alTerminar={() => setTanda(null)}
        />
      )}
    </Contexto.Provider>
  );
}

function Lluvia({ tipo, texto, quieta, alTerminar }: {
  tipo: Tipo; texto?: string; quieta: boolean; alTerminar: () => void;
}) {
  const receta = RECETAS[tipo];
  const avance = useRef(new Animated.Value(0)).current;

  // Se sortean una vez y se quedan quietas: recalcularlas en cada fotograma
  // haría bailar las partículas.
  const piezas = useMemo(
    () => Array.from({ length: quieta ? 0 : receta.n }, (_, i) => ({
      i,
      x: Math.random(),
      deriva: (Math.random() - 0.5) * 140,
      giro: (Math.random() - 0.5) * 3,
      tam: 18 + Math.random() * 20,
      retraso: Math.random() * 320,
      emoji: receta.emojis[i % receta.emojis.length],
    })),
    [receta, quieta],
  );

  useEffect(() => {
    const anim = Animated.timing(avance, {
      toValue: 1,
      duration: quieta ? 900 : 2000,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    anim.start(({ finished }) => { if (finished) alTerminar(); });
    return () => anim.stop();
  }, [avance, quieta, alTerminar]);

  return (
    <View style={e.capa} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {piezas.map((p) => {
        const t = avance.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 1],
        });
        return (
          <Animated.Text
            key={p.i}
            style={[
              e.pieza,
              {
                left: `${p.x * 100}%`,
                fontSize: p.tam,
                opacity: t.interpolate({ inputRange: [0, 0.15, 0.75, 1], outputRange: [0, 1, 1, 0] }),
                transform: [
                  {
                    translateY: t.interpolate({
                      inputRange: [0, 1],
                      outputRange: receta.desdeAbajo ? [900, -220] : [-160, 1000],
                    }),
                  },
                  { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, p.deriva] }) },
                  { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.giro * 360}deg`] }) },
                ],
              },
            ]}
          >
            {p.emoji}
          </Animated.Text>
        );
      })}

      {texto && (
        <Animated.View
          testID="cartel-celebracion"
          style={[
            e.cartel,
            {
              opacity: avance.interpolate({
                inputRange: [0, 0.12, 0.7, 1], outputRange: [0, 1, 1, 0],
              }),
              transform: [{
                scale: avance.interpolate({ inputRange: [0, 0.16, 1], outputRange: [0.85, 1, 1] }),
              }],
            },
          ]}
        >
          <Text style={e.cartelTexto}>{texto}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const e = StyleSheet.create({
  capa: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 999, alignItems: 'center', justifyContent: 'center',
  },
  pieza: { position: 'absolute', top: 0 },
  cartel: {
    backgroundColor: 'rgba(36,31,56,0.94)', paddingVertical: 14, paddingHorizontal: 24,
    borderRadius: 18, maxWidth: '80%',
  },
  cartelTexto: { color: '#FFF', fontSize: 18, fontWeight: '700', textAlign: 'center' },
});
