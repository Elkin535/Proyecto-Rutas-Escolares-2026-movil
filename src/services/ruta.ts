import { Alert, Platform } from 'react-native';

import { Colors } from '../constants/Colors';
import { RutaColors } from '../styles/ruta.styles';

export type EstadoRecorrido = 'sin-iniciar' | 'en-curso' | 'finalizado';

export const ESTADO_LABEL: Record<EstadoRecorrido, string> = {
  'sin-iniciar': 'Sin iniciar',
  'en-curso': 'En curso',
  finalizado: 'Finalizado',
};

// "06:42:10.123" (TimeSpan del backend) -> "6:42 a. m."
export const formatHora = (h?: string | null) => {
  if (!h) return '';
  const [hh, mm] = h.split(':').map(Number);
  return `${hh % 12 || 12}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'a. m.' : 'p. m.'}`;
};

// Último viaje de hoy que cumpla el filtro (por conductor o por vehículo); null si no hay
export const viajeDeHoy = (historial: any[], filtro: (h: any) => boolean) => {
  const hoy = new Date().toDateString();
  const viaje = historial
    .filter(filtro)
    .sort((a, b) => b.idViaje - a.idViaje)
    .find(h => h.estadoViaje === 'En progreso' || new Date(h.fecha).toDateString() === hoy);
  return viaje || null;
};

export const estadoDeViaje = (viaje: any): EstadoRecorrido =>
  !viaje ? 'sin-iniciar' : viaje.estadoViaje === 'En progreso' ? 'en-curso' : 'finalizado';

// La ruta guarda "Conductor: X | Vehículo: Y" en la descripción (misma lógica que el admin)
export const placaDeRuta = (descripcion?: string) =>
  descripcion?.split(' | ').find(p => p.startsWith('Vehículo: '))?.replace('Vehículo: ', '');

// Estudiantes de la ruta en el orden en que el bus visita sus paradas (sin parada van al final)
export const ordenarPorParada = (estudiantes: any[], paradas: any[]) => {
  const orden = (idParada?: number) => {
    const i = paradas.findIndex(p => p.idParada === idParada);
    return i === -1 ? Infinity : i;
  };
  return [...estudiantes].sort((a, b) => orden(a.idParada) - orden(b.idParada));
};

// Siguiente estudiante a recoger y parada donde va el bus (-1 = no ha salido, paradas.length = llegó)
export const progresoRuta = (estado: EstadoRecorrido, paradas: any[], ordenados: any[], asistencias: any[]) => {
  const siguiente =
    estado === 'en-curso'
      ? ordenados.find(e => asistencias.find(a => a.idEstudiante === e.idEstudiante)?.estadoAbordaje === 'Pendiente')
      : undefined;
  const busIndex =
    estado === 'sin-iniciar' ? -1
    : !siguiente ? paradas.length
    : Math.max(0, paradas.findIndex(p => p.idParada === siguiente.idParada));
  return { siguiente, busIndex };
};

// Distancia en km entre dos coordenadas (haversine), como calcularDistancia en la web
export const distanciaKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const rad = (g: number) => (g * Math.PI) / 180;
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const pillAsistencia = (a?: any): { text: string; color: string } => {
  switch (a?.estadoAbordaje) {
    case 'Abordo':
      return { text: `Abordado · ${formatHora(a.horaAbordaje)}`, color: RutaColors.success };
    case 'Entregado':
      return { text: `Entregado · ${formatHora(a.horaEntrega)}`, color: RutaColors.success };
    case 'Ausente':
      return { text: 'Ausente', color: RutaColors.danger };
    default:
      return { text: 'Pendiente', color: Colors.mutedText };
  }
};

export const avisar = (mensaje: string) =>
  Platform.OS === 'web' ? window.alert(mensaje) : Alert.alert('Aviso', mensaje);

// Alert con botones no funciona en react-native-web, ahí usamos window.confirm
export const confirmar = (mensaje: string, textoOk: string, onOk: () => void) => {
  if (Platform.OS === 'web') {
    if (window.confirm(mensaje)) onOk();
    return;
  }
  Alert.alert('Confirmar', mensaje, [
    { text: 'Cancelar', style: 'cancel' },
    { text: textoOk, onPress: onOk },
  ]);
};
