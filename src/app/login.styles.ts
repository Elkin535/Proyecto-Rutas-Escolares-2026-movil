
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
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    elevation: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  busIcon: {
    fontSize: 42,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.dark,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.mutedText,
    marginTop: 3,
  },
  roleLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  roleSelector: {
    flexDirection: 'row',
    backgroundColor: Colors.border,
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
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
    backgroundColor: Colors.dark,
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
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    padding: 22,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.darkText,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
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
    color: Colors.dark,
  },
  eyeButton: {
    padding: 6,
  },
  eyeText: {
    fontSize: 16,
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
    elevation: 2,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: Colors.dark,
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
