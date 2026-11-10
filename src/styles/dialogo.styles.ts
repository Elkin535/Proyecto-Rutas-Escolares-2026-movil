import { StyleSheet } from 'react-native';
import { Colors } from '../constants/Colors';

export const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(4, 12, 24, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: Colors.dark,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.25)',
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 18,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
  },
  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  titulo: {
    color: Colors.darkText,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  mensaje: {
    color: Colors.mutedText,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
  },
  botones: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
    alignSelf: 'stretch',
  },
  botonesApilados: {
    flexDirection: 'column-reverse',
  },
  boton: {
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  botonPrincipal: {
    backgroundColor: Colors.primary,
  },
  botonSecundario: {
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: 'rgba(0, 212, 255, 0.08)',
  },
  botonCancelar: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'transparent',
  },
  botonPeligro: {
    backgroundColor: '#ef4444',
  },
  botonTexto: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
});
