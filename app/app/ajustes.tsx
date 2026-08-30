import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { usarPaleta } from '@/lib/tema';
import { repositorio } from '@/lib/repositorio';
import type { Ajustes as TipoAjustes, Persona } from '@/lib/tipos';

const ICONOS = ['👧', '🧒', '🦊', '🌻', '🦋', '🐢', '🌙', '⭐', '🎸', '🐨', '🍓', '🙂'];
const ANTICIPACIONES = [0, 5, 10, 15, 30];
const SONIDOS = ['campana', 'agua', 'pájaros', 'arpa', 'marimba'];

export default function Ajustes() {
  const p = usarPaleta();
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [persona, setPersona] = useState<Persona | null>(null);
  const [aj, setAj] = useState<TipoAjustes | null>(null);

  const cargar = useCallback(async () => {
    setPersona(await repositorio.persona());
    setAj(await repositorio.ajustes());
  }, []);
  useFocusEffect(useCallback(() => { void cargar(); }, [cargar]));

  if (!persona || !aj) return <View style={{ flex: 1, backgroundColor: p.papel }} />;

  const guardar = async (cambios: Partial<TipoAjustes>) => setAj(await repositorio.guardarAjustes(cambios));

  return (
    <ScrollView style={{ backgroundColor: p.papel }} contentContainerStyle={e.cuerpo}>
      <Grupo titulo="TÚ">
        <View style={e.campo}>
          <Text style={[e.campoEtiqueta, { color: p.tintaSuave }]}>Tu nombre</Text>
          <TextInput
            value={persona.nombre}
            onChangeText={(t) => setPersona({ ...persona, nombre: t })}
            onBlur={() => { void repositorio.guardarPersona({ nombre: persona.nombre.trim() || 'Tú' }); }}
            placeholder="Tu nombre"
            placeholderTextColor={p.tintaTenue}
            aria-label="Tu nombre"
            style={[e.entrada, { color: p.tinta, backgroundColor: p.tarjeta2, borderColor: p.linea }]}
          />
        </View>
        <Text style={[e.ayuda, { color: p.tintaSuave, borderTopColor: p.linea, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 14 }]}>
          Tu ícono. Así te ven tu familia y tus grupos.
        </Text>
        <View style={e.iconos}>
          {ICONOS.map((i) => {
            const puesto = persona.avatar_valor === i;
            return (
              <Pressable
                key={i}
                onPress={async () => setPersona(await repositorio.guardarPersona({ avatar_valor: i }))}
                role="radio"
                aria-checked={puesto}
                aria-label={`Ícono ${i}`}
                style={[
                  e.icono,
                  puesto
                    ? { backgroundColor: p.albaPiso, borderColor: p.alba, borderWidth: 2 }
                    : { backgroundColor: p.tarjeta2, borderColor: p.linea },
                ]}
              >
                <Text style={e.iconoTexto}>{i}</Text>
              </Pressable>
            );
          })}
        </View>
      </Grupo>

      <Grupo titulo="AVISOS Y SONIDOS">
        <Fila titulo="Avisarme">
          <Switch
            value={aj.avisos_activos}
            onValueChange={(v) => guardar({ avisos_activos: v })}
            trackColor={{ true: p.verde, false: p.lineaFuerte }}
          />
        </Fila>

        <Fila titulo="Con cuánto tiempo antes" sub="La regla general; cada cosa puede llevarle la contraria.">
          <View style={e.opciones}>
            {ANTICIPACIONES.map((m) => (
              <Chip
                key={m}
                texto={m === 0 ? 'A la hora' : `${m} min`}
                puesto={aj.avisar_antes_min === m}
                onPress={() => guardar({ avisar_antes_min: m })}
              />
            ))}
          </View>
        </Fila>

        <Fila titulo="Sonido normal">
          <View style={e.opciones}>
            {SONIDOS.map((s) => (
              <Chip key={s} texto={s} puesto={aj.sonido_aviso === s}
                onPress={() => guardar({ sonido_aviso: s })} />
            ))}
          </View>
        </Fila>

        <Fila titulo="Sonido del devocional" sub="Distinto del resto, para reconocerlo sin mirar.">
          <View style={e.opciones}>
            {SONIDOS.map((s) => (
              <Chip key={s} texto={s} puesto={aj.sonido_devocional === s}
                onPress={() => guardar({ sonido_devocional: s })} />
            ))}
          </View>
        </Fila>

        <Fila titulo="No molestar de noche" sub={
          aj.silencio_desde ? `De ${aj.silencio_desde} a ${aj.silencio_hasta}` : 'Apagado'
        }>
          <Switch
            value={aj.silencio_desde !== null}
            onValueChange={(v) => guardar(
              v ? { silencio_desde: '22:00', silencio_hasta: '06:00' }
                : { silencio_desde: null, silencio_hasta: null },
            )}
            trackColor={{ true: p.verde, false: p.lineaFuerte }}
          />
        </Fila>
      </Grupo>

      <Grupo titulo="CÓMO SE VE">
        <Fila titulo="Celebraciones" sub="El confeti cuando terminas algo. Llega en la fase 2.">
          <Switch
            value={aj.celebraciones}
            onValueChange={(v) => guardar({ celebraciones: v })}
            trackColor={{ true: p.verde, false: p.lineaFuerte }}
          />
        </Fila>
        <Fila titulo="Tema" sub="Por ahora sigue el del teléfono.">
          <Text style={[e.valor, { color: p.tintaTenue }]}>Automático</Text>
        </Fila>
      </Grupo>

      <Grupo titulo="EMPEZAR DE NUEVO">
        <Fila
          titulo={confirmando ? '¿Seguro? Se borra todo' : 'Volver a contestar el asistente'}
          sub={confirmando
            ? 'Tu rutina, tus rachas y tus insignias. No se puede deshacer.'
            : 'Se borra tu rutina y vuelve a salir la bienvenida.'}
        >
          <Pressable
            role="button"
            onPress={async () => {
              if (!confirmando) { setConfirmando(true); return; }
              await repositorio.empezarDeNuevo();
              router.replace('/bienvenida');
            }}
            style={[
              e.peligro,
              confirmando
                ? { backgroundColor: p.fuego, borderColor: p.fuego }
                : { backgroundColor: 'transparent', borderColor: p.fuego },
            ]}
          >
            <Text style={[e.peligroTexto, { color: confirmando ? '#FFF' : p.fuego }]}>
              {confirmando ? 'Sí, borrar' : 'Empezar de nuevo'}
            </Text>
          </Pressable>
        </Fila>
      </Grupo>

      <Text style={[e.version, { color: p.tintaTenue }]}>
        GraceDay · tu día, tu fe y tu gente
      </Text>
    </ScrollView>
  );
}

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  const p = usarPaleta();
  return (
    <View style={e.grupo}>
      <Text style={[e.grupoTitulo, { color: p.tintaTenue }]}>{titulo}</Text>
      <View style={[e.caja, { backgroundColor: p.tarjeta, borderColor: p.linea }]}>{children}</View>
    </View>
  );
}

