import { Ionicons } from '@expo/vector-icons';
import { ReactNode, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Colors } from '../constants/Colors';
import { styles } from '../styles/form.styles';

export type Opcion = { value: string; label: string };
export type Campo = {
  key: string;
  label: string;
  tipo?: 'texto' | 'correo' | 'clave' | 'numero' | 'fecha' | 'select';
  opciones?: Opcion[];
  requerido?: boolean;
  placeholder?: string;
};
export type Valores = Record<string, string>;

interface FormModalProps {
  visible: boolean;
  titulo: string;
  // Puede depender de los valores actuales (ej. paradas según la ruta elegida)
  campos: Campo[] | ((v: Valores) => Campo[]);
  iniciales: Valores;
  onCerrar: () => void;
  // Si lanza un Error, su mensaje se muestra en el formulario
  onGuardar: (v: Valores) => Promise<void>;
  children?: ReactNode;
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

const validar = (campos: Campo[], v: Valores) => {
  for (const c of campos) {
    const val = (v[c.key] || '').trim();
    if (c.requerido && !val) return `"${c.label}" es obligatorio.`;
    if (!val) continue;
    if (c.tipo === 'numero' && !/^\d+$/.test(val)) return `"${c.label}" debe ser un número entero.`;
    if (c.tipo === 'fecha' && (!FECHA.test(val) || isNaN(Date.parse(val)))) return `"${c.label}" debe tener el formato AAAA-MM-DD.`;
    if (c.tipo === 'correo' && !/^\S+@\S+\.\S+$/.test(val)) return `"${c.label}" no es un correo válido.`;
  }
  return null;
};

export default function FormModal({ visible, titulo, campos, iniciales, onCerrar, onGuardar, children }: FormModalProps) {
  const [valores, setValores] = useState<Valores>(iniciales);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [selectAbierto, setSelectAbierto] = useState<Campo | null>(null);
  const [filtro, setFiltro] = useState('');

  // Cada vez que se abre el modal arranca con los valores del registro (o vacío)
  useEffect(() => {
    if (visible) {
      setValores(iniciales);
      setError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const lista = typeof campos === 'function' ? campos(valores) : campos;
  const cambiar = (key: string, val: string) => setValores(prev => ({ ...prev, [key]: val }));

  const guardar = async () => {
    const msg = validar(lista, valores);
    if (msg) return setError(msg);
    setGuardando(true);
    setError('');
    try {
      await onGuardar(valores);
    } catch (e: any) {
      setError(e?.message || 'No se pudo guardar. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  const opcionesFiltradas = (selectAbierto?.opciones || []).filter(o =>
    o.label.toLowerCase().includes(filtro.toLowerCase().trim())
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onCerrar}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{titulo}</Text>
            <TouchableOpacity onPress={onCerrar} accessibilityLabel="Cerrar">
              <Ionicons name="close" size={24} color={Colors.mutedText} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 16 }} keyboardShouldPersistTaps="handled">
            {lista.map(c => (
              <View key={c.key} style={styles.field}>
                <Text style={styles.label}>
                  {c.label}
                  {c.requerido ? ' *' : ''}
                </Text>
                {c.tipo === 'select' ? (
                  <TouchableOpacity
                    style={styles.input}
                    onPress={() => {
                      setFiltro('');
                      setSelectAbierto(c);
                    }}
                  >
                    <Text style={[styles.inputText, !valores[c.key] && { color: Colors.placeholder }]} numberOfLines={1}>
                      {c.opciones?.find(o => o.value === valores[c.key])?.label || c.placeholder || 'Seleccionar...'}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color={Colors.mutedText} />
                  </TouchableOpacity>
                ) : (
                  <TextInput
                    style={[styles.input, styles.inputText]}
                    value={valores[c.key] || ''}
                    onChangeText={t => cambiar(c.key, t)}
                    placeholder={c.placeholder || (c.tipo === 'fecha' ? 'AAAA-MM-DD' : '')}
                    placeholderTextColor={Colors.placeholder}
                    secureTextEntry={c.tipo === 'clave'}
                    keyboardType={c.tipo === 'numero' ? 'number-pad' : c.tipo === 'correo' ? 'email-address' : 'default'}
                    autoCapitalize={c.tipo === 'correo' || c.tipo === 'clave' ? 'none' : 'sentences'}
                  />
                )}
              </View>
            ))}

            {children}

            {!!error && <Text style={styles.error}>{error}</Text>}
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.button, styles.buttonCancel]} onPress={onCerrar}>
              <Text style={styles.buttonCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.buttonSave]} onPress={guardar} disabled={guardando}>
              {guardando ? <ActivityIndicator color={Colors.darker} /> : <Text style={styles.buttonSaveText}>Guardar</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Selector con buscador */}
      <Modal visible={!!selectAbierto} animationType="fade" transparent onRequestClose={() => setSelectAbierto(null)}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { maxHeight: '70%' }]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{selectAbierto?.label}</Text>
              <TouchableOpacity onPress={() => setSelectAbierto(null)} accessibilityLabel="Cerrar">
                <Ionicons name="close" size={24} color={Colors.mutedText} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.input, styles.inputText, { marginBottom: 10 }]}
              placeholder="Buscar..."
              placeholderTextColor={Colors.placeholder}
              value={filtro}
              onChangeText={setFiltro}
            />
            <FlatList
              data={[...(selectAbierto?.requerido ? [] : [{ value: '', label: 'Sin asignar' }]), ...opcionesFiltradas]}
              keyExtractor={o => o.value || 'vacio'}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={<Text style={styles.emptyOption}>Sin resultados</Text>}
              renderItem={({ item }) => {
                const activo = selectAbierto && valores[selectAbierto.key] === item.value;
                return (
                  <TouchableOpacity
                    style={styles.option}
                    onPress={() => {
                      if (selectAbierto) cambiar(selectAbierto.key, item.value);
                      setSelectAbierto(null);
                    }}
                  >
                    <Text style={[styles.optionText, activo && { color: Colors.primary }]}>{item.label}</Text>
                    {activo && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </Modal>
  );
}
