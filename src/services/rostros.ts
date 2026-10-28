import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { fetchApi } from './api';

/**
 * Abre la cámara (o la galería) y devuelve la foto en JPEG base64, reducida a 800 px de ancho:
 * Rekognition acepta hasta 5 MB y una foto completa del celular suele pasarse.
 */
export const tomarFotoBase64 = async (origen: 'camara' | 'galeria' = 'camara'): Promise<string | null> => {
  const permiso =
    origen === 'camara'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permiso.granted) throw new Error('Se necesita permiso para usar la cámara o las fotos.');

  const opciones: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 };
  const r =
    origen === 'camara' ? await ImagePicker.launchCameraAsync(opciones) : await ImagePicker.launchImageLibraryAsync(opciones);
  if (r.canceled) return null;

  const imagen = await ImageManipulator.manipulate(r.assets[0].uri).resize({ width: 800 }).renderAsync();
  const salida = await imagen.saveAsync({ compress: 0.7, format: SaveFormat.JPEG, base64: true });
  return salida.base64 ?? null;
};

// Devuelve { idEstudiante, nombre, similitud } o lanza Error con el mensaje del backend
export const identificarRostro = async (imagenBase64: string) => {
  const res = await fetchApi('/Reconocimiento/identificar', {
    method: 'POST',
    body: JSON.stringify({ imagenBase64 }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.mensaje || 'No se pudo identificar al estudiante.');
  return data as { idEstudiante: number; nombre: string; similitud: number };
};

export const registrarRostro = async (idEstudiante: number, imagenBase64: string) => {
  const res = await fetchApi(`/Reconocimiento/registrar-rostro?idEstudiante=${idEstudiante}`, {
    method: 'POST',
    body: JSON.stringify({ imagenBase64, consentimientoAcudiente: true }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.mensaje || 'No se pudo registrar el rostro.');
};
