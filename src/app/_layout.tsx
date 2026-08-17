import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { colors } from '@/constants/app-theme';
import { supabase } from '@/lib/supabase';

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
  const router = useRouter();

  useEffect(() => {
    checkLoginState();
    
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as { screen?: string; matchId?: string };
      if (data?.screen === 'match-detail' && data?.matchId) {
        router.push(`/(match)/${data.matchId}` as any);
      }
    });

    return () => subscription.remove();
  }, []);

  const checkLoginState = async () => {
    try {
      const playerId = await AsyncStorage.getItem('current_player_id');
      const rememberMe = await AsyncStorage.getItem('remember_me_status');

      if (playerId && rememberMe === 'true') {
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)');
      }
    } catch (err) {
      console.error('Błąd sesji:', err);
      router.replace('/(auth)');
    }
  };

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}