function Fila({ titulo, sub, children }: { titulo: string; sub?: string; children: React.ReactNode }) {
  const p = usarPaleta();
  return (
    <View style={[e.fila, { borderTopColor: p.linea }]}>
      <View style={e.filaTexto}>
        <Text style={[e.filaTitulo, { color: p.tinta }]}>{titulo}</Text>
        {sub && <Text style={[e.filaSub, { color: p.tintaTenue }]}>{sub}</Text>}
      </View>
      {children}
    </View>
  );
}

function Chip({ texto, puesto, onPress }: { texto: string; puesto: boolean; onPress: () => void }) {
  const p = usarPaleta();
  return (
    <Pressable
      onPress={onPress}
      role="radio"
      aria-checked={puesto}
      style={[
        e.chip,
        puesto
          ? { backgroundColor: p.alba, borderColor: p.alba }
          : { backgroundColor: p.tarjeta2, borderColor: p.linea },
      ]}
    >
      <Text style={[e.chipTexto, { color: puesto ? '#FFF' : p.tintaSuave }]}>{texto}</Text>
    </Pressable>
  );
}

const e = StyleSheet.create({
  cuerpo: { padding: 18, paddingBottom: 48, maxWidth: 620, width: '100%', alignSelf: 'center' },
  grupo: { marginBottom: 22 },
  grupoTitulo: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 8 },
  caja: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  ayuda: { fontSize: 13, padding: 14, paddingBottom: 0 },
  campo: { padding: 14, gap: 7 },
  campoEtiqueta: { fontSize: 13.5, fontWeight: '600' },
  entrada: {
    borderWidth: StyleSheet.hairlineWidth, borderRadius: 11,
    paddingHorizontal: 13, paddingVertical: 12, fontSize: 16,
  },
  iconos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 14 },
  icono: {
    width: 48, height: 48, borderRadius: 13, borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center', justifyContent: 'center',
  },
  iconoTexto: { fontSize: 22 },
  fila: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderTopWidth: StyleSheet.hairlineWidth, flexWrap: 'wrap',
  },
  filaTexto: { flex: 1, minWidth: 150 },
  filaTitulo: { fontSize: 15, fontWeight: '600' },
  filaSub: { fontSize: 12, marginTop: 2 },
  valor: { fontSize: 13 },
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingVertical: 7, paddingHorizontal: 12, borderRadius: 9,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipTexto: { fontSize: 13, fontWeight: '600' },
  peligro: {
    paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1.5,
  },
  peligroTexto: { fontSize: 13.5, fontWeight: '700' },
  version: { fontSize: 12, textAlign: 'center', marginTop: 8 },
});
