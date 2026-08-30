import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { diasEntre, fechaLarga, fechaLocal, sumarDias } from '@/lib/fechas';
import { repositorio, type ResumenDia } from '@/lib/repositorio';
import { usarPaleta } from '@/lib/tema';
import type { Fecha } from '@/lib/tipos';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
  'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const CABECERA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

/** Ver hacia atrás y hacia adelante: la semana, el mes y lo que ya se cumplió. */
export default function Calendario() {
  const p = usarPaleta();
  const [vista, setVista] = useState<'semana' | 'mes'>('mes');
  /** Cuántas semanas o meses de distancia del actual. 0 = ahora. */
  const [salto, setSalto] = useState(0);
  const [resumen, setResumen] = useState<Map<Fecha, ResumenDia>>(new Map());
  const [zona, setZona] = useState('America/Guatemala');

  const hoy = fechaLocal(new Date(), zona);
  const celdas = vista === 'semana' ? semanaDe(hoy, salto) : mesDe(hoy, salto);
  const visibles = celdas.filter((c): c is Fecha => c !== null);

  const cargar = useCallback(async () => {
    const persona = await repositorio.persona();
    setZona(persona.zona_horaria);
    if (visibles.length === 0) return;
    const r = await repositorio.resumenDias(visibles[0], visibles[visibles.length - 1]);
    setResumen(new Map(r.map((x) => [x.fecha, x])));
  }, [visibles[0], visibles[visibles.length - 1]]);
  useFocusEffect(useCallback(() => { void cargar(); }, [cargar]));

  const conDatos = [...resumen.values()].filter((r) => r.total > 0);
  const cumplidos = conDatos.filter((r) => r.porcentaje === 100).length;

  return (
    <ScrollView style={{ backgroundColor: p.papel }} contentContainerStyle={e.cuerpo}>
      <View style={e.solapas}>
        {(['semana', 'mes'] as const).map((v) => (
          <Pressable
            key={v}
            role="tab"
            aria-selected={vista === v}
            onPress={() => { setVista(v); setSalto(0); }}
            style={[
              e.solapa,
              vista === v
                ? { backgroundColor: p.tinta, borderColor: p.tinta }
                : { backgroundColor: p.tarjeta, borderColor: p.linea },
            ]}
          >
            <Text style={[e.solapaTexto, { color: vista === v ? p.papel : p.tintaSuave }]}>
              {v === 'semana' ? 'Semana' : 'Mes'}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={e.barra}>
        <Pressable
          role="button" aria-label="Ir hacia atrás"
          onPress={() => setSalto(salto - 1)}
          style={[e.flecha, { borderColor: p.linea, backgroundColor: p.tarjeta }]}
        >
          <Text style={{ color: p.tinta, fontSize: 17 }}>‹</Text>
        </Pressable>
        <Text style={[e.periodo, { color: p.tinta }]}>{titulo(celdas, vista, zona)}</Text>
        <Pressable
          role="button" aria-label="Ir hacia adelante"
          onPress={() => setSalto(salto + 1)}
          style={[e.flecha, { borderColor: p.linea, backgroundColor: p.tarjeta }]}
        >
          <Text style={{ color: p.tinta, fontSize: 17 }}>›</Text>
        </Pressable>
      </View>

      {salto !== 0 && (
        <Pressable role="button" onPress={() => setSalto(0)} style={e.volver}>
          <Text style={[e.volverTexto, { color: p.alba }]}>Volver a hoy</Text>
        </Pressable>
      )}

      <View style={e.cabecera}>
        {CABECERA.map((d, i) => (
          <Text key={i} style={[e.cabeceraTexto, { color: p.tintaTenue }]}>{d}</Text>
        ))}
      </View>

      <View style={e.rejilla}>
        {celdas.map((f, i) => {
          if (f === null) return <View key={`v${i}`} style={e.celda} />;
          const r = resumen.get(f);
          const esHoy = f === hoy;
          const futuro = f > hoy;
          const lleno = r && r.total > 0 ? r.porcentaje : null;

          return (
            <View
              key={f}
              accessible
              aria-label={`${fechaLarga(f, zona)}${
                lleno === null ? ', sin datos' : `, ${r!.hechas} de ${r!.total} hechas`}`}
              style={[
                e.celda,
                {
                  backgroundColor: lleno === null ? 'transparent'
                    : lleno === 100 ? p.verde
                    : lleno >= 50 ? p.verdePiso
                    : p.tarjeta2,
                  borderColor: esHoy ? p.alba : 'transparent',
                  borderWidth: esHoy ? 2 : 0,
                  opacity: futuro ? 0.45 : 1,
                },
              ]}
            >
              <Text style={[
                e.numero,
                { color: lleno === 100 ? '#FFF' : esHoy ? p.alba : p.tinta,
                  fontWeight: esHoy ? '800' : '600' },
              ]}>
                {Number(f.slice(8, 10))}
              </Text>
              {r && r.total > 0 && lleno !== 100 && (
                <Text style={[e.mini, { color: p.tintaTenue }]}>{r.hechas}/{r.total}</Text>
              )}
            </View>
          );
        })}
      </View>

      <View style={[e.pie, { backgroundColor: p.tarjeta, borderColor: p.linea }]}>
        {conDatos.length === 0 ? (
          <Text style={[e.pieTexto, { color: p.tintaSuave }]}>
            Todavía no hay nada guardado en estas fechas. Los días se van
            llenando conforme los vives.
          </Text>
        ) : (
          <>
            <Text style={[e.pieCifra, { color: p.tinta }]}>
              {cumplidos} de {conDatos.length} días completos
            </Text>
            <Text style={[e.pieTexto, { color: p.tintaSuave }]}>
              Verde entero es un día cumplido del todo. Los flojos también
              cuentan — lo que importa es no dejar de venir.
            </Text>
          </>
        )}
      </View>

      <View style={e.leyenda}>
        <Cuadro color={p.verde} texto="Completo" />
        <Cuadro color={p.verdePiso} texto="A medias" />
        <Cuadro color={p.tarjeta2} texto="Flojo" />
      </View>
    </ScrollView>
  );
}

function Cuadro({ color, texto }: { color: string; texto: string }) {
  const p = usarPaleta();
  return (
    <View style={e.leyendaItem}>
      <View style={[e.leyendaColor, { backgroundColor: color, borderColor: p.linea }]} />
      <Text style={[e.leyendaTexto, { color: p.tintaSuave }]}>{texto}</Text>
    </View>
  );
}

/** El lunes de la semana que toca, y sus siete días. */
function semanaDe(hoy: Fecha, salto: number): (Fecha | null)[] {
  const base = sumarDias(hoy, salto * 7);
  const dow = new Date(`${base}T12:00:00Z`).getUTCDay();
  const lunes = sumarDias(base, dow === 0 ? -6 : 1 - dow);
  return Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
}

/** El mes completo, con huecos delante para que caiga en su columna. */
function mesDe(hoy: Fecha, salto: number): (Fecha | null)[] {
  const [a, m] = hoy.split('-').map(Number);
  const d = new Date(Date.UTC(a, m - 1 + salto, 1));
  const primero = d.toISOString().slice(0, 10);
  const dow = d.getUTCDay();
  const huecos = dow === 0 ? 6 : dow - 1;
  const ultimo = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();

  return [
    ...Array<null>(huecos).fill(null),
    ...Array.from({ length: ultimo }, (_, i) => sumarDias(primero, i)),
  ];
}

function titulo(celdas: (Fecha | null)[], vista: 'semana' | 'mes', zona: string): string {
  const f = celdas.find((x): x is Fecha => x !== null);
  if (!f) return '';
  const [a, m] = f.split('-').map(Number);
  if (vista === 'mes') return `${MESES[m - 1]} de ${a}`;
  const ultimo = [...celdas].reverse().find((x): x is Fecha => x !== null)!;
  const dias = diasEntre(f, ultimo) + 1;
  return `${fechaLarga(f, zona).replace(/^\w+ /, '')} · ${dias} días`;
}

const e = StyleSheet.create({
  cuerpo: { padding: 18, paddingBottom: 48, maxWidth: 620, width: '100%', alignSelf: 'center' },
  solapas: { flexDirection: 'row', gap: 7, marginBottom: 16 },
  solapa: {
    flex: 1, paddingVertical: 10, borderRadius: 11,
    borderWidth: StyleSheet.hairlineWidth, alignItems: 'center',
  },
  solapaTexto: { fontSize: 14.5, fontWeight: '700' },
  barra: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  flecha: {
    width: 38, height: 38, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center', justifyContent: 'center',
  },
  periodo: { flex: 1, textAlign: 'center', fontSize: 16.5, fontWeight: '700' },
  volver: { alignItems: 'center', paddingVertical: 8 },
  volverTexto: { fontSize: 13.5, fontWeight: '700' },
  cabecera: { flexDirection: 'row', marginTop: 10, marginBottom: 6 },
  cabeceraTexto: { flex: 1, textAlign: 'center', fontSize: 11.5, fontWeight: '700' },
  rejilla: { flexDirection: 'row', flexWrap: 'wrap' },
  celda: {
    width: `${100 / 7}%`, aspectRatio: 1, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  numero: { fontSize: 14.5, fontVariant: ['tabular-nums'] },
  mini: { fontSize: 9.5, marginTop: 1 },
  pie: {
    marginTop: 18, padding: 16, borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth, gap: 6,
  },
  pieCifra: { fontSize: 16, fontWeight: '700' },
  pieTexto: { fontSize: 13.5, lineHeight: 19 },
  leyenda: { flexDirection: 'row', gap: 16, marginTop: 14, justifyContent: 'center' },
  leyendaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  leyendaColor: { width: 14, height: 14, borderRadius: 4, borderWidth: StyleSheet.hairlineWidth },
  leyendaTexto: { fontSize: 12 },
});
