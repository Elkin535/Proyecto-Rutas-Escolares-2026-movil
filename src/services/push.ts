import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { clearAuthData, fetchApi } from './api';

// Con la app abierta también se muestra la notificación (por defecto Expo la oculta)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Los mismos ids de canal que usa el backend (NotificacionService)
const crearCanales = async () => {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('recorrido', {
    name: 'Recorrido del bus',
    importance: Notifications.AndroidImportance.HIGH,
  });
  await Notifications.setNotificationChannelAsync('alertas', {
    name: 'Alertas de seguridad',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 500, 250, 500],
    bypassDnd: true,
  });
};

/**
 * Pide permiso, obtiene el token de Expo Push y lo registra en el backend para el usuario actual.
 * No lanza errores: sin push la app sigue funcionando.
 */
export const registrarPush = async () => {
  try {
    await crearCanales();
    if (!Device.isDevice) return;

    const { granted } = await Notifications.requestPermissionsAsync();
    if (!granted) return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      console.warn('Falta extra.eas.projectId en app.json (ejecuta "eas init"): no habrá notificaciones push.');
      return;
    }
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    const res = await fetchApi('/Notificacion/registrar-token', { method: 'POST', body: JSON.stringify({ token }) });
    if (res.ok) await AsyncStorage.setItem('pushToken', token);
  } catch (e) {
    console.warn('No se pudo registrar el celular para notificaciones:', e);
  }
};

// Notificación inmediata en este mismo celular (alarma de somnolencia, avisos del GPS...)
export const notificarLocal = (title: string, body: string, canal: 'recorrido' | 'alertas' = 'recorrido') =>
  Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: Platform.OS === 'android' ? { channelId: canal } : null,
  }).catch(() => {});

// Al cerrar sesión el celular deja de recibir push del usuario anterior
export const cerrarSesionCompleta = async () => {
  const token = await AsyncStorage.getItem('pushToken');
  if (token) {
    await fetchApi(`/Notificacion/eliminar-token?token=${encodeURIComponent(token)}`, { method: 'DELETE' }).catch(() => {});
    await AsyncStorage.removeItem('pushToken');
  }
  await clearAuthData();
};
