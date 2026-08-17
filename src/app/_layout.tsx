import { useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { colors } from '@/constants/app-theme';
import { supabase } from '@/lib/supabase';
import { refreshPlayerNotifications } from '@/services/matchSyncService';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function RootLayout() {
  const [isChecking, setIsChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkLoginState();
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as { screen?: string; matchId?: string };
      if (data?.screen === 'match-detail' && data?.matchId) {
        router.push(`/(match)/${data.matchId}` as any);
      } else if (data?.screen === 'announcements') {
        router.push('/(tabs)/announcements' as any);
      }
    });
    return () => subscription.remove();
  }, []);

  const checkLoginState = async () => {
    try {
      const playerId = await AsyncStorage.getItem('current_player_id');
      const rememberMe = await AsyncStorage.getItem('remember_me_status');

      if (playerId && rememberMe === 'true') {
        await registerAndSavePushToken(playerId);
        await refreshPlayerNotifications(playerId);
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)');
      }
    } catch (err) {
      console.error('Błąd sesji:', err);
      router.replace('/(auth)');
    } finally {
      setIsChecking(false);
    }
  };

  const registerAndSavePushToken = async (playerId: string) => {
    if (!Device.isDevice) return;
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') return;

      const tokenData = await Notifications.getExpoPushTokenAsync();
      const pushToken = tokenData?.data;
      const platformName = Platform.OS; // 'ios' lub 'android'

      if (pushToken && playerId) {
        // Zapis do nowej tabeli player_devices z obsługą wielu urządzeń dla jednego gracza
        const { error } = await supabase
          .from('player_devices')
          .upsert(
            {
              player_id: playerId,
              push_token: pushToken,
              platform: platformName,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'push_token' }
          );

        if (error) {
          console.error('Błąd zapisu tokena do player_devices:', error.message);
        }
      }
    } catch (e) {
      console.error('Błąd tokenu push:', e);
    }
  };

  if (isChecking) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});