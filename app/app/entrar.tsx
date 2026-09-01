import { useCallback, useState } from 'react';
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';

import { Aviso } from '@/componentes/Aviso';
import { Cabecera } from '@/componentes/Cabecera';
import { CampoTexto } from '@/componentes/CampoTexto';
import {
  crearCuenta, entrar as entrarEnLaCuenta, hayNube, recuperarSesion, salir,
  subirSiEstaVacia, verLaMaleta, type Cuenta,
} from '@/lib/cuenta';
import type { Equipaje } from '@/lib/equipaje';
import {
  LARGO_CLAVE, queFalta, SIN_AVISOS, todoBien, type Avisos, type Modo,
} from '@/lib/sesion';
import { usarPaleta } from '@/lib/tema';

/**
 * Entrar y crear cuenta.
 *
 * La app funciona sin cuenta, y eso no es un modo a medias: es como se usa el
 * primer día. Esta pantalla no obliga a nada — se llega desde Ajustes, y lo
 * primero que dice es **para qué sirve tener una**.
 *
 * Lo que ya está en el teléfono se enseña **antes** de subirlo, con números, y
 * lo que no viaja se dice también. Un «sincronizando…» seguido de un tick
 * verde no cuenta si viajaron las cuatro cosas o las cuarenta.
 */
