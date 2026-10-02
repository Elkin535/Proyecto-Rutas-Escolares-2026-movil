import AsyncStorage from '@react-native-async-storage/async-storage';

// IMPORTANTE: En el móvil no puedes usar localhost, usa la IP de tu PC
// Reemplaza TU_PUERTO por el puerto de tu backend (ej. 5000, 7152)
export const API_URL = 'http://192.168.100.17:TU_PUERTO/api';

/**
 * Función genérica para hacer peticiones al backend con el Token inyectado
 */
export const fetchApi = async (endpoint: string, options: RequestInit = {}) => {
  try {
    const token = await AsyncStorage.getItem('token');
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    return response;
  } catch (error) {
    console.error('Error en fetchApi:', error);
    throw error;
  }
};

/**
 * Función para guardar el token y los datos del usuario tras el login
 */
export const saveAuthData = async (token: string, userData: any) => {
  try {
    await AsyncStorage.setItem('token', token);
    await AsyncStorage.setItem('usuario', JSON.stringify(userData));
  } catch (error) {
    console.error('Error guardando datos de auth:', error);
  }
};

/**
 * Función para limpiar la sesión (logout)
 */
export const clearAuthData = async () => {
  try {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('usuario');
  } catch (error) {
    console.error('Error limpiando datos de auth:', error);
  }
};
