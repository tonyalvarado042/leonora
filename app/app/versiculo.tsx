import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';

import { Cabecera } from '@/componentes/Cabecera';
import { textoEn, textoParaCompartir, versiculoDelDia, versionesDe } from '@/lib/fe';
import { fechaLarga, fechaLocal } from '@/lib/fechas';
import { repositorio } from '@/lib/repositorio';
import { usarPaleta } from '@/lib/tema';
import type { Versiculo } from '@/datos/versiculos';

/**
 * El versículo del día, entero.
 *
 * La tarjeta grande **es** la imagen para compartir: se ve igual en pantalla
 * que en una captura. Compartirla como archivo PNG necesita un paquete más
 * (`react-native-view-shot`); por ahora se comparte el texto, que es lo que la
 * gente pega en WhatsApp de todos modos.
 */
export default function PantallaVersiculo() {
  const p = usarPaleta();
  const [v, setV] = useState<Versiculo | null>(null);
  const [version, setVersion] = useState<string | null>(null);
  const [fecha, setFecha] = useState('');
  const [zona, setZona] = useState('America/Guatemala');

  const cargar = useCallback(async () => {
    const persona = await repositorio.persona();
    const hoy = fechaLocal(new Date(), persona.zona_horaria);
    setZona(persona.zona_horaria);
    setFecha(hoy);
    setV(versiculoDelDia(hoy));
  }, []);
  useFocusEffect(useCallback(() => { void cargar(); }, [cargar]));

  if (!v) return <View style={{ flex: 1, backgroundColor: p.papel }} />;
  const t = textoEn(v, version ?? undefined);
  const versiones = versionesDe(v);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.papel }} edges={['top']}>
      <Cabecera titulo="Versículo de hoy" />
      <ScrollView contentContainerStyle={e.cuerpo}>
        {/* Esta tarjeta es la imagen: se comparte tal cual se ve. */}
        <View style={[e.lamina, { backgroundColor: p.alba }]}>
          <Text style={e.comilla}>“</Text>
          <Text style={e.laminaTexto}>{t.texto}</Text>
          <View style={e.laminaPie}>
            <Text style={e.laminaRef}>{v.referencia}</Text>
            <Text style={e.laminaVersion}>{t.version}</Text>
          </View>
          <Text style={e.laminaMarca}>GraceDay</Text>
        </View>

        <Text style={[e.fecha, { color: p.tintaTenue }]}>
          {fecha ? fechaLarga(fecha, zona) : ''} · tema: {v.tema}
        </Text>

        <Pressable
          role="button"
          onPress={() => { void Share.share({ message: textoParaCompartir(v, version ?? undefined) }); }}
          style={[e.compartir, { backgroundColor: p.alba }]}
        >
          <Text style={e.compartirTexto}>Compartir</Text>
        </Pressable>

        <Text style={[e.rotulo, { color: p.tintaSuave }]}>En otras versiones</Text>
        {versiones.length === 1 ? (
          <View style={[e.nota, { backgroundColor: p.tarjeta, borderColor: p.linea }]}>
            <Text style={[e.notaTitulo, { color: p.tinta }]}>
              Por ahora solo Reina-Valera 1909
            </Text>
            <Text style={[e.notaTexto, { color: p.tintaSuave }]}>
              Es la que se puede distribuir libremente. Las versiones modernas
              —NVI, NTV, RVR1960— tienen derechos de autor y hace falta licencia
              del editor para incluirlas en una app que se vende. Añadir una
              licenciada después es meter filas, no cambiar la app.
            </Text>
          </View>
        ) : (
          versiones.map((nombre) => {
            const puesta = (version ?? versiones[0]) === nombre;
            const texto = textoEn(v, nombre);
            return (
              <Pressable
                key={nombre}
                role="radio"
                aria-checked={puesta}
                onPress={() => setVersion(nombre)}
                style={[
                  e.version,
                  {
                    backgroundColor: p.tarjeta,
                    borderColor: puesta ? p.alba : p.linea,
                    borderWidth: puesta ? 1.5 : StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <Text style={[e.versionNombre, { color: puesta ? p.alba : p.tintaTenue }]}>
                  {nombre}
                </Text>
                <Text style={[e.versionTexto, { color: p.tinta }]}>{texto.texto}</Text>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const e = StyleSheet.create({
  cuerpo: { padding: 20, paddingBottom: 48, maxWidth: 560, width: '100%', alignSelf: 'center' },
  lamina: { borderRadius: 22, padding: 26, paddingTop: 14, minHeight: 260, justifyContent: 'center' },
  comilla: { color: 'rgba(255,255,255,0.45)', fontSize: 64, lineHeight: 70, fontWeight: '700' },
  laminaTexto: { color: '#FFF', fontSize: 21, lineHeight: 31, fontWeight: '600', marginTop: -14 },
  laminaPie: { marginTop: 22, flexDirection: 'row', alignItems: 'baseline', gap: 9 },
  laminaRef: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  laminaVersion: { color: 'rgba(255,255,255,0.7)', fontSize: 12.5 },
  laminaMarca: {
    color: 'rgba(255,255,255,0.55)', fontSize: 11.5, marginTop: 18,
    letterSpacing: 1, fontWeight: '600',
  },
  fecha: { fontSize: 12.5, textAlign: 'center', marginTop: 14 },
  compartir: { marginTop: 18, borderRadius: 13, paddingVertical: 15, alignItems: 'center' },
  compartirTexto: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  rotulo: { fontSize: 13, fontWeight: '700', marginTop: 28, marginBottom: 10 },
  version: { borderRadius: 13, padding: 15, marginBottom: 9 },
  versionNombre: { fontSize: 11.5, fontWeight: '700', letterSpacing: 0.8, marginBottom: 6 },
  versionTexto: { fontSize: 15, lineHeight: 21 },
  nota: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 13, padding: 16 },
  notaTitulo: { fontSize: 15, fontWeight: '700', marginBottom: 6 },
  notaTexto: { fontSize: 13.5, lineHeight: 19 },
});
