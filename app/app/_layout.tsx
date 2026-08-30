import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { ProveedorCelebracion } from '@/componentes/Celebracion';
import { repositorio } from '@/lib/repositorio';
import { usarPaleta } from '@/lib/tema';

export default function Disposicion() {
  const p = usarPaleta();
  // La celebración se monta en la raíz para que caiga por encima de todo,
  // incluida la barra de navegación.
  const [activadas, setActivadas] = useState(true);
  useEffect(() => {
    void repositorio.ajustes().then((a) => setActivadas(a.celebraciones));
  }, []);

  return (
    <ProveedorCelebracion activadas={activadas}>
      <StatusBar style={p.oscuro ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: p.papel },
          headerTintColor: p.tinta,
          headerTitleStyle: { fontWeight: '700' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: p.papel },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" options={{ headerShown: false }} />
        <Stack.Screen name="bienvenida" options={{ headerShown: false }} />
        <Stack.Screen name="arranque" options={{ headerShown: false }} />
        <Stack.Screen name="rutina" options={{ title: 'Tu rutina' }} />
        <Stack.Screen name="ajustes" options={{ title: 'Ajustes' }} />
        <Stack.Screen name="rachas" options={{ title: 'Tus rachas' }} />
        <Stack.Screen name="actividad" options={{ title: 'Una cosa tuya', presentation: 'modal' }} />
      </Stack>
    </ProveedorCelebracion>
  );
}
