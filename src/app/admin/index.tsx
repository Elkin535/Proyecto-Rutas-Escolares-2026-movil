import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { HubConnectionBuilder } from '@microsoft/signalr';

import BottomNav from '../../components/BottomNav';
import DisenadorRuta from '../../components/DisenadorRuta';
import FormModal, { Campo, Valores } from '../../components/FormModal';
import MapaRuta, { ParadaMapa } from '../../components/MapaRuta';
import MenuUsuario from '../../components/MenuUsuario';
import PerfilView from '../../components/PerfilView';
import { Colors } from '../../constants/Colors';
import { API_URL, fetchApi, getJson, getStoredAuthData } from '../../services/api';
import { registrarPush } from '../../services/push';
import { registrarRostro, tomarFotoBase64 } from '../../services/rostros';
import { placaDeRuta } from '../../services/ruta';
import { MetricColors, styles } from '../../styles/admin.styles';

type IconName = keyof typeof Ionicons.glyphMap;
type Tab = 'resumen' | 'rutas' | 'estudiantes' | 'acudientes' | 'conductores' | 'vehiculos';

const TABS: { key: Tab; label: string; icon: IconName }[] = [
  { key: 'resumen', label: 'Resumen', icon: 'grid-outline' },
  { key: 'rutas', label: 'Rutas', icon: 'map-outline' },
  { key: 'estudiantes', label: 'Estudiantes', icon: 'school-outline' },
  { key: 'acudientes', label: 'Acudientes', icon: 'people-outline' },
  { key: 'conductores', label: 'Conductores', icon: 'id-card-outline' },
  { key: 'vehiculos', label: 'Vehículos', icon: 'bus-outline' },
];

const NAV = [
  { key: 'inicio', label: 'Inicio', icon: 'home-outline' as const },
  { key: 'perfil', label: 'Perfil', icon: 'person-circle-outline' as const },
];

// Mismos ids de rol que usa el front web al crear usuarios
const ROL_CONDUCTOR = 2;
const ROL_ACUDIENTE = 3;
const CATEGORIAS = ['A1', 'A2', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3'].map(c => ({ value: c, label: c }));

type Item = {
  key: string;
  title: string;
  lines: string[];
  badge?: string;
  onEdit: () => void;
  onDelete: () => void;
  // Acción adicional de la tarjeta (ej. registrar rostro del estudiante)
  extra?: { icon: IconName; label: string; onPress: () => void };
};

// Alert con botones no funciona en react-native-web, ahí usamos window.confirm
const confirmar = (mensaje: string, onOk: () => void) => {
  if (Platform.OS === 'web') {
    if (window.confirm(mensaje)) onOk();
    return;
  }
  Alert.alert('Confirmar', mensaje, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Eliminar', style: 'destructive', onPress: onOk },
  ]);
};

const avisar = (mensaje: string) =>
  Platform.OS === 'web' ? window.alert(mensaje) : Alert.alert('Aviso', mensaje);

const formatearFecha = (fecha?: string) => (fecha ? new Date(fecha).toLocaleDateString() : '-');

