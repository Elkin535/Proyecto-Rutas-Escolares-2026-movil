import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Linking,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Colors } from '../constants/Colors';
import {
  ESTADO_LABEL,
  InfoEta,
  conductorDeRuta,
  estadoDeViaje,
  formatHora,
  placaDeRuta,
  progresoRuta,
  telefonoDeRuta,
} from '../services/ruta';
import { RutaColors } from '../styles/ruta.styles';

const SCREEN_HEIGHT = Dimensions.get('window').height;

// Puntos de anclaje (Snap Points) medidos como altura visible desde la base
const SNAP_COLLAPSED = 145;
const SNAP_HALF = 360;
const SNAP_EXPANDED = Math.min(580, SCREEN_HEIGHT * 0.74);

export interface RutaInfoExtendida {
  ruta: any;
  paradas: any[];
  ordenados: any[];
  viaje: any;
  asistencias: any[];
  vehiculo?: any;
  conductorNombre?: string;
  conductorTelefono?: string;
}

interface PanelEstudianteBottomSheetProps {
  estudiante: any;
  estudiantes?: any[];
  rutasInfo?: Record<number, RutaInfoExtendida>;
  onSelectEstudiante?: (idEstudiante: number) => void;
  infoRuta?: RutaInfoExtendida;
  bus?: { latitude: number; longitude: number } | null;
  infoEta?: InfoEta | null;
  onCentrarBus?: () => void;
  onCentrarParada?: () => void;
  onCentrarRuta?: () => void;
}

