import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Cabecera } from '@/componentes/Cabecera';
import { useFocusEffect } from 'expo-router';

import { EMOJI_TIPO_EVENTO, eventosDeFecha } from '@/lib/eventos';
import { diasEntre, fechaLarga, fechaLocal, sumarDias } from '@/lib/fechas';
import { repositorio, type ResumenDia } from '@/lib/repositorio';
import { colorDeTipo, usarPaleta, type Paleta } from '@/lib/tema';
import type { Evento, Fecha, TipoActividad } from '@/lib/tipos';

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
  // Los eventos se pintan aunque el día no esté guardado: un feriado del mes
  // que viene tiene que verse ahora, no cuando llegue.
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [quien, setQuien] = useState('');

  const hoy = fechaLocal(new Date(), zona);
  const celdas = vista === 'semana' ? semanaDe(hoy, salto) : mesDe(hoy, salto);
  const visibles = celdas.filter((c): c is Fecha => c !== null);

  const cargar = useCallback(async () => {
    const persona = await repositorio.persona();
    setZona(persona.zona_horaria);
    setQuien(persona.id);
    setEventos(await repositorio.eventos());
    if (visibles.length === 0) return;
    const r = await repositorio.resumenDias(visibles[0], visibles[visibles.length - 1]);
    setResumen(new Map(r.map((x) => [x.fecha, x])));
  }, [visibles[0], visibles[visibles.length - 1]]);
  useFocusEffect(useCallback(() => { void cargar(); }, [cargar]));

  const conDatos = [...resumen.values()].filter((r) => r.total > 0);
  const cumplidos = conDatos.filter((r) => r.porcentaje === 100).length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.papel }} edges={['top']}>
      <Cabecera titulo="Tu calendario" />
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

      {vista === 'mes' && (
        <View style={e.cabecera}>
          {CABECERA.map((d, i) => (
            <Text key={i} style={[e.cabeceraTexto, { color: p.tintaTenue }]}>{d}</Text>
          ))}
        </View>
      )}

      {vista === 'mes' ? (
        <View style={e.rejilla}>
          {celdas.map((f, i) => {
            if (f === null) return <View key={`v${i}`} style={e.celda} />;
            const r = resumen.get(f);
            const esHoy = f === hoy;
            const futuro = f > hoy;
            const lleno = r && r.total > 0 ? r.porcentaje : null;
            const finde = r?.tipo_dia === 'fin_de_semana';
            const suyos = eventosDeFecha(eventos, f, quien);
            // El día guardado puede decir «feriado», pero un feriado del futuro
            // todavía no tiene día guardado: por eso se mira también el evento.
            const feriado = r?.tipo_dia === 'feriado'
              || suyos.some((x) => x.efecto === 'libra_el_dia');

            return (
              <View
                key={f}
                accessible
                aria-label={`${fechaLarga(f, zona)}${
                  lleno === null ? ', sin nada' : `, ${r!.hechas} de ${r!.total} hechas`}${
                  suyos.length === 0 ? '' : `. ${suyos.map((x) => x.titulo).join(', ')}`}`}
                style={[
                  e.celda,
                  {
                    backgroundColor: feriado ? p.fuegoPiso
                      : lleno === 100 ? p.verdePiso
                      : finde ? p.tarjeta2
                      : 'transparent',
                    borderColor: esHoy ? p.alba : 'transparent',
                    borderWidth: esHoy ? 2 : 0,
                    opacity: futuro ? 0.55 : 1,
                  },
                ]}
              >
                <Text style={[
                  e.numero,
                  { color: esHoy ? p.alba : p.tinta, fontWeight: esHoy ? '800' : '600' },
                ]}>
                  {Number(f.slice(8, 10))}
                </Text>
                {suyos.length > 0 && (
                  <Text numberOfLines={1} style={e.eventoEmoji}>
                    {suyos.slice(0, 3).map((x) => EMOJI_TIPO_EVENTO[x.tipo]).join('')}
                  </Text>
                )}
                <Barras tareas={r?.tareas ?? []} p={p} />
              </View>
            );
          })}
        </View>
      ) : (
        <View style={e.agenda}>
          {celdas.filter((f): f is Fecha => f !== null).map((f) => {
            const r = resumen.get(f);
            const esHoy = f === hoy;
            const tareas = r?.tareas ?? [];
            return (
              <View
                key={f}
                style={[
                  e.diaAgenda,
                  {
                    backgroundColor: p.tarjeta,
                    borderColor: esHoy ? p.alba : p.linea,
                    borderWidth: esHoy ? 1.5 : StyleSheet.hairlineWidth,
                    opacity: f > hoy ? 0.7 : 1,
                  },
                ]}
              >
                <View style={e.diaAgendaCab}>
                  <Text style={[e.diaAgendaNombre, { color: esHoy ? p.alba : p.tinta }]}>
                    {fechaLarga(f, zona)}
                  </Text>
                  {r && r.total > 0 && (
                    <Text style={[
                      e.diaAgendaCuenta,
                      { color: r.porcentaje === 100 ? p.verde : p.tintaTenue },
                    ]}>
                      {r.hechas}/{r.total}
                    </Text>
                  )}
                </View>

                {eventosDeFecha(eventos, f, quien).map((x) => (
                  <View
                    key={x.id}
                    style={[
                      e.eventoTira,
                      {
                        backgroundColor: x.efecto === 'libra_el_dia' ? p.verdePiso : p.tarjeta2,
                        borderColor: x.efecto === 'libra_el_dia' ? p.verde : p.linea,
                      },
                    ]}
                  >
                    <Text style={[e.eventoTexto, { color: p.tinta }]}>
                      {EMOJI_TIPO_EVENTO[x.tipo]}  {x.titulo}
                      {x.efecto === 'libra_el_dia' ? ' · sin colegio' : ''}
                    </Text>
                  </View>
                ))}

                {tareas.length === 0 ? (
                  <Text style={[e.diaAgendaVacio, { color: p.tintaTenue }]}>
                    {f > hoy ? 'Se arma cuando llegue' : 'Nada guardado'}
                  </Text>
                ) : (
                  <View style={e.tiras}>
                    {tareas.slice(0, 6).map((t, i) => (
                      <View
                        key={i}
                        style={[
                          e.tira,
                          {
                            backgroundColor: t.estado === 'omitida' ? p.tarjeta2 : colorDeTipo(t.tipo, p) + '22',
                            borderLeftColor: t.estado === 'omitida' ? p.tintaTenue : colorDeTipo(t.tipo, p),
                          },
                        ]}
                      >
                        <Text style={[e.tiraHora, { color: p.tintaTenue }]}>{t.hora_inicio}</Text>
                        <Text
                          numberOfLines={1}
                          style={[
                            e.tiraTexto,
                            {
                              color: t.estado === 'omitida' ? p.tintaTenue : p.tinta,
                              textDecorationLine: t.estado === 'hecha' ? 'line-through' : 'none',
                            },
                          ]}
                        >
                          {t.emoji} {t.titulo}
                        </Text>
                        {t.estado === 'hecha' && (
                          <Text style={[e.tiraTic, { color: p.verde }]}>✓</Text>
                        )}
                      </View>
                    ))}
                    {tareas.length > 6 && (
                      <Text style={[e.tiraMas, { color: p.tintaTenue }]}>
                        y {tareas.length - 6} más
                      </Text>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}

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
        <Cuadro color={p.alba} texto="Fe" />
        <Cuadro color={p.dia} texto="Estudio" />
        <Cuadro color={p.tarde} texto="Casa" />
        <Cuadro color={p.verde} texto="Deporte" />
        <Cuadro color={p.fuego} texto="Familia" />
      </View>
      <Text style={[e.leyendaPie, { color: p.tintaTenue }]}>
        Barra llena, terminado. A media tinta, aún pendiente. El fondo verde es
        un día cumplido del todo; el gris, fin de semana.
      </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * Las barritas de un día en el mes.
 *
 * En una celda de este tamaño no cabe el nombre de nada, pero sí el color: una
 * barra por tipo de cosa que hay ese día. De un vistazo se ve si el día está
 * cargado de estudio, de casa o de fe, sin leer una palabra. Las hechas van
 * llenas y las pendientes a media tinta.
 */
function Barras({ tareas, p }: { tareas: ResumenDia['tareas']; p: Paleta }) {
  if (tareas.length === 0) return null;

  // Una barra por tipo, en el orden en que aparecen, hasta cuatro.
  const porTipo = new Map<TipoActividad, { total: number; hechas: number }>();
  for (const t of tareas) {
    if (t.estado === 'omitida') continue;
    const v = porTipo.get(t.tipo) ?? { total: 0, hechas: 0 };
    v.total += 1;
    if (t.estado === 'hecha') v.hechas += 1;
    porTipo.set(t.tipo, v);
  }
  const tipos = [...porTipo.entries()].slice(0, 4);
  if (tipos.length === 0) return null;

  return (
    <View style={e.barras}>
      {tipos.map(([tipo, v]) => (
        <View
          key={tipo}
          style={[
            e.barraTipo,
            {
              backgroundColor: colorDeTipo(tipo, p),
              opacity: v.hechas === v.total ? 1 : 0.42,
            },
          ]}
        />
      ))}
    </View>
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
  eventoEmoji: { fontSize: 9, lineHeight: 11, marginTop: 1 },
  eventoTira: {
    borderWidth: StyleSheet.hairlineWidth, borderRadius: 9,
    paddingHorizontal: 9, paddingVertical: 7, marginBottom: 5,
  },
  eventoTexto: { fontSize: 12.5, fontWeight: '600' },
  numero: { fontSize: 14, fontVariant: ['tabular-nums'] },
  barras: { flexDirection: 'row', gap: 1.5, marginTop: 3, height: 3 },
  barraTipo: { width: 6, height: 3, borderRadius: 2 },
  agenda: { gap: 9, marginTop: 4 },
  diaAgenda: { borderRadius: 14, padding: 13 },
  diaAgendaCab: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  diaAgendaNombre: { flex: 1, fontSize: 14.5, fontWeight: '700' },
  diaAgendaCuenta: { fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  diaAgendaVacio: { fontSize: 12.5, fontStyle: 'italic' },
  tiras: { gap: 4 },
  tira: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    borderLeftWidth: 3, borderRadius: 6, paddingVertical: 5, paddingHorizontal: 8,
  },
  tiraHora: { fontSize: 10.5, fontVariant: ['tabular-nums'], width: 34 },
  tiraTexto: { flex: 1, fontSize: 12.5, fontWeight: '600' },
  tiraTic: { fontSize: 12, fontWeight: '700' },
  tiraMas: { fontSize: 11.5, marginTop: 2, marginLeft: 8 },
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
  leyendaPie: { fontSize: 11.5, textAlign: 'center', marginTop: 10, lineHeight: 16 },
});
