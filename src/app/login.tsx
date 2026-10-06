import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Colors } from '../constants/Colors';
import { fetchApi, saveAuthData } from '../services/api';
import { styles } from '../styles/login.styles';

type UserRole = 'acudiente' | 'conductor' | 'admin';

export default function LoginScreen() {
  const router = useRouter();
  const [role, setRole] = useState<UserRole>('acudiente');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Campos requeridos', 'Por favor ingresa tu correo y contraseña.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetchApi('/Usuario/login', {
        method: 'POST',
        body: JSON.stringify({
          correo: email.trim(),
          contrasena: password
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        Alert.alert('Error', errorData.mensaje || 'Correo o contraseña incorrectos');
        return;
      }

      const data = await response.json();

      // Guardamos el JWT y los datos del usuario usando nuestra nueva función
      const jwtToken = data.token || data.Token;
      if (jwtToken && jwtToken !== 'undefined' && jwtToken !== 'null') {
        await saveAuthData(jwtToken, data);
      }

      const roleLower = (data.nombreRol || '').toLowerCase();

      // Redirección al igual que en la web
      if (roleLower.includes('admin') || roleLower.includes('administrador')) {
        router.replace('/admin');
      } else if (roleLower.includes('cond') || roleLower.includes('chofer')) {
        router.replace('/conductor');
      } else {
        router.replace('/acudiente');
      }

    } catch (error) {
      console.error(error);
      Alert.alert('Error de conexión', 'No se pudo conectar al servidor. Inténtalo más tarde.');
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

        {/* Selector de Rol */}
        <Text style={styles.roleLabel}>Selecciona tu perfil:</Text>
        <View style={styles.roleSelector}>
          {(['acudiente', 'conductor', 'admin'] as UserRole[]).map((item) => (
            <TouchableOpacity
              key={item}
              style={[styles.roleButton, role === item && styles.roleButtonActive]}
              onPress={() => setRole(item)}
              activeOpacity={0.8}
            >
              <Text style={styles.roleIconText}>
                {item === 'acudiente' ? '👨‍👩‍👦' : item === 'conductor' ? '🚐' : '🛡️'}
              </Text>
              <Text style={[styles.roleText, role === item && styles.roleTextActive]}>
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tarjeta del Formulario */}
        <View style={styles.card}>
          <Text style={styles.inputLabel}>Correo Institucional</Text>
          <View style={styles.inputWrapper}>
            <Text style={styles.fieldIcon}></Text>
            <TextInput
              style={styles.input}
              placeholder="usuario@colegio.edu.co"
              placeholderTextColor={Colors.placeholder}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <Text style={styles.inputLabel}>Contraseña</Text>
          <View style={styles.inputWrapper}>
            <Text style={styles.fieldIcon}></Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={Colors.placeholder}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
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
              <Text style={styles.loginButtonText}>Iniciar sesion</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Acceso seguro y protegido para la comunidad escolar
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
