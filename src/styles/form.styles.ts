import { StyleSheet } from 'react-native';
import { Colors } from '../constants/Colors';
import { RutaColors } from './ruta.styles';

export const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.darker,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: RutaColors.cardBorder,
    padding: 18,
    maxHeight: '92%',
  },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sheetTitle: { color: Colors.darkText, fontSize: 18, fontWeight: '800', flex: 1 },
  field: { marginBottom: 12 },
  label: { color: Colors.darkText, fontSize: 12, fontWeight: '700', marginBottom: 6, letterSpacing: 0.3 },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: RutaColors.cardBorder,
    backgroundColor: RutaColors.card,
    paddingHorizontal: 12,
  },
  inputText: { color: Colors.darkText, fontSize: 15, flexShrink: 1 },
  error: { color: Colors.error, fontSize: 13, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 10, paddingTop: 10 },
  button: { flex: 1, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  buttonCancel: { borderWidth: 1, borderColor: RutaColors.cardBorder },
  buttonCancelText: { color: Colors.mutedText, fontSize: 15, fontWeight: '600' },
  buttonSave: { backgroundColor: Colors.primary },
  buttonSaveText: { color: Colors.darker, fontSize: 15, fontWeight: '800' },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: RutaColors.cardBorder,
  },
  optionText: { color: Colors.darkText, fontSize: 15, flex: 1 },
  emptyOption: { color: Colors.mutedText, textAlign: 'center', paddingVertical: 20 },
});
