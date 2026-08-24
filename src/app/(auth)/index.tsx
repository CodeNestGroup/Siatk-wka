import React, { useState } from 'react';
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
  Modal,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { syncMatchNotifications } from '@/services/notificationService';

// Klucze lokalnej sesji użytkownika
const CURRENT_PLAYER_KEY = 'current_player_id';
const REMEMBER_ME_KEY = 'remember_me_status';

type CustomAlertProps = {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
};

// Komponent prostego alertu dostosowany do starszych użytkowników (ogromny czytelny tekst)
function CustomAlert({ visible, title, message, onClose }: CustomAlertProps) {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={alertStyles.overlay}>
        <View style={alertStyles.alertBox}>
          <View style={alertStyles.indicator} />
          <Text style={alertStyles.title}>{title}</Text>
          <Text style={alertStyles.message}>{message}</Text>
          <TouchableOpacity
            style={alertStyles.button}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={alertStyles.buttonText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function LoginScreen() {
  const router = useRouter();

  // Stany formularza logowania
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  // Stany dedykowanego okna alertu
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertCallback, setAlertCallback] = useState<(() => void) | null>(null);

  // Funkcja wywołująca powiadomienie dla użytkownika
  const showAlert = (title: string, message: string, onCloseCallback?: () => void) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertCallback(() => onCloseCallback || null);
    setAlertVisible(true);
  };

  const handleAlertClose = () => {
    setAlertVisible(false);
    if (alertCallback) {
      alertCallback();
      setAlertCallback(null);
    }
  };

  // Główna logika logowania przy użyciu bazy danych (funkcja RPC verify_login)[cite: 1]
  const handleLogin = async () => {
    if (!email.trim() || !password) {
      showAlert('Błąd', 'Wypełnij pole e-mail oraz hasło.');
      return;
    }

    setLoading(true);

    try {
      // Wywołanie bezpiecznej funkcji RPC w bazie danych do weryfikacji hasha bcrypt[cite: 1]
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
            'Twoje konto nie zostało jeszcze zatwierdzone przez administratora. Spróbuj ponownie później.'
          );
        } else {
          showAlert('Błąd logowania', 'Nieprawidłowy e-mail lub hasło.');
        }
        return;
      }

      // Dane użytkownika zwrócone poprawnie przez procedurę RPC[cite: 1]
      const player = data;

      // Zapisanie danych sesji lokalnie
      await AsyncStorage.setItem(CURRENT_PLAYER_KEY, player.id);
      await AsyncStorage.setItem(REMEMBER_ME_KEY, rememberMe ? 'true' : 'false');
      await AsyncStorage.setItem('current_player_data', JSON.stringify(player));

      // Pobieranie meczów w celu synchronizacji powiadomień lokalnych przy starcie
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
      showAlert('Błąd', 'Wystąpił nieoczekiwany błąd podczas logowania.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
      <CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        onClose={handleAlertClose}
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
            <Text style={styles.title}>Siatkówka App</Text>
            <Text style={styles.subtitle}>Zaloguj się do swojego konta</Text>
          </View>

          {/* Formularz logowania */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Adres E-mail</Text>
              <TextInput
                style={styles.input}
                placeholder="twoj@email.com"
                placeholderTextColor="#64748B"
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
                placeholderTextColor="#64748B"
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
                trackColor={{ false: '#334155', true: '#FBBF24' }}
                thumbColor={Platform.OS === 'ios' ? '#fff' : '#0F172A'}
              />
            </View>

            {/* Główny przycisk akcji logowania (Kolor żółty Mikasy) */}
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

// Stylizacja okna dialogowego
const alertStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  alertBox: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#334155',
  },
  indicator: {
    width: 48,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FBBF24',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  button: {
    width: '100%',
    backgroundColor: '#FBBF24',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '800',
  },
});

// Stylizacja ekranu logowania (Motyw Mikasy: Granat + Żółty, duża czytelność)
const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: '#0F172A' // Głęboki grafit/granat tła 
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
    width: 96, 
    height: 96, 
    borderRadius: 48, 
    backgroundColor: '#1E293B', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  title: { 
    fontSize: 30, 
    fontWeight: '800', 
    color: '#FFFFFF', 
    marginBottom: 8 
  },
  subtitle: { 
    fontSize: 16, 
    color: '#94A3B8', 
    fontWeight: '500', 
    textAlign: 'center' 
  },
  form: { 
    backgroundColor: '#1E293B', 
    borderRadius: 24, 
    padding: 24,
    borderWidth: 2,
    borderColor: '#334155'
  },
  inputGroup: { 
    marginBottom: 18 
  },
  label: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#F1F5F9', 
    marginBottom: 8 
  },
  input: { 
    borderWidth: 2, 
    borderColor: '#334155', 
    borderRadius: 16, 
    paddingHorizontal: 16, 
    paddingVertical: 14, 
    fontSize: 18, 
    backgroundColor: '#0F172A', 
    color: '#FFFFFF' 
  },
  rememberRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 20, 
    marginTop: 6 
  },
  rememberText: { 
    fontSize: 16, 
    color: '#F1F5F9', 
    fontWeight: '600' 
  },
  button: { 
    backgroundColor: '#FBBF24', // Żółty kolor piłki Mikasa
    borderRadius: 16, 
    paddingVertical: 18, 
    alignItems: 'center', 
    marginTop: 8,
  },
  buttonDisabled: { 
    opacity: 0.6 
  },
  buttonText: { 
    color: '#0F172A', // Ciemny kontrastowy tekst na żółtym przycisku
    fontSize: 18, 
    fontWeight: '800' 
  },
  registerRow: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    marginTop: 28 
  },
  registerText: { 
    color: '#94A3B8', 
    fontSize: 16 
  },
  registerLink: { 
    color: '#FBBF24', 
    fontSize: 16, 
    fontWeight: '800' 
  },
});