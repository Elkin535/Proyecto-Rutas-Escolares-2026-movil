import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { styles } from '../styles/forgot-password.styles';

type Step = 'email' | 'code' | 'newPassword';

export default function ForgotPasswordScreen() {
  const router = useRouter();

  // Estados del flujo
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Estados de control y temporizador
  const [timer, setTimer] = useState(60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Referencia al temporizador de intervalo
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Función para generar un código numérico aleatorio de 8 dígitos
  const generate8DigitCode = () => {
    const randomCode = Math.floor(10000000 + Math.random() * 90000000).toString();
    return randomCode;
  };

  // Manejo del temporizador de 60 segundos
  useEffect(() => {
    if (isTimerRunning && timer > 0) {
      timerRef.current = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsTimerRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isTimerRunning, timer]);

  // Iniciar cuenta regresiva de 60s
  const startTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setTimer(60);
    setIsTimerRunning(true);
  };

  // PASO 1: Enviar código al correo
  const handleSendCode = () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      Alert.alert('Correo requerido', 'Por favor ingresa tu correo electrónico.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      Alert.alert('Correo inválido', 'Por favor ingresa una dirección de correo válida.');
      return;
    }

    setLoading(true);

    setTimeout(() => {
      const newCode = generate8DigitCode();
      setGeneratedCode(newCode);
      setCode('');
      setLoading(false);
      setStep('code');
      startTimer();

      Alert.alert(
        'Código Enviado',
        `Se ha enviado un código de 8 dígitos al correo ${trimmedEmail}.\n\n(Código de prueba: ${newCode})`,
        [{ text: 'Entendido' }]
      );
    }, 800);
  };

  // Reenviar código (disponible cuando el temporizador llega a 0)
  const handleResendCode = () => {
    if (timer > 0) return;

    setLoading(true);
    setTimeout(() => {
      const newCode = generate8DigitCode();
      setGeneratedCode(newCode);
      setCode('');
      setLoading(false);
      startTimer();

      Alert.alert(
        'Nuevo Código Enviado',
        `Te hemos enviado un nuevo código de 8 dígitos a ${email}.\n\n(Código de prueba: ${newCode})`,
        [{ text: 'Entendido' }]
      );
    }, 600);
  };

  // PASO 2: Confirmar código de 8 dígitos
  const handleVerifyCode = () => {
    const trimmedCode = code.trim();

    if (!trimmedCode) {
      Alert.alert('Código requerido', 'Por favor introduce el código de 8 dígitos.');
      return;
    }

    if (trimmedCode.length !== 8) {
      Alert.alert('Código incompleto', 'El código de recuperación debe tener 8 dígitos.');
      return;
    }

    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      if (trimmedCode === generatedCode) {
        Alert.alert('Código confirmado', '¡El código es correcto! Ahora crea tu nueva contraseña.', [
          {
            text: 'Continuar',
            onPress: () => setStep('newPassword'),
          },
        ]);
      } else {
        Alert.alert(
          'Código Incorrecto',
          'El código de 8 dígitos ingresado no coincide. Revisa el código o solicita uno nuevo.'
        );
      }
    }, 600);
  };

  // PASO 3: Guardar la nueva contraseña
  const handleResetPassword = () => {
    if (!newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert('Campos requeridos', 'Por favor completa ambos campos de contraseña.');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert('Contraseña corta', 'La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Las contraseñas no coinciden', 'Por favor verifica que ambas contraseñas sean idénticas.');
      return;
    }

    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      setShowSuccessModal(true);
    }, 800);
  };

  // Formato MM:SS para el temporizador
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Barra superior de navegación */}
        <View style={styles.topNavigation}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (step === 'newPassword') {
                setStep('code');
              } else if (step === 'code') {
                setStep('email');
              } else {
                router.back();
              }
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={Colors.primary} />
            <Text style={styles.backButtonText}>
              {step === 'email' ? 'Volver al login' : 'Atrás'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Cabecera visual */}
        <View style={styles.headerContainer}>
          <View style={styles.iconCircle}>
            <Ionicons
              name={step === 'email' ? 'mail-unread-outline' : step === 'code' ? 'shield-checkmark-outline' : 'key-outline'}
              size={30}
              color={Colors.primary}
            />
          </View>
          <Text style={styles.title}>SchoolTrack</Text>
          <Text style={styles.subtitle}>Recuperación de Contraseña</Text>
        </View>

        {/* Indicador de pasos visual */}
        <View style={styles.stepperContainer}>
          {/* Paso 1 */}
          <View style={styles.stepItem}>
            <View
              style={[
                styles.stepDot,
                step === 'email' && styles.stepDotActive,
                (step === 'code' || step === 'newPassword') && styles.stepDotCompleted,
              ]}
            >
              {(step === 'code' || step === 'newPassword') ? (
                <Ionicons name="checkmark" size={14} color={Colors.primary} />
              ) : (
                <Text style={[styles.stepDotText, step === 'email' && styles.stepDotTextActive]}>1</Text>
              )}
            </View>
          </View>

          <View
            style={[
              styles.stepLine,
              (step === 'code' || step === 'newPassword') && styles.stepLineActive,
            ]}
          />

          {/* Paso 2 */}
          <View style={styles.stepItem}>
            <View
              style={[
                styles.stepDot,
                step === 'code' && styles.stepDotActive,
                step === 'newPassword' && styles.stepDotCompleted,
              ]}
            >
              {step === 'newPassword' ? (
                <Ionicons name="checkmark" size={14} color={Colors.primary} />
              ) : (
                <Text style={[styles.stepDotText, step === 'code' && styles.stepDotTextActive]}>2</Text>
              )}
            </View>
          </View>

          <View
            style={[
              styles.stepLine,
              step === 'newPassword' && styles.stepLineActive,
            ]}
          />

          {/* Paso 3 */}
          <View style={styles.stepItem}>
            <View
              style={[
                styles.stepDot,
                step === 'newPassword' && styles.stepDotActive,
              ]}
            >
              <Text style={[styles.stepDotText, step === 'newPassword' && styles.stepDotTextActive]}>3</Text>
            </View>
          </View>
        </View>


        {step === 'email' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Solicitar código</Text>
            <Text style={styles.cardDescription}>
              Ingresa tu correo institucional registrado para enviarte un código de recuperación de 8 dígitos.
            </Text>

            <Text style={styles.inputLabel}>Correo Electrónico</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="mail-outline"
                size={18}
                color={Colors.placeholder}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="usuario@colegio.edu.co"
                placeholderTextColor={Colors.placeholder}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
                editable={!loading}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSendCode}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={Colors.dark} />
              ) : (
                <Text style={styles.submitButtonText}>Enviar código</Text>
              )}
            </TouchableOpacity>
          </View>
        )}


        {step === 'code' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Introduce el código</Text>
            <Text style={styles.cardDescription}>
              Ingresa el código de 8 dígitos que enviamos a tu correo institucional.
            </Text>

            {/* Email al que se envió con opción de editar */}
            <View style={styles.emailBadge}>
              <Ionicons name="mail" size={15} color={Colors.primary} />
              <Text style={styles.emailBadgeText} numberOfLines={1}>
                {email}
              </Text>
              <TouchableOpacity onPress={() => setStep('email')}>
                <Text style={styles.changeEmailText}>Cambiar</Text>
              </TouchableOpacity>
            </View>

            {/* Banner de ayuda rápida para frontend demo */}
            {generatedCode ? (
              <TouchableOpacity
                style={styles.demoCodeBanner}
                activeOpacity={0.8}
                onPress={() => setCode(generatedCode)}
              >
                <View style={styles.demoCodeContent}>
                  <Text style={styles.demoCodeTitle}>Código generado (Simulación):</Text>
                  <Text style={styles.demoCodeValue}>{generatedCode}</Text>
                </View>
                <View style={styles.demoCodeBadge}>
                  <Text style={styles.demoCodeBadgeText}>Usar este</Text>
                </View>
              </TouchableOpacity>
            ) : null}

            {/* Cuadro para introducir el código de 8 dígitos */}
            <Text style={styles.inputLabel}>Código de 8 dígitos</Text>
            <View style={styles.codeInputWrapper}>
              <TextInput
                style={styles.codeInput}
                placeholder="••••••••"
                placeholderTextColor={Colors.placeholder}
                keyboardType="number-pad"
                maxLength={8}
                value={code}
                onChangeText={(text) => setCode(text.replace(/[^0-9]/g, ''))}
                editable={!loading}
                autoFocus
              />
            </View>
            <Text style={styles.codeCounter}>
              {code.length}/8 dígitos ingresados
            </Text>


            <View style={styles.timerContainer}>
              <Ionicons
                name="time-outline"
                size={18}
                color={timer > 0 ? Colors.primary : Colors.mutedText}
              />
              {timer > 0 ? (
                <Text style={styles.timerTextRunning}>
                  Podrás solicitar un nuevo código en:{' '}
                  <Text style={styles.timerCountText}>{formatTimer(timer)}</Text>
                </Text>
              ) : (
                <TouchableOpacity
                  style={styles.resendButton}
                  onPress={handleResendCode}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <Ionicons name="refresh" size={16} color={Colors.primary} />
                  <Text style={styles.resendButtonText}>
                    ¿No recibiste el código? Reenviar código
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Botón para verificar código */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                (code.length !== 8 || loading) && styles.submitButtonDisabled,
              ]}
              onPress={handleVerifyCode}
              disabled={code.length !== 8 || loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={Colors.dark} />
              ) : (
                <Text style={styles.submitButtonText}>Confirmar código</Text>
              )}
            </TouchableOpacity>
          </View>
        )}


        {step === 'newPassword' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Cree la nueva contraseña</Text>
            <Text style={styles.cardDescription}>
              Tu identidad ha sido verificada con éxito. Escribe y confirma tu nueva contraseña de acceso.
            </Text>

            {/* Nueva contraseña */}
            <Text style={styles.inputLabel}>Nueva Contraseña</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={Colors.placeholder}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Nueva contraseña (mín. 6 caracteres)"
                placeholderTextColor={Colors.placeholder}
                secureTextEntry={!showNewPassword}
                value={newPassword}
                onChangeText={setNewPassword}
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowNewPassword(!showNewPassword)}
                style={styles.eyeButton}
              >
                <Ionicons
                  name={showNewPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color={Colors.placeholder}
                />
              </TouchableOpacity>
            </View>

            {/* Confirmar nueva contraseña */}
            <Text style={styles.inputLabel}>Confirmar Contraseña</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={Colors.placeholder}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Repite tu nueva contraseña"
                placeholderTextColor={Colors.placeholder}
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeButton}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color={Colors.placeholder}
                />
              </TouchableOpacity>
            </View>

            {/* Requisitos visuales */}
            <View style={styles.passwordRules}>
              <View style={styles.ruleItem}>
                <Ionicons
                  name={newPassword.length >= 8 ? 'checkmark-circle' : 'ellipse-outline'}
                  size={14}
                  color={newPassword.length >= 8 ? '#4ade80' : Colors.placeholder}
                />
                <Text
                  style={[
                    styles.ruleText,
                    newPassword.length >= 8 && styles.ruleTextValid,
                  ]}
                >
                  Mínimo 8 caracteres
                </Text>
              </View>

              <View style={styles.ruleItem}>
                <Ionicons
                  name={
                    newPassword.length > 0 && newPassword === confirmPassword
                      ? 'checkmark-circle'
                      : 'ellipse-outline'
                  }
                  size={14}
                  color={
                    newPassword.length > 0 && newPassword === confirmPassword
                      ? '#4ade80'
                      : Colors.placeholder
                  }
                />
                <Text
                  style={[
                    styles.ruleText,
                    newPassword.length > 0 &&
                    newPassword === confirmPassword &&
                    styles.ruleTextValid,
                  ]}
                >
                  Las contraseñas coinciden
                </Text>
              </View>
            </View>

            {/* Botón para guardar contraseña */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!newPassword || !confirmPassword || loading) && styles.submitButtonDisabled,
              ]}
              onPress={handleResetPassword}
              disabled={!newPassword || !confirmPassword || loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={Colors.dark} />
              ) : (
                <Text style={styles.submitButtonText}>Restablecer contraseña</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Modal de Éxito al completar el restablecimiento */}
        <Modal
          visible={showSuccessModal}
          transparent
          animationType="fade"
          onRequestClose={() => { }}
        >
          <View style={styles.successOverlay}>
            <View style={styles.successCard}>
              <View style={styles.successIconCircle}>
                <Ionicons name="checkmark-done" size={40} color="#4ade80" />
              </View>
              <Text style={styles.successTitle}>¡Contraseña Actualizada!</Text>
              <Text style={styles.successDescription}>
                Tu contraseña ha sido restablecida exitosamente. Ahora puedes ingresar con tu nueva credencial.
              </Text>
              <TouchableOpacity
                style={[styles.submitButton, { width: '100%', marginTop: 0 }]}
                onPress={() => {
                  setShowSuccessModal(false);
                  router.replace('/login');
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.submitButtonText}>Iniciar sesión</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Pie de página */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Acceso seguro y protegido para la comunidad escolar
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
