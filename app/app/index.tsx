import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';

import { AnilloProgreso } from '@/componentes/AnilloProgreso';
import { Aviso } from '@/componentes/Aviso';
import { CampoTexto } from '@/componentes/CampoTexto';
import { DetalleTarea } from '@/componentes/DetalleTarea';
import { useCelebrar } from '@/componentes/Celebracion';
import { Enlace } from '@/componentes/Enlace';
import { PreguntaTerminaste } from '@/componentes/PreguntaTerminaste';
import { SelectorHora } from '@/componentes/SelectorHora';
import { FilaTarea } from '@/componentes/FilaTarea';
import { TarjetaAhora } from '@/componentes/TarjetaAhora';
import { TarjetaVersiculo } from '@/componentes/TarjetaVersiculo';
import { devocionalDelDia, versiculoDelDia } from '@/lib/fe';
import { avisosDelDia } from '@/lib/avisos';
import { prepararAvisos, reprogramar } from '@/lib/avisosTelefono';
import { foco as calcularFoco, proximaOcupacion, resumenAvance } from '@/lib/dia';
import { aHora, aMinutos } from '@/lib/fechas';
import { diaSemana, fechaLarga, fechaLocal, horaLocal } from '@/lib/fechas';
import { OCUPACIONES } from '@/lib/arranque';
import { preguntarSiTermino, type Marcado, type Racha } from '@/lib/rachas';
import { repositorio, type DiaCompleto } from '@/lib/repositorio';
import { usarPaleta } from '@/lib/tema';
import type { Actividad, Ajustes, Persona } from '@/lib/tipos';

