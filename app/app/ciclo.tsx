import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';

import { Cabecera } from '@/componentes/Cabecera';
import {
  confianza, duracionMedia, enPalabras, periodos, predecir, vaLaPenaContarlo,
} from '@/lib/ciclo';
import { fechaLarga, fechaLocal, sumarDias } from '@/lib/fechas';
import { repositorio } from '@/lib/repositorio';
import { usarPaleta } from '@/lib/tema';
import type { DiaCiclo, Intensidad, Persona } from '@/lib/tipos';

const CABECERA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
  'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const INTENSIDADES: { id: Intensidad; texto: string }[] = [
  { id: 'poco', texto: 'Poco' },
  { id: 'normal', texto: 'Normal' },
  { id: 'mucho', texto: 'Mucho' },
];

const ANIMOS = ['🙂 Bien', '😴 Cansada', '😣 Con dolor', '😢 Sensible', '😤 De mal humor'];

/**
 * El calendario del ciclo.
 *
 * **Lo único de toda la app que no ve nadie más.** Ni un tutor, ni quien
 * comparte grupo, ni quien mira el horario. La base de datos lo cumple con su
 * propia política; aquí solo se dibuja.
 */
export default function Ciclo() {
  const p = usarPaleta();
  const [yo, setYo] = useState<Persona | null>(null);
  const [dias, setDias] = useState<DiaCiclo[]>([]);
  const [salto, setSalto] = useState(0);
  const [abierto, setAbierto] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const [pe, cs] = await Promise.all([repositorio.persona(), repositorio.ciclo()]);
    setYo(pe); setDias(cs);
  }, []);

  useFocusEffect(useCallback(() => { void cargar(); }, [cargar]));

  const zona = yo?.zona_horaria ?? 'America/Guatemala';
  const hoy = useMemo(() => fechaLocal(new Date(), zona), [zona]);
  const ps = useMemo(() => periodos(dias), [dias]);
  const p1 = useMemo(() => predecir(dias, hoy), [dias, hoy]);
  const aviso = useMemo(() => vaLaPenaContarlo(ps), [ps]);
  const media = useMemo(() => duracionMedia(ps), [ps]);

  if (!yo) {
    return (
      <SafeAreaView style={[e.pantalla, e.centrado, { backgroundColor: p.papel }]}>
        <ActivityIndicator color={p.rosa} />
      </SafeAreaView>
    );
  }

  const celdas = mesDe(hoy, salto);
  const puestos = new Set(dias.filter((d) => d.sangrado).map((d) => d.fecha));
  const deHoy = dias.find((d) => d.fecha === abierto);

  async function alternar(fecha: string) {
    if (puestos.has(fecha)) {
      setDias(await repositorio.borrarDiaCiclo(fecha));
      if (abierto === fecha) setAbierto(null);
    } else {
      setDias(await repositorio.marcarCiclo(fecha, { sangrado: true }));
      setAbierto(fecha);
    }
  }

  async function guardarDetalle(cambios: Partial<DiaCiclo>) {
    if (!abierto) return;
    setDias(await repositorio.marcarCiclo(abierto, cambios));
  }

  return (
    <SafeAreaView style={[e.pantalla, { backgroundColor: p.papel }]} edges={['top']}>
      <Cabecera titulo="Mi calendario" />

      <ScrollView contentContainerStyle={e.cuerpo}>
        <View style={[e.privado, { backgroundColor: p.tarjeta2, borderColor: p.linea }]}>
          <Text style={[e.privadoTexto, { color: p.tintaSuave }]}>
            🔒  Esto es solo tuyo. No lo ve tu mamá, ni tu papá, ni nadie de tus
            grupos, aunque vean tu horario.
          </Text>
        </View>

        <View style={[e.resumen, { backgroundColor: p.tarjeta, borderColor: p1.ahora ? p.rosa : p.linea }]}>
          <Text style={[e.resumenTitulo, { color: p1.ahora ? p.rosa : p.tinta }]}>
            {enPalabras(p1)}
          </Text>
          {p1.fecha && (
            <Text style={[e.resumenTexto, { color: p.tintaSuave }]}>
              Sería el {fechaLarga(p1.fecha, zona).toLowerCase()}
              {media !== null ? ` · tu ciclo dura ${media} días` : ''}
            </Text>
          )}
          {p1.diaDelCiclo !== null && !p1.ahora && (
            <Text style={[e.resumenTexto, { color: p.tintaTenue }]}>
              Vas por el día {p1.diaDelCiclo} de tu ciclo
            </Text>
          )}
          {confianza(ps) === 'poca' && (
            <Text style={[e.resumenTexto, { color: p.tintaTenue }]}>
              Con un mes más apuntado, la cuenta se afina.
            </Text>
          )}
        </View>

        {aviso && (
          <View style={[e.aviso, { backgroundColor: p.tardePiso, borderColor: p.tarde }]}>
            <Text style={[e.avisoTexto, { color: p.tinta }]}>{aviso}</Text>
          </View>
        )}

        <View style={e.barra}>
          <Pressable
            role="button" aria-label="El mes anterior"
            onPress={() => setSalto(salto - 1)}
            style={[e.flecha, { borderColor: p.linea, backgroundColor: p.tarjeta }]}
          >
            <Text style={{ color: p.tinta, fontSize: 17 }}>‹</Text>
          </Pressable>
          <Text style={[e.mes, { color: p.tinta }]}>{tituloMes(celdas)}</Text>
          <Pressable
            role="button" aria-label="El mes siguiente"
            onPress={() => setSalto(salto + 1)}
            style={[e.flecha, { borderColor: p.linea, backgroundColor: p.tarjeta }]}
          >
            <Text style={{ color: p.tinta, fontSize: 17 }}>›</Text>
          </Pressable>
        </View>

        <View style={e.cabecera}>
          {CABECERA.map((d, i) => (
            <Text key={i} style={[e.cabeceraTexto, { color: p.tintaTenue }]}>{d}</Text>
          ))}
        </View>

        <View style={e.rejilla}>
          {celdas.map((f, i) => {
            if (f === null) return <View key={`v${i}`} style={e.celda} />;
            const marcado = puestos.has(f);
            const esperado = p1.fecha !== null && f >= p1.fecha
              && f < sumarDias(p1.fecha, 5) && !marcado;
            const esHoy = f === hoy;
            return (
              <Pressable
                key={f}
                role="checkbox"
                aria-checked={marcado}
                aria-label={`${fechaLarga(f, zona)}${marcado ? ', marcado' : ''}`}
                onPress={() => alternar(f)}
                style={[
                  e.celda,
                  {
                    backgroundColor: marcado ? p.rosa : esperado ? p.tarjeta2 : 'transparent',
                    borderColor: esHoy ? p.alba : esperado ? p.rosa : 'transparent',
                    borderWidth: esHoy ? 2 : esperado ? 1 : 0,
                    borderStyle: esperado && !esHoy ? 'dashed' : 'solid',
                  },
                ]}
              >
                <Text style={[
                  e.numero,
                  { color: marcado ? '#FFFFFF' : esHoy ? p.alba : p.tinta,
                    fontWeight: esHoy || marcado ? '800' : '500' },
                ]}>
                  {Number(f.slice(8, 10))}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={e.leyenda}>
          <View style={e.leyendaFila}>
            <View style={[e.punto, { backgroundColor: p.rosa }]} />
            <Text style={[e.leyendaTexto, { color: p.tintaSuave }]}>Días marcados</Text>
          </View>
          <View style={e.leyendaFila}>
            <View style={[e.punto, { borderWidth: 1, borderColor: p.rosa, borderStyle: 'dashed' }]} />
            <Text style={[e.leyendaTexto, { color: p.tintaSuave }]}>Cuándo tocaría</Text>
          </View>
        </View>

        {abierto && (
          <View style={[e.detalle, { backgroundColor: p.tarjeta, borderColor: p.linea }]}>
            <Text style={[e.detalleTitulo, { color: p.tinta }]}>
              {fechaLarga(abierto, zona)}
            </Text>
            <Text style={[e.detalleAyuda, { color: p.tintaTenue }]}>
              Si quieres, apunta más. Solo si quieres.
            </Text>

            <Text style={[e.etiqueta, { color: p.tintaSuave }]}>¿Cuánto?</Text>
            <View style={e.opciones}>
              {INTENSIDADES.map((x) => (
                <Pressable
                  key={x.id}
                  role="radio"
                  aria-checked={deHoy?.intensidad === x.id}
                  onPress={() => guardarDetalle({
                    intensidad: deHoy?.intensidad === x.id ? null : x.id,
                  })}
                  style={[
                    e.opcion,
                    {
                      borderColor: deHoy?.intensidad === x.id ? p.rosa : p.linea,
                      backgroundColor: deHoy?.intensidad === x.id ? p.tarjeta2 : p.tarjeta,
                    },
                  ]}
                >
                  <Text style={[e.opcionTexto, {
                    color: deHoy?.intensidad === x.id ? p.rosa : p.tinta,
                  }]}>
                    {x.texto}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[e.etiqueta, { color: p.tintaSuave }]}>¿Cómo te sientes?</Text>
            <View style={e.opciones}>
              {ANIMOS.map((x) => (
                <Pressable
                  key={x}
                  role="radio"
                  aria-checked={deHoy?.animo === x}
                  onPress={() => guardarDetalle({ animo: deHoy?.animo === x ? null : x })}
                  style={[
                    e.opcion,
                    {
                      borderColor: deHoy?.animo === x ? p.rosa : p.linea,
                      backgroundColor: deHoy?.animo === x ? p.tarjeta2 : p.tarjeta,
                    },
                  ]}
                >
                  <Text style={[e.opcionTexto, { color: deHoy?.animo === x ? p.rosa : p.tinta }]}>
                    {x}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              role="button"
              onPress={() => setAbierto(null)}
              style={[e.cerrar, { borderColor: p.linea }]}
            >
              <Text style={[e.cerrarTexto, { color: p.tintaSuave }]}>Listo</Text>
            </Pressable>
          </View>
        )}

        <Text style={[e.pista, { color: p.tintaTenue }]}>
          Toca los días que te venga. Con dos meses apuntados la app ya te dice
          cuándo tocaría el siguiente; con uno solo todavía no puede, y te lo
          dice en vez de inventárselo.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

/** Las celdas de un mes, empezando en lunes. */
function mesDe(hoy: string, salto: number): (string | null)[] {
  const [a, m] = hoy.split('-').map(Number);
  const primero = new Date(Date.UTC(a, m - 1 + salto, 1));
  const ultimo = new Date(Date.UTC(primero.getUTCFullYear(), primero.getUTCMonth() + 1, 0));
  const huecos = (primero.getUTCDay() + 6) % 7;

  const celdas: (string | null)[] = Array(huecos).fill(null);
  for (let d = 1; d <= ultimo.getUTCDate(); d++) {
    celdas.push(new Date(Date.UTC(primero.getUTCFullYear(), primero.getUTCMonth(), d))
      .toISOString().slice(0, 10));
  }
  return celdas;
}

function tituloMes(celdas: (string | null)[]): string {
  const f = celdas.find((x): x is string => x !== null);
  if (!f) return '';
  const [a, m] = f.split('-').map(Number);
  return `${MESES[m - 1]} de ${a}`;
}

const e = StyleSheet.create({
  pantalla: { flex: 1 },
  centrado: { alignItems: 'center', justifyContent: 'center' },
  cuerpo: { padding: 16, gap: 12, paddingBottom: 40 },

  privado: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 12 },
  privadoTexto: { fontSize: 13, lineHeight: 19 },

  resumen: { borderWidth: 1.5, borderRadius: 15, padding: 16, gap: 5 },
  resumenTitulo: { fontSize: 18, fontWeight: '800' },
  resumenTexto: { fontSize: 13.5, lineHeight: 19 },

  aviso: { borderWidth: 1, borderRadius: 13, padding: 14 },
  avisoTexto: { fontSize: 13.5, lineHeight: 19 },

  barra: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  flecha: {
    width: 40, height: 40, borderRadius: 11, borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center', justifyContent: 'center',
  },
  mes: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700' },

  cabecera: { flexDirection: 'row' },
  cabeceraTexto: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700' },
  rejilla: { flexDirection: 'row', flexWrap: 'wrap' },
  celda: {
    width: `${100 / 7}%`, aspectRatio: 1, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  numero: { fontSize: 14 },

  leyenda: { flexDirection: 'row', gap: 18, marginTop: 4 },
  leyendaFila: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  punto: { width: 13, height: 13, borderRadius: 7 },
  leyendaTexto: { fontSize: 12 },

  detalle: { borderWidth: 1, borderRadius: 15, padding: 16, gap: 4, marginTop: 6 },
  detalleTitulo: { fontSize: 16, fontWeight: '700' },
  detalleAyuda: { fontSize: 12.5, marginBottom: 6 },
  etiqueta: { fontSize: 13, fontWeight: '700', marginTop: 12, marginBottom: 8 },
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  opcion: { borderWidth: 1, borderRadius: 11, paddingHorizontal: 13, paddingVertical: 10 },
  opcionTexto: { fontSize: 13.5, fontWeight: '600' },
  cerrar: {
    borderWidth: StyleSheet.hairlineWidth, borderRadius: 12,
    paddingVertical: 13, alignItems: 'center', marginTop: 16,
  },
  cerrarTexto: { fontSize: 14.5, fontWeight: '600' },

  pista: { fontSize: 12.5, lineHeight: 18, marginTop: 8 },
});
