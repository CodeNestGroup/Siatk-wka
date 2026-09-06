import { useEffect, useState, useCallback } from 'react';
import { Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Linking } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import CustomAlert from '@/components/CustomAlert';
import { useAppTheme } from '@/hooks/use-theme';

export default function RootLayout() {
  const router = useRouter();
  const { c } = useAppTheme();

  // Stan alertu – scentralizowane zarządzanie komunikatami dla użytkownika z użyciem CustomAlert.tsx
  const [alert, setAlert] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'error' | 'success' | 'info';
    confirmText: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
    confirmText: 'OK',
    onConfirm: () => {},
  });

  // Logika sprawdzania stanu zalogowania (używamy useCallback dla optymalizacji)
  const checkLoginState = useCallback(async () => {
    try {
      const playerId = await AsyncStorage.getItem('current_player_id');
      const rememberMe = await AsyncStorage.getItem('remember_me_status');
      router.replace(playerId && rememberMe === 'true' ? '/(tabs)' : '/(auth)');
    } catch (err) {
      console.error('Błąd sesji:', err);
      router.replace('/(auth)');
    }
  }, [router]);

  // Logika uprawnień i optymalizacji baterii (Android specific) z użyciem palety INK/COBALT/CORAL
  const requestPermissionsAndBatteryCheck = useCallback(async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      
      if (status === 'granted') {
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'Powiadomienia o meczach',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
          });
          
          const hasShownBatteryAlert = await AsyncStorage.getItem('has_shown_battery_alert');

          if (hasShownBatteryAlert !== 'true') {
            setAlert({
              visible: true,
              title: 'Optymalizacja baterii',
              message: 'Aby powiadomienia dochodziły na czas, wyłącz oszczędzanie energii dla tej aplikacji.',
              type: 'info',
              confirmText: 'Ustawienia',
              cancelText: 'Później',
              onConfirm: async () => {
                await AsyncStorage.setItem('has_shown_battery_alert', 'true');
                setAlert(prev => ({ ...prev, visible: false }));
                Linking.openSettings();
              },
              onCancel: async () => {
                await AsyncStorage.setItem('has_shown_battery_alert', 'true');
                setAlert(prev => ({ ...prev, visible: false }));
              }
            });
          }
        }
      } else {
        setAlert({
          visible: true,
          title: 'Brak uprawnień',
          message: 'Włącz powiadomienia w ustawieniach, aby otrzymywać informacje o meczach.',
          type: 'error',
          confirmText: 'Ustawienia',
          cancelText: 'Anuluj',
          onConfirm: () => {
            setAlert(prev => ({ ...prev, visible: false }));
            Linking.openSettings();
          },
          onCancel: () => setAlert(prev => ({ ...prev, visible: false }))
        });
      }
    } catch (err) {
      console.error('Błąd uprawnień:', err);
    }
  }, []);

  useEffect(() => {
    checkLoginState();
    
    // Opóźnienie startowe dla lepszego UX przy starcie aplikacji
    const timer = setTimeout(() => {
      requestPermissionsAndBatteryCheck();
    }, 1500);

    // Nasłuchiwanie kliknięć w powiadomienia
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as { screen?: string; matchId?: string };
      if (data?.screen === 'match-detail' && data?.matchId) {
        router.replace(`/(match)/${data.matchId}` as any);
      }
    });

    return () => {
      subscription.remove();
      clearTimeout(timer);
    };
  }, [checkLoginState, requestPermissionsAndBatteryCheck, router]);

  return (
    // SafeAreaProvider musi być na samej górze drzewa — bez niego useSafeAreaInsets()/SafeAreaView
    // działają na nieaktualnych/domyślnych wartościach zamiast rzeczywistych wcięć urządzenia,
    // co na części telefonów (Android edge-to-edge domyślnie włączone od SDK 53) objawiało się
    // dolnym paskiem zakładek zasłoniętym przez systemowy pasek nawigacji/gesty.
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        {/* Stack ukrywa domyślny header, co pozwala na pełną kontrolę wyglądu zależną od motywu */}
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: c.bg },
          }}
        >
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="(match)"
            options={{ animation: 'slide_from_right', gestureEnabled: true, gestureDirection: 'horizontal' }}
          />
          <Stack.Screen
            name="(announcement)"
            options={{ animation: 'slide_from_right', gestureEnabled: true, gestureDirection: 'horizontal' }}
          />
        </Stack>

        {/* Globalny komponent CustomAlert widoczny nad całą aplikacją */}
        <CustomAlert
          visible={alert.visible}
          title={alert.title}
          message={alert.message}
          type={alert.type}
          confirmText={alert.confirmText}
          cancelText={alert.cancelText}
          onClose={alert.onConfirm}
          onCancel={alert.onCancel}
        />
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}