export default function Hoy() {
  const p = usarPaleta();
  const [persona, setPersona] = useState<Persona | null>(null);
  const [ajustes, setAjustes] = useState<Ajustes | null>(null);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [dia, setDia] = useState<DiaCompleto | null>(null);
  const [rachas, setRachas] = useState<Racha[]>([]);
  const [chispas, setChispas] = useState(0);
  const [preguntando, setPreguntando] = useState<string | null>(null);
  const [suelta, setSuelta] = useState<{ titulo: string; hora: string } | null>(null);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [faltaSuelta, setFaltaSuelta] = useState<string | null>(null);
  const router = useRouter();
  const celebrar = useCelebrar();
  // Se guarda el minuto para que «lo que toca ahora» se mueva solo con el reloj.
  const [ahora, setAhora] = useState(() => new Date());

  const zona = persona?.zona_horaria ?? 'America/Guatemala';
  const fecha = fechaLocal(ahora, zona);
  const hora = horaLocal(ahora, zona);

  const cargar = useCallback(async () => {
    const [pe, aj, ac] = await Promise.all([
      repositorio.persona(), repositorio.ajustes(), repositorio.actividades(),
    ]);
    // Quien nunca contestó el asistente no debería aterrizar en un día vacío
    // que no entiende: primero la bienvenida.
    if (!aj.arranque_hecho) { router.replace('/bienvenida'); return; }

    setPersona(pe); setAjustes(aj); setActividades(ac);
    setDia(await repositorio.dia(fechaLocal(new Date(), pe.zona_horaria)));
    setRachas(await repositorio.rachas());
    setChispas(await repositorio.chispasTotales());
  }, [router]);

  // Al volver de Rutina o Ajustes hay que releer: el día pudo cambiar.
  useFocusEffect(useCallback(() => { void cargar(); }, [cargar]));

  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => { void prepararAvisos(); }, []);

  // Abrir la app cuenta para su propia racha. `avanzar` ignora el día repetido,
  // así que volver a llamarlo no suma dos veces; el guardia es para no escribir
  // en el almacén cada vez que la pantalla recupera el foco.
  const aperturaHecha = useRef(false);
  useEffect(() => {
    if (!persona || aperturaHecha.current) return;
    aperturaHecha.current = true;
    let vivo = true;
    void repositorio.registrarApertura(fechaLocal(new Date(), persona.zona_horaria))
      .then(async (premio) => {
        if (!vivo) return;
        // Siempre se releen: la racha puede haber subido aunque no desbloquee
        // ninguna insignia, y la banda tiene que enseñarlo hoy, no mañana.
        setRachas(await repositorio.rachas());
        celebrar(premio.celebracion, textoPremio(premio));
      });
    return () => { vivo = false; };
  }, [persona, celebrar]);

  // Cada vez que cambia lo pendiente se vuelve a dejar la agenda al día: así
  // marcar una tarea calla su alarma.
  useEffect(() => {
    if (!ajustes || !dia) return;
    void reprogramar(avisosDelDia({
      fecha: dia.dia.fecha, zonaHoraria: zona, ajustes, actividades,
      tareas: dia.tareas, ahora: new Date(),
    }));
  }, [ajustes, dia, actividades, zona]);

  // El versículo y el devocional se deciden por la fecha, no por el reloj:
  // no cambian a media mañana ni al volver a abrir la app.
  const versiculo = useMemo(() => versiculoDelDia(fecha), [fecha]);
  const devocional = useMemo(
    () => devocionalDelDia(fecha, edadDe(persona?.fecha_nacimiento)),
    [fecha, persona],
  );

  const foco = useMemo(
    () => (dia ? calcularFoco(dia.tareas, hora) : null),
    [dia, hora],
  );

  const avisarAntes = useMemo(() => {
    if (!foco?.actual || !ajustes) return null;
    const act = actividades.find((a) => a.id === foco.actual!.actividad_id);
    if (act && !act.avisar) return null;
    return act?.avisar_antes_min ?? ajustes.avisar_antes_min;
  }, [foco, actividades, ajustes]);

  async function marcar(id: string, estado: 'hecha' | 'pendiente' | 'omitida', m?: Marcado) {
    const t = dia?.tareas.find((x) => x.id === id);

    // Al marcar estudio antes de tiempo hay que preguntar: la respuesta decide
    // el premio, y premiar la velocidad ahí sería pagar por estudiar menos.
    if (t && estado === 'hecha' && !m) {
      const act = actividades.find((a) => a.id === t.actividad_id);
      const reales = Math.max(0, aMinutos(hora) - aMinutos(t.hora_inicio));
      if (preguntarSiTermino(t, act, reales)) { setPreguntando(id); return; }
    }

    const minutos = t && estado === 'hecha'
      ? Math.max(0, aMinutos(hora) - aMinutos(t.hora_inicio))
      : null;

    const r = await repositorio.marcarTarea(fecha, id, estado, {
      minutos_reales: m?.minutos_reales ?? minutos,
      termino_de_verdad: m?.termino_de_verdad ?? null,
    });
    setDia(r.dia);
    setRachas(await repositorio.rachas());
    setChispas(await repositorio.chispasTotales());
    celebrar(r.premio.celebracion, textoPremio(r.premio));
  }

  if (!persona || !ajustes || !dia || !foco) {
    return (
      <SafeAreaView style={[e.pantalla, e.centrado, { backgroundColor: p.papel }]}>
        <ActivityIndicator color={p.alba} />
      </SafeAreaView>
    );
  }

  const avance = resumenAvance(dia.tareas);

  // Un día sin colegio y sin decir por qué se lee como si la app no hubiera
  // guardado el horario. Es la confusión más fácil de tener y la más barata
  // de evitar.
  const hoyToca = ajustes.ocupacion !== 'ninguno'
    && ajustes.dias_ocupados.includes(diaSemana(fecha, zona));
  const vuelve = ajustes.ocupacion === 'ninguno' || hoyToca
    ? null
    : proximaOcupacion(fecha, ajustes.dias_ocupados, zona);
  const comoSeLlama = ajustes.ocupacion_nombre.trim()
    || OCUPACIONES.find((o) => o.id === ajustes.ocupacion)?.nombre
    || 'el colegio';

  return (
    <SafeAreaView style={[e.pantalla, { backgroundColor: p.papel }]} edges={['top']}>
      <ScrollView contentContainerStyle={e.cuerpo}>
        <View style={e.barra}>
          <View style={[e.avatar, { backgroundColor: p.albaPiso }]}>
            <Text style={e.avatarTexto}>{persona.avatar_valor}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[e.saludo, { color: p.tinta }]}>{saludo(hora)}, {persona.nombre}</Text>
            <Text style={[e.fecha, { color: p.tintaTenue }]}>{fechaLarga(fecha, zona)}</Text>
          </View>
          <Enlace
            href="/ajustes"
            etiqueta="Ajustes"
            estilo={[e.boton, { backgroundColor: p.tarjeta, borderColor: p.linea }]}
          >
            <Text style={e.botonTexto}>⚙️</Text>
          </Enlace>
        </View>

        <TarjetaVersiculo versiculo={versiculo} onAbrir={() => router.push('/versiculo')} />

        <TarjetaAhora foco={foco} avisarAntes={avisarAntes} />
        <AnilloProgreso hechas={avance.hechas} total={avance.total} />

        {vuelve && (
          <View style={[e.libre, { backgroundColor: p.tarjeta2, borderColor: p.linea }]}>
            <Text style={[e.libreTitulo, { color: p.tinta }]}>
              Hoy no hay {comoSeLlama.toLowerCase()}
            </Text>
            <Text style={[e.libreTexto, { color: p.tintaSuave }]}>
              Tu horario está guardado y vuelve el {vuelve.nombre}
              {vuelve.enCuantos === 1 ? ', que es mañana' : ''}. Míralo entero en
              «Editar mi rutina de la semana».
            </Text>
          </View>
        )}

        {dia.tareas.length === 0 ? (
          <View style={[e.vacio, { backgroundColor: p.tarjeta, borderColor: p.linea }]}>
            <Text style={[e.vacioTitulo, { color: p.tinta }]}>Hoy no tienes nada puesto</Text>
            <Text style={[e.vacioTexto, { color: p.tintaSuave }]}>
              Arma tu semana una vez y la app te la reparte todos los días.
            </Text>
            <Enlace href="/rutina" estilo={[e.botonGrande, { backgroundColor: p.alba }]}>
              <Text style={e.botonGrandeTexto}>Armar mi rutina</Text>
            </Enlace>
          </View>
        ) : (
          dia.tareas.map((t) => (
            <FilaTarea
              key={t.id}
              tarea={t}
              esFoco={foco.enCurso && foco.actual?.id === t.id}
              onMarcar={() => marcar(t.id, t.estado === 'hecha' ? 'pendiente' : 'hecha')}
              onOmitir={() => marcar(t.id, t.estado === 'omitida' ? 'pendiente' : 'omitida')}
              onAbrir={() => setAbierta(t.id)}
            />
          ))
        )}

        <Pressable
          role="button"
          onPress={() => { setFaltaSuelta(null); setSuelta({ titulo: '', hora }); }}
          style={[e.anadir, { borderColor: p.alba, backgroundColor: p.albaPiso }]}
        >
          <Text style={[e.anadirTexto, { color: p.alba }]}>+ Añadir algo solo para hoy</Text>
        </Pressable>

        <Enlace href="/rachas" estilo={[e.enlace, { borderColor: p.linea, marginTop: 12 }]}>
          <Text style={[e.enlaceTexto, { color: p.fuego }]}>
            {rachaFuerte(rachas)} · {chispas} chispas →
          </Text>
        </Enlace>

        <Enlace href="/calendario" estilo={[e.enlace, { borderColor: p.linea }]}>
          <Text style={[e.enlaceTexto, { color: p.dia }]}>📅  Ver mi semana y mi mes →</Text>
        </Enlace>

        <Enlace href="/rutina" estilo={[e.enlace, { borderColor: p.linea }]}>
          <Text style={[e.enlaceTexto, { color: p.alba }]}>Editar mi rutina de la semana →</Text>
        </Enlace>

        <Text style={[e.pista, { color: p.tintaTenue }]}>
          Toca el círculo para marcar, la tarea para ver el detalle, y mantén
          pulsado si te la saltaste.
        </Text>
      </ScrollView>

      <DetalleTarea
        tarea={dia.tareas.find((t) => t.id === abierta) ?? null}
        devocional={devocional}
        onCerrar={() => setAbierta(null)}
        onGuardar={async (nota, metodo) => {
          if (!abierta) return;
          setDia(await repositorio.guardarDetalle(fecha, abierta, {
            nota, metodo_devocional: metodo,
          }));
          setAbierta(null);
        }}
        onEstado={(estado) => {
          const id = abierta;
          setAbierta(null);
          if (id) void marcar(id, estado as 'hecha' | 'pendiente' | 'omitida');
        }}
        onBorrar={async () => {
          if (!abierta) return;
          const id = abierta;
          setAbierta(null);
          setDia(await repositorio.borrarTarea(fecha, id));
        }}
      />

      <Modal
        visible={suelta !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSuelta(null)}
      >
        <View style={e.fondo}>
          <View style={[e.hoja, { backgroundColor: p.papel }]}>
            <Text style={[e.hojaTitulo, { color: p.tinta }]}>Algo solo para hoy</Text>
            <Text style={[e.hojaAyuda, { color: p.tintaSuave }]}>
              No entra en tu rutina: aparece hoy y ya está.
            </Text>
            <CampoTexto
              etiqueta="¿Qué hay que hacer?"
              obligatorio
              error={faltaSuelta}
              value={suelta?.titulo ?? ''}
              onChangeText={(t) => {
                setFaltaSuelta(null);
                setSuelta((s) => (s ? { ...s, titulo: t } : s));
              }}
              placeholder="Llamar a la abuela, comprar pan…"
              autoFocus
            />
            <SelectorHora
              etiqueta="¿A qué hora?"
              valor={suelta?.hora ?? '12:00'}
              onCambiar={(h) => setSuelta((s) => (s ? { ...s, hora: h } : s))}
            />
            <Aviso texto={faltaSuelta} />

            <Pressable
              role="button"
              onPress={async () => {
                const s = suelta;
                if (!s?.titulo.trim()) {
                  setFaltaSuelta('Falta decir qué hay que hacer.');
                  return;
                }
                setSuelta(null);
                setFaltaSuelta(null);
                setDia(await repositorio.anadirTareaHoy(fecha, {
                  titulo: s.titulo.trim(), emoji: '⭐', tipo: 'casa',
                  hora_inicio: s.hora, hora_fin: aHora(aMinutos(s.hora) + 30),
                }));
              }}
              style={[e.hojaBoton, { backgroundColor: p.alba }]}
            >
              <Text style={e.hojaBotonTexto}>Añadir a hoy</Text>
            </Pressable>
            <Pressable
              role="button"
              onPress={() => { setSuelta(null); setFaltaSuelta(null); }}
              style={e.cerrar}
            >
              <Text style={[e.cerrarTexto, { color: p.tintaSuave }]}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <PreguntaTerminaste
        visible={preguntando !== null}
        onResponder={(termino) => {
          const id = preguntando;
          setPreguntando(null);
          if (id) void marcar(id, 'hecha', { minutos_reales: null, termino_de_verdad: termino });
        }}
      />
    </SafeAreaView>
  );
}

