import { Ionicons } from '@expo/vector-icons';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Text, TouchableOpacity, Vibration, View } from 'react-native';
import type { Face } from 'react-native-vision-camera-face-detector';

import { Colors } from '../constants/Colors';
import { fetchApi } from '../services/api';
import { notificarLocal } from '../services/push';
import { avisar, confirmar } from '../services/ruta';
import { RutaColors, styles } from '../styles/ruta.styles';

// Carga segura: En Expo Go no están los módulos nativos C++ (NitroModules/VisionCamera)
let Camera: any = null;
let useCameraPermission: () => { hasPermission: boolean; requestPermission: () => Promise<boolean> } = () => ({
  hasPermission: false,
  requestPermission: async () => false,
});

try {
  const vc = require('react-native-vision-camera');
  if (vc?.useCameraPermission) {
    useCameraPermission = vc.useCameraPermission;
  }
  const fd = require('react-native-vision-camera-face-detector');
  Camera = fd?.Camera;
} catch {
  // Expo Go: degrada de forma segura sin romper la aplicación
}

// La detección de ojos (ML Kit) es nativa: solo existe en la app instalada (build de desarrollo / APK)
const CAMARA_DISPONIBLE = !!Camera;

// Umbrales (ML Kit da la probabilidad de ojo abierto entre 0 y 1)
const OJO_CERRADO = 0.25;
const MICROSUENO_MS = 1500; // ojos cerrados seguidos -> alarma
const VENTANA_FATIGA_MS = 30000; // PERCLOS: % del tiempo con ojos cerrados en los últimos 30 s
const PERCLOS_FATIGA = 0.3;
const SIN_ROSTRO_MS = 8000;
const PAUSA_ALERTA_MS = { Microsueño: 60000, Fatiga: 300000 };

type Estado = 'atento' | 'fatiga' | 'microsueno' | 'sin-rostro' | 'sin-permiso' | 'no-disponible';
type Tipo = keyof typeof PAUSA_ALERTA_MS;

interface Props {
  activo: boolean;
  idViaje?: number | null;
  ubicacion?: { latitude: number; longitude: number } | null;
}

const ESTADOS: Record<Estado, { texto: string; color: string; icono: keyof typeof Ionicons.glyphMap }> = {
  atento: { texto: 'Atento', color: RutaColors.success, icono: 'eye-outline' },
  fatiga: { texto: 'Fatiga', color: '#f59e0b', icono: 'cafe-outline' },
  microsueno: { texto: '¡DESPIERTA!', color: RutaColors.danger, icono: 'alert-circle' },
  'sin-rostro': { texto: 'Sin rostro', color: Colors.mutedText, icono: 'eye-off-outline' },
  'sin-permiso': { texto: 'Sin permiso de cámara', color: '#f59e0b', icono: 'videocam-off-outline' },
  'no-disponible': { texto: 'Monitor de sueño inactivo', color: Colors.mutedText, icono: 'eye-off-outline' },
};

/**
 * Detección de somnolencia en el propio celular con la cámara frontal (ML Kit, sin internet).
 * - Microsueño: ojos cerrados ≥ 1,5 s → alarma sonora + vibración + alerta al admin.
 * - Fatiga: ojos cerrados ≥ 30 % del tiempo en 30 s (PERCLOS) → aviso + alerta al admin.
 */
