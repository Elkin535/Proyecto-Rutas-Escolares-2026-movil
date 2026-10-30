import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { fetchApi } from './api';

/**
 * GPS del conductor en segundo plano: sigue enviando la ubicación del bus aunque bloquee el celular.
 * La tarea debe definirse al cargar la app (se importa desde _layout.tsx) para que Android pueda
 * despertarla sin que la pantalla esté abierta.
 */
const GPS_TASK = 'schooltrack-gps';
const KEY_VIAJE = 'gpsIdViaje';

type Coord = { latitude: number; longitude: number };
let escucha: ((c: Coord) => void) | null = null;

export const enviarUbicacion = async (idViaje: string | number, { latitude, longitude }: Coord) => {
  const res = await fetchApi(`/Historial/actualizar-gps?idViaje=${idViaje}`, {
    method: 'PUT',
    body: JSON.stringify({ latitudActual: latitude, longitudActual: longitude }),
  });
  return res.ok;
};

TaskManager.defineTask<{ locations: Location.LocationObject[] }>(GPS_TASK, async ({ data, error }) => {
  const ultima = data?.locations?.[data.locations.length - 1];
  if (error || !ultima) return;
  const coord = { latitude: ultima.coords.latitude, longitude: ultima.coords.longitude };
  escucha?.(coord);
  const idViaje = await AsyncStorage.getItem(KEY_VIAJE);
  if (idViaje) await enviarUbicacion(idViaje, coord).catch(() => false);
});

// La pantalla del conductor se suscribe para mover el bus en su propio mapa
export const escucharGps = (fn: (c: Coord) => void) => {
  escucha = fn;
  return () => {
    if (escucha === fn) escucha = null;
  };
};

export type ModoGps = 'segundo-plano' | 'primer-plano' | 'denegado';

export const iniciarGps = async (idViaje: number): Promise<ModoGps> => {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (!fg.granted) return 'denegado';
  await AsyncStorage.setItem(KEY_VIAJE, String(idViaje));

  // Android pide "Permitir todo el tiempo" en una pantalla aparte; si no lo da, se usa solo con la app abierta
  const bg = await Location.requestBackgroundPermissionsAsync().catch(() => ({ granted: false }));
  if (!bg.granted) return 'primer-plano';

  if (!(await Location.hasStartedLocationUpdatesAsync(GPS_TASK))) {
    await Location.startLocationUpdatesAsync(GPS_TASK, {
      accuracy: Location.Accuracy.High,
      timeInterval: 5000,
      distanceInterval: 15,
      pausesUpdatesAutomatically: false,
      activityType: Location.ActivityType.AutomotiveNavigation,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'SchoolTrack · recorrido en curso',
        notificationBody: 'Compartiendo la ubicación del bus con los acudientes',
        notificationColor: '#00d4ff',
      },
    });
  }
  return 'segundo-plano';
};

export const detenerGps = async () => {
  await AsyncStorage.removeItem(KEY_VIAJE);
  if (await Location.hasStartedLocationUpdatesAsync(GPS_TASK).catch(() => false)) {
    await Location.stopLocationUpdatesAsync(GPS_TASK);
  }
};
