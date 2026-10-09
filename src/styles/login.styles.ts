import { StyleSheet } from 'react-native';
import { Colors } from '../constants/Colors';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 50,
    paddingBottom: 30,
    justifyContent: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  busIcon: {
    fontSize: 28,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.primary,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.mutedText,
    marginTop: 3,
  },
  roleLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.placeholder,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  roleSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  roleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 4,
  },
  roleButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderColor: Colors.primary,
    borderWidth: 1,
  },
  roleIconText: {
    fontSize: 14,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.mutedText,
  },
  roleTextActive: {
    color: Colors.primary,
  },
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.mutedText,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  fieldIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 14,
    color: Colors.darkText,
  },
  eyeButton: {
    padding: 6,
  },
  eyeText: {
    fontSize: 16,
  },
  rememberContainer: {
    marginBottom: 16,
    position: 'relative',
    zIndex: 10,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rememberCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#00d4ff', // Celeste/cyan como en la captura
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#00d4ff',
    borderColor: '#00d4ff',
  },
  rememberLabel: {
    fontSize: 13,
    color: Colors.darkText,
    fontWeight: '500',
  },
  infoButton: {
    padding: 4,
  },
  // Recuadro estilo Steam
  tooltipWrapper: {
    marginTop: 8,
    position: 'relative',
  },
  tooltipArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#cbd5e1',
    marginLeft: 6,
  },
  tooltipBox: {
    backgroundColor: '#cbd5e1', // Fondo gris claro idéntico a Steam
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  tooltipText: {
    fontSize: 12.5,
    lineHeight: 18,
    color: '#1e293b', // Texto oscuro legible de Steam
    fontWeight: '500',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    fontSize: 12,
    color: Colors.link,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#040c18',
    fontSize: 15,
    fontWeight: '700',
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: Colors.placeholder,
    textAlign: 'center',
  },
});