/** La racha más alta, para enseñarla en la banda. */
function rachaFuerte(rachas: Racha[]): string {
  const mejor = [...rachas].sort((a, b) => b.racha_actual - a.racha_actual)[0];
  if (!mejor || mejor.racha_actual === 0) return '🔥 Empieza tu racha';
  return `🔥 ${mejor.racha_actual} ${mejor.racha_actual === 1 ? 'día' : 'días'}`;
}

function textoPremio(premio: { logros: { nombre: string; emoji: string }[]; dia_perfecto: boolean; chispas: number }): string | undefined {
  if (premio.logros.length > 0) {
    const l = premio.logros[premio.logros.length - 1];
    return `${l.emoji}  ¡${l.nombre}!`;
  }
  if (premio.dia_perfecto) return '⭐  ¡Día completo!';
  return undefined;
}

/** Los años cumplidos, o null si no se sabe la fecha de nacimiento. */
function edadDe(nacimiento: string | null | undefined): number | null {
  if (!nacimiento) return null;
  const n = new Date(`${nacimiento}T12:00:00Z`);
  const hoy = new Date();
  let anios = hoy.getUTCFullYear() - n.getUTCFullYear();
  const cumplioYa = hoy.getUTCMonth() > n.getUTCMonth()
    || (hoy.getUTCMonth() === n.getUTCMonth() && hoy.getUTCDate() >= n.getUTCDate());
  if (!cumplioYa) anios -= 1;
  return anios >= 0 && anios < 130 ? anios : null;
}

