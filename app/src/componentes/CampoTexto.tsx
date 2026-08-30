import { StyleSheet, Text, TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';

import { usarPaleta } from '@/lib/tema';

interface Props extends Omit<TextInputProps, 'style' | 'placeholderTextColor'> {
  etiqueta: string;
  /** Qué se espera aquí. Sale siempre, no solo cuando algo falla. */
  ayuda?: string;
  /** El aviso de que falta o está mal. Sale en rojo, debajo. */
  error?: string | null;
  obligatorio?: boolean;
}

/**
 * Un campo de texto con su etiqueta, su ayuda y su aviso.
 *
 * Existe para que sea difícil hacerlo mal: **ningún campo vacío puede quedarse
 * sin explicación**. Un botón apagado sin decir por qué es exactamente el
 * fallo que esto evita.
 */
export function CampoTexto({ etiqueta, ayuda, error, obligatorio, ...resto }: Props) {
  const p = usarPaleta();
  const mal = Boolean(error);

  return (
    <View style={e.caja}>
      <View style={e.fila}>
        <Text style={[e.etiqueta, { color: mal ? p.fuego : p.tintaSuave }]}>{etiqueta}</Text>
        {obligatorio && (
          <Text style={[e.marca, { color: mal ? p.fuego : p.tintaTenue }]}>obligatorio</Text>
        )}
      </View>

      <TextInput
        placeholderTextColor={p.tintaTenue}
        aria-label={etiqueta}
        aria-invalid={mal}
        style={[
          e.entrada,
          {
            color: p.tinta,
            backgroundColor: p.tarjeta,
            borderColor: mal ? p.fuego : p.linea,
            borderWidth: mal ? 1.5 : StyleSheet.hairlineWidth,
          },
        ]}
        {...resto}
      />

      {error ? (
        <Text role="alert" style={[e.error, { color: p.fuego }]}>⚠︎  {error}</Text>
      ) : ayuda ? (
        <Text style={[e.ayuda, { color: p.tintaTenue }]}>{ayuda}</Text>
      ) : null}
    </View>
  );
}
const e = StyleSheet.create({
  caja: { gap: 7 },
  fila: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  etiqueta: { flex: 1, fontSize: 13.5, fontWeight: '700' },
  marca: { fontSize: 11, fontWeight: '600' },
  entrada: { borderRadius: 13, paddingHorizontal: 15, paddingVertical: 14, fontSize: 17 },
  ayuda: { fontSize: 12.5, lineHeight: 17 },
  error: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
});