export function obtenerEstadoEstudiante(est: any, info?: RutaInfoExtendida) {
  const estado = estadoDeViaje(info?.viaje);
  const asistencia = (info?.asistencias || []).find(a => a.idEstudiante === est?.idEstudiante);
  const abordo = asistencia?.estadoAbordaje === 'Abordo';
  const entregado = asistencia?.estadoAbordaje === 'Entregado';
  const ausente = asistencia?.estadoAbordaje === 'Ausente';
  const esperando = estado === 'en-curso' && (!asistencia || asistencia?.estadoAbordaje === 'Pendiente');

  const pill =
    estado === 'sin-iniciar'
      ? { text: 'Recorrido sin iniciar', shortText: 'Sin iniciar', color: Colors.mutedText, bg: '#1e293b' }
      : ausente
        ? { text: 'Reportado Ausente', shortText: 'Ausente', color: RutaColors.danger, bg: 'rgba(239, 68, 68, 0.15)' }
        : entregado
          ? {
            text: `Entregado${asistencia?.horaEntrega ? ` · ${formatHora(asistencia?.horaEntrega)}` : ''}`,
            shortText: 'Entregado',
            color: RutaColors.warning,
            bg: 'rgba(245, 158, 11, 0.15)',
          }
          : abordo
            ? {
              text: `A bordo${asistencia?.horaAbordaje ? ` · ${formatHora(asistencia?.horaAbordaje)}` : ''}`,
              shortText: 'A bordo',
              color: RutaColors.success,
              bg: 'rgba(34, 197, 94, 0.15)',
            }
            : esperando
              ? { text: 'Esperando el bus', shortText: 'Esperando', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' }
              : { text: ESTADO_LABEL[estado], shortText: ESTADO_LABEL[estado], color: Colors.mutedText, bg: '#1e293b' };

  return { estado, asistencia, abordo, entregado, ausente, esperando, pill };
}

export default function PanelEstudianteBottomSheet({
  estudiante,
  estudiantes = [],
  rutasInfo = {},
  onSelectEstudiante,
  infoRuta,
  bus,
  infoEta,
  onCentrarBus,
  onCentrarParada,
  onCentrarRuta,
}: PanelEstudianteBottomSheetProps) {
  const animatedHeight = useMemo(() => new Animated.Value(SNAP_COLLAPSED), []);
  const currentHeightRef = useRef<number>(SNAP_COLLAPSED);
  const [snapState, setSnapState] = useState<'collapsed' | 'half' | 'expanded'>('collapsed');

  const animarA = useCallback(
    (target: number, callbackState?: 'collapsed' | 'half' | 'expanded') => {
      Animated.spring(animatedHeight, {
        toValue: target,
        damping: 20,
        stiffness: 180,
        useNativeDriver: false,
      }).start(() => {
        currentHeightRef.current = target;
        if (callbackState) setSnapState(callbackState);
      });
    },
    [animatedHeight]
  );

  const toggleSnap = useCallback(() => {
    if (currentHeightRef.current <= SNAP_COLLAPSED + 30) {
      animarA(SNAP_HALF, 'half');
    } else if (currentHeightRef.current <= SNAP_HALF + 30) {
      animarA(SNAP_EXPANDED, 'expanded');
    } else {
      animarA(SNAP_COLLAPSED, 'collapsed');
    }
  }, [animarA]);

  /* eslint-disable react-hooks/refs */
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 5,
        onPanResponderMove: (_, gesture) => {
          // En Android/iOS, arrastrar hacia arriba da dy negativo
          const nuevaAltura = currentHeightRef.current - gesture.dy;
          if (nuevaAltura >= SNAP_COLLAPSED - 20 && nuevaAltura <= SNAP_EXPANDED + 40) {
            animatedHeight.setValue(nuevaAltura);
          }
        },
        onPanResponderRelease: (_, gesture) => {
          const alturaActual = currentHeightRef.current - gesture.dy;
          const vy = gesture.vy;

          // Deslizado rápido hacia arriba
          if (vy < -0.5) {
            if (alturaActual < SNAP_HALF) {
              animarA(SNAP_HALF, 'half');
            } else {
              animarA(SNAP_EXPANDED, 'expanded');
            }
            return;
          }

          // Deslizado rápido hacia abajo
          if (vy > 0.5) {
            if (alturaActual > SNAP_HALF) {
              animarA(SNAP_HALF, 'half');
            } else {
              animarA(SNAP_COLLAPSED, 'collapsed');
            }
            return;
          }

          // Snap por cercanía a los puntos
          const dCollapsed = Math.abs(alturaActual - SNAP_COLLAPSED);
          const dHalf = Math.abs(alturaActual - SNAP_HALF);
          const dExpanded = Math.abs(alturaActual - SNAP_EXPANDED);

          if (dCollapsed < dHalf && dCollapsed < dExpanded) {
            animarA(SNAP_COLLAPSED, 'collapsed');
          } else if (dHalf < dExpanded) {
            animarA(SNAP_HALF, 'half');
          } else {
            animarA(SNAP_EXPANDED, 'expanded');
          }
        },
      }),
    [animarA, animatedHeight]
  );
  /* eslint-enable react-hooks/refs */

  if (!estudiante) return null;

  const nombre = `${estudiante.nombre} ${estudiante.apellido || ''}`.trim();
  const paradas = infoRuta?.paradas || [];
  const ordenados = infoRuta?.ordenados || [];
  const asistencias = infoRuta?.asistencias || [];
  const { estado, abordo, entregado, esperando, pill } = obtenerEstadoEstudiante(estudiante, infoRuta);
  const miParadaIndex = paradas.findIndex(p => p.idParada === estudiante.idParada);
  const miParada = paradas[miParadaIndex];
  const { busIndex } = progresoRuta(estado, paradas, ordenados, asistencias);
  const faltanParadas = Math.max(0, miParadaIndex - busIndex);

  const placa = infoRuta?.vehiculo?.placa || placaDeRuta(infoRuta?.ruta?.descripcion);
  const modelo = infoRuta?.vehiculo?.modelo || 'No registrado';
  const conductorNombre =
    infoRuta?.conductorNombre || conductorDeRuta(infoRuta?.ruta?.descripcion) || 'No asignado';
  const conductorTelefono =
    infoRuta?.conductorTelefono || telefonoDeRuta(infoRuta?.ruta?.descripcion) || '';
  const listaHijos = estudiantes.length > 0 ? estudiantes : [estudiante];

  return (
    <Animated.View style={[styles.bottomSheet, { height: animatedHeight }]}>
      {/* Barra superior de agarre con PanResponder */}
      <View {...panResponder.panHandlers} style={styles.handleArea}>
        <TouchableOpacity activeOpacity={0.7} onPress={toggleSnap} style={styles.handleTouchable}>
          <View style={styles.handleBar} />
        </TouchableOpacity>
      </View>

      {/* Resumen siempre visible (Header del Panel) */}
      <View style={styles.summaryRow}>
        <View style={styles.avatar}>
          <Ionicons
            name={abordo ? 'bus' : entregado ? 'checkmark-circle' : 'school-outline'}
            size={22}
            color={pill.color}
          />
        </View>

        <View style={styles.summaryInfo}>
          <View style={styles.summaryTitleRow}>
            <Text style={styles.studentName} numberOfLines={1}>
              {nombre}
            </Text>
            <View style={[styles.pillBadge, { backgroundColor: pill.bg }]}>
              <Text style={[styles.pillBadgeText, { color: pill.color }]}>{pill.text}</Text>
            </View>
          </View>

          <Text style={styles.subText} numberOfLines={1}>
            {miParada?.nombreParada ? `Parada: ${miParada.nombreParada}` : 'Sin parada'} · {estudiante.colegio || 'Sin colegio'}
          </Text>
        </View>

        {/* Botón rápido para alternar expansión */}
        <TouchableOpacity onPress={toggleSnap} style={styles.expandButton}>
          <Ionicons
            name={snapState === 'expanded' ? 'chevron-down' : 'chevron-up'}
            size={20}
            color={Colors.primary}
          />
        </TouchableOpacity>
      </View>

      {/* Contenido deslizable del panel */}
      <ScrollView
        style={styles.sheetScroll}
        contentContainerStyle={styles.sheetContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Listado de todos los estudiantes a cargo del acudiente (1, 2, 3, 4 o más) */}
        <View style={styles.hijosSection}>
          <View style={styles.hijosSectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="people-outline" size={16} color={Colors.primary} />
              <Text style={styles.hijosSectionTitle}>
                Estudiantes a cargo ({listaHijos.length})
              </Text>
            </View>
            {listaHijos.length > 1 && (
              <Text style={styles.hijosSectionHint}>Toca un estudiante para ver su ruta</Text>
            )}
          </View>

          <View style={styles.hijosList}>
            {listaHijos.map(h => {
              const esActivo = h.idEstudiante === estudiante.idEstudiante;
              const infoHijo = h.idRuta ? rutasInfo[h.idRuta] : undefined;
              const estHijo = obtenerEstadoEstudiante(h, infoHijo);
              const paradaHijo = (infoHijo?.paradas || []).find(p => p.idParada === h.idParada);
              const nombreHijo = `${h.nombre || ''} ${h.apellido || ''}`.trim();
              const placaHijo = infoHijo?.vehiculo?.placa || placaDeRuta(infoHijo?.ruta?.descripcion);

              return (
                <TouchableOpacity
                  key={h.idEstudiante}
                  activeOpacity={0.8}
                  onPress={() => onSelectEstudiante?.(h.idEstudiante)}
                  style={[
                    styles.hijoCard,
                    esActivo && styles.hijoCardActivo,
                  ]}
                >
                  <View
                    style={[
                      styles.hijoAvatarSmall,
                      esActivo && { borderColor: Colors.primary, backgroundColor: 'rgba(0, 212, 255, 0.15)' },
                    ]}
                  >
                    <Ionicons
                      name={estHijo.abordo ? 'bus' : estHijo.entregado ? 'checkmark-circle' : 'person-outline'}
                      size={16}
                      color={esActivo ? Colors.primary : estHijo.pill.color}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={styles.hijoHeaderRow}>
                      <Text
                        style={[
                          styles.hijoNombre,
                          esActivo && { color: Colors.primary },
                        ]}
                        numberOfLines={1}
                      >
                        {nombreHijo}
                      </Text>
                      <View style={[styles.pillBadge, { backgroundColor: estHijo.pill.bg }]}>
                        <Text style={[styles.pillBadgeText, { color: estHijo.pill.color }]}>
                          {estHijo.pill.shortText}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.hijoMeta} numberOfLines={1}>
                      {h.colegio || 'Sin colegio'}
                      {h.cursoGrado ? ` · ${h.cursoGrado}` : ''}
                      {infoHijo?.ruta?.nombreRuta ? ` · ${infoHijo.ruta.nombreRuta}` : ' · Sin ruta'}
                      {placaHijo ? ` (${placaHijo})` : ''}
                    </Text>
                    {paradaHijo?.nombreParada ? (
                      <Text style={styles.hijoParadaText} numberOfLines={1}>
                        Parada: {paradaHijo.nombreParada}
                      </Text>
                    ) : null}
                  </View>

                  {esActivo && (
                    <Ionicons name="radio-button-on" size={18} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Banner de alerta inminente si el bus está a menos de 500m */}
        {esperando && infoEta?.esInminente && (
          <View style={styles.alertaInminente}>
            <Ionicons name="notifications-outline" size={20} color="#f59e0b" />
            <View style={{ flex: 1 }}>
              <Text style={styles.alertaInminenteTitulo}>¡El bus está llegando!</Text>
              <Text style={styles.alertaInminenteDesc}>
                Acércate a la parada para no retrasar el recorrido.
              </Text>
            </View>
          </View>
        )}

        {/* Widget ETA Destacado */}
        {estado === 'en-curso' && bus ? (
          <View style={styles.etaWidget}>
            <View style={styles.etaHeader}>
              <View style={styles.etaIconBadge}>
                <Ionicons name="time" size={20} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.etaKicker}>
                  {esperando
                    ? 'TIEMPO ESTIMADO A TU PARADA'
                    : abordo
                      ? 'TIEMPO ESTIMADO AL DESTINO'
                      : 'TIEMPO ESTIMADO'}
                </Text>
                <View style={styles.etaTimeRow}>
                  <Text style={styles.etaDuration}>
                    {infoEta?.duracionTexto || 'Calculando...'}
                  </Text>
                  {infoEta?.horaEstimada ? (
                    <Text style={styles.etaHora}>· Aprox. {infoEta.horaEstimada}</Text>
                  ) : null}
                </View>
              </View>
            </View>

            <View style={styles.etaStatsGrid}>
              <View style={styles.etaStatItem}>
                <Ionicons name="navigate-outline" size={16} color={Colors.primary} />
                <Text style={styles.etaStatValue}>{infoEta?.distanciaKm || '--'}</Text>
                <Text style={styles.etaStatLabel}>Distancia vial</Text>
              </View>

              <View style={styles.etaStatItem}>
                <Ionicons name="location-outline" size={16} color="#f59e0b" />
                <Text style={styles.etaStatValue}>
                  {esperando
                    ? faltanParadas === 0
                      ? 'Llegando'
                      : `${faltanParadas} parada${faltanParadas > 1 ? 's' : ''}`
                    : 'En ruta'}
                </Text>
                <Text style={styles.etaStatLabel}>Restantes</Text>
              </View>

              <View style={styles.etaStatItem}>
                <Ionicons name="bus-outline" size={16} color="#22c55e" />
                <Text style={styles.etaStatValue}>{placa || 'Asignado'}</Text>
                <Text style={styles.etaStatLabel}>Placa bus</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.statusNoViaje}>
            <Ionicons
              name={estado === 'finalizado' ? 'flag-outline' : 'moon-outline'}
              size={24}
              color={Colors.mutedText}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.statusNoViajeTitle}>
                {estado === 'finalizado' ? 'Recorrido finalizado hoy' : 'Recorrido no iniciado'}
              </Text>
              <Text style={styles.statusNoViajeDesc}>
                {estado === 'finalizado'
                  ? 'El bus ha completado todas las paradas del día.'
                  : 'El conductor iniciará la ruta en el horario programado.'}
              </Text>
            </View>
          </View>
        )}

        {/* Acciones Rápidas del Mapa */}
        <View style={styles.accionesRow}>
          {bus && onCentrarBus && (
            <TouchableOpacity style={styles.accionBoton} onPress={onCentrarBus}>
              <Ionicons name="bus" size={16} color={Colors.primary} />
              <Text style={styles.accionTexto}>Ver Bus</Text>
            </TouchableOpacity>
          )}

          {miParada && onCentrarParada && (
            <TouchableOpacity style={styles.accionBoton} onPress={onCentrarParada}>
              <Ionicons name="pin" size={16} color="#f59e0b" />
              <Text style={styles.accionTexto}>Mi Parada</Text>
            </TouchableOpacity>
          )}

          {onCentrarRuta && (
            <TouchableOpacity style={styles.accionBoton} onPress={onCentrarRuta}>
              <Ionicons name="map-outline" size={16} color={Colors.darkText} />
              <Text style={styles.accionTexto}>Ver Todo</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Itinerario en tiempo real de las paradas */}
        {paradas.length > 0 && (
          <View style={styles.itinerarioCard}>
            <View style={styles.itinerarioHeader}>
              <Ionicons name="list-outline" size={18} color={Colors.primary} />
              <Text style={styles.itinerarioTitle}>Itinerario del recorrido</Text>
            </View>

            {paradas.map((p, idx) => {
              const esMiParada = idx === miParadaIndex;
              const visitada = estado === 'en-curso' && busIndex > idx;
              const esActual = estado === 'en-curso' && busIndex === idx;

              return (
                <View key={p.idParada || idx} style={styles.paradaItem}>
                  <View style={styles.paradaColIndicador}>
                    <View
                      style={[
                        styles.paradaPunto,
                        visitada && styles.paradaPuntoVisitado,
                        esActual && styles.paradaPuntoActual,
                        esMiParada && styles.paradaPuntoMio,
                      ]}
                    >
                      {visitada ? (
                        <Ionicons name="checkmark" size={12} color="#ffffff" />
                      ) : esActual ? (
                        <View style={styles.paradaPuntoPulso} />
                      ) : (
                        <Text
                          style={[
                            styles.paradaNumTexto,
                            esMiParada && { color: '#081120', fontWeight: '800' },
                          ]}
                        >
                          {idx + 1}
                        </Text>
                      )}
                    </View>
                    {idx < paradas.length - 1 && (
                      <View
                        style={[
                          styles.paradaLinea,
                          visitada && { backgroundColor: Colors.primary },
                        ]}
                      />
                    )}
                  </View>

                  <View style={styles.paradaContenido}>
                    <View style={styles.paradaNombreRow}>
                      <Text
                        style={[
                          styles.paradaNombre,
                          visitada && styles.paradaNombreVisitada,
                          esMiParada && styles.paradaNombreMio,
                        ]}
                      >
                        {p.nombreParada}
                      </Text>
                      {esMiParada && (
                        <View style={styles.badgeTuParada}>
                          <Text style={styles.badgeTuParadaTexto}>Tu parada</Text>
                        </View>
                      )}
                    </View>
                    {p.horaEstimada ? (
                      <Text style={styles.paradaHora}>Hora prog: {formatHora(p.horaEstimada)}</Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Información del vehículo y conductor */}
        <View style={styles.vehiculoCard}>
          <Text style={styles.cardHeaderTitle}>Información básica del bus y conductor</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoRowItem}>
              <Text style={styles.infoLabel}>Conductor</Text>
              <Text style={styles.infoValue}>{conductorNombre}</Text>
            </View>
            <View style={styles.infoRowItem}>
              <Text style={styles.infoLabel}>Placa del bus</Text>
              <Text style={[styles.infoValue, { color: Colors.primary }]}>{placa || 'Sin placa'}</Text>
            </View>
            <View style={styles.infoRowItem}>
              <Text style={styles.infoLabel}>Modelo del bus</Text>
              <Text style={styles.infoValue}>{modelo}</Text>
            </View>
            <View style={styles.infoRowItem}>
              <Text style={styles.infoLabel}>Ruta asignada</Text>
              <Text style={styles.infoValue}>{infoRuta?.ruta?.nombreRuta || 'Sin asignar'}</Text>
            </View>
            <View style={styles.infoRowItem}>
              <Text style={styles.infoLabel}>Estado viaje</Text>
              <Text style={[styles.infoValue, { color: pill.color }]}>
                {ESTADO_LABEL[estado]}
              </Text>
            </View>
          </View>

          {/* Teléfono del conductor con botón directo para llamar */}
          <View style={styles.phoneRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <View style={styles.phoneIconBox}>
                <Ionicons name="call-outline" size={16} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.phoneLabel}>TELÉFONO DEL CONDUCTOR</Text>
                <Text style={styles.phoneValue}>
                  {conductorTelefono || 'No registrado'}
                </Text>
              </View>
            </View>

            {conductorTelefono ? (
              <TouchableOpacity
                style={styles.callButton}
                onPress={() => Linking.openURL(`tel:${conductorTelefono.replace(/\s+/g, '')}`)}
                accessibilityRole="button"
                accessibilityLabel={`Llamar al conductor ${conductorNombre}`}
              >
                <Ionicons name="call" size={14} color={Colors.darker} />
                <Text style={styles.callButtonText}>Llamar</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0c1729',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#1e2f4f',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 20,
    overflow: 'hidden',
  },
  handleArea: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 10,
  },
  handleTouchable: {
    paddingVertical: 4,
    paddingHorizontal: 24,
  },
  handleBar: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#12203a',
    borderWidth: 1.5,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  summaryInfo: {
    flex: 1,
  },
  summaryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  studentName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  pillBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  pillBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  subText: {
    color: Colors.mutedText,
    fontSize: 12,
    marginTop: 2,
  },
  expandButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#13213a',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sheetScroll: {
    flex: 1,
  },
  sheetContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 12,
  },
  alertaInminente: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderRadius: 12,
    padding: 12,
  },
  alertaInminenteTitulo: {
    color: '#f59e0b',
    fontSize: 14,
    fontWeight: '700',
  },
  alertaInminenteDesc: {
    color: Colors.darkText,
    fontSize: 12,
    marginTop: 2,
  },
  etaWidget: {
    backgroundColor: '#12203a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e2f4f',
    padding: 14,
  },
  etaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  etaIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 212, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  etaKicker: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  etaTimeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 2,
  },
  etaDuration: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
  },
  etaHora: {
    color: Colors.mutedText,
    fontSize: 13,
  },
  etaStatsGrid: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#1e2f4f',
    paddingTop: 10,
  },
  etaStatItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  etaStatValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  etaStatLabel: {
    color: Colors.mutedText,
    fontSize: 10,
  },
  statusNoViaje: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#12203a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e2f4f',
    padding: 14,
  },
  statusNoViajeTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  statusNoViajeDesc: {
    color: Colors.mutedText,
    fontSize: 12,
    marginTop: 2,
  },
  accionesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  accionBoton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#12203a',
    borderWidth: 1,
    borderColor: '#1e2f4f',
    paddingVertical: 10,
    borderRadius: 12,
  },
  accionTexto: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  itinerarioCard: {
    backgroundColor: '#12203a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e2f4f',
    padding: 14,
  },
  itinerarioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  itinerarioTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  paradaItem: {
    flexDirection: 'row',
    minHeight: 44,
  },
  paradaColIndicador: {
    alignItems: 'center',
    width: 28,
  },
  paradaPunto: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#0c1729',
    borderWidth: 2,
    borderColor: '#1e2f4f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paradaPuntoVisitado: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  paradaPuntoActual: {
    borderColor: Colors.primary,
    backgroundColor: '#0c1729',
  },
  paradaPuntoPulso: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  paradaPuntoMio: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  paradaNumTexto: {
    color: Colors.mutedText,
    fontSize: 10,
    fontWeight: '600',
  },
  paradaLinea: {
    flex: 1,
    width: 2,
    backgroundColor: '#1e2f4f',
    marginVertical: 2,
  },
  paradaContenido: {
    flex: 1,
    paddingLeft: 8,
    paddingBottom: 10,
  },
  paradaNombreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  paradaNombre: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  paradaNombreVisitada: {
    color: Colors.mutedText,
  },
  paradaNombreMio: {
    color: '#f59e0b',
    fontWeight: '700',
  },
  badgeTuParada: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  badgeTuParadaTexto: {
    color: '#f59e0b',
    fontSize: 9,
    fontWeight: '700',
  },
  paradaHora: {
    color: Colors.mutedText,
    fontSize: 11,
    marginTop: 1,
  },
  vehiculoCard: {
    backgroundColor: '#12203a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e2f4f',
    padding: 14,
  },
  cardHeaderTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  infoGrid: {
    gap: 8,
  },
  infoRowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoLabel: {
    color: Colors.mutedText,
    fontSize: 13,
  },
  infoValue: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  hijosSection: {
    backgroundColor: '#12203a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e2f4f',
    padding: 12,
    gap: 10,
  },
  hijosSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 4,
  },
  hijosSectionTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  hijosSectionHint: {
    color: Colors.mutedText,
    fontSize: 11,
  },
  hijosList: {
    gap: 8,
  },
  hijoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#0c1729',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e2f4f',
    padding: 10,
  },
  hijoCardActivo: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(0, 212, 255, 0.08)',
  },
  hijoAvatarSmall: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#12203a',
    borderWidth: 1,
    borderColor: '#1e2f4f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hijoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  hijoNombre: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  hijoMeta: {
    color: Colors.mutedText,
    fontSize: 11,
    marginTop: 2,
  },
  hijoParadaText: {
    color: Colors.primary,
    fontSize: 11,
    marginTop: 1,
  },
  phoneRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1e2f4f',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  phoneIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0, 212, 255, 0.12)',
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneLabel: {
    color: Colors.mutedText,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  phoneValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 1,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  callButtonText: {
    color: Colors.darker,
    fontSize: 12,
    fontWeight: '800',
  },
});