function saludo(hora: string): string {
  const h = Number(hora.slice(0, 2));
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

const e = StyleSheet.create({
  pantalla: { flex: 1 },
  centrado: { alignItems: 'center', justifyContent: 'center' },
  cuerpo: { padding: 18, paddingBottom: 48, maxWidth: 620, width: '100%', alignSelf: 'center' },
  barra: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarTexto: { fontSize: 22 },
  saludo: { fontSize: 21, fontWeight: '700' },
  fecha: { fontSize: 13, marginTop: 2 },
  boton: {
    width: 40, height: 40, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center', justifyContent: 'center',
  },
  botonTexto: { fontSize: 17 },
  vacio: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, padding: 22, alignItems: 'center' },
  vacioTitulo: { fontSize: 17, fontWeight: '700', marginBottom: 6 },
  vacioTexto: { fontSize: 14, textAlign: 'center', marginBottom: 16 },
  botonGrande: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 22 },
  botonGrandeTexto: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  enlace: {
    marginTop: 14, paddingVertical: 14, borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth, alignItems: 'center',
  },
  enlaceTexto: { fontSize: 15, fontWeight: '600' },
  pista: { fontSize: 12, textAlign: 'center', marginTop: 16 },
  libre: {
    borderWidth: StyleSheet.hairlineWidth, borderRadius: 14,
    padding: 15, marginBottom: 14, gap: 5,
  },
  libreTitulo: { fontSize: 15.5, fontWeight: '700' },
  libreTexto: { fontSize: 13.5, lineHeight: 19 },
  anadir: {
    marginTop: 14, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', borderWidth: 1.5, borderStyle: 'dashed',
  },
  anadirTexto: { fontSize: 15.5, fontWeight: '700' },
  fondo: { flex: 1, backgroundColor: 'rgba(20,16,36,0.55)', justifyContent: 'flex-end' },
  hoja: { borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingBottom: 34, gap: 12 },
  hojaTitulo: { fontSize: 19, fontWeight: '700' },
  hojaAyuda: { fontSize: 13.5, marginTop: -6 },
  entrada: {
    borderWidth: StyleSheet.hairlineWidth, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13, fontSize: 16,
  },
  hojaBoton: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 6 },
  hojaBotonTexto: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  cerrar: { paddingVertical: 10, alignItems: 'center' },
  cerrarTexto: { fontSize: 15, fontWeight: '600' },
});