// Envía JSON al API y lanza un Error con el mensaje del backend si falla
const enviar = async (endpoint: string, method: string, body?: object) => {
  const res = await fetchApi(endpoint, { method, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.mensaje || data?.title || `Error del servidor (${res.status})`);
  return data;
};

const nulo = (v?: string) => (v?.trim() ? v.trim() : null);
const entero = (v?: string) => (v ? parseInt(v, 10) : null);
const fechaIso = (v?: string) => (v ? new Date(`${v}T00:00:00`).toISOString() : null);

export default function AdminScreen() {
  const [vista, setVista] = useState('inicio');
  const [tab, setTab] = useState<Tab>('resumen');
  const [search, setSearch] = useState('');
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [usuario, setUsuario] = useState<any>(null);

  const [metricas, setMetricas] = useState<any>({});
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [vehiculos, setVehiculos] = useState<any[]>([]);
  const [rutas, setRutas] = useState<any[]>([]);
  const [paradas, setParadas] = useState<any[]>([]);
  const [estudiantes, setEstudiantes] = useState<any[]>([]);
  const [acudientes, setAcudientes] = useState<any[]>([]);
  const [conductores, setConductores] = useState<any[]>([]);
  const [historial, setHistorial] = useState<any[]>([]);

  // Formulario abierto: qué entidad y, si es edición, el registro
  const [form, setForm] = useState<{ tipo: Tab; registro?: any } | null>(null);
  const [paradasNuevas, setParadasNuevas] = useState<ParadaMapa[]>([]);
  const [infoRuta, setInfoRuta] = useState<{ distanciaKm: string; duracionMin: number } | null>(null);
  const [disenadorAbierto, setDisenadorAbierto] = useState(false);
  const [alertas, setAlertas] = useState<any[]>([]);

  const cargarTodo = useCallback(async () => {
    const [met, usu, veh, rut, par, est, acu, con, his, ale] = await Promise.all([
      getJson('/Usuario/dashboard-metricas', {}),
      getJson('/Usuario/obtener-todos'),
      getJson('/Vehiculo/obtener-todos'),
      getJson('/Ruta/obtener-todas'),
      getJson('/Parada/obtener-todas'),
      getJson('/Estudiante/obtener-todos'),
      getJson('/Acudiente/obtener-todos'),
      getJson('/Conductor/obtener-todos'),
      getJson('/Historial/obtener-todos'),
      getJson('/Alerta/obtener-recientes'),
    ]);
    setMetricas(met);
    setUsuarios(usu);
    setVehiculos(veh);
    setRutas(rut);
    setParadas(par);
    setEstudiantes(est);
    setAcudientes(acu);
    setConductores(con);
    setHistorial(his);
    setAlertas(ale);
  }, []);

  useEffect(() => {
    getStoredAuthData().then(({ usuario: u }) => setUsuario(u));
    cargarTodo().finally(() => setCargando(false));
    registrarPush();
  }, [cargarTodo]);

  // Alertas de somnolencia en tiempo real (además llegan como push si la app está cerrada)
  useEffect(() => {
    const conn = new HubConnectionBuilder()
      .withUrl(`${API_URL.replace(/\/api$/, '')}/trackingHub`, {
        accessTokenFactory: async () => (await getStoredAuthData()).token || '',
      })
      .withAutomaticReconnect()
      .build();
    conn.on('RecibirAlerta', (alerta: any) => {
      setAlertas(prev => [alerta, ...prev]);
      avisar(`⚠️ ${alerta.tipo}: ${alerta.mensaje}`);
    });
    conn.onreconnected(() => conn.invoke('SuscribirseAdmins'));
    conn
      .start()
      .then(() => conn.invoke('SuscribirseAdmins'))
      .catch(err => console.warn('SignalR de alertas no disponible:', err?.message));
    return () => {
      conn.stop();
    };
  }, []);

  const atenderAlerta = async (idAlerta: number) => {
    const res = await fetchApi(`/Alerta/atender?id=${idAlerta}`, { method: 'PUT' }).catch(() => null);
    if (res?.ok) setAlertas(prev => prev.map(a => (a.idAlerta === idAlerta ? { ...a, atendida: true } : a)));
  };

  // Datos biométricos de un menor: se exige confirmar la autorización del acudiente antes de la foto
  const registrarRostroDe = (e: any) => {
    const tomar = async (origen: 'camara' | 'galeria') => {
      try {
        const foto = await tomarFotoBase64(origen);
        if (!foto) return;
        await registrarRostro(e.idEstudiante, foto);
        await cargarTodo();
        avisar(`Rostro de ${e.nombre} registrado. Ya puede tomarse su asistencia con la cámara.`);
      } catch (err: any) {
        avisar(err?.message || 'No se pudo registrar el rostro.');
      }
    };
    const aviso =
      'Al continuar confirmas que el acudiente autorizó el tratamiento de los datos biométricos del estudiante (Ley 1581 de 2012). ' +
      'Toma la foto de frente, sin gafas oscuras y con buena luz.';
    if (Platform.OS === 'web') {
      if (window.confirm(aviso)) tomar('galeria');
      return;
    }
    Alert.alert(`Registrar rostro de ${e.nombre}`, aviso, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Galería', onPress: () => tomar('galeria') },
      { text: 'Tomar foto', onPress: () => tomar('camara') },
    ]);
  };

  const onRefresh = async () => {
    setRefrescando(true);
    await cargarTodo();
    setRefrescando(false);
  };

  const cambiarTab = (t: Tab) => {
    setTab(t);
    setSearch('');
  };

  const abrirForm = (tipo: Tab, registro?: any) => {
    setParadasNuevas([]);
    setInfoRuta(null);
    setForm({ tipo, registro });
  };

  // Ejecuta uno o varios DELETE en orden y recarga; se detiene en el primero que falle
  const eliminar = (mensaje: string, endpoints: string[]) =>
    confirmar(mensaje, async () => {
      try {
        for (const ep of endpoints) {
          const res = await fetchApi(ep, { method: 'DELETE' });
          if (!res.ok) throw new Error();
        }
        await cargarTodo();
      } catch {
        avisar('No se pudo eliminar el registro. Verifica que no esté en uso.');
      }
    });

  const usuarioDe = (idUsuario: number) => usuarios.find(u => u.idUsuario === idUsuario) || {};
  const nombreUsuario = (idUsuario: number) => {
    const u = usuarioDe(idUsuario);
    return u.nombre ? `${u.nombre} ${u.apellido || ''}`.trim() : 'Sin nombre';
  };
  const placaDe = (idVehiculo?: number) =>
    vehiculos.find(v => v.idVehiculo === idVehiculo)?.placa || 'Sin asignar';
  const nombreRuta = (idRuta?: number) =>
    rutas.find(r => r.idRuta === idRuta)?.nombreRuta || 'Sin asignar';
  const paradasDeRuta = (idRuta: number) =>
    paradas.filter(p => p.idRuta === idRuta).sort((a, b) => a.ordenVisita - b.ordenVisita);

  // Misma lógica que el web: la descripción guarda "Conductor: X | Vehículo: Y"
  const conductorYVehiculo = (descripcion?: string) => {
    if (descripcion?.includes('Conductor:') && descripcion.includes('Vehículo:')) {
      const [c, v] = descripcion.split(' | ');
      return { conductor: c.replace('Conductor: ', ''), vehiculo: v.replace('Vehículo: ', '') };
    }
    return { conductor: descripcion || 'No asignado', vehiculo: 'Sin placa' };
  };

  // ── Formularios (crear / editar), equivalentes a los modales del Admin web ──
  const camposUsuario = (editando: boolean): Campo[] => [
    { key: 'nombre', label: 'Nombre', requerido: true },
    { key: 'apellido', label: 'Apellido', requerido: true },
    { key: 'correo', label: 'Correo', tipo: 'correo', requerido: true },
    {
      key: 'contrasena',
      label: 'Contraseña',
      tipo: 'clave',
      requerido: !editando,
      placeholder: editando ? 'Dejar vacío para no cambiarla' : '',
    },
    { key: 'telefono', label: 'Teléfono' },
  ];

  // Crea el usuario y luego su perfil; si el perfil falla se borra el usuario para no dejarlo huérfano
  const crearConUsuario = async (idRol: number, v: Valores, crearPerfil: (idUsuario: number) => Promise<void>) => {
    const u = await enviar('/Usuario/crear', 'POST', {
      idRol,
      nombre: v.nombre.trim(),
      apellido: v.apellido.trim(),
      correo: v.correo.trim(),
      contrasena: v.contrasena,
      telefono: nulo(v.telefono),
    });
    try {
      await crearPerfil(u.idUsuario);
    } catch (e) {
      await fetchApi(`/Usuario/eliminar?id=${u.idUsuario}`, { method: 'DELETE' }).catch(() => {});
      throw e;
    }
  };

  const actualizarUsuario = (idUsuario: number, v: Valores) =>
    enviar(`/Usuario/actualizar?id=${idUsuario}`, 'PUT', {
      nombre: v.nombre.trim(),
      apellido: v.apellido.trim(),
      correo: v.correo.trim(),
      contrasena: nulo(v.contrasena),
      telefono: nulo(v.telefono),
    });

  const formConfig = (
    tipo: Tab,
    r?: any
  ): { titulo: string; campos: Campo[] | ((v: Valores) => Campo[]); iniciales: Valores; guardar: (v: Valores) => Promise<void> } => {
    switch (tipo) {
      case 'rutas': {
        const actual = r ? conductorYVehiculo(r.descripcion) : null;
        return {
          titulo: r ? 'Editar ruta' : 'Nueva ruta',
          campos: [
            { key: 'nombre', label: 'Nombre de la ruta', requerido: true, placeholder: 'Ej. Ruta 04 - Occidente' },
            {
              key: 'conductor',
              label: 'Conductor asignado',
              tipo: 'select',
              requerido: true,
              opciones: conductores.map(c => {
                const nom = nombreUsuario(c.idUsuario);
                return { value: nom, label: `${nom} (Lic: ${c.numeroLicencia || 'N/A'})` };
              }),
            },
            {
              key: 'placa',
              label: 'Vehículo asignado',
              tipo: 'select',
              opciones: vehiculos.map(v => ({ value: v.placa, label: `${v.placa}${v.modelo ? ` · ${v.modelo}` : ''}` })),
            },
          ] as Campo[],
          iniciales: {
            nombre: r?.nombreRuta || '',
            conductor: actual?.conductor === 'No asignado' ? '' : actual?.conductor || '',
            placa: ['Sin placa', 'SIN PLACA'].includes(actual?.vehiculo || '') ? '' : actual?.vehiculo || '',
          },
          guardar: async (v: Valores) => {
            const descripcion = `Conductor: ${v.conductor} | Vehículo: ${v.placa || 'SIN PLACA'}`;
            if (r) {
              // Se conserva el estado: si no se envía, el backend lo pone en false (Mantenimiento)
              await enviar(`/Ruta/actualizar?id=${r.idRuta}`, 'PUT', {
                idRuta: r.idRuta,
                nombreRuta: v.nombre.trim(),
                descripcion,
                estado: r.estado,
              });
              return;
            }
            const creada = await enviar('/Ruta/crear', 'POST', { nombreRuta: v.nombre.trim(), descripcion });
            // En orden, para que ordenVisita coincida con el orden en que se marcaron en el mapa
            for (const [i, p] of paradasNuevas.entries()) {
              await enviar('/Parada/crear', 'POST', {
                idRuta: creada.idRuta,
                nombreParada: p.nombreParada.trim() || `Parada ${i + 1}`,
                latitud: p.latitud,
                longitud: p.longitud,
                ordenVisita: i + 1,
              });
            }
          },
        };
      }
      case 'estudiantes':
        return {
          titulo: r ? 'Editar estudiante' : 'Nuevo estudiante',
          campos: (v: Valores): Campo[] => [
            { key: 'nombre', label: 'Nombre', requerido: true },
            { key: 'apellido', label: 'Apellido', requerido: true },
            {
              key: 'idAcudiente',
              label: 'Acudiente',
              tipo: 'select',
              requerido: true,
              opciones: acudientes.map(a => ({ value: String(a.idAcudiente), label: nombreUsuario(a.idUsuario) })),
            },
            { key: 'colegio', label: 'Colegio' },
            { key: 'cursoGrado', label: 'Curso / grado' },
            {
              key: 'idRuta',
              label: 'Ruta',
              tipo: 'select',
              opciones: rutas.map(x => ({ value: String(x.idRuta), label: x.nombreRuta })),
            },
            ...(v.idRuta
              ? [
                  {
                    key: 'idParada',
                    label: 'Parada de recogida',
                    tipo: 'select',
                    opciones: paradasDeRuta(Number(v.idRuta)).map((p, i) => ({
                      value: String(p.idParada),
                      label: `${i + 1}. ${p.nombreParada}`,
                    })),
                  } as Campo,
                ]
              : []),
          ],
          iniciales: {
            nombre: r?.nombre || '',
            apellido: r?.apellido || '',
            idAcudiente: r?.idAcudiente ? String(r.idAcudiente) : '',
            colegio: r?.colegio || '',
            cursoGrado: r?.cursoGrado || '',
            idRuta: r?.idRuta ? String(r.idRuta) : '',
            idParada: r?.idParada ? String(r.idParada) : '',
          },
          guardar: async (v: Valores) => {
            const idRuta = entero(v.idRuta);
            // Si cambió la ruta, la parada anterior ya no aplica
            const idParada = paradas.some(p => p.idParada === entero(v.idParada) && p.idRuta === idRuta)
              ? entero(v.idParada)
              : null;
            const body = {
              idAcudiente: entero(v.idAcudiente),
              nombre: v.nombre.trim(),
              apellido: v.apellido.trim(),
              colegio: nulo(v.colegio),
              cursoGrado: nulo(v.cursoGrado),
              estado: r ? r.estado : true,
              idRuta,
              idParada,
            };
            if (r) await enviar(`/Estudiante/actualizar?id=${r.idEstudiante}`, 'PUT', body);
            else await enviar('/Estudiante/crear', 'POST', body);
          },
        };
      case 'acudientes': {
        const u = r ? usuarioDe(r.idUsuario) : {};
        return {
          titulo: r ? 'Editar acudiente' : 'Nuevo acudiente',
          campos: [...camposUsuario(!!r), { key: 'direccion', label: 'Dirección de residencia' }],
          iniciales: {
            nombre: u.nombre || '',
            apellido: u.apellido || '',
            correo: u.correo || '',
            contrasena: '',
            telefono: u.telefono || '',
            direccion: r?.direccionResidencia || '',
          },
          guardar: async (v: Valores) => {
            if (r) {
              await actualizarUsuario(r.idUsuario, v);
              await enviar(`/Acudiente/actualizar?id=${r.idAcudiente}`, 'PUT', {
                idUsuario: r.idUsuario,
                direccionResidencia: nulo(v.direccion),
              });
              return;
            }
            await crearConUsuario(ROL_ACUDIENTE, v, async idUsuario => {
              await enviar('/Acudiente/crear', 'POST', { idUsuario, direccionResidencia: nulo(v.direccion) });
            });
          },
        };
      }
      case 'conductores': {
        const u = r ? usuarioDe(r.idUsuario) : {};
        return {
          titulo: r ? 'Editar conductor' : 'Nuevo conductor',
          campos: [
            ...camposUsuario(!!r),
            { key: 'numeroLicencia', label: 'Número de licencia', requerido: true },
            { key: 'categoriaLicencia', label: 'Categoría de licencia', tipo: 'select', opciones: CATEGORIAS },
            {
              key: 'idVehiculo',
              label: 'Vehículo asignado',
              tipo: 'select',
              opciones: vehiculos.map(v => ({ value: String(v.idVehiculo), label: v.placa })),
            },
          ] as Campo[],
          iniciales: {
            nombre: u.nombre || '',
            apellido: u.apellido || '',
            correo: u.correo || '',
            contrasena: '',
            telefono: u.telefono || '',
            numeroLicencia: r?.numeroLicencia || '',
            categoriaLicencia: r?.categoriaLicencia || '',
            idVehiculo: r?.idVehiculo ? String(r.idVehiculo) : '',
          },
          guardar: async (v: Valores) => {
            const perfil = (idUsuario: number) => ({
              idUsuario,
              idVehiculo: entero(v.idVehiculo),
              numeroLicencia: v.numeroLicencia.trim(),
              categoriaLicencia: nulo(v.categoriaLicencia),
            });
            if (r) {
              await actualizarUsuario(r.idUsuario, v);
              await enviar(`/Conductor/actualizar?id=${r.idConductor}`, 'PUT', perfil(r.idUsuario));
              return;
            }
            await crearConUsuario(ROL_CONDUCTOR, v, async idUsuario => {
              await enviar('/Conductor/crear', 'POST', perfil(idUsuario));
            });
          },
        };
      }
      default:
        return {
          titulo: r ? 'Editar vehículo' : 'Nuevo vehículo',
          campos: [
            { key: 'placa', label: 'Placa', requerido: true, placeholder: 'Ej. STR-2026' },
            { key: 'modelo', label: 'Modelo' },
            { key: 'capacidadPasajeros', label: 'Capacidad de pasajeros', tipo: 'numero', requerido: true },
            { key: 'soatVencimiento', label: 'Vencimiento SOAT', tipo: 'fecha' },
            { key: 'tecnomecanicaVencimiento', label: 'Vencimiento tecnomecánica', tipo: 'fecha' },
          ] as Campo[],
          iniciales: {
            placa: r?.placa || '',
            modelo: r?.modelo || '',
            capacidadPasajeros: r?.capacidadPasajeros ? String(r.capacidadPasajeros) : '',
            soatVencimiento: r?.soatVencimiento?.split('T')[0] || '',
            tecnomecanicaVencimiento: r?.tecnomecanicaVencimiento?.split('T')[0] || '',
          },
          guardar: async (v: Valores) => {
            const body = {
              placa: v.placa.trim().toUpperCase(),
              modelo: nulo(v.modelo),
              capacidadPasajeros: entero(v.capacidadPasajeros),
              estado: true,
              soatVencimiento: fechaIso(v.soatVencimiento),
              tecnomecanicaVencimiento: fechaIso(v.tecnomecanicaVencimiento),
            };
            if (r) await enviar(`/Vehiculo/actualizar?id=${r.idVehiculo}`, 'PUT', { idVehiculo: r.idVehiculo, ...body });
            else await enviar('/Vehiculo/crear', 'POST', body);
          },
        };
    }
  };

  const itemsDeTab = (): Item[] => {
    switch (tab) {
      case 'rutas':
        return rutas.map(r => {
          const { conductor, vehiculo } = conductorYVehiculo(r.descripcion);
          const nParadas = paradas.filter(p => p.idRuta === r.idRuta).length;
          return {
            key: `r${r.idRuta}`,
            title: r.nombreRuta,
            lines: [`Conductor: ${conductor}`, `${nParadas} paradas · ${r.estado ? 'En servicio' : 'Mantenimiento'}`],
            badge: vehiculo,
            onEdit: () => abrirForm('rutas', r),
            onDelete: () => eliminar('¿Eliminar esta ruta escolar?', [`/Ruta/eliminar?id=${r.idRuta}`]),
          };
        });
      case 'estudiantes':
        return estudiantes.map(e => {
          const acu = acudientes.find(a => a.idAcudiente === e.idAcudiente);
          const parada = paradas.find(p => p.idParada === e.idParada);
          return {
            key: `e${e.idEstudiante}`,
            title: `${e.nombre} ${e.apellido || ''}`.trim(),
            lines: [
              `Acudiente: ${acu ? nombreUsuario(acu.idUsuario) : 'Sin asignar'}`,
              `Colegio: ${e.colegio || '-'}${e.cursoGrado ? ` · ${e.cursoGrado}` : ''}`,
              `Parada: ${parada?.nombreParada || 'Sin asignar'}`,
              `Rostro: ${e.rostroRegistrado ? 'registrado ✓' : 'sin registrar'}`,
            ],
            badge: e.idRuta ? nombreRuta(e.idRuta) : undefined,
            extra: {
              icon: e.rostroRegistrado ? 'happy-outline' : 'scan-outline',
              label: e.rostroRegistrado ? 'Actualizar rostro' : 'Registrar rostro',
              onPress: () => registrarRostroDe(e),
            },
            onEdit: () => abrirForm('estudiantes', e),
            onDelete: () => eliminar('¿Eliminar este estudiante?', [`/Estudiante/eliminar?id=${e.idEstudiante}`]),
          };
        });
      case 'acudientes':
        return acudientes.map(a => {
          const u = usuarioDe(a.idUsuario);
          return {
            key: `a${a.idAcudiente}`,
            title: nombreUsuario(a.idUsuario),
            lines: [u.correo || '-', `Tel: ${u.telefono || '-'}`, `Dir: ${a.direccionResidencia || '-'}`],
            onEdit: () => abrirForm('acudientes', a),
            onDelete: () =>
              eliminar('¿Eliminar este acudiente? También se eliminará su usuario.', [
                `/Acudiente/eliminar?id=${a.idAcudiente}`,
                `/Usuario/eliminar?id=${a.idUsuario}`,
              ]),
          };
        });
      case 'conductores':
        return conductores.map(c => ({
          key: `c${c.idConductor}`,
          title: nombreUsuario(c.idUsuario),
          lines: [usuarioDe(c.idUsuario).correo || '-', `Licencia: ${c.numeroLicencia} (${c.categoriaLicencia || '-'})`],
          badge: placaDe(c.idVehiculo),
          onEdit: () => abrirForm('conductores', c),
          onDelete: () =>
            eliminar('¿Eliminar este conductor? También se eliminará su usuario.', [
              `/Conductor/eliminar?id=${c.idConductor}`,
              `/Usuario/eliminar?id=${c.idUsuario}`,
            ]),
        }));
      case 'vehiculos':
        return vehiculos.map(v => ({
          key: `v${v.idVehiculo}`,
          title: v.modelo || 'Vehículo',
          lines: [
            `Capacidad: ${v.capacidadPasajeros} pasajeros`,
            `SOAT: ${formatearFecha(v.soatVencimiento)} · Tecno: ${formatearFecha(v.tecnomecanicaVencimiento)}`,
          ],
          badge: v.placa,
          onEdit: () => abrirForm('vehiculos', v),
          onDelete: () => eliminar('¿Eliminar este vehículo?', [`/Vehiculo/eliminar?id=${v.idVehiculo}`]),
        }));
      default:
        return [];
    }
  };

  if (cargando) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const term = search.toLowerCase().trim();
  const items = itemsDeTab().filter(
    i => !term || [i.title, i.badge, ...i.lines].join(' ').toLowerCase().includes(term)
  );
  const tabActual = TABS.find(t => t.key === tab)!;
  const config = form ? formConfig(form.tipo, form.registro) : null;

  const metricasCards: { label: string; value: number; icon: IconName; color: string; tab: Tab }[] = [
    { label: 'Rutas creadas', value: metricas.totalRutas ?? rutas.length, icon: 'map-outline', color: MetricColors.routes, tab: 'rutas' },
    { label: 'Conductores', value: metricas.totalConductores ?? conductores.length, icon: 'id-card-outline', color: MetricColors.drivers, tab: 'conductores' },
    { label: 'Vehículos', value: metricas.totalVehiculos ?? vehiculos.length, icon: 'bus-outline', color: MetricColors.vehicles, tab: 'vehiculos' },
    { label: 'Alumnos asignados', value: metricas.totalEstudiantes ?? estudiantes.length, icon: 'school-outline', color: MetricColors.students, tab: 'estudiantes' },
  ];

  // "Estado de las rutas" del Figma: una ruta está activa si su vehículo tiene un viaje en progreso
  const estadoRutas = rutas.map(r => {
    const placa = placaDeRuta(r.descripcion);
    const idVehiculo = vehiculos.find(v => v.placa === placa)?.idVehiculo;
    const activa = historial.some(h => h.idVehiculo === idVehiculo && h.estadoViaje === 'En progreso');
    const nEst = estudiantes.filter(e => e.idRuta === r.idRuta).length;
    return { r, placa, activa, nEst };
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerSubtitle, { color: Colors.primary }]}>CENTRO DE CONTROL</Text>
          <Text style={styles.headerTitle}>
            {vista === 'perfil' ? 'Mi perfil' : `Hola, ${usuario?.nombre || 'administrador'}`}
          </Text>
        </View>
        <MenuUsuario usuario={usuario} rol="Administrador" />
      </View>

      {vista === 'perfil' ? (
        <PerfilView usuario={usuario} />
      ) : (
        <>
          <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
              {TABS.map(t => {
                const activo = t.key === tab;
                return (
                  <TouchableOpacity key={t.key} style={[styles.tab, activo && styles.tabActive]} onPress={() => cambiarTab(t.key)}>
                    <Ionicons name={t.icon} size={16} color={activo ? Colors.darker : Colors.mutedText} />
                    <Text style={[styles.tabText, activo && styles.tabTextActive]}>{t.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refrescando} onRefresh={onRefresh} tintColor={Colors.primary} />}
          >
            {tab === 'resumen' ? (
              <>
                {alertas.some(a => !a.atendida) && (
                  <>
                    <Text style={[styles.sectionTitle, { color: MetricColors.danger }]}>⚠️ Alertas de somnolencia</Text>
                    {alertas
                      .filter(a => !a.atendida)
                      .map(a => (
                        <View key={a.idAlerta} style={[styles.card, { borderColor: MetricColors.danger }]}>
                          <View style={styles.cardBody}>
                            <Text style={[styles.cardTitle, { color: MetricColors.danger }]}>{a.tipo}</Text>
                            <Text style={styles.cardLine}>{a.mensaje}</Text>
                            <Text style={styles.cardLine}>{new Date(a.fecha.endsWith('Z') ? a.fecha : `${a.fecha}Z`).toLocaleString()}</Text>
                          </View>
                          <TouchableOpacity style={styles.editButton} onPress={() => atenderAlerta(a.idAlerta)} accessibilityLabel="Marcar alerta como atendida">
                            <Ionicons name="checkmark-done-outline" size={18} color={Colors.primary} />
                          </TouchableOpacity>
                        </View>
                      ))}
                  </>
                )}

                <Text style={styles.sectionTitle}>Estadísticas generales</Text>
                <View style={styles.metricsGrid}>
                  {metricasCards.map(m => (
                    <TouchableOpacity key={m.label} style={styles.metricCard} onPress={() => cambiarTab(m.tab)}>
                      <View style={[styles.metricIcon, { backgroundColor: `${m.color}26` }]}>
                        <Ionicons name={m.icon} size={22} color={m.color} />
                      </View>
                      <Text style={styles.metricValue}>{m.value}</Text>
                      <Text style={styles.metricLabel}>{m.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Estado de las rutas</Text>
                {estadoRutas.length === 0 && <Text style={styles.emptyText}>No hay rutas registradas</Text>}
                {estadoRutas.map(({ r, placa, activa, nEst }) => {
                  const color = activa ? MetricColors.vehicles : Colors.mutedText;
                  return (
                    <View key={r.idRuta} style={styles.statusRow}>
                      <Ionicons name={activa ? 'checkmark-circle-outline' : 'time-outline'} size={24} color={color} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>{r.nombreRuta}</Text>
                        <Text style={styles.cardLine}>Vehículo {placa || '-'} · {nEst} estudiantes</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: `${color}26` }]}>
                        <Text style={{ color, fontSize: 12, fontWeight: '700' }}>{activa ? 'En curso' : 'En espera'}</Text>
                      </View>
                    </View>
                  );
                })}

                <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Gestión</Text>
                {TABS.slice(1).map(t => (
                  <TouchableOpacity key={t.key} style={styles.shortcut} onPress={() => cambiarTab(t.key)}>
                    <Ionicons name={t.icon} size={20} color={Colors.primary} />
                    <Text style={styles.shortcutText}>Gestionar {t.label.toLowerCase()}</Text>
                    <Ionicons name="chevron-forward" size={18} color={Colors.mutedText} />
                  </TouchableOpacity>
                ))}
              </>
            ) : (
              <>
                <TouchableOpacity style={styles.newButton} onPress={() => abrirForm(tab)}>
                  <Ionicons name="add" size={22} color={Colors.darker} />
                  <Text style={styles.newButtonText}>Nuevo Registro</Text>
                </TouchableOpacity>

                <View style={styles.searchBox}>
                  <Ionicons name="search" size={18} color={Colors.placeholder} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder={`Buscar en ${tabActual.label.toLowerCase()}...`}
                    placeholderTextColor={Colors.placeholder}
                    value={search}
                    onChangeText={setSearch}
                  />
                </View>
                <Text style={styles.countText}>{items.length} registro(s)</Text>

                {items.length === 0 ? (
                  <View style={styles.empty}>
                    <Ionicons name={tabActual.icon} size={40} color={Colors.placeholder} />
                    <Text style={styles.emptyText}>No hay {tabActual.label.toLowerCase()} registrados</Text>
                  </View>
                ) : (
                  items.map(i => (
                    <View key={i.key} style={styles.card}>
                      <View style={styles.cardBody}>
                        <Text style={styles.cardTitle}>{i.title}</Text>
                        {i.lines.map((l, idx) => (
                          <Text key={idx} style={styles.cardLine}>{l}</Text>
                        ))}
                        {i.badge && (
                          <View style={styles.badge}>
                            <Text style={styles.badgeText}>{i.badge}</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.cardActions}>
                        {i.extra && (
                          <TouchableOpacity style={styles.editButton} onPress={i.extra.onPress} accessibilityLabel={i.extra.label}>
                            <Ionicons name={i.extra.icon} size={18} color={Colors.primary} />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity style={styles.editButton} onPress={i.onEdit} accessibilityLabel="Editar">
                          <Ionicons name="create-outline" size={18} color={Colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.deleteButton} onPress={i.onDelete} accessibilityLabel="Eliminar">
                          <Ionicons name="trash-outline" size={18} color={MetricColors.danger} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </>
            )}
          </ScrollView>
        </>
      )}

      <BottomNav tabs={NAV} active={vista} onChange={setVista} />

      {config && form && (
        <FormModal
          visible
          titulo={config.titulo}
          campos={config.campos}
          iniciales={config.iniciales}
          onCerrar={() => setForm(null)}
          onGuardar={async v => {
            await config.guardar(v);
            setForm(null);
            await cargarTodo();
          }}
        >
          {/* Recorrido (solo al crear): se diseña a pantalla completa y aquí se ve el resumen */}
          {form.tipo === 'rutas' && !form.registro && (
            <View>
              <Text style={[styles.sectionTitle, { marginTop: 4, marginBottom: 6 }]}>Recorrido</Text>
              {paradasNuevas.length > 0 && (
                <>
                  <MapaRuta paradas={paradasNuevas} height={180} onRuta={setInfoRuta} />
                  <Text style={styles.designerHint}>
                    {paradasNuevas.length} punto(s) · {paradasNuevas.map(p => p.nombreParada).join(' → ')}
                    {infoRuta ? `\n${infoRuta.distanciaKm} km · ${infoRuta.duracionMin} min` : ''}
                  </Text>
                </>
              )}
              <TouchableOpacity
                style={[styles.newButton, paradasNuevas.length > 0 && { backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.primary }]}
                onPress={() => setDisenadorAbierto(true)}
              >
                <Ionicons name="map" size={20} color={paradasNuevas.length ? Colors.primary : Colors.darker} />
                <Text style={[styles.newButtonText, paradasNuevas.length > 0 && { color: Colors.primary }]}>
                  {paradasNuevas.length ? 'Editar recorrido en el mapa' : 'Diseñar recorrido en el mapa'}
                </Text>
              </TouchableOpacity>

              {/* Va dentro del FormModal: en iOS un Modal solo puede abrirse encima de otro si está anidado */}
              <DisenadorRuta
                visible={disenadorAbierto}
                paradasIniciales={paradasNuevas}
                onCerrar={() => setDisenadorAbierto(false)}
                onGuardar={p => {
                  setParadasNuevas(p);
                  setDisenadorAbierto(false);
                }}
              />
            </View>
          )}
        </FormModal>
      )}
    </View>
  );
}
