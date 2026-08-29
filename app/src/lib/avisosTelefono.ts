/**
 * Poner los avisos en la agenda del teléfono.
 *
 * Este archivo sí toca Expo, así que solo corre en el dispositivo. Qué avisar
 * y a qué hora se decide en `avisos.ts`, que es puro.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { AvisoProgramable } from './avisos';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Pide permiso una vez y prepara el canal de Android. */
export async function prepararAvisos(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('graceday', {
      name: 'GraceDay',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6C5CD4',
    });
  }

  const actual = await Notifications.getPermissionsAsync();
  if (actual.granted) return true;
  if (!actual.canAskAgain) return false;

  const pedido = await Notifications.requestPermissionsAsync();
  return pedido.granted;
}

/**
 * Deja programado exactamente lo que toca hoy.
 *
 * Se borra todo antes de volver a poner: es la única forma barata de que
 * marcar una tarea como hecha calle su alarma sin llevar la contabilidad de
 * cada identificador por separado.
 */
export async function reprogramar(avisos: AvisoProgramable[]): Promise<number> {
  if (Platform.OS === 'web') return 0;

  await Notifications.cancelAllScheduledNotificationsAsync();

  let puestos = 0;
  for (const a of avisos) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: a.titulo,
          body: a.cuerpo,
          sound: 'default',
          data: { tarea_id: a.tarea_id },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: a.momento,
        },
      });
      puestos += 1;
    } catch (e) {
      // Un aviso que no se pudo poner no debe tumbar los demás.
      console.warn('No se pudo programar un aviso:', e);
    }
  }
  return puestos;
}
