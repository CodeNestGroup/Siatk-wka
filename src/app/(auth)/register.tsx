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
  Image,
  useColorScheme,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import CustomAlert from '@/components/CustomAlert';

const THEME_STORAGE_KEY = 'app_theme_mode';

export default function RegisterScreen() {
  const router = useRouter();
  const systemColorScheme = useColorScheme();

  const [themeMode, setThemeMode] = useState<'system' | 'light' | 'dark'>('system');
  const isDark = themeMode === 'system' ? systemColorScheme === 'dark' : themeMode === 'dark';
  const styles = getStyles(isDark);

  // Stany formularza rejestracji
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Stany dedykowanego okna alertu
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

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
        setThemeMode(savedTheme);
      } else {
        setThemeMode('system');
      }
    } catch (e) {
      console.error('Błąd wczytywania motywu na ekranie rejestracji:', e);
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

  // Stany dla zabezpieczenia Captcha
  const [captchaCode, setCaptchaCode] = useState('');
  const [userCaptchaInput, setUserCaptchaInput] = useState('');
  const [captchaChars, setCaptchaChars] = useState<Array<{char: string, rotate: string, topOffset: number, fontSize: number, color: string}>>([]);
  const [noiseElements, setNoiseElements] = useState<Array<{top: number, left: number, width: number, height: number, rotate: string, backgroundColor: string}>>([]);

  const generateCaptcha = () => {
    const charsPool = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghijkmnpqrstuvwxyz'; 
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += charsPool.charAt(Math.floor(Math.random() * charsPool.length));
    }
    setCaptchaCode(code);
    setUserCaptchaInput('');

    const colorsList = ['#2C4BFF', '#FF5A5F', '#00C48C', '#FFD23F', '#7A5CFF', isDark ? '#ffffff' : '#0F172A'];
    const formattedChars = code.split('').map((char) => ({
      char,
      rotate: `${Math.floor(Math.random() * 50) - 25}deg`,
      topOffset: Math.floor(Math.random() * 12) - 6,
      fontSize: Math.floor(Math.random() * 6) + 22,
      color: colorsList[Math.floor(Math.random() * colorsList.length)],
    }));
    setCaptchaChars(formattedChars);

    const noise = [];
    for (let i = 0; i < 6; i++) {
      noise.push({
        top: Math.floor(Math.random() * 45),
        left: Math.floor(Math.random() * 180),
        width: Math.floor(Math.random() * 90) + 50,
        height: Math.random() > 0.5 ? 2 : 3,
        rotate: `${Math.floor(Math.random() * 120) - 60}deg`,
        backgroundColor: colorsList[Math.floor(Math.random() * colorsList.length)],
      });
    }
    for (let i = 0; i < 10; i++) {
      noise.push({
        top: Math.floor(Math.random() * 50),
        left: Math.floor(Math.random() * 220),
        width: Math.floor(Math.random() * 6) + 4,
        height: Math.floor(Math.random() * 6) + 4,
        rotate: '0deg',
        backgroundColor: isDark ? '#64748b' : '#94A3B8',
      });
    }
    setNoiseElements(noise);
  };

  useEffect(() => {
    generateCaptcha();
  }, [isDark]);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      showAlert('Błąd', 'Wypełnij wszystkie wymagane pola.', 'error');
      return;
    }
    if (!email.includes('@')) {
      showAlert('Błąd', 'Podaj poprawny adres email.', 'error');
      return;
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{6,}$/;
    if (!passwordRegex.test(password)) {
      showAlert(
        'Błąd',
        'Hasło musi mieć co najmniej 6 znaków, zawierać jedną wielką literę, jedną cyfrę oraz jeden znak specjalny.',
        'error'
      );
      return;
    }

    if (password !== confirmPassword) {
      showAlert('Błąd', 'Hasła nie są takie same.', 'error');
      return;
    }

    if (!userCaptchaInput.trim() || userCaptchaInput.trim() !== captchaCode) {
      showAlert('Błąd weryfikacji', 'Wpisany kod jest niepoprawny (uwzględnij wielkość liter). Spróbuj ponownie.', 'error');
      generateCaptcha();
      return;
    }

    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const cleanPhone = phone.trim();

    try {
      const { data: existingUsers, error: checkError } = await supabase
        .from('players')
        .select('id, email, full_name')
        .or(`email.eq.${cleanEmail},full_name.eq.${cleanName}`);

      if (checkError) {
        setLoading(false);
        showAlert('Błąd', 'Nie udało się zweryfikować unikalności danych.', 'error');
        generateCaptcha();
        return;
      }

      if (existingUsers && existingUsers.length > 0) {
        setLoading(false);
        const emailTaken = existingUsers.some((u) => u.email === cleanEmail);
        const nameTaken = existingUsers.some((u) => u.full_name === cleanName);

        if (emailTaken && nameTaken) {
          showAlert('Błąd', 'Ten adres email oraz nazwa są już zajęte.', 'error');
        } else if (emailTaken) {
          showAlert('Błąd', 'Ten adres email jest już zajęty.', 'error');
        } else {
          showAlert('Błąd', 'Ta nazwa użytkownika jest już zajęta.', 'error');
        }
        generateCaptcha();
        return;
      }

      const { data, error: insertError } = await supabase
        .from('players')
        .insert({
          full_name: cleanName,
          email: cleanEmail,
          phone: cleanPhone || null,
          password: password,
        })
        .select()
        .single();

      if (insertError || !data) {
        setLoading(false);
        showAlert('Błąd rejestracji', insertError?.message || 'Nie udało się utworzyć konta.', 'error');
        generateCaptcha();
        return;
      }

      setLoading(false);
      
      showAlert(
        'Rejestracja zakończona sukcesem',
        'Twoje konto zostało utworzone i czeka na zatwierdzenie przez administratora.',
        'success',
        () => router.back()
      );

    } catch (err) {
      setLoading(false);
      showAlert('Błąd', 'Wystąpił nieoczekiwany błąd podczas rejestracji.', 'error');
      generateCaptcha();
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
          {/* Przycisk powrotu */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.backButtonText}>‹ Wstecz</Text>
          </TouchableOpacity>

          {/* Nagłówek ekranu */}
          <View style={styles.header}>
            <View style={styles.logoCircle}>
              <Image 
                source={require('@/assets/images/icon.png')} 
                style={styles.logoImage} 
                resizeMode="cover"
              />
            </View>
            <Text style={styles.title}>Dołącz do gry</Text>
            <Text style={styles.subtitle}>Załóż konto i zapisuj się na mecze</Text>
          </View>

          {/* Formularz rejestracji */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nazwa (Imię i nazwisko)</Text>
              <TextInput
                style={styles.input}
                placeholder="Jan Kowalski"
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                autoCapitalize="words"
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Adres E-mail</Text>
              <TextInput
                style={styles.input}
                placeholder="twoj@email.com"
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Numer telefonu (opcjonalnie)</Text>
              <TextInput
                style={styles.input}
                placeholder="np. 123456789"
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Hasło</Text>
              <TextInput
                style={styles.input}
                placeholder="Min. 6 znaków, duża litera, cyfra, znak"
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Powtórz hasło</Text>
              <TextInput
                style={styles.input}
                placeholder="Powtórz hasło"
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>

            {/* Zabezpieczenie Captcha */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Zabezpieczenie przed botami (przepisz kod)</Text>
              <View style={styles.captchaBoxContainer}>
                <View style={styles.captchaVisualBox}>
                  {noiseElements.map((item, index) => (
                    <View
                      key={index}
                      style={[
                        styles.noiseItem,
                        {
                          top: item.top,
                          left: item.left,
                          width: item.width,
                          height: item.height,
                          backgroundColor: item.backgroundColor,
                          transform: [{ rotate: item.rotate }],
                        },
                      ]}
                    />
                  ))}

                  <View style={styles.charsRow}>
                    {captchaChars.map((item, index) => (
                      <Text
                        key={index}
                        style={[
                          styles.captchaChar,
                          {
                            color: item.color,
                            fontSize: item.fontSize,
                            transform: [
                              { rotate: item.rotate },
                              { translateY: item.topOffset },
                            ],
                          },
                        ]}
                      >
                        {item.char}
                      </Text>
                    ))}
                  </View>
                </View>
                <TouchableOpacity style={styles.refreshButton} onPress={generateCaptcha}>
                  <Text style={styles.refreshButtonText}>🔄 Zmień</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={[styles.input, { marginTop: 10 }]}
                placeholder="Wpisz dokładnie powyższy kod"
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                autoCapitalize="none"
                autoCorrect={false}
                value={userCaptchaInput}
                onChangeText={setUserCaptchaInput}
              />
            </View>

            {/* Główny przycisk rejestracji */}
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Tworzenie konta...' : 'ZAREJESTRUJ SIĘ'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Powrót do logowania */}
          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Masz już konto? </Text>
            <TouchableOpacity
              onPress={() => router.back()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.loginLink}>Zaloguj się</Text>
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
      paddingVertical: 24,
    },
    backButton: {
      alignSelf: 'flex-start',
      paddingVertical: 10,
      paddingHorizontal: 4,
      marginBottom: 12,
    },
    backButtonText: {
      color: '#2C4BFF',
      fontSize: 16,
      fontWeight: '700',
    },
    header: { 
      alignItems: 'center', 
      marginBottom: 28 
    },
    logoCircle: {
      width: 96,
      height: 96,
      borderRadius: 32,
      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
      shadowColor: '#2C4BFF',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 16,
      elevation: 8,
      overflow: 'hidden',
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
      textAlign: 'center',
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
      marginBottom: 8,
    },
    input: {
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#CBD5E1',
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: Platform.OS === 'ios' ? 14 : 12,
      fontSize: 16,
      backgroundColor: isDark ? '#0B1120' : '#F8FAFC',
      color: isDark ? '#FFFFFF' : '#0F172A',
    },
    captchaBoxContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    captchaVisualBox: {
      flex: 1,
      height: 64,
      backgroundColor: isDark ? '#090D16' : '#F1F5F9',
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#CBD5E1',
      overflow: 'hidden',
      position: 'relative',
    },
    charsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2,
    },
    captchaChar: {
      fontWeight: '900',
      marginHorizontal: 4,
    },
    noiseItem: {
      position: 'absolute',
      opacity: 0.6,
      zIndex: 1,
    },
    refreshButton: {
      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
      paddingHorizontal: 14,
      paddingVertical: 14,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#CBD5E1',
      justifyContent: 'center',
      alignItems: 'center',
      height: 64,
    },
    refreshButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: isDark ? '#F1F5F9' : '#0F172A',
    },
    button: {
      backgroundColor: '#2C4BFF',
      borderRadius: 16,
      paddingVertical: 18,
      alignItems: 'center',
      marginTop: 12,
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
    loginRow: { 
      flexDirection: 'row', 
      justifyContent: 'center', 
      marginTop: 28 
    },
    loginText: { 
      color: isDark ? '#94A3B8' : '#64748B', 
      fontSize: 16 
    },
    loginLink: { 
      color: '#2C4BFF', 
      fontSize: 16, 
      fontWeight: '800' 
    },
  });