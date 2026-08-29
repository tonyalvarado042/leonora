import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { usarPaleta } from '@/lib/tema';

/**
 * «¿Terminaste, o lo dejas para después?»
 *
 * Solo sale al marcar estudio antes de tiempo, porque es el único caso donde
 * la respuesta cambia el premio. Decir que no cuesta nada: se guarda igual, lo
 * único que no se cobra es el extra.
 */
export function PreguntaTerminaste({ visible, onResponder }: {
  visible: boolean;
  onResponder: (termino: boolean) => void;
}) {
  const p = usarPaleta();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => onResponder(false)}>
      <View style={e.fondo}>
        <View style={[e.caja, { backgroundColor: p.tarjeta }]}>
          <Text style={[e.titulo, { color: p.tinta }]}>Terminaste antes 👀</Text>
          <Text style={[e.texto, { color: p.tintaSuave }]}>
            ¿Acabaste lo que tenías que hacer, o lo dejas para después?
          </Text>
          <Pressable
            role="button"
            onPress={() => onResponder(true)}
            style={[e.boton, { backgroundColor: p.verde }]}
          >
            <Text style={e.botonTexto}>Lo terminé</Text>
          </Pressable>
          <Pressable
            role="button"
            onPress={() => onResponder(false)}
            style={[e.boton, { backgroundColor: 'transparent', borderColor: p.linea, borderWidth: 1 }]}
          >
            <Text style={[e.botonTexto, { color: p.tintaSuave }]}>Lo dejo para después</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const e = StyleSheet.create({
  fondo: {
    flex: 1, backgroundColor: 'rgba(20,16,36,0.55)',
    alignItems: 'center', justifyContent: 'center', padding: 28,
  },
  caja: { borderRadius: 20, padding: 24, width: '100%', maxWidth: 380, gap: 10 },
  titulo: { fontSize: 20, fontWeight: '700' },
  texto: { fontSize: 15, lineHeight: 21, marginBottom: 8 },
  boton: { borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  botonTexto: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});
