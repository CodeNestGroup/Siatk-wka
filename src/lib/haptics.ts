import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

// Cienka warstwa nad expo-haptics: każde wywołanie jest "fire and forget" i nigdy nie
// wyrzuca wyjątku — wibracje to czysty bonus UX, więc awaria (np. tryb oszczędzania baterii,
// brak silniczka na tablecie/webie) nie może przerwać żadnej akcji w aplikacji.
function safeHaptic(run: () => Promise<void>) {
  if (Platform.OS === 'web') return;
  run().catch(() => {});
}

/** Lekkie stuknięcie — używane przy każdym dotknięciu przycisku/kafelka (PressableScale). */
export function tapHaptic() {
  safeHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

/** Wyraźniejszy sygnał sukcesu — po zapisaniu się / wypisaniu się z meczu. */
export function successHaptic() {
  safeHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}
