import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';

import { Colors } from '../constants/Colors';
import { styles } from '../styles/dialogo.styles';

/**
 * Diálogos con el diseño de SchoolTrack (reemplazan el Alert.alert blanco del sistema).
 * - <DialogoHost /> va una sola vez en el layout raíz.
 * - alerta(titulo, mensaje, botones) tiene la misma forma que Alert.alert, para migrar fácil.
 */

export type TipoDialogo = 'info' | 'exito' | 'error' | 'advertencia' | 'pregunta' | 'rostro';

export type BotonDialogo = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
};

type Dialogo = {
  id: number;
  titulo: string;
  mensaje?: string;
  tipo: TipoDialogo;
  botones: BotonDialogo[];
};

const ICONOS: Record<TipoDialogo, { icono: keyof typeof Ionicons.glyphMap; color: string }> = {
  info: { icono: 'information-circle-outline', color: Colors.primary },
  exito: { icono: 'checkmark-circle-outline', color: '#22c55e' },
  error: { icono: 'alert-circle-outline', color: '#ef4444' },
  advertencia: { icono: 'warning-outline', color: '#f59e0b' },
  pregunta: { icono: 'help-circle-outline', color: Colors.primary },
  rostro: { icono: 'happy-outline', color: Colors.primary },
};

// Cola global: si un botón abre otro diálogo, se muestra al cerrar el actual
let cola: Dialogo[] = [];
let siguienteId = 1;
const oyentes = new Set<(d: Dialogo | null) => void>();
const emitir = () => oyentes.forEach(o => o(cola[0] ?? null));

// Si el título no dice el tipo, se deduce de palabras comunes
const deducirTipo = (titulo: string, botones: BotonDialogo[]): TipoDialogo => {
  const t = titulo.toLowerCase();
  if (/error|no se pudo|inválid|incorrect|fall/.test(t)) return 'error';
  if (/éxito|exito|listo|registrad|confirmad|finalizad|guardad/.test(t)) return 'exito';
  if (/confirmar|¿/.test(t) || botones.length > 1) return 'pregunta';
  if (/requerid|incomplet|corta|no coinciden|atención|cuidado/.test(t)) return 'advertencia';
  return 'info';
};

export const alerta = (titulo: string, mensaje?: string, botones?: BotonDialogo[], tipo?: TipoDialogo) => {
  const lista = botones?.length ? botones : [{ text: 'Entendido' }];
  cola = [...cola, { id: siguienteId++, titulo, mensaje, tipo: tipo ?? deducirTipo(titulo, lista), botones: lista }];
  emitir();
};

const cerrarActual = () => {
  cola = cola.slice(1);
  emitir();
};

export function DialogoHost() {
  const [actual, setActual] = useState<Dialogo | null>(cola[0] ?? null);

  useEffect(() => {
    oyentes.add(setActual);
    return () => {
      oyentes.delete(setActual);
    };
  }, []);

  if (!actual) return null;

  const { icono, color } = ICONOS[actual.tipo];
  const cancelar = actual.botones.find(b => b.style === 'cancel');
  // Con 3 botones o más se apilan para que los textos no se corten
  const apilados = actual.botones.length > 2;

  const pulsar = (b?: BotonDialogo) => {
    cerrarActual();
    b?.onPress?.();
  };

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => pulsar(cancelar)}
    >
      {/* Tocar fuera equivale a cancelar solo si hay un botón de cancelar */}
      <Pressable style={styles.overlay} onPress={cancelar ? () => pulsar(cancelar) : undefined}>
        <Pressable style={styles.card} onPress={() => {}} accessibilityRole="alert">
          <View style={[styles.iconCircle, { backgroundColor: `${color}1f`, borderColor: `${color}55` }]}>
            <Ionicons name={icono} size={30} color={color} />
          </View>
          <Text style={styles.titulo}>{actual.titulo}</Text>
          {!!actual.mensaje && <Text style={styles.mensaje}>{actual.mensaje}</Text>}

          <View style={[styles.botones, apilados && styles.botonesApilados]}>
            {actual.botones.map((b, i) => {
              const esCancelar = b.style === 'cancel';
              const esPeligro = b.style === 'destructive';
              // El último botón que no es "cancelar" es la acción principal
              const principal = !esCancelar && i === actual.botones.length - 1;
              return (
                <TouchableOpacity
                  key={`${actual.id}-${i}`}
                  style={[
                    styles.boton,
                    !apilados && { flex: 1 },
                    esCancelar && styles.botonCancelar,
                    esPeligro && styles.botonPeligro,
                    principal && !esPeligro && styles.botonPrincipal,
                    !esCancelar && !esPeligro && !principal && styles.botonSecundario,
                  ]}
                  onPress={() => pulsar(b)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.botonTexto,
                      esCancelar && { color: Colors.mutedText },
                      esPeligro && { color: '#fff' },
                      principal && !esPeligro && { color: Colors.darker },
                    ]}
                  >
                    {b.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
