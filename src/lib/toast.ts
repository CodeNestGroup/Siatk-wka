import { DeviceEventEmitter } from 'react-native';

// Globalne wywoływanie toastów bez Contextu/Providera: dowolny ekran woła showToast(), a każdy
// zamontowany src/components/ui/Toast.tsx (jeden na ekran, żeby móc pozycjonować się względem
// własnego przyklejonego paska akcji) sam decyduje, czy akurat jest widoczny na tyle, żeby pokazać.
export const TOAST_EVENT = 'app-toast';

export type ToastPayload = { id: number; message: string; icon: string };

// Rosnące id wymusza `key={toast.id}` na komponencie toastu przy każdym nowym wywołaniu, więc
// wejściowa animacja (ZoomIn) odpala się od nowa, nawet jeśli treść toastu jest identyczna.
let counter = 0;

export function showToast(message: string, icon: string = 'checkmark-circle') {
  counter += 1;
  DeviceEventEmitter.emit(TOAST_EVENT, { id: counter, message, icon } as ToastPayload);
}