export default function Entrar() {
  const p = usarPaleta();
  const router = useRouter();

  const [modo, setModo] = useState<Modo>('crear');
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');

  const [avisos, setAvisos] = useState<Avisos>(SIN_AVISOS);
  const [fallo, setFallo] = useState<string | null>(null);
  const [bien, setBien] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState(false);

  const [cuenta, setCuenta] = useState<Cuenta | null>(null);
  const [maleta, setMaleta] = useState<{
    equipaje: Equipaje; trae: boolean; viaja: string[]; noViaja: string[];
  } | null>(null);

  const cargar = useCallback(async () => {
    setMaleta(await verLaMaleta());
    if (hayNube) setCuenta(await recuperarSesion());
  }, []);

  useFocusEffect(useCallback(() => { void cargar(); }, [cargar]));

  function cambiarModo(nuevo: Modo) {
    setModo(nuevo);
    // Los avisos son del modo anterior: dejarlos puestos diría que falta el
    // nombre en una pantalla que ya no lo pide.
    setAvisos(SIN_AVISOS);
    setFallo(null);
    setBien(null);
  }

  /**
   * El botón no se apaga nunca (R2): se pulsa y dice qué falta.
   *
   * Un botón gris no explica por qué está gris, y quien lo mira acaba
   * probando cosas al azar.
   */
  async function seguir() {
    const falta = queFalta(modo, { nombre, correo, clave });
    setAvisos(falta);
    setFallo(null);
    setBien(null);
    if (!todoBien(falta)) return;

    if (!hayNube) {
      setFallo('Esta copia de la app no tiene la nube configurada. '
        + 'Todo se sigue guardando en este teléfono.');
      return;
    }

    setTrabajando(true);
    try {
      if (modo === 'crear') {
        const r = await crearCuenta(nombre, correo, clave, maleta?.equipaje ?? null);
        setCuenta(r.cuenta);
        setBien(r.mensaje);
        if (r.dentro) setClave('');
      } else {
        const r = await entrarEnLaCuenta(correo, clave);
        setCuenta(r.cuenta);
        setClave('');
        // Lo que se quedó sin subir el día que se creó la cuenta —porque
        // hacía falta confirmar el correo— sube ahora, y solo si allá no hay
        // nada: encima de una rutina que ya existe, la duplicaría.
        const subido = maleta?.equipaje ? await subirSiEstaVacia(maleta.equipaje) : null;
        setBien(subido ? `${r.mensaje} ${subido}` : r.mensaje);
      }
      setMaleta(await verLaMaleta());
    } catch (e) {
      setFallo(e instanceof Error ? e.message : 'No se pudo. Vuelve a probar.');
    } finally {
      setTrabajando(false);
    }
  }

  async function cerrarSesion() {
    setTrabajando(true);
    setFallo(null);
    try {
      await salir();
      setCuenta(null);
      setBien('Saliste de tu cuenta. Todo lo tuyo sigue guardado, aquí y allá.');
      setMaleta(await verLaMaleta());
    } catch (e) {
      setFallo(e instanceof Error ? e.message : 'No se pudo salir.');
    } finally {
      setTrabajando(false);
    }
  }

  // ------------------------------------------------------------ ya dentro

  if (cuenta) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: p.papel }} edges={['top']}>
        <Cabecera titulo="Mi cuenta" />
        <ScrollView contentContainerStyle={e.hoja}>
          <View style={[e.tarjeta, { backgroundColor: p.tarjeta, borderColor: p.linea }]}>
            <Text style={[e.grande, { color: p.tinta }]}>☁️  Estás dentro</Text>
            <Text style={[e.parrafo, { color: p.tintaSuave }]}>
              {cuenta.nombre ? `${cuenta.nombre} · ` : ''}{cuenta.correo}
            </Text>
            <Text style={[e.parrafo, { color: p.tintaTenue }]}>
              Lo que hagas se guarda en tu cuenta, así que lo tienes en cualquier
              teléfono en el que entres.
            </Text>
          </View>

          {bien && (
            <View style={[e.tarjeta, { backgroundColor: p.verdePiso, borderColor: p.verde }]}>
              <Text style={[e.parrafo, { color: p.verde }]}>✓  {bien}</Text>
            </View>
          )}
          <Aviso texto={fallo} />

          <Pressable
            role="button"
            accessibilityState={{ busy: trabajando }}
            onPress={() => void cerrarSesion()}
            style={[e.boton, { borderColor: p.linea, backgroundColor: p.tarjeta }]}
          >
            <Text style={[e.botonTexto, { color: p.tinta }]}>
              {trabajando ? 'Saliendo…' : 'Salir de mi cuenta'}
            </Text>
          </Pressable>
          <Text style={[e.pie, { color: p.tintaTenue }]}>
            Salir no borra nada. Lo tuyo se queda en la cuenta, y este teléfono
            vuelve a guardar por su cuenta.
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // -------------------------------------------------------- entrar o crear

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.papel }} edges={['top']}>
      <Cabecera titulo={modo === 'crear' ? 'Crear mi cuenta' : 'Entrar'} />
      <ScrollView contentContainerStyle={e.hoja} keyboardShouldPersistTaps="handled">

        <View style={[e.tarjeta, { backgroundColor: p.tarjeta, borderColor: p.linea }]}>
          <Text style={[e.parrafo, { color: p.tintaSuave }]}>
            GraceDay funciona sin cuenta, y así puedes seguir. Con una cuenta,
            lo tuyo te sigue a otro teléfono y puedes invitar a tu familia.
          </Text>
        </View>

        {/* Los dos modos, siempre a la vista: quien ya tiene cuenta no debería
            tener que adivinar dónde está «entrar». */}
        <View role="tablist" style={e.pestanas}>
          {(['crear', 'entrar'] as Modo[]).map((m) => {
            const puesta = modo === m;
            return (
              <Pressable
                key={m}
                role="tab"
                aria-selected={puesta}
                onPress={() => cambiarModo(m)}
                style={[e.pestana, {
                  backgroundColor: puesta ? p.albaPiso : p.tarjeta,
                  borderColor: puesta ? p.alba : p.linea,
                }]}
              >
                <Text style={[e.pestanaTexto, { color: puesta ? p.alba : p.tintaSuave }]}>
                  {m === 'crear' ? 'Crear cuenta' : 'Ya tengo cuenta'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={e.campos}>
          {modo === 'crear' && (
            <CampoTexto
              etiqueta="Tu nombre"
              ayuda="Así te va a saludar la app."
              obligatorio
              value={nombre}
              onChangeText={setNombre}
              error={avisos.nombre}
              autoCapitalize="words"
              autoComplete="name"
            />
          )}

          <CampoTexto
            etiqueta="Tu correo"
            ayuda="Es con lo que entras, y a donde llegan las invitaciones."
            obligatorio
            value={correo}
            onChangeText={setCorreo}
            error={avisos.correo}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            inputMode="email"
          />

          <CampoTexto
            etiqueta="Tu contraseña"
            ayuda={modo === 'crear'
              ? `Al menos ${LARGO_CLAVE} caracteres. Que no sea la del colegio.`
              : 'La que pusiste al crear la cuenta.'}
            obligatorio
            value={clave}
            onChangeText={setClave}
            error={avisos.clave}
            secureTextEntry
            autoCapitalize="none"
            autoComplete={modo === 'crear' ? 'new-password' : 'current-password'}
          />
        </View>

        {/* Lo que se lleva, ANTES de subirlo. */}
        {modo === 'crear' && maleta?.trae && (
          <View style={[e.tarjeta, { backgroundColor: p.albaPiso, borderColor: p.alba }]}>
            <Text style={[e.titulillo, { color: p.alba }]}>Se sube contigo</Text>
            {maleta.viaja.map((x) => (
              <Text key={x} style={[e.linea, { color: p.tintaSuave }]}>·  {x}</Text>
            ))}
            {maleta.noViaja.length > 0 && (
              <>
                <Text style={[e.titulillo, { color: p.tintaSuave, marginTop: 12 }]}>
                  Se queda en este teléfono
                </Text>
                {maleta.noViaja.map((x) => (
                  <Text key={x} style={[e.linea, { color: p.tintaTenue }]}>·  {x}</Text>
                ))}
              </>
            )}
          </View>
        )}

        {bien && (
          <View style={[e.tarjeta, { backgroundColor: p.verdePiso, borderColor: p.verde }]}>
            <Text style={[e.parrafo, { color: p.verde }]}>✓  {bien}</Text>
          </View>
        )}
        <Aviso texto={fallo} />

        <Pressable
          role="button"
          accessibilityState={{ busy: trabajando }}
          onPress={() => void seguir()}
          style={[e.boton, { backgroundColor: p.alba, borderColor: p.alba }]}
        >
          {trabajando
            ? <ActivityIndicator color={p.papel} />
            : (
              <Text style={[e.botonTexto, { color: p.papel }]}>
                {modo === 'crear' ? 'Crear mi cuenta' : 'Entrar'}
              </Text>
            )}
        </Pressable>

        <Pressable role="button" onPress={() => router.back()} style={e.volver}>
          <Text style={[e.volverTexto, { color: p.tintaSuave }]}>
            Seguir sin cuenta, en este teléfono
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const e = StyleSheet.create({
  hoja: { padding: 18, paddingBottom: 48, gap: 16 },
  tarjeta: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 15, padding: 16, gap: 8 },
  grande: { fontSize: 19, fontWeight: '800' },
  parrafo: { fontSize: 14.5, lineHeight: 21 },
  titulillo: { fontSize: 12.5, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  linea: { fontSize: 14, lineHeight: 21 },
  pestanas: { flexDirection: 'row', gap: 10 },
  pestana: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  pestanaTexto: { fontSize: 14.5, fontWeight: '700' },
  campos: { gap: 18 },
  boton: {
    borderWidth: 1, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center', minHeight: 54,
  },
  botonTexto: { fontSize: 16.5, fontWeight: '800' },
  volver: { alignItems: 'center', paddingVertical: 10 },
  volverTexto: { fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' },
  pie: { fontSize: 12.5, lineHeight: 18, textAlign: 'center' },
});
