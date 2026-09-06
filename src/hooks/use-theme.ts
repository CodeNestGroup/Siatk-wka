/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { useCallback, useEffect, useState } from 'react';
import { DeviceEventEmitter, useColorScheme as useRNColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/constants/theme';
import { paletteFor, type Palette } from '@/constants/app-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useTheme() {
  const scheme = useColorScheme();
  const theme = scheme === 'unspecified' ? 'light' : scheme;

  return Colors[theme];
}

const THEME_STORAGE_KEY = 'app_theme_mode';
export type ThemeMode = 'system' | 'light' | 'dark';

export type AppTheme = {
  isDark: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  c: Palette;
};

// Jedyne źródło prawdy o motywie aplikacji: AsyncStorage('app_theme_mode') +
// DeviceEventEmitter('themeChanged'), tak żeby każdy ekran reagował natychmiast na zmianę.
export function useAppTheme(): AppTheme {
  const systemColorScheme = useRNColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');

  const loadThemePreference = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setThemeModeState(saved);
      }
    } catch (e) {
      console.error('Błąd wczytywania motywu:', e);
    }
  }, []);

  useEffect(() => {
    loadThemePreference();
    const sub = DeviceEventEmitter.addListener('themeChanged', loadThemePreference);
    return () => sub.remove();
  }, [loadThemePreference]);

  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
      DeviceEventEmitter.emit('themeChanged');
    } catch (e) {
      console.error('Błąd zapisu motywu:', e);
    }
  }, []);

  const isDark = themeMode === 'system' ? systemColorScheme === 'dark' : themeMode === 'dark';

  return { isDark, themeMode, setThemeMode, c: paletteFor(isDark) };
}
