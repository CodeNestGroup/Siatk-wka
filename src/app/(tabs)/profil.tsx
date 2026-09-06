import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Switch,
  ActivityIndicator,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { ensureCalendarPermission } from '@/services/calendarService';
import { tapHaptic } from '@/lib/haptics';
import { useAppTheme, type ThemeMode } from '@/hooks/use-theme';
import { brand, radius, space, type Palette } from '@/constants/app-theme';
import CustomAlert from '@/components/CustomAlert';
import PressableScale from '@/components/ui/PressableScale';
import Card from '@/components/ui/Card';
import Pill from '@/components/ui/Pill';
import Ticket from '@/components/ui/Ticket';
import PrimaryButton from '@/components/ui/PrimaryButton';
import DangerButton from '@/components/ui/DangerButton';
import SegmentButtons from '@/components/ui/SegmentButtons';

type CustomConfirmProps = {
  visible: boolean;
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  c: Palette;
};

function CustomConfirm({
  visible,
  title,
  message,
  onCancel,
  onConfirm,
  confirmText = 'Tak',
  cancelText = 'Anuluj',
  destructive = false,
  c,
}: CustomConfirmProps) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View style={confirmStyles.overlay}>
        <View style={[confirmStyles.alertBox, { backgroundColor: c.card, borderColor: c.line }]}>
          <View style={[confirmStyles.indicator, { backgroundColor: brand.accent }]} />
          <Text style={[confirmStyles.title, { color: c.ink }]}>{title}</Text>
          <Text style={[confirmStyles.message, { color: c.ink2 }]}>{message}</Text>
          <View style={confirmStyles.confirmButtonsRow}>
            <PressableScale
              style={[confirmStyles.confirmButton, { backgroundColor: c.card2, borderColor: c.line }]}
              onPress={onCancel}
            >
              <Text style={[confirmStyles.cancelButtonText, { color: c.ink }]}>{cancelText}</Text>
            </PressableScale>
            <PressableScale
              style={[
                confirmStyles.confirmButton,
                destructive
                  ? { backgroundColor: c.tintR, borderColor: 'rgba(255,90,95,0.35)' }
                  : { backgroundColor: brand.primary, borderColor: brand.primary },
              ]}
              onPress={onConfirm}
            >
              <Text style={destructive ? [confirmStyles.destructiveButtonText, { color: c.redInk }] : confirmStyles.primaryButtonText}>
                {confirmText}
              </Text>
            </PressableScale>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function ProfilScreen() {
  const router = useRouter();
  const { isDark, themeMode, setThemeMode, c } = useAppTheme();
  const styles = useMemo(() => getStyles(c), [c]);

  const [loadingUser, setLoadingUser] = useState(true);
  const [playerId, setPlayerId] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [roleName, setRoleName] = useState('');
  const [playerStatusName, setPlayerStatusName] = useState('');

  const [showSensitiveData, setShowSensitiveData] = useState(false);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const [notifMatchReminders, setNotifMatchReminders] = useState(true);
  const [calendarSyncEnabled, setCalendarSyncEnabled] = useState(false);

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

  const [logoutConfirmVisible, setLogoutConfirmVisible] = useState(false);

  useEffect(() => {
    loadPlayerData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPlayerData = async () => {
    setLoadingUser(true);
    try {
      const storedPlayerId = await AsyncStorage.getItem('current_player_id');

      if (!storedPlayerId) {
        router.replace('/(auth)');
        return;
      }

      setPlayerId(storedPlayerId);

      const { data, error } = await supabase
        .from('players')
        .select(
          `
          *,
          roles:role_id ( name ),
          player_status:player_status_id ( name )
        `
        )
        .eq('id', storedPlayerId)
        .single();

      if (error || !data) {
        showAlert('Błąd', 'Nie udało się pobrać danych profilu.');
        return;
      }

      setFullName(data.full_name ?? '');
      setEmail(data.email ?? '');
      setPhone(data.phone ?? 'Brak numeru');

      const fetchedRole = (data as any).roles?.name || 'user';
      setRoleName(fetchedRole.toUpperCase());

      const fetchedStatus = (data as any).player_status?.name || 'aktywny';
      setPlayerStatusName(fetchedStatus);

      setNotifMatchReminders(data.notif_match_reminders ?? true);
      setCalendarSyncEnabled(data.calendar_sync_enabled ?? false);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingUser(false);
    }
  };

  const toggleMatchReminders = async () => {
    if (!playerId) return;
    tapHaptic();

    const newValue = !notifMatchReminders;
    setNotifMatchReminders(newValue);

    const { error } = await supabase.from('players').update({ notif_match_reminders: newValue }).eq('id', playerId);

    if (error) {
      showAlert('Błąd', 'Nie udało się zapisać ustawienia powiadomień.');
      setNotifMatchReminders(!newValue);
    }
  };

  // Włączenie synchronizacji od razu prosi o uprawnienia do kalendarza — jeśli użytkownik
  // odmówi, przełącznik wraca do stanu wyłączonego zamiast później cicho nic nie robić.
  const toggleCalendarSync = async () => {
    if (!playerId) return;
    tapHaptic();

    const newValue = !calendarSyncEnabled;

    if (newValue) {
      const granted = await ensureCalendarPermission();
      if (!granted) {
        showAlert(
          'Brak uprawnień',
          'Aby dodawać mecze do kalendarza, zezwól aplikacji na dostęp do kalendarza w ustawieniach telefonu.'
        );
        return;
      }
    }

    setCalendarSyncEnabled(newValue);
    const { error } = await supabase.from('players').update({ calendar_sync_enabled: newValue }).eq('id', playerId);

    if (error) {
      showAlert('Błąd', 'Nie udało się zapisać ustawienia kalendarza.');
      setCalendarSyncEnabled(!newValue);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      showAlert('Błąd', 'Wypełnij wszystkie pola dotyczące hasła.');
      return;
    }
    if (newPassword.length < 6) {
      showAlert('Błąd', 'Nowe hasło musi mieć minimum 6 znaków.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showAlert('Błąd', 'Nowe hasła nie są takie same.');
      return;
    }
    if (!playerId) return;

    setChangingPassword(true);

    try {
      // Hasła w players.password są haszowane (bcrypt) triggerem po stronie bazy — porównanie
      // "na piechotę" (player.password !== oldPassword) zawsze się nie zgadzało, bo porównywało
      // hash z jawnym tekstem. Weryfikację i podmianę robi teraz atomowo RPC change_player_password
      // (patrz supabase/change_player_password.sql), tak samo jak logowanie robi to w verify_login.
      const { data, error } = await supabase.rpc('change_player_password', {
        p_player_id: playerId,
        p_old_password: oldPassword,
        p_new_password: newPassword,
      });

      setChangingPassword(false);

      if (error) {
        showAlert('Błąd', error.message);
        return;
      }

      if (data?.error === 'wrong_password') {
        showAlert('Błąd', 'Stare hasło jest niepoprawne.');
        return;
      }

      if (data?.error) {
        showAlert('Błąd', 'Nie udało się zmienić hasła.');
        return;
      }

      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showAlert('Sukces', 'Hasło zostało zmienione.');
    } catch (e: any) {
      setChangingPassword(false);
      showAlert('Błąd', e.message || 'Wystąpił nieoczekiwany błąd.');
    }
  };

  const handleLogoutPress = () => setLogoutConfirmVisible(true);

  const executeLogout = async () => {
    setLogoutConfirmVisible(false);
    // Uwaga: tokeny push żyją w osobnej tabeli player_devices (per urządzenie), nie w players —
    // usuwanie ich przy wylogowaniu wymagałoby najpierw zapisywania tokenu przy logowaniu,
    // czego ta apka jeszcze nie robi, więc nie ma tu nic do wyczyszczenia.
    await AsyncStorage.removeItem('current_player_id');
    await AsyncStorage.removeItem('remember_me_status');
    await AsyncStorage.removeItem('current_player_data');
    await AsyncStorage.removeItem('current_auth_user_id');

    router.replace('/(auth)');
  };

  if (loadingUser) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['bottom', 'left', 'right']}>
        <ActivityIndicator size="large" color={brand.primary} />
      </SafeAreaView>
    );
  }

  const maskedPhone = phone ? phone.replace(/.(?=.{4})/g, '*') : 'Brak numeru';
  const maskedEmail = email ? email.replace(/(^[\w\.]{2})(.*)(@.*)/, '$1***$3') : '';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <CustomAlert visible={alertVisible} title={alertTitle} message={alertMessage} onClose={handleAlertClose} />

      <CustomConfirm
        visible={logoutConfirmVisible}
        title="Wylogowanie"
        message="Czy na pewno chcesz się wylogować?"
        cancelText="Anuluj"
        confirmText="Wyloguj"
        destructive
        onCancel={() => setLogoutConfirmVisible(false)}
        onConfirm={executeLogout}
        c={c}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.headerTitle}>Profil</Text>
        <Text style={styles.headerSubtitle}>Twoje dane i ustawienia konta</Text>

        <Card c={c} isDark={isDark} style={styles.card}>
          <Text style={styles.cardTitle}>Wygląd i motyw</Text>
          <Text style={[styles.prefDescription, styles.themeDescription]}>
            Dopasuj motyw aplikacji lub zostaw zgodny z ustawieniami urządzenia (obecny systemowy:{' '}
            {isDark ? 'Ciemny' : 'Jasny'}).
          </Text>

          <SegmentButtons
            c={c}
            activeKey={themeMode}
            onChange={(key) => setThemeMode(key as ThemeMode)}
            options={[
              { key: 'system', label: 'Urządzenia', icon: 'phone-portrait-outline' },
              { key: 'light', label: 'Biały', icon: 'sunny-outline' },
              { key: 'dark', label: 'Czarny', icon: 'moon-outline' },
            ]}
          />
        </Card>

        <Card c={c} isDark={isDark} style={styles.card}>
          <Text style={styles.cardTitle}>Dane profilu</Text>

          <Ticket style={styles.profileTicket}>
            <View style={styles.profileHeaderBox}>
              <View style={styles.profileAvatar}>
                <Text style={styles.profileAvatarText}>{fullName ? fullName.charAt(0).toUpperCase() : 'P'}</Text>
              </View>
              <View style={styles.profileInfoWrap}>
                <Text style={styles.profileFullName} numberOfLines={1}>
                  {fullName || 'Gracz'}
                </Text>
                <View style={styles.badgesRow}>
                  <Pill c={c} variant="solidAmber" label={roleName} />
                  <Pill c={c} variant="solidGreen" label={playerStatusName} />
                </View>
              </View>
            </View>
          </Ticket>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nazwa (Full name)</Text>
            <TextInput style={[styles.input, styles.inputReadOnly]} value={fullName} editable={false} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Telefon</Text>
            <TextInput
              style={[styles.input, styles.inputReadOnly]}
              value={showSensitiveData ? phone : maskedPhone}
              editable={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Adres email</Text>
            <TextInput
              style={[styles.input, styles.inputReadOnly]}
              value={showSensitiveData ? email : maskedEmail}
              editable={false}
            />
          </View>

          <PressableScale
            style={styles.revealButton}
            onPressIn={() => setShowSensitiveData(true)}
            onPressOut={() => setShowSensitiveData(false)}
          >
            <Ionicons name={showSensitiveData ? 'lock-open-outline' : 'lock-closed-outline'} size={14} color={c.ink2} />
            <Text style={styles.revealButtonText}>
              {showSensitiveData ? 'Dane odsłonięte' : 'Przytrzymaj, aby zobaczyć telefon i email'}
            </Text>
          </PressableScale>
        </Card>

        <Card c={c} isDark={isDark} style={styles.card}>
          <Text style={styles.cardTitle}>Zmiana hasła</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Stare hasło</Text>
            <TextInput
              style={styles.input}
              placeholder="Wpisz obecne hasło"
              placeholderTextColor={c.ink3}
              secureTextEntry
              value={oldPassword}
              onChangeText={setOldPassword}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nowe hasło</Text>
            <TextInput
              style={styles.input}
              placeholder="Minimum 6 znaków"
              placeholderTextColor={c.ink3}
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Powtórz nowe hasło</Text>
            <TextInput
              style={styles.input}
              placeholder="Powtórz nowe hasło"
              placeholderTextColor={c.ink3}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
          </View>

          <PrimaryButton
            label={changingPassword ? 'Zmienianie...' : 'Zmień hasło'}
            onPress={handleChangePassword}
            loading={changingPassword}
          />
        </Card>

        <Card c={c} isDark={isDark} style={styles.card}>
          <Text style={styles.cardTitle}>Powiadomienia</Text>

          <View style={styles.prefRow}>
            <View style={styles.prefTextWrap}>
              <Text style={styles.prefLabel}>Przypomnienia o meczach</Text>
              <Text style={styles.prefDescription}>24h przed meczem</Text>
            </View>
            <Switch
              value={notifMatchReminders}
              onValueChange={toggleMatchReminders}
              trackColor={{ false: c.line, true: brand.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.prefDivider} />

          <View style={styles.prefRow}>
            <View style={styles.prefTextWrap}>
              <Text style={styles.prefLabel}>Dodawaj mecze do kalendarza</Text>
              <Text style={styles.prefDescription}>Zapis i wypis aktualizują wydarzenie w kalendarzu telefonu</Text>
            </View>
            <Switch
              value={calendarSyncEnabled}
              onValueChange={toggleCalendarSync}
              trackColor={{ false: c.line, true: brand.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </Card>

        <DangerButton label="Wyloguj się" onPress={handleLogoutPress} c={c} style={styles.logoutButton} />
      </ScrollView>
    </SafeAreaView>
  );
}

const confirmStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  alertBox: {
    width: '100%',
    maxWidth: 360,
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
  },
  indicator: { width: 48, height: 6, borderRadius: 3, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 10, textAlign: 'center' },
  message: { fontSize: 16, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  confirmButtonsRow: { flexDirection: 'row', gap: 12, width: '100%' },
  confirmButton: { flex: 1, paddingVertical: 14, borderRadius: radius.lg, alignItems: 'center', borderWidth: 1 },
  cancelButtonText: { fontSize: 15, fontWeight: '800' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  destructiveButtonText: { fontSize: 15, fontWeight: '800' },
});

const getStyles = (c: Palette) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: c.bg },
    loadingContainer: { flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' },
    scrollContent: { paddingHorizontal: space.screen, paddingTop: 12, paddingBottom: 40 },

    headerTitle: { fontSize: 24, fontWeight: '800', color: c.ink },
    headerSubtitle: { fontSize: 12.5, color: c.ink3, marginTop: 4, marginBottom: 20, fontWeight: '500' },

    card: { marginBottom: space.gap },
    cardTitle: { fontSize: 16, fontWeight: '800', color: c.ink, marginBottom: 14 },

    themeDescription: { marginBottom: 14 },

    profileTicket: { marginBottom: 16 },
    profileHeaderBox: { flexDirection: 'row', alignItems: 'center', padding: 14 },
    profileAvatar: {
      width: 48,
      height: 48,
      borderRadius: radius.lg,
      backgroundColor: brand.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    profileAvatarText: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
    profileInfoWrap: { flex: 1 },
    profileFullName: { fontSize: 16, fontWeight: '800', color: brand.ticketInk, marginBottom: 7 },
    badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },

    inputGroup: { marginBottom: 14 },
    label: { fontSize: 13, fontWeight: '700', color: c.ink, marginBottom: 6 },
    input: {
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.md,
      paddingHorizontal: 14,
      paddingVertical: Platform.OS === 'ios' ? 12 : 10,
      fontSize: 15,
      backgroundColor: c.card2,
      color: c.ink,
      fontWeight: '500',
    },
    inputReadOnly: { color: c.ink2, opacity: 0.9 },

    revealButton: {
      flexDirection: 'row',
      backgroundColor: c.card2,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.md,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginTop: 4,
    },
    revealButtonText: { color: c.ink2, fontSize: 13, fontWeight: '800' },

    logoutButton: { marginTop: 4, marginBottom: 20 },

    prefRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
    prefDivider: { height: 1, backgroundColor: c.line, marginVertical: 10 },
    prefTextWrap: { flex: 1, paddingRight: 12 },
    prefLabel: { fontSize: 14, fontWeight: '700', color: c.ink, marginBottom: 2 },
    prefDescription: { fontSize: 12, color: c.ink2, lineHeight: 16, fontWeight: '500' },
  });
