import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { usarPaleta } from '@/lib/tema';

export default function Disposicion() {
  const p = usarPaleta();
  return (
    <>
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
        <Stack.Screen name="rutina" options={{ title: 'Tu rutina' }} />
        <Stack.Screen name="ajustes" options={{ title: 'Ajustes' }} />
      </Stack>
    </>
  );
}
