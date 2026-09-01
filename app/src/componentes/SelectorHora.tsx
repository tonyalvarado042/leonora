import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { usarPaleta } from '@/lib/tema';
import type { Hora } from '@/lib/tipos';

/** Los minutos que se usan el 90% de las veces. Tocar es más rápido que
 *  escribir dos dígitos en un teléfono. */
const REDONDOS = ['00', '15', '30', '45'];

interface Props {
  etiqueta: string;
  valor: Hora;
  onCambiar: (h: Hora) => void;
}

/**
 * Elegir una hora escribiéndola: la hora por un lado, los minutos por otro.
 *
 * Son **dos campos separados a propósito**. Uno solo con «06:30» dentro obliga
 * a pelearse con el cursor y con los dos puntos para cambiar solo los minutos.
 * Con dos, se toca el que se quiere cambiar y ya.
 *
 * **Salta solo al siguiente** en cuanto la hora no puede crecer más: dos
 * dígitos, o un primer dígito que ya no admite otro —un 3 no puede ser 3X,
 * porque no hay hora 30—. Así se escribe «630» de corrido y sale 06:30.
 *
 * No usa el selector nativo del teléfono: así se ve y se usa igual en iPhone,
 * Android y navegador, y funciona con lector de pantalla.
 */
export function SelectorHora({ etiqueta, valor, onCambiar }: Props) {
  const p = usarPaleta();
  const [hh, setHH] = useState(valor.slice(0, 2));
  const [mm, setMM] = useState(valor.slice(3, 5));
  const [error, setError] = useState<string | null>(null);
  const minutos = useRef<TextInput>(null);
  /** Mientras se está escribiendo, manda lo escrito. Sin esto, el valor de
   *  fuera pisaba cada tecla: escribir «07» acababa en «00». */
  const escribiendo = useRef(false);

  /**
   * Al entrar en un campo se selecciona lo que hay, para escribir encima.
   *
   * `selectTextOnFocus` lo hace en el teléfono pero **no en el navegador**, y
   * sin esto pasaba lo peor: saltabas a los minutos, escribías, y no cambiaba
   * nada —los dos dígitos nuevos se caían al recortar a dos—. Teclear y que no
   * pase nada es más desconcertante que un error.
   */
  function alEntrar(ev: { target?: unknown }) {
    escribiendo.current = true;
    (ev?.target as { select?: () => void } | undefined)?.select?.();
  }

  useEffect(() => {
    if (escribiendo.current) return;
    setHH(valor.slice(0, 2));
    setMM(valor.slice(3, 5));
    setError(null);
  }, [valor]);

  function malo(h: string, m: string): string | null {
    if (h === '' || m === '') return 'Falta la hora o los minutos.';
    if (Number(h) > 23) return 'Las horas van de 0 a 23.';
    if (Number(m) > 59) return 'Los minutos van de 0 a 59.';
    return null;
  }

  /** Solo se guarda lo que es una hora de verdad. Lo demás se queda escrito y
   *  avisa, en vez de guardarse a medias o corregirse por su cuenta (R2). */
  function intentar(h: string, m: string) {
    const fallo = malo(h, m);
    setError(fallo);
    if (fallo === null) onCambiar(`${h.padStart(2, '0')}:${m.padStart(2, '0')}`);
  }

  /** Una hora ya no puede crecer con dos dígitos, o con uno mayor que 2: no
   *  existe la hora 30, así que un 3 ya está completo. */
  const horaCompleta = (h: string) =>
    h.length === 2 || (h.length === 1 && Number(h) > 2);

  function escribirHora(t: string) {
    const limpio = t.replace(/[^0-9]/g, '').slice(0, 2);
    setHH(limpio);
    // Un «0» suelto todavía puede ser las 07: no se guarda hasta que se sepa.
    if (horaCompleta(limpio)) {
      intentar(limpio, mm);
      if (Number(limpio) <= 23) minutos.current?.focus();
    } else {
      setError(null);
    }
  }

  function escribirMinutos(t: string) {
    const limpio = t.replace(/[^0-9]/g, '').slice(0, 2);
    setMM(limpio);
    if (limpio.length === 2 || (limpio.length === 1 && Number(limpio) > 5)) {
      intentar(hh, limpio);
    } else {
      setError(null);
    }
  }

  /** Al salir del campo, lo que no vale vuelve a lo último bueno. Dejarlo roto
   *  sería guardar una hora que no existe. */
  function alSalir() {
    escribiendo.current = false;
    const fallo = malo(hh, mm);
    if (fallo === null) { intentar(hh, mm); return; }
    setHH(valor.slice(0, 2));
    setMM(valor.slice(3, 5));
    setError(null);
  }

  const estiloEntrada = [
    e.entrada,
    {
      color: p.tinta,
      backgroundColor: p.tarjeta,
      borderColor: error ? p.fuego : p.linea,
      borderWidth: error ? 1.5 : StyleSheet.hairlineWidth,
    },
  ];

  return (
    <View style={e.caja}>
      <Text style={[e.etiqueta, { color: error ? p.fuego : p.tintaSuave }]}>{etiqueta}</Text>

      <View style={e.reloj}>
        <View style={e.campo}>
          <TextInput
            value={hh}
            onChangeText={escribirHora}
            onFocus={alEntrar}
            onBlur={alSalir}
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={2}
            selectTextOnFocus
            aria-label={`Hora de ${etiqueta.trim()}`}
            aria-invalid={error !== null}
            style={estiloEntrada}
          />
          <Text style={[e.micro, { color: p.tintaTenue }]}>hora</Text>
        </View>

        <Text style={[e.dosPuntos, { color: p.tintaTenue }]}>:</Text>

        <View style={e.campo}>
          <TextInput
            ref={minutos}
            value={mm}
            onChangeText={escribirMinutos}
            onFocus={alEntrar}
            onBlur={alSalir}
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={2}
            selectTextOnFocus
            aria-label={`Minutos de ${etiqueta.trim()}`}
            aria-invalid={error !== null}
            style={estiloEntrada}
          />
          <Text style={[e.micro, { color: p.tintaTenue }]}>minutos</Text>
        </View>

        <View style={e.redondos}>
          {REDONDOS.map((m) => (
            <Pressable
              key={m}
              role="button"
              aria-label={`${etiqueta.trim()}: minuto ${m}`}
              onPress={() => { setMM(m); intentar(hh, m); }}
              style={({ pressed }) => [
                e.redondo,
                {
                  borderColor: mm === m ? p.alba : p.linea,
                  backgroundColor: mm === m ? p.albaPiso : p.tarjeta,
                  opacity: pressed ? 0.6 : 1,
                },
              ]}
            >
              <Text style={[e.redondoTexto, { color: mm === m ? p.alba : p.tintaSuave }]}>
                :{m}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {error && <Text role="alert" style={[e.error, { color: p.fuego }]}>⚠︎  {error}</Text>}
    </View>
  );
}

const e = StyleSheet.create({
  caja: { gap: 8 },
  etiqueta: { fontSize: 13.5, fontWeight: '600' },
  reloj: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  campo: { alignItems: 'center', gap: 2 },
  entrada: {
    width: 62, borderRadius: 12, paddingVertical: 11,
    fontSize: 24, fontWeight: '700', textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  micro: { fontSize: 10.5 },
  dosPuntos: { fontSize: 24, fontWeight: '700', lineHeight: 48 },
  redondos: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginLeft: 4 },
  redondo: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 8,
  },
  redondoTexto: { fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  error: { fontSize: 13, fontWeight: '600' },
});
