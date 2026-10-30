import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

// Registra la tarea de GPS en segundo plano al arrancar la app (Android la relanza sin abrir pantallas)
import '../services/gpsTask';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="forgot-password" />
      </Stack>
    </>
  );
}

