import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = 'app_theme_mode';

export default function AuthLayout() {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<'system' | 'light' | 'dark'>('system');

  const isDark = themeMode === 'system' ? systemColorScheme === 'dark' : themeMode === 'dark';

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
        setThemeMode(savedTheme);
      } else {
        // Domyślnie z urządzenia przy pierwszym uruchomieniu
        setThemeMode('system');
      }
    } catch (e) {
      console.error('Błąd wczytywania motywu w AuthLayout:', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadThemePreference();
    }, [])
  );

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: {
          backgroundColor: isDark ? '#0B1120' : '#F8FAFC',
        },
      }}
    />
  );
}