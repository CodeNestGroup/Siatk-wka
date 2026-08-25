import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  Image,
  useColorScheme,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { syncMatchNotifications } from '@/services/notificationService';
import CustomAlert from '@/components/CustomAlert';

const CURRENT_PLAYER_KEY = 'current_player_id';
const REMEMBER_ME_KEY = 'remember_me_status';
const THEME_STORAGE_KEY = 'app_theme_mode';

export default function LoginScreen() {
  const router = useRouter();
  const systemColorScheme = useColorScheme();

  const [themeMode, setThemeMode] = useState<'system' | 'light' | 'dark'>('system');
  const isDark = themeMode === 'system' ? systemColorScheme === 'dark' : themeMode === 'dark';
  const styles = getStyles(isDark);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  const [alertState, setAlertState] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'error' | 'success' | 'info';
    onConfirm: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: () => {},
  });

  // Wczytywanie motywu: domyślnie system, a jeśli użytkownik zmienił w aplikacji, to preferencja z AsyncStorage
  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
        setThemeMode(savedTheme);
      } else {
        // Pierwsze odpalenie / brak zapisu - wymuś domyślnie z urządzenia
        setThemeMode('system');
      }
    } catch (e) {
      console.error('Błąd wczytywania motywu na ekranie logowania:', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadThemePreference();
    }, [])
  );

  const showAlert = (title: string, message: string, type: 'error' | 'success' | 'info' = 'error', onCloseCallback?: () => void) => {
    setAlertState({
      visible: true,
      title,
      message,
      type,
      onConfirm: () => {
        setAlertState(prev => ({ ...prev, visible: false }));
        if (onCloseCallback) onCloseCallback();
      },
    });
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      showAlert('Błąd', 'Wypełnij pole e-mail oraz hasło.', 'error');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.rpc('verify_login', {
        p_email: email.trim().toLowerCase(),
        p_password: password,
      });

      if (error || !data || data.error) {
        setLoading(false);
        const errType = data?.error;
        if (errType === 'pending') {
          showAlert(
            'Konto oczekuje na zatwierdzenie',
            'Twoje konto nie zostało jeszcze zatwierdzone przez administratora. Spróbuj ponownie później.',
            'info'
          );
        } else {
          showAlert('Błąd logowania', 'Nieprawidłowy e-mail lub hasło.', 'error');
        }
        return;
      }

      const player = data;

      await AsyncStorage.setItem(CURRENT_PLAYER_KEY, player.id);
      await AsyncStorage.setItem(REMEMBER_ME_KEY, rememberMe ? 'true' : 'false');
      await AsyncStorage.setItem('current_player_data', JSON.stringify(player));

      const { data: matchesData } = await supabase.from('matches').select('*');
      const { data: regsData } = await supabase
        .from('match_registrations')
        .select('match_id, player_id')
        .eq('player_id', player.id);

      if (matchesData) {
        const registeredMatchIds = new Set((regsData || []).map((r) => r.match_id));
        const formattedMatches = matchesData.map((m) => ({
          id: m.id,
          title: m.title,
          date: m.date,
          time_start: m.time_start,
          location: m.location,
          status_id: m.status_id,
          isRegistered: registeredMatchIds.has(m.id),
        }));
        await syncMatchNotifications(formattedMatches);
      }

      setLoading(false);
      router.replace('/(tabs)');
    } catch (err) {
      setLoading(false);
      showAlert('Błąd', 'Wystąpił nieoczekiwany błąd podczas logowania.', 'error');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
      <CustomAlert
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        confirmText="OK"
        onClose={alertState.onConfirm}
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Nagłówek aplikacji */}
          <View style={styles.header}>
            <View style={styles.logoCircle}>
              <Image source={require('@/assets/images/icon.png')} style={styles.logoImage} resizeMode="cover"/>
            </View>
            <Text style={styles.title}>ESCO VolleyManager</Text>
            <Text style={styles.subtitle}>Zaloguj się do swojego konta</Text>
          </View>

          {/* Formularz logowania */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Adres E-mail</Text>
              <TextInput
                style={styles.input}
                placeholder="twoj@email.com"
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Hasło</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                secureTextEntry
                autoCapitalize="none"
                value={password}
                onChangeText={setPassword}
              />
            </View>

            {/* Przełącznik zapamiętywania sesji */}
            <View style={styles.rememberRow}>
              <Text style={styles.rememberText}>Pozostań zalogowany</Text>
              <Switch
                value={rememberMe}
                onValueChange={setRememberMe}
                trackColor={{ false: isDark ? '#334155' : '#CBD5E1', true: '#2C4BFF' }}
                thumbColor={Platform.OS === 'ios' ? '#fff' : (rememberMe ? '#2C4BFF' : '#f4f3f4')}
              />
            </View>

            {/* Główny przycisk akcji */}
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Logowanie...' : 'ZALOGUJ SIĘ'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Przejście do rejestracji */}
          <View style={styles.registerRow}>
            <Text style={styles.registerText}>Nie masz konta? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.registerLink}>Zarejestruj się</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const getStyles = (isDark: boolean) =>
  StyleSheet.create({
    safeArea: { 
      flex: 1, 
      backgroundColor: isDark ? '#0B1120' : '#F8FAFC' 
    },
    container: { 
      flex: 1 
    },
    scrollContent: { 
      flexGrow: 1, 
      justifyContent: 'center', 
      paddingHorizontal: 24, 
      paddingVertical: 32 
    },
    header: { 
      alignItems: 'center', 
      marginBottom: 28 
    },
    logoCircle: { 
      width: 110, 
      height: 110, 
      borderRadius: 28, 
      backgroundColor: isDark ? '#1E293B' : '#FFFFFF', 
      alignItems: 'center', 
      justifyContent: 'center', 
      marginBottom: 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
      overflow: 'hidden',
      shadowColor: '#2C4BFF',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 16,
      elevation: 8,
    },
    logoImage: {
      width: '100%',
      height: '100%',
    },
    title: { 
      fontSize: 30, 
      fontWeight: '800', 
      color: isDark ? '#FFFFFF' : '#0F172A', 
      marginBottom: 8,
      letterSpacing: 0.5,
    },
    subtitle: { 
      fontSize: 16, 
      color: isDark ? '#94A3B8' : '#64748B', 
      fontWeight: '500', 
      textAlign: 'center' 
    },
    form: { 
      backgroundColor: isDark ? '#1E293B' : '#FFFFFF', 
      borderRadius: 32, 
      padding: 24,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: isDark ? 0.4 : 0.06,
      shadowRadius: 20,
      elevation: 10,
    },
    inputGroup: { 
      marginBottom: 18 
    },
    label: { 
      fontSize: 15, 
      fontWeight: '700', 
      color: isDark ? '#F1F5F9' : '#0F172A', 
      marginBottom: 8 
    },
    input: { 
      borderWidth: 1, 
      borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#CBD5E1', 
      borderRadius: 16, 
      paddingHorizontal: 16, 
      paddingVertical: 14, 
      fontSize: 16, 
      backgroundColor: isDark ? '#0B1120' : '#F8FAFC', 
      color: isDark ? '#FFFFFF' : '#0F172A' 
    },
    rememberRow: { 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      marginBottom: 20, 
      marginTop: 6 
    },
    rememberText: { 
      fontSize: 15, 
      color: isDark ? '#F1F5F9' : '#0F172A', 
      fontWeight: '600' 
    },
    button: { 
      backgroundColor: '#2C4BFF', 
      borderRadius: 16, 
      paddingVertical: 18, 
      alignItems: 'center', 
      marginTop: 8,
      shadowColor: '#2C4BFF',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
      elevation: 6,
    },
    buttonDisabled: { 
      opacity: 0.6 
    },
    buttonText: { 
      color: '#FFFFFF', 
      fontSize: 16, 
      fontWeight: '800',
      letterSpacing: 1,
    },
    registerRow: { 
      flexDirection: 'row', 
      justifyContent: 'center', 
      marginTop: 28 
    },
    registerText: { 
      color: isDark ? '#94A3B8' : '#64748B', 
      fontSize: 16 
    },
    registerLink: { 
      color: '#2C4BFF', 
      fontSize: 16, 
      fontWeight: '800' 
    },
  });