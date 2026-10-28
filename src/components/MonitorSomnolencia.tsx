import { Ionicons } from '@expo/vector-icons';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Text, TouchableOpacity, Vibration, View } from 'react-native';
import { useCameraPermission } from 'react-native-vision-camera';
import { Camera, Face } from 'react-native-vision-camera-face-detector';

import { Colors } from '../constants/Colors';
import { fetchApi } from '../services/api';
import { notificarLocal } from '../services/push';
import { RutaColors, styles } from '../styles/ruta.styles';

// Umbrales (ML Kit da la probabilidad de ojo abierto entre 0 y 1)
const OJO_CERRADO = 0.25;
const MICROSUENO_MS = 1500; // ojos cerrados seguidos -> alarma
const VENTANA_FATIGA_MS = 30000; // PERCLOS: % del tiempo con ojos cerrados en los últimos 30 s
const PERCLOS_FATIGA = 0.3;
const SIN_ROSTRO_MS = 8000;
const PAUSA_ALERTA_MS = { Microsueño: 60000, Fatiga: 300000 };

type Estado = 'atento' | 'fatiga' | 'microsueno' | 'sin-rostro' | 'sin-permiso';
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
  'sin-permiso': { texto: 'Sin cámara', color: Colors.mutedText, icono: 'videocam-off-outline' },
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
    if (activo && !hasPermission) requestPermission();
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
  const info = ESTADOS[hasPermission ? estado : 'sin-permiso'];

  return (
    <View style={[styles.monitor, { borderColor: info.color }]}>
      {hasPermission && (
        <Camera
          style={styles.monitorCamara}
          device="front"
          isActive={activo}
          performanceMode="fast"
          runClassifications
          minFaceSize={0.2}
          onFacesDetected={onFaces}
          onError={e => console.warn('Cámara de somnolencia:', e)}
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
