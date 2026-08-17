import { useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native'; // <-- Tutaj dodano Platform z 'react-native'
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { colors } from '@/constants/app-theme';
import { supabase } from '@/lib/supabase';
import { refreshPlayerNotifications } from '@/services/matchSyncService';

// ... (ustawienia powiadomień bez zmian)

export default function RootLayout() {
  // ... (reszta kodu bez zmian)

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
      const platformName = Platform.OS; // Pobierane z 'react-native' ('ios' lub 'android')

      if (pushToken && playerId) {
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

  // ... (reszta komponentu)
}