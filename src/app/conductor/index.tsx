import { Ionicons } from '@expo/vector-icons';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';

import BottomNav from '../../components/BottomNav';
import MapaRuta from '../../components/MapaRuta';
import MonitorSomnolencia from '../../components/MonitorSomnolencia';
import PerfilView from '../../components/PerfilView';
import { Colors } from '../../constants/Colors';
import { fetchApi, getJson, getStoredAuthData } from '../../services/api';
import { ModoGps, detenerGps, escucharGps, iniciarGps } from '../../services/gpsTask';
import { registrarPush } from '../../services/push';
import { identificarRostro, tomarFotoBase64 } from '../../services/rostros';
import {
  ESTADO_LABEL,
  avisar,
  confirmar,
  estadoDeViaje,
  ordenarPorParada,
  pillAsistencia,
  placaDeRuta,
  progresoRuta,
  viajeDeHoy,
} from '../../services/ruta';
import { RutaColors, styles } from '../../styles/ruta.styles';

const TABS = [
  { key: 'ruta', label: 'Ruta', icon: 'home-outline' as const },
  { key: 'perfil', label: 'Perfil', icon: 'person-circle-outline' as const },
];

export default function ConductorScreen() {
  const [tab, setTab] = useState('ruta');
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  const [usuario, setUsuario] = useState<any>(null);
  const [conductor, setConductor] = useState<any>(null);
  const [placa, setPlaca] = useState('');
  const [ruta, setRuta] = useState<any>(null);
  const [paradas, setParadas] = useState<any[]>([]);
  const [estudiantes, setEstudiantes] = useState<any[]>([]);
  const [viaje, setViaje] = useState<any>(null);
  const [asistencias, setAsistencias] = useState<any[]>([]);
  const [gps, setGps] = useState<{ latitude: number; longitude: number } | null>(null);
  const [simulando, setSimulando] = useState(false);
  const [modoGps, setModoGps] = useState<ModoGps | null>(null);
  const [ultimaSenal, setUltimaSenal] = useState<Date | null>(null);
  const [infoRuta, setInfoRuta] = useState<{ distanciaKm: string; duracionMin: number } | null>(null);

  const idViajeActivo = viaje?.estadoViaje === 'En progreso' ? viaje.idViaje : null;

  // Mueve el bus en el mapa y lo transmite al backend (que lo reenvía por SignalR a los acudientes)
  const enviarUbicacion = useCallback(
    (latitude: number, longitude: number) => {
      setGps({ latitude, longitude });
      setUltimaSenal(new Date());
      if (!idViajeActivo) return;
      fetchApi(`/Historial/actualizar-gps?idViaje=${idViajeActivo}`, {
        method: 'PUT',
        body: JSON.stringify({ latitudActual: latitude, longitudActual: longitude }),
      }).catch(() => {});
    },
    [idViajeActivo]
  );

  // GPS real mientras el recorrido está en curso. Con permiso "todo el tiempo" lo envía la tarea en
  // segundo plano (sigue con el celular bloqueado); si no, se envía desde aquí con la app abierta.
  useEffect(() => {
    if (!idViajeActivo || simulando) {
      // En simulación se apaga el GPS real para que no compita con las posiciones simuladas
      detenerGps().catch(() => {});
      setModoGps(null);
      return;
    }
    let vigente = true;
    let sub: Location.LocationSubscription | undefined;
    let quitarEscucha: (() => void) | undefined;

    iniciarGps(idViajeActivo)
      .then(async modo => {
        if (!vigente) return;
        setModoGps(modo);
        if (modo === 'segundo-plano') {
          quitarEscucha = escucharGps(c => {
            setGps(c);
            setUltimaSenal(new Date());
          });
        } else if (modo === 'primer-plano') {
          const s = await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 15 },
            pos => enviarUbicacion(pos.coords.latitude, pos.coords.longitude)
          );
          if (vigente) sub = s;
          else s.remove();
        }
      })
      .catch(() => setModoGps('denegado'));

    return () => {
      vigente = false;
      sub?.remove();
      quitarEscucha?.();
    };
  }, [idViajeActivo, simulando, enviarUbicacion]);

  // Pantalla siempre encendida en el recorrido: la necesitan el mapa y el monitor de somnolencia
  useEffect(() => {
    if (!idViajeActivo) return;
    activateKeepAwakeAsync('recorrido').catch(() => {});
    return () => {
      deactivateKeepAwake('recorrido').catch(() => {});
    };
  }, [idViajeActivo]);

  useEffect(() => {
    registrarPush();
  }, []);

  // Simulación (igual que la web): el bus avanza en línea recta de parada en parada
  useEffect(() => {
    if (!idViajeActivo || !simulando || paradas.length < 2) return;
    const PASOS = 20;
    let tramo = 0;
    let paso = 0;
    const id = setInterval(() => {
      if (tramo >= paradas.length - 1) return clearInterval(id);
      const a = paradas[tramo];
      const b = paradas[tramo + 1];
      const t = paso / PASOS;
      enviarUbicacion(
        Number(a.latitud) + (Number(b.latitud) - Number(a.latitud)) * t,
        Number(a.longitud) + (Number(b.longitud) - Number(a.longitud)) * t
      );
      if (++paso > PASOS) {
        paso = 0;
        tramo++;
      }
    }, 1000);
    return () => clearInterval(id);
  }, [idViajeActivo, simulando, paradas, enviarUbicacion]);

  const cargarTodo = useCallback(async () => {
    const { usuario: u } = await getStoredAuthData();
    setUsuario(u);

    const [conductores, vehiculos, rutas, todos, historial] = await Promise.all([
      getJson('/Conductor/obtener-todos'),
      getJson('/Vehiculo/obtener-todos'),
      getJson('/Ruta/obtener-todas'),
      getJson('/Estudiante/obtener-todos'),
      getJson('/Historial/obtener-todos'),
    ]);

    const con = conductores.find((c: any) => c.idUsuario === u?.idUsuario) || null;
    const pla = vehiculos.find((v: any) => v.idVehiculo === con?.idVehiculo)?.placa || '';
    const nombre = `${u?.nombre || ''} ${u?.apellido || ''}`.trim();
    // La ruta no tiene FK al conductor: se busca por nombre en la descripción y, si no, por placa
    const rut =
      rutas.find((r: any) => r.descripcion?.includes(`Conductor: ${nombre}`)) ||
      rutas.find((r: any) => pla && placaDeRuta(r.descripcion) === pla) ||
      null;

    const par: any[] = rut ? await getJson(`/Parada/obtener-por-ruta?idRuta=${rut.idRuta}`) : [];
    par.sort((a, b) => a.ordenVisita - b.ordenVisita);
    const est = ordenarPorParada(
      todos.filter((e: any) => rut && e.idRuta === rut.idRuta && e.estado !== false),
      par
    );

    const via = con ? viajeDeHoy(historial, h => h.idConductor === con.idConductor) : null;
    const asi = via ? await getJson(`/AsistenciaViaje/obtener-viaje?idViaje=${via.idViaje}`) : [];

    setConductor(con);
    setPlaca(pla);
    setRuta(rut);
    setParadas(par);
    setEstudiantes(est);
    setViaje(via);
    setAsistencias(asi);
  }, []);

  useEffect(() => {
    cargarTodo().finally(() => setCargando(false));
  }, [cargarTodo]);

  const onRefresh = async () => {
    setRefrescando(true);
    await cargarTodo();
    setRefrescando(false);
  };

  // Ejecuta la acción contra el API, avisa si falla y recarga
  const ejecutar = async (accion: () => Promise<void>, error: string) => {
    setOcupado(true);
    try {
      await accion();
    } catch {
      avisar(error);
    }
    await cargarTodo();
    setOcupado(false);
  };

  const iniciarRecorrido = () => {
    if (!conductor?.idVehiculo) return avisar('No tienes un vehículo asignado. Contacta al administrador.');
    ejecutar(async () => {
      const res = await fetchApi('/Historial/iniciar', {
        method: 'POST',
        body: JSON.stringify({ idVehiculo: conductor.idVehiculo, idConductor: conductor.idConductor }),
      });
      if (!res.ok) throw new Error();
      const nuevo = await res.json();
      // Cada estudiante de la ruta arranca en "Pendiente" para este viaje
      await Promise.all(
        estudiantes.map(e =>
          fetchApi('/AsistenciaViaje/crear', {
            method: 'POST',
            body: JSON.stringify({ idViaje: nuevo.idViaje, idEstudiante: e.idEstudiante }),
          })
        )
      );
    }, 'No se pudo iniciar el recorrido.');
  };

  const finalizarRecorrido = () => {
    const pendientes = asistencias.filter(a => a.estadoAbordaje === 'Pendiente').length;
    const mensaje = pendientes
      ? `Aún hay ${pendientes} estudiante(s) pendiente(s). ¿Finalizar el recorrido de todas formas?`
      : '¿Finalizar el recorrido?';
    confirmar(mensaje, 'Finalizar', () =>
      ejecutar(async () => {
        setSimulando(false);
        const res = await fetchApi(`/Historial/finalizar?idViaje=${viaje.idViaje}`, { method: 'PUT' });
        if (!res.ok) throw new Error();
      }, 'No se pudo finalizar el recorrido.')
    );
  };

  const marcar = (idAsistencia: number, estadoAbordaje: string) =>
    ejecutar(async () => {
      const res = await fetchApi(`/AsistenciaViaje/actualizar?id=${idAsistencia}`, {
        method: 'PUT',
        body: JSON.stringify({ estadoAbordaje }),
      });
      if (!res.ok) throw new Error();
    }, 'No se pudo actualizar la asistencia.');

  if (cargando) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const estado = estadoDeViaje(viaje);
  const asistenciaDe = (idEstudiante: number) => asistencias.find(a => a.idEstudiante === idEstudiante);
  const abordados = asistencias.filter(a => ['Abordo', 'Entregado'].includes(a.estadoAbordaje)).length;
  const ausentes = asistencias.filter(a => a.estadoAbordaje === 'Ausente').length;
  const total = estudiantes.length;
  const pendientes = estado === 'sin-iniciar' ? total : total - abordados - ausentes;

  const { siguiente } = progresoRuta(estado, paradas, estudiantes, asistencias);
  const ubicacionViaje =
    viaje?.latitudActual != null ? { latitude: Number(viaje.latitudActual), longitude: Number(viaje.longitudActual) } : null;

  // Asistencia por reconocimiento facial: foto del estudiante al subir → AWS Rekognition → "Abordó"
  const asistenciaFacial = async () => {
    try {
      const foto = await tomarFotoBase64('camara');
      if (!foto) return;
      setOcupado(true);
      const est = await identificarRostro(foto);
      const a = asistenciaDe(est.idEstudiante);
      if (!a) return avisar(`${est.nombre} no pertenece a esta ruta.`);
      if (a.estadoAbordaje === 'Abordo') return avisar(`${est.nombre} ya estaba registrado a bordo.`);
      await marcar(a.idAsistencia, 'Abordo');
      avisar(`✅ ${est.nombre} abordó el bus (coincidencia ${est.similitud}%).`);
    } catch (e: any) {
      avisar(e?.message || 'No se pudo tomar la asistencia.');
    } finally {
      setOcupado(false);
    }
  };

  const gpsInfo =
    simulando ? { texto: 'Ubicación simulada', color: '#f59e0b', icono: 'flask-outline' as const }
    : modoGps === 'segundo-plano' ? { texto: 'GPS activo, también con el celular bloqueado', color: RutaColors.success, icono: 'navigate-circle-outline' as const }
    : modoGps === 'primer-plano' ? { texto: 'GPS activo solo con la app abierta (toca para permitir siempre)', color: '#f59e0b', icono: 'navigate-circle-outline' as const }
    : modoGps === 'denegado' ? { texto: 'Sin permiso de ubicación (toca para activarlo)', color: RutaColors.danger, icono: 'warning-outline' as const }
    : { texto: 'Iniciando GPS…', color: Colors.mutedText, icono: 'navigate-circle-outline' as const };

  const chip =
    estado === 'sin-iniciar' ? { text: 'Listo para salir', color: Colors.mutedText }
    : estado === 'en-curso' ? { text: 'En movimiento', color: RutaColors.success }
    : { text: '¡Recorrido finalizado con éxito!', color: RutaColors.success };

  const resumen =
    estado === 'sin-iniciar' ? `${total} pendientes`
    : estado === 'en-curso' ? `${ausentes} ausente(s) · ${pendientes} pendiente(s)`
    : `${abordados} abordados / ${ausentes} ausentes · Sin pendientes`;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerKicker}>centro de control</Text>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>{tab === 'ruta' ? 'MI RUTA' : 'MI PERFIL'}</Text>
          {tab === 'ruta' && (
            <Text style={[styles.headerEstado, estado === 'finalizado' && { color: RutaColors.success }]}>
              · {ESTADO_LABEL[estado]}
            </Text>
          )}
        </View>
      </View>

      {tab === 'perfil' ? (
        <PerfilView
          usuario={usuario}
          extras={[
            { icon: 'bus-outline', label: 'Vehículo', value: placa || 'Sin asignar' },
            { icon: 'map-outline', label: 'Ruta', value: ruta?.nombreRuta || 'Sin asignar' },
            { icon: 'card-outline', label: 'Licencia', value: conductor ? `${conductor.numeroLicencia} (${conductor.categoriaLicencia || '-'})` : '-' },
          ]}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refrescando} onRefresh={onRefresh} tintColor={Colors.primary} />}
        >
          <View style={[styles.card, styles.row]}>
            <View style={styles.avatar}>
              <Ionicons name="person-outline" size={24} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{`${usuario?.nombre || ''} ${usuario?.apellido || ''}`.trim()}</Text>
              <Text style={styles.accentText}>{ruta?.nombreRuta || 'Sin ruta asignada'}</Text>
            </View>
            <Text style={styles.mutedText}>Placa: {placa || '-'}</Text>
          </View>

          {!ruta ? (
            <View style={styles.empty}>
              <Ionicons name="map-outline" size={40} color={Colors.placeholder} />
              <Text style={styles.emptyText}>Aún no tienes una ruta asignada.{'\n'}Contacta al administrador.</Text>
            </View>
          ) : (
            <>
              <MapaRuta paradas={paradas} bus={estado === 'en-curso' ? gps || ubicacionViaje : null} onRuta={setInfoRuta}>
                <View style={styles.mapOverlayTop}>
                  <View style={[styles.chip, { marginBottom: 0 }]}>
                    <View style={[styles.chipDot, { backgroundColor: chip.color }]} />
                    <Text style={{ color: chip.color, fontSize: 13, fontWeight: '600' }}>{chip.text}</Text>
                  </View>
                </View>
                <View style={styles.mapOverlayBottom}>
                  <View style={[styles.chip, { marginBottom: 0 }]}>
                    <Ionicons name="time-outline" size={14} color={Colors.darkText} />
                    <Text style={{ color: Colors.darkText, fontSize: 13, fontWeight: '600' }}>
                      {infoRuta ? `${infoRuta.duracionMin} min · ${infoRuta.distanciaKm} km` : `${paradas.length} paradas`}
                    </Text>
                  </View>
                </View>
              </MapaRuta>

              {estado === 'en-curso' && (
                <View style={[styles.sectionRow, { marginBottom: 10 }]}>
                  <TouchableOpacity
                    style={[styles.gpsEstado, { flex: 1, marginBottom: 0 }]}
                    onPress={() => modoGps !== 'segundo-plano' && !simulando && Linking.openSettings()}
                    accessibilityRole="button"
                  >
                    <Ionicons name={gpsInfo.icono} size={16} color={gpsInfo.color} />
                    <Text style={{ color: gpsInfo.color, fontSize: 12, flex: 1 }}>
                      {gpsInfo.texto}
                      {ultimaSenal ? ` · ${ultimaSenal.toLocaleTimeString()}` : ''}
                    </Text>
                  </TouchableOpacity>
                  {paradas.length >= 2 && (
                    <TouchableOpacity style={[styles.row, { gap: 4 }]} onPress={() => setSimulando(s => !s)}>
                      <Ionicons name={simulando ? 'pause-circle-outline' : 'play-circle-outline'} size={18} color={Colors.primary} />
                      <Text style={styles.progressText}>{simulando ? 'Detener' : 'Simular'}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {estado === 'sin-iniciar' && (
                <TouchableOpacity
                  style={[styles.mainButton, { backgroundColor: Colors.primary }]}
                  onPress={iniciarRecorrido}
                  disabled={ocupado}
                >
                  {ocupado ? <ActivityIndicator color={Colors.darker} /> : <Ionicons name="navigate-outline" size={20} color={Colors.darker} />}
                  <Text style={[styles.mainButtonText, { color: Colors.darker }]}>Iniciar Recorrido</Text>
                </TouchableOpacity>
              )}
              {estado === 'en-curso' && (
                <TouchableOpacity
                  style={[styles.mainButton, { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderWidth: 1, borderColor: RutaColors.danger }]}
                  onPress={finalizarRecorrido}
                  disabled={ocupado}
                >
                  <Ionicons name="navigate-outline" size={20} color={RutaColors.danger} />
                  <Text style={[styles.mainButtonText, { color: RutaColors.danger }]}>Finalizar Recorrido</Text>
                </TouchableOpacity>
              )}
              {estado === 'finalizado' && (
                <View style={[styles.mainButton, { backgroundColor: RutaColors.muted }]}>
                  <Ionicons name="checkmark-done-outline" size={20} color={Colors.mutedText} />
                  <Text style={[styles.mainButtonText, { color: Colors.mutedText }]}>Recorrido finalizado</Text>
                </View>
              )}

              <View style={styles.sectionRow}>
                <Text style={styles.sectionTitle}>ESTUDIANTES DE LA RUTA</Text>
                <Text style={styles.progressText}>{abordados} de {total} abordados</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={{ flex: abordados, backgroundColor: estado === 'finalizado' ? RutaColors.success : Colors.primary }} />
                <View style={{ flex: ausentes, backgroundColor: RutaColors.danger }} />
                <View style={{ flex: pendientes }} />
              </View>

              {estado === 'en-curso' && pendientes > 0 && (
                <TouchableOpacity
                  style={[styles.mainButton, { height: 46, marginBottom: 12, borderWidth: 1, borderColor: Colors.primary, backgroundColor: 'rgba(0, 212, 255, 0.1)' }]}
                  onPress={asistenciaFacial}
                  disabled={ocupado}
                >
                  {ocupado ? <ActivityIndicator color={Colors.primary} /> : <Ionicons name="scan-outline" size={20} color={Colors.primary} />}
                  <Text style={[styles.mainButtonText, { color: Colors.primary, fontSize: 15 }]}>Tomar asistencia con rostro</Text>
                </TouchableOpacity>
              )}
              <Text style={[styles.mutedText, { marginBottom: 12 }]}>{resumen}</Text>

              {estudiantes.map(e => {
                const a = asistenciaDe(e.idEstudiante);
                const esSiguiente = siguiente?.idEstudiante === e.idEstudiante;
                const pill = esSiguiente ? { text: 'Siguiente parada', color: Colors.primary } : pillAsistencia(a);
                const pendiente = !a || a.estadoAbordaje === 'Pendiente';
                const parada = paradas.find(p => p.idParada === e.idParada);
                const orden = parada ? paradas.indexOf(parada) + 1 : '-';
                const borde = esSiguiente ? Colors.primary : pendiente ? RutaColors.cardBorder : pill.color;

                return (
                  <View key={e.idEstudiante} style={[styles.studentCard, { borderColor: borde }]}>
                    <View style={styles.row}>
                      <View style={styles.orderCircle}>
                        <Text style={{ color: Colors.primary, fontWeight: '700' }}>{orden}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.name}>{`${e.nombre} ${e.apellido || ''}`.trim()}</Text>
                        <Text style={styles.mutedText}>
                          {parada?.nombreParada || 'Sin parada'} · {e.colegio || 'Sin colegio'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.sectionRow}>
                      <View style={[styles.pill, { backgroundColor: `${pill.color}22` }]}>
                        <Text style={[styles.pillText, { color: pill.color }]}>{pill.text}</Text>
                      </View>
                      {estado === 'en-curso' && a && !pendiente && (
                        <TouchableOpacity onPress={() => marcar(a.idAsistencia, 'Pendiente')} disabled={ocupado}>
                          <Text style={[styles.undo, { marginTop: 8 }]}>Deshacer</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {estado === 'en-curso' && a && pendiente && (
                      <View style={styles.actionsRow}>
                        <TouchableOpacity
                          style={[styles.actionButton, { borderColor: RutaColors.success }]}
                          onPress={() => marcar(a.idAsistencia, 'Abordo')}
                          disabled={ocupado}
                        >
                          <Ionicons name="checkmark" size={16} color={RutaColors.success} />
                          <Text style={[styles.actionText, { color: RutaColors.success }]}>Abordó</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionButton, { borderColor: RutaColors.danger }]}
                          onPress={() => marcar(a.idAsistencia, 'Ausente')}
                          disabled={ocupado}
                        >
                          <Ionicons name="close" size={16} color={RutaColors.danger} />
                          <Text style={[styles.actionText, { color: RutaColors.danger }]}>Ausente</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}

              {total === 0 && <Text style={styles.emptyText}>No hay estudiantes asignados a esta ruta.</Text>}
            </>
          )}
        </ScrollView>
      )}

      {/* Sigue vigilando aunque el conductor cambie a la pestaña Perfil */}
      <MonitorSomnolencia activo={estado === 'en-curso'} idViaje={idViajeActivo} ubicacion={gps || ubicacionViaje} />

      <BottomNav tabs={TABS} active={tab} onChange={setTab} />
    </View>
  );
}
