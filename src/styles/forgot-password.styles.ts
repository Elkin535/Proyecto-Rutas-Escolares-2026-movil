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
    paddingTop: 40,
    paddingBottom: 30,
    justifyContent: 'center',
  },
  topNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    gap: 6,
  },
  backButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 212, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.darkText,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: Colors.mutedText,
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
  },

  /* Indicador de pasos */
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  stepItem: {
    alignItems: 'center',
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  stepDotCompleted: {
    backgroundColor: 'rgba(0, 212, 255, 0.2)',
    borderColor: Colors.primary,
  },
  stepDotText: {
    color: Colors.mutedText,
    fontSize: 12,
    fontWeight: '700',
  },
  stepDotTextActive: {
    color: Colors.dark,
    fontWeight: '800',
  },
  stepDotTextCompleted: {
    color: Colors.primary,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: Colors.primary,
  },

  /* Tarjeta */
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.darkText,
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 13,
    color: Colors.mutedText,
    marginBottom: 20,
    lineHeight: 18,
  },

  /* Inputs */
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.mutedText,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  inputFocused: {
    borderColor: Colors.primary,
  },
  inputIcon: {
    marginRight: 10,
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

  /* Input del Código de 8 dígitos */
  codeInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  codeInput: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.primary,
    textAlign: 'center',
    letterSpacing: 8,
    width: '100%',
  },
  codeCounter: {
    textAlign: 'right',
    fontSize: 11,
    color: Colors.mutedText,
    marginBottom: 14,
  },

  /* Banner de simulación en frontend */
  demoCodeBanner: {
    backgroundColor: 'rgba(0, 212, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.25)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  demoCodeContent: {
    flex: 1,
    marginRight: 8,
  },
  demoCodeTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'uppercase',
  },
  demoCodeValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 2,
    marginTop: 2,
  },
  demoCodeBadge: {
    backgroundColor: 'rgba(0, 212, 255, 0.2)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  demoCodeBadgeText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },

  /* Email Badge para el paso 2 */
  emailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    gap: 8,
  },
  emailBadgeText: {
    flex: 1,
    color: Colors.darkText,
    fontSize: 13,
    fontWeight: '600',
  },
  changeEmailText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },

  /* Temporizador ABAJITO */
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginBottom: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 8,
  },
  timerTextRunning: {
    fontSize: 13,
    color: Colors.mutedText,
    fontWeight: '500',
  },
  timerCountText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '700',
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  resendButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },

  /* Reglas de contraseña */
  passwordRules: {
    marginBottom: 16,
    padding: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 2,
  },
  ruleText: {
    fontSize: 12,
    color: Colors.mutedText,
  },
  ruleTextValid: {
    color: '#4ade80',
  },

  /* Botones principales */
  submitButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#040c18',
    fontSize: 15,
    fontWeight: '700',
  },

  /* Footer */
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: Colors.placeholder,
    textAlign: 'center',
  },

  /* Modal de Éxito */
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(4, 12, 24, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successCard: {
    width: '100%',
    backgroundColor: Colors.dark,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  successIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    borderWidth: 2,
    borderColor: '#4ade80',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.darkText,
    marginBottom: 8,
    textAlign: 'center',
  },
  successDescription: {
    fontSize: 13,
    color: Colors.mutedText,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 18,
  },
});
