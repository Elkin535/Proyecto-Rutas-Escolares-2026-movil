import AsyncStorage from '@react-native-async-storage/async-storage';

// Backend desplegado en AWS EC2 (IP pública). Para probar contra tu PC usa http://<IP-de-tu-PC>:5110/api
export const API_URL = 'http://18.220.127.242:5000/api';

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
export const saveAuthData = async (token: string, userData: any, remember: boolean = true) => {
  try {
    await AsyncStorage.setItem('token', token);
    await AsyncStorage.setItem('usuario', JSON.stringify(userData));
    await AsyncStorage.setItem('rememberSession', remember ? 'true' : 'false');
  } catch (error) {
    console.error('Error guardando datos de auth:', error);
  }
};

/**
 * Función para obtener los datos de autenticación guardados
 */
export const getStoredAuthData = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    const usuarioRaw = await AsyncStorage.getItem('usuario');
    const rememberSession = await AsyncStorage.getItem('rememberSession');
    const usuario = usuarioRaw ? JSON.parse(usuarioRaw) : null;
    return {
      token,
      usuario,
      rememberSession: rememberSession === 'true',
    };
  } catch (error) {
    console.error('Error leyendo datos de auth:', error);
    return { token: null, usuario: null, rememberSession: false };
  }
};

/**
 * Función para limpiar la sesión (logout)
 */
export const clearAuthData = async () => {
  try {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('usuario');
    await AsyncStorage.setItem('rememberSession', 'false');
  } catch (error) {
    console.error('Error limpiando datos de auth:', error);
  }
};
