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
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, radius, shadow } from '@/constants/app-theme';
import { supabase } from '@/lib/supabase';
import { syncMatchNotifications } from '@/services/notificationService';

const CURRENT_PLAYER_KEY = 'current_player_id';
const REMEMBER_ME_KEY = 'remember_me_status';

type CustomAlertProps = {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
};

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

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertCallback, setAlertCallback] = useState<(() => void) | null>(null);

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

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      showAlert('Błąd', 'Wypełnij pole e-mail oraz hasło.');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('email', email.trim().toLowerCase())
        .eq('password', password)
        .single();

      if (error || !data) {
        setLoading(false);
        showAlert('Błąd logowania', 'Nieprawidłowy e-mail lub hasło.');
        return;
      }

      if (data.role_id === 3) {
        setLoading(false);
        showAlert(
          'Konto oczekuje na zatwierdzenie',
          'Twoje konto nie zostało jeszcze zatwierdzone przez administratora. Spróbuj ponownie później.'
        );
        return;
      }

      await AsyncStorage.setItem(CURRENT_PLAYER_KEY, data.id);
      await AsyncStorage.setItem(REMEMBER_ME_KEY, rememberMe ? 'true' : 'false');
      await AsyncStorage.setItem('current_player_data', JSON.stringify(data));

      // Pobieramy mecze i rejestracje, aby zsynchronizować powiadomienia lokalne przy starcie
      const { data: matchesData } = await supabase.from('matches').select('*');
      const { data: regsData } = await supabase
        .from('match_registrations')
        .select('match_id, player_id')
        .eq('player_id', data.id);

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
          <View style={styles.header}>
            <View style={styles.logoCircle}>
              <Text style={styles.logo}>🏐</Text>
            </View>
            <Text style={styles.title}>Siatkówka App</Text>
            <Text style={styles.subtitle}>Zaloguj się do swojego konta</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="twoj@email.com"
                placeholderTextColor={colors.mutedForeground}
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
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry
                autoCapitalize="none"
                value={password}
                onChangeText={setPassword}
              />
            </View>

            <View style={styles.rememberRow}>
              <Text style={styles.rememberText}>Pozostań zalogowany</Text>
              <Switch
                value={rememberMe}
                onValueChange={setRememberMe}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={Platform.OS === 'ios' ? '#fff' : colors.primaryForeground}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Logowanie...' : 'Zaloguj się'}
              </Text>
            </TouchableOpacity>
          </View>

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

const alertStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  alertBox: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: 24,
    alignItems: 'center',
    overflow: 'hidden',
    ...shadow.card,
  },
  indicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  button: {
    width: '100%',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radius.lg,
    alignItems: 'center',
    ...shadow.button,
  },
  buttonText: {
    color: colors.primaryForeground,
    fontSize: 15,
    fontWeight: '700',
  },
});

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 32 },
  header: { alignItems: 'center', marginBottom: 32 },
  logoCircle: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', marginBottom: 16, ...shadow.card },
  logo: { fontSize: 44 },
  title: { fontSize: 26, fontWeight: '700', color: colors.foreground, marginBottom: 6 },
  subtitle: { fontSize: 14, color: colors.mutedForeground, fontWeight: '500', textAlign: 'center' },
  form: { backgroundColor: colors.card, borderRadius: radius['2xl'], padding: 24, ...shadow.card },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: colors.foreground, marginBottom: 8 },
  input: { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, backgroundColor: colors.muted, color: colors.foreground },
  rememberRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, marginTop: 4 },
  rememberText: { fontSize: 14, color: colors.foreground, fontWeight: '500' },
  button: { backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: 16, alignItems: 'center', marginTop: 12, ...shadow.button },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: colors.primaryForeground, fontSize: 16, fontWeight: '700' },
  registerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  registerText: { color: colors.mutedForeground, fontSize: 14 },
  registerLink: { color: colors.primary, fontSize: 14, fontWeight: '700' },
});