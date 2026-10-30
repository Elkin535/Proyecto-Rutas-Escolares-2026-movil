import { Modal, Text, TouchableOpacity, View } from 'react-native';

import { Colors } from '../constants/Colors';
import { styles } from '../styles/disenador.styles';
import type { DisenadorRutaProps } from './DisenadorRuta';

// react-native-maps no funciona en navegador: el diseño de rutas se hace desde el celular
export default function DisenadorRuta({ visible, onCerrar }: DisenadorRutaProps) {
  return (
    <Modal visible={visible} transparent onRequestClose={onCerrar}>
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center', padding: 24 }]}>
        <Text style={[styles.title, { textAlign: 'center' }]}>El diseñador de rutas está disponible en la app del celular.</Text>
        <TouchableOpacity style={[styles.headerButton, { marginTop: 20 }]} onPress={onCerrar}>
          <Text style={[styles.headerButtonText, { color: Colors.darker }]}>Entendido</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}
