import { TipoDialogo, alerta } from '../components/Dialogo';
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

// Formato robusto para horas de viajes en historial (admite TimeSpan "06:42:10", "06:42" o fecha ISO)
export const formatHoraHistorial = (h?: string | null) => {
  if (!h) return '-';
  if (h.includes('T')) {
    const d = new Date(h);
    if (!isNaN(d.getTime())) {
      const hh = d.getHours();
      const mm = d.getMinutes();
      return `${hh % 12 || 12}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'a. m.' : 'p. m.'}`;
    }
  }
  if (h.includes(':')) {
    return formatHora(h);
  }
  return h;
};

// Formato legible de fecha para el historial de viajes (ej: "10 nov. 2026")
export const formatFechaHistorial = (f?: string | null) => {
  if (!f) return '-';
  const d = new Date(f);
  if (isNaN(d.getTime())) return f;
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
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

// Rumbo / ángulo de orientación (bearing) en grados (0 a 360) entre dos coordenadas
export const calcularRumbo = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const toRad = (g: number) => (g * Math.PI) / 180;
  const dLon = toRad(lon2 - lon1);
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const y = Math.sin(dLon) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
};

export type InfoEta = {
  duracionMin: number;
  duracionTexto: string;
  distanciaKm: string;
  distanciaNum: number;
  horaEstimada: string;
  esInminente: boolean;
};

/**
 * Calcula el tiempo estimado de llegada (ETA) y distancia desde el bus a un punto destino (parada o colegio).
 * Usa OSRM para precisión vial y conmuta a cálculo urbano estimado si la red no está disponible.
 */
export const calcularEta = async (
  origen: { latitude: number; longitude: number },
  destino: { latitude: number; longitude: number },
  paradasIntermedias = 0
): Promise<InfoEta> => {
  let distKm = 0;
  let durMin = 0;

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${origen.longitude},${origen.latitude};${destino.longitude},${destino.latitude}?overview=false`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    const data = await res.json();
    if (data.code === 'Ok' && data.routes?.[0]) {
      distKm = data.routes[0].distance / 1000;
      durMin = Math.round(data.routes[0].duration / 60);
    } else {
      throw new Error('OSRM fallback');
    }
  } catch {
    // Estimación urbana: distancia Haversine * 1.35 factor vial
    distKm = distanciaKm(origen.latitude, origen.longitude, destino.latitude, destino.longitude) * 1.35;
    // Velocidad promedio de bus escolar urbano en Colombia: ~24 km/h (0.4 km/minuto)
    durMin = Math.round((distKm / 24) * 60);
  }

  // Agrega ~1.5 minutos por cada parada intermedia que falte visitar
  if (paradasIntermedias > 0) {
    durMin += Math.round(paradasIntermedias * 1.5);
  }

  durMin = Math.max(1, durMin);

  // Calcular la hora estimada de llegada
  const ahora = new Date();
  ahora.setMinutes(ahora.getMinutes() + durMin);
  const hh = ahora.getHours();
  const mm = ahora.getMinutes();
  const horaEstimada = `${hh % 12 || 12}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'a. m.' : 'p. m.'}`;

  const esInminente = distKm < 0.6 || durMin <= 2;
  const duracionTexto = esInminente ? '¡Llegando!' : `${durMin} min`;

  return {
    duracionMin: durMin,
    duracionTexto,
    distanciaKm: `${distKm.toFixed(1)} km`,
    distanciaNum: distKm,
    horaEstimada,
    esInminente,
  };
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

// Diálogo con el diseño de la app (funciona igual en Android, iOS y web)
export const avisar = (mensaje: string, titulo = 'Aviso', tipo?: TipoDialogo) => alerta(titulo, mensaje, undefined, tipo);

export const confirmar = (
  mensaje: string,
  textoOk: string,
  onOk: () => void,
  opciones: { titulo?: string; peligro?: boolean } = {}
) =>
  alerta(
    opciones.titulo ?? 'Confirmar',
    mensaje,
    [
      { text: 'Cancelar', style: 'cancel' },
      { text: textoOk, style: opciones.peligro ? 'destructive' : 'default', onPress: onOk },
    ],
    opciones.peligro ? 'advertencia' : 'pregunta'
  );
