import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { syncMatchNotifications } from '@/services/notificationService';
import { useAppTheme } from '@/hooks/use-theme';
import { brand, radius, space, type Palette } from '@/constants/app-theme';
import CustomAlert from '@/components/CustomAlert';
import Card from '@/components/ui/Card';
import PressableScale from '@/components/ui/PressableScale';
import PrimaryButton from '@/components/ui/PrimaryButton';

const CURRENT_PLAYER_KEY = 'current_player_id';
const REMEMBER_ME_KEY = 'remember_me_status';

// Logowanie nie korzysta z Supabase Auth — nie ma tu prawdziwej sesji/JWT. "Zalogowanie" to
// zapisanie player.id z RPC verify_login w AsyncStorage; wszystkie kolejne zapytania w apce
// identyfikują gracza właśnie po tym id (patrz src/lib/player.ts: getCurrentPlayer()).
export default function LoginScreen() {
  const router = useRouter();
  const { isDark, c } = useAppTheme();
  const styles = getStyles(c);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  // Nie ma samoobsługowego resetu hasła (brak Supabase Auth, więc brak maila resetującego) —
  // jedyna ścieżka to admin ręcznie ustawiający nowe hasło startowe w bazie.
  const [showForgotHelp, setShowForgotHelp] = useState(false);

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

  const showAlert = (
    title: string,
    message: string,
    type: 'error' | 'success' | 'info' = 'error',
    onCloseCallback?: () => void
  ) => {
    setAlertState({
      visible: true,
      title,
      message,
      type,
      onConfirm: () => {
        setAlertState((prev) => ({ ...prev, visible: false }));
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
      // verify_login robi po stronie bazy to, czego apka nigdy nie powinna: porównuje hasło
      // z zaszyfrowanym (bcrypt/pgcrypto) players.password i sprawdza rolę konta. Zwraca albo
      // dane gracza, albo { error: 'wrong_password' | 'pending' | ... } — nigdy samego hasła.
      const { data, error } = await supabase.rpc('verify_login', {
        p_email: email.trim().toLowerCase(),
        p_password: password,
      });

      if (error || !data || data.error) {
        setLoading(false);
        const errType = data?.error;
        // role_id = 3 ("pending") = konto czeka na akceptację admina — patrz players_role w bazie.
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
          <View style={styles.header}>
            <View style={styles.logoSquare}>
              <Image source={require('@/assets/images/icon.png')} style={styles.logoImage} resizeMode="cover" />
            </View>
            <Text style={styles.title}>ESCO VolleyManager</Text>
            <Text style={styles.subtitle}>Zaloguj się do swojego konta</Text>
          </View>

          <Card c={c} isDark={isDark} style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Adres E-mail</Text>
              <TextInput
                style={styles.input}
                placeholder="twoj@email.com"
                placeholderTextColor={c.ink3}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Hasło</Text>
                <PressableScale onPress={() => setShowForgotHelp((v) => !v)} disableHaptic>
                  <Text style={styles.forgotLink}>Zapomniałeś hasła?</Text>
                </PressableScale>
              </View>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={c.ink3}
                secureTextEntry
                autoCapitalize="none"
                value={password}
                onChangeText={setPassword}
              />
              {showForgotHelp && (
                <View style={styles.forgotBox}>
                  <Text style={styles.forgotBoxText}>
                    Skontaktuj się z administratorem klubu — ustawi Ci nowe hasło startowe, którym się zalogujesz.
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.rememberRow}>
              <Text style={styles.rememberText}>Pozostań zalogowany</Text>
              <Switch
                value={rememberMe}
                onValueChange={setRememberMe}
                trackColor={{ false: c.line, true: brand.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            <PrimaryButton label={loading ? 'Logowanie...' : 'ZALOGUJ SIĘ'} onPress={handleLogin} loading={loading} />
          </Card>

          <View style={styles.registerRow}>
            <Text style={styles.registerText}>Nie masz konta? </Text>
            <PressableScale onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.registerLink}>Zarejestruj się</Text>
            </PressableScale>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const getStyles = (c: Palette) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: c.bg },
    container: { flex: 1 },
    scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 32 },
    header: { alignItems: 'center', marginBottom: 28 },
    logoSquare: {
      width: 34,
      height: 34,
      borderRadius: radius.xs,
      backgroundColor: brand.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
      overflow: 'hidden',
    },
    logoImage: { width: '100%', height: '100%' },
    title: { fontSize: 26, fontWeight: '800', color: c.ink, marginBottom: 8, letterSpacing: 0.3 },
    subtitle: { fontSize: 14.5, color: c.ink2, fontWeight: '500', textAlign: 'center' },
    form: { padding: space.cardPad },
    inputGroup: { marginBottom: 16 },
    label: { fontSize: 13.5, fontWeight: '700', color: c.ink, marginBottom: 7 },
    labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    forgotLink: { fontSize: 12.5, fontWeight: '700', color: c.priInk, marginBottom: 7 },
    forgotBox: {
      marginTop: 10,
      padding: 12,
      borderRadius: radius.md,
      backgroundColor: c.tintB,
    },
    forgotBoxText: { fontSize: 12.5, fontWeight: '600', color: c.ink, lineHeight: 18 },
    input: {
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.md,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 15,
      backgroundColor: c.card2,
      color: c.ink,
    },
    rememberRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, marginTop: 4 },
    rememberText: { fontSize: 14, color: c.ink, fontWeight: '600' },
    registerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 26 },
    registerText: { color: c.ink2, fontSize: 14.5 },
    registerLink: { color: c.priInk, fontSize: 14.5, fontWeight: '800' },
  });
