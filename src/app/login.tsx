import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Colors } from '../constants/Colors';
import { fetchApi, getRoleRoute, saveAuthData } from '../services/api';
import { styles } from '../styles/login.styles';

type ErrorField = 'email' | 'password' | 'both' | null;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// El driver nativo de animaciones no existe en web
const useNativeDriver = Platform.OS !== 'web';

// Credenciales demo para pruebas rápidas
const DEMO_USERS: Record<string, { contrasena: string; data: any }> = {
  'acudiente@colegio.edu.co': {
    contrasena: '12345678',
    data: {
      token: 'jwt-demo-token-acudiente',
      nombre: 'María Gómez',
      correo: 'acudiente@colegio.edu.co',
      nombreRol: 'Acudiente',
    },
  },
  'conductor@colegio.edu.co': {
    contrasena: '12345678',
    data: {
      token: 'jwt-demo-token-conductor',
      nombre: 'Roberto Rodríguez',
      correo: 'conductor@colegio.edu.co',
      nombreRol: 'Conductor',
    },
  },
  'admin@colegio.edu.co': {
    contrasena: '12345678',
    data: {
      token: 'jwt-demo-token-admin',
      nombre: 'Laura Martínez',
      correo: 'admin@colegio.edu.co',
      nombreRol: 'Administrador',
    },
  },
};

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberSession, setRememberSession] = useState(true);
  const [showTooltip, setShowTooltip] = useState(false);
  const [loading, setLoading] = useState(false);
  const tooltipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [error, setError] = useState<{ title: string; message: string; field: ErrorField } | null>(null);
  const errorAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Alert.alert no se muestra en web, por eso el error va dentro de la tarjeta
  const showError = (title: string, message: string, field: ErrorField = null) => {
    setError({ title, message, field });
    errorAnim.setValue(0);
    shakeAnim.setValue(0);
    Animated.parallel([
      Animated.spring(errorAnim, { toValue: 1, friction: 7, tension: 80, useNativeDriver }),
      Animated.sequence(
        [10, -10, 7, -7, 3, 0].map((toValue) =>
          Animated.timing(shakeAnim, { toValue, duration: 55, useNativeDriver })
        )
      ),
    ]).start();
  };

  const hideError = () => {
    if (!error) return;
    Animated.timing(errorAnim, { toValue: 0, duration: 180, useNativeDriver }).start(() => setError(null));
  };

  const onChangeEmail = (text: string) => {
    setEmail(text);
    hideError();
  };

  const onChangePassword = (text: string) => {
    setPassword(text);
    hideError();
  };

  const emailHasError = error?.field === 'email' || error?.field === 'both';
  const passwordHasError = error?.field === 'password' || error?.field === 'both';

  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
    };
  }, []);

  const handleToggleRemember = () => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }

    const nextVal = !rememberSession;
    setRememberSession(nextVal);

    if (nextVal) {
      // Aparece al seleccionar el cuadro, dura 2 segundos y se quita solo
      setShowTooltip(true);
      tooltipTimeoutRef.current = setTimeout(() => {
        setShowTooltip(false);
      }, 2000);
    } else {
      setShowTooltip(false);
    }
  };

  const handleLogin = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      const field: ErrorField = !trimmedEmail && !trimmedPassword ? 'both' : !trimmedEmail ? 'email' : 'password';
      showError('Campos requeridos', 'Por favor ingresa tu correo y contraseña.', field);
      return;
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      showError('Correo inválido', 'Escribe un correo válido, por ejemplo usuario@colegio.edu.co', 'email');
      return;
    }

    setLoading(true);

    try {
      // 1. Verificación de cuentas demo de desarrollo
      const demoAccount = DEMO_USERS[trimmedEmail.toLowerCase()];
      if (demoAccount && demoAccount.contrasena === trimmedPassword) {
        await saveAuthData(demoAccount.data.token, demoAccount.data, rememberSession);
        router.replace(getRoleRoute(demoAccount.data.nombreRol));
        return;
      }

      // 2. Conexión con el backend en AWS EC2
      const response = await fetchApi('/Usuario/login', {
        method: 'POST',
        body: JSON.stringify({
          correo: trimmedEmail,
          contrasena: trimmedPassword,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401) {
          showError(
            'Credenciales incorrectas',
            'El correo no está registrado o la contraseña es incorrecta. Verifica e inténtalo de nuevo.',
            'both'
          );
        } else if (response.status === 400) {
          showError('Datos inválidos', 'Revisa que el correo y la contraseña estén bien escritos.', 'both');
        } else {
          showError('Error del servidor', errorData.mensaje || 'Ocurrió un problema. Inténtalo más tarde.');
        }
        return;
      }

      const data = await response.json();

      // Guardamos el JWT y los datos del usuario usando almacenamiento persistente
      const jwtToken = data.token || data.Token;
      if (jwtToken && jwtToken !== 'undefined' && jwtToken !== 'null') {
        await saveAuthData(jwtToken, data, rememberSession);
      }

      // Redirección centralizada por rol
      const rol = data.nombreRol || data.rol || data.Rol;
      router.replace(getRoleRoute(rol));

    } catch (error) {
      console.error(error);
      showError(
        'Sin conexión',
        'No se pudo conectar al servidor. Revisa tu internet o utiliza las credenciales demo para pruebas.'
      );
    } finally {
      setLoading(false);
    }
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
        {/* Cabecera */}
        <View style={styles.headerContainer}>
          <View style={styles.iconCircle}>
            <Text style={styles.busIcon}>🚌</Text>
          </View>
          <Text style={styles.title}>SchoolTrack</Text>
          <Text style={styles.subtitle}>Rutas y Transporte Escolar</Text>
        </View>

        {/* Tarjeta del Formulario */}
        <Animated.View style={[styles.card, { transform: [{ translateX: shakeAnim }] }]}>
          {error && (
            <Animated.View
              accessibilityRole="alert"
              style={[
                styles.errorBanner,
                {
                  opacity: errorAnim,
                  transform: [
                    { translateY: errorAnim.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) },
                    { scale: errorAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) },
                  ],
                },
              ]}
            >
              <View style={styles.errorIconCircle}>
                <Ionicons name="alert-circle" size={22} color={Colors.error} />
              </View>
              <View style={styles.errorTextContainer}>
                <Text style={styles.errorTitle}>{error.title}</Text>
                <Text style={styles.errorMessage}>{error.message}</Text>
              </View>
              <TouchableOpacity onPress={hideError} hitSlop={10} accessibilityLabel="Cerrar mensaje">
                <Ionicons name="close" size={18} color={Colors.mutedText} />
              </TouchableOpacity>
            </Animated.View>
          )}

          <Text style={styles.inputLabel}>Correo Institucional</Text>
          <View style={[styles.inputWrapper, emailHasError && styles.inputWrapperError]}>
            <Text style={styles.fieldIcon}></Text>
            <TextInput
              style={styles.input}
              placeholder="usuario@colegio.edu.co"
              placeholderTextColor={Colors.placeholder}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={onChangeEmail}
            />
          </View>

          <Text style={styles.inputLabel}>Contraseña</Text>
          <View style={[styles.inputWrapper, passwordHasError && styles.inputWrapperError]}>
            <Text style={styles.fieldIcon}></Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={Colors.placeholder}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={onChangePassword}
            />

            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeButton}
            >
              <Ionicons
                name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color={Colors.placeholder || '#888'}
              />
            </TouchableOpacity>
          </View>

          {/* Guardar inicio de sesión */}
          <View style={styles.rememberContainer}>
            <TouchableOpacity
              style={styles.rememberCheckboxRow}
              activeOpacity={0.7}
              onPress={handleToggleRemember}
            >
              <View style={[styles.checkbox, rememberSession && styles.checkboxChecked]}>
                {rememberSession && (
                  <Ionicons name="checkmark" size={15} color="#040c18" />
                )}
              </View>
              <Text style={styles.rememberLabel}>Guardar inicio de sesión</Text>
            </TouchableOpacity>

            {/* Recuadro que aparece únicamente al seleccionar el cuadro y dura 2 segundos */}
            {showTooltip && (
              <View style={styles.tooltipWrapper}>
                <View style={styles.tooltipArrow} />
                <View style={styles.tooltipBox}>
                  <Text style={styles.tooltipText}>
                    La próxima vez que abras SchoolTrack no necesitarás escribir tu contraseña ni confirmar el inicio de sesión.
                  </Text>
                </View>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.forgotPassword}
            onPress={() => router.push('/forgot-password')}
          >
            <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={Colors.dark} />
            ) : (
              <Text style={styles.loginButtonText}>Iniciar sesión</Text>
            )}
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Acceso seguro y protegido para la comunidad escolar
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
