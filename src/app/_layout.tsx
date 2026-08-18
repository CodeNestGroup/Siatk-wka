import { useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Linking } from 'react-native';
import * as Notifications from 'expo-notifications';
import CustomAlert from '@/components/CustomAlert';

export default function RootLayout() {
  const router = useRouter();
  
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

  useEffect(() => {
    checkLoginState();
    
    const timer = setTimeout(() => {
      requestPermissionsAndBatteryCheck();
    }, 1500);

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
  }, []);

  const requestPermissionsAndBatteryCheck = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      
      if (status === 'granted') {
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'Powiadomienia o meczach',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
          });
          
          // Sprawdzamy, czy alert o baterii był już pokazywany
          const hasShownBatteryAlert = await AsyncStorage.getItem('has_shown_battery_alert');

          if (hasShownBatteryAlert !== 'true') {
            setAlert({
              visible: true,
              title: 'Optymalizacja baterii',
              message: 'Aby powiadomienia o meczach dochodziły na czas, wyłącz oszczędzanie baterii dla tej aplikacji w ustawieniach.',
              type: 'info',
              confirmText: 'Przejdź do ustawień',
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
          message: 'Aby otrzymywać powiadomienia o meczach, musisz zezwolić na nie w ustawieniach systemu.',
          type: 'error',
          confirmText: 'Otwórz ustawienia',
          cancelText: 'Anuluj',
          onConfirm: () => {
            setAlert(prev => ({ ...prev, visible: false }));
            Linking.openSettings();
          },
          onCancel: () => {
            setAlert(prev => ({ ...prev, visible: false }));
          }
        });
      }
    } catch (err) {
      console.error('Błąd uprawnień:', err);
    }
  };

  const checkLoginState = async () => {
    try {
      const playerId = await AsyncStorage.getItem('current_player_id');
      const rememberMe = await AsyncStorage.getItem('remember_me_status');
      router.replace(playerId && rememberMe === 'true' ? '/(tabs)' : '/(auth)');
    } catch (err) {
      console.error('Błąd sesji:', err);
      router.replace('/(auth)');
    }
  };

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>

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
    </>
  );
}