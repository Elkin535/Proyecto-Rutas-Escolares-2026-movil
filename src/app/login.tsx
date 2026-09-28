// src/app/login.tsx
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
import { styles } from './login.styles';

type UserRole = 'acudiente' | 'conductor' | 'admin';

export default function LoginScreen() {
  const [role, setRole] = useState<UserRole>('acudiente');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Campos requeridos', 'Por favor ingresa tu correo y contraseña.');
      return;
    }

    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      Alert.alert(
        '¡Acceso correcto (Simulado)!',
        `Bienvenido como ${role.toUpperCase()}.\nCorreo: ${email}`
      );
    }, 1200);
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
            <Text style={styles.fieldIcon}>✉️</Text>
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
            <Text style={styles.fieldIcon}>🔒</Text>
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
              <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.forgotPassword}
            onPress={() => Alert.alert('Ayuda', 'Comunícate con la administración.')}
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
              <Text style={styles.loginButtonText}>Ingresar al Sistema</Text>
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