export default function MonitorSomnolencia({ activo, idViaje, ubicacion }: Props) {
  const { hasPermission, requestPermission } = useCameraPermission();
  const alarma = useAudioPlayer(require('../../assets/sounds/alarma.wav'));
  const [estado, setEstado] = useState<Estado>('atento');

  const cerradoDesde = useRef<number | null>(null);
  const ultimoRostro = useRef(0);
  const muestras = useRef<{ t: number; cerrado: boolean }[]>([]);
  const ultimaAlerta = useRef<Record<Tipo, number>>({ Microsueño: 0, Fatiga: 0 });
  const estadoRef = useRef<Estado>('atento');
  const ubicacionRef = useRef(ubicacion);
  const repetir = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    ubicacionRef.current = ubicacion;
  }, [ubicacion]);

  useEffect(() => {
    if (activo && CAMARA_DISPONIBLE && !hasPermission) requestPermission();
  }, [activo, hasPermission, requestPermission]);

  useEffect(() => {
    // Que la alarma suene aunque el celular esté en modo silencio
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true }).catch(() => {});
  }, []);

  // El WAV dura 1 s: se repite cada segundo mientras dure el microsueño
  const sonarAlarma = useCallback(() => {
    const sonar = () => {
      alarma.seekTo(0);
      alarma.play();
    };
    sonar();
    if (!repetir.current) repetir.current = setInterval(sonar, 1000);
  }, [alarma]);

  const detenerAlarma = useCallback(() => {
    if (repetir.current) clearInterval(repetir.current);
    repetir.current = null;
    alarma.pause();
    Vibration.cancel();
  }, [alarma]);

  // Al terminar el recorrido o desmontar, nunca dejar la alarma sonando
  useEffect(() => {
    if (!activo) detenerAlarma();
    return detenerAlarma;
  }, [activo, detenerAlarma]);

  const reportar = useCallback(
    (tipo: Tipo) => {
      const ahora = Date.now();
      if (ahora - ultimaAlerta.current[tipo] < PAUSA_ALERTA_MS[tipo]) return;
      ultimaAlerta.current[tipo] = ahora;
      const u = ubicacionRef.current;
      fetchApi('/Alerta/somnolencia', {
        method: 'POST',
        body: JSON.stringify({ tipo, idViaje, latitud: u?.latitude, longitud: u?.longitude }),
      }).catch(() => {});
    },
    [idViaje]
  );

  const cambiarEstado = useCallback(
    (nuevo: Estado) => {
      if (estadoRef.current === nuevo) return;
      const anterior = estadoRef.current;
      estadoRef.current = nuevo;
      setEstado(nuevo);

      if (nuevo === 'microsueno') {
        sonarAlarma();
        Vibration.vibrate([0, 600, 300], true);
        reportar('Microsueño');
      } else if (anterior === 'microsueno') {
        detenerAlarma();
      }
      if (nuevo === 'fatiga') {
        Vibration.vibrate([0, 300, 200, 300]);
        notificarLocal('☕ Señales de cansancio', 'Detén el bus en un lugar seguro y toma un descanso.', 'alertas');
        reportar('Fatiga');
      }
    },
    [sonarAlarma, detenerAlarma, reportar]
  );

  const onFaces = useCallback(
    (faces: Face[]) => {
      const ahora = Date.now();
      // El rostro más grande es el del conductor (el más cercano a la cámara)
      const cara = faces.reduce<Face | undefined>(
        (max, f) => (!max || f.bounds.width > max.bounds.width ? f : max),
        undefined
      );
      const izq = cara?.leftEyeOpenProbability;
      const der = cara?.rightEyeOpenProbability;

      if (izq == null || der == null) {
        cerradoDesde.current = null;
        ultimoRostro.current ||= ahora;
        if (ahora - ultimoRostro.current > SIN_ROSTRO_MS && estadoRef.current !== 'microsueno') cambiarEstado('sin-rostro');
        return;
      }
      ultimoRostro.current = ahora;

      const cerrado = Math.max(izq, der) < OJO_CERRADO;
      muestras.current.push({ t: ahora, cerrado });
      while (muestras.current.length && muestras.current[0].t < ahora - VENTANA_FATIGA_MS) muestras.current.shift();

      if (cerrado) cerradoDesde.current ??= ahora;
      else cerradoDesde.current = null;

      const perclos = muestras.current.filter(m => m.cerrado).length / muestras.current.length;
      // Se exige media ventana de datos para no saltar con los primeros segundos
      const ventanaLlena = ahora - muestras.current[0].t > VENTANA_FATIGA_MS / 2;

      if (cerradoDesde.current && ahora - cerradoDesde.current >= MICROSUENO_MS) cambiarEstado('microsueno');
      else if (!cerrado && estadoRef.current === 'microsueno') cambiarEstado('atento');
      else if (ventanaLlena && perclos >= PERCLOS_FATIGA) cambiarEstado('fatiga');
      else if (!cerrado && estadoRef.current !== 'microsueno') cambiarEstado('atento');
    },
    [cambiarEstado]
  );

  if (!activo) return null;

  // Sin el módulo nativo (Expo Go) o sin permiso: etiqueta pequeña que explica qué pasa al tocarla,
  // en lugar de una caja negra que tapa los botones de la pantalla
  if (!CAMARA_DISPONIBLE || !hasPermission) {
    const motivo: Estado = !CAMARA_DISPONIBLE ? 'no-disponible' : 'sin-permiso';
    const info = ESTADOS[motivo];
    const explicar = () =>
      motivo === 'no-disponible'
        ? avisar(
            'La detección de somnolencia analiza los ojos con la cámara frontal usando un módulo nativo que Expo Go no incluye. ' +
              'Funciona en la app instalada (build de desarrollo o APK). El resto del recorrido funciona normal.',
            'No disponible en Expo Go',
            'info'
          )
        : confirmar(
            'Para vigilar si el conductor se duerme, SchoolTrack necesita usar la cámara frontal durante el recorrido.',
            'Permitir',
            () => {
              requestPermission().then(ok => {
                if (!ok) Linking.openSettings();
              });
            },
            { titulo: 'Permiso de cámara' }
          );
    return (
      <TouchableOpacity
        style={[styles.monitorPill, { borderColor: `${info.color}66` }]}
        onPress={explicar}
        accessibilityRole="button"
        accessibilityLabel={info.texto}
      >
        <Ionicons name={info.icono} size={14} color={info.color} />
        <Text style={[styles.monitorTexto, { color: info.color }]}>{info.texto}</Text>
        <Ionicons name="information-circle-outline" size={14} color={Colors.mutedText} />
      </TouchableOpacity>
    );
  }

  const info = ESTADOS[estado];

  return (
    <View style={[styles.monitor, { borderColor: info.color }]}>
      {(
        <Camera
          style={styles.monitorCamara}
          device="front"
          isActive={activo}
          performanceMode="fast"
          runClassifications
          minFaceSize={0.2}
          onFacesDetected={onFaces}
          onError={(e: unknown) => console.warn('Cámara de somnolencia:', e)}
        />
      )}
      <View style={[styles.monitorEstado, { backgroundColor: `${info.color}33` }]}>
        <Ionicons name={info.icono} size={12} color={info.color} />
        <Text style={[styles.monitorTexto, { color: info.color }]}>{info.texto}</Text>
      </View>
      {estado === 'microsueno' && (
        <TouchableOpacity style={styles.monitorBoton} onPress={() => cambiarEstado('atento')} accessibilityLabel="Detener alarma">
          <Text style={styles.monitorBotonTexto}>Estoy bien</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
