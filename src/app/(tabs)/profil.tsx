import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, radius, shadow } from '@/constants/app-theme';
import { supabase } from '@/lib/supabase';

type NotificationPrefs = {
  notif_announcements: boolean;
  notif_match_reminders: boolean;
  notif_payments: boolean;
};

export default function ProfilScreen() {
  const router = useRouter();
  const [loadingUser, setLoadingUser] = useState(true);
  const [playerId, setPlayerId] = useState<string | null>(null);

  // Dane profilu (tylko do odczytu)
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Zmiana hasła
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Prefs odpowiadające kolumnom w bazie danych players
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    notif_announcements: true,
    notif_match_reminders: true,
    notif_payments: false,
  });

  useEffect(() => {
    loadPlayerData();
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

      // Pobieramy dane gracza wraz z preferencjami powiadomień
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('id', storedPlayerId)
        .single();

      if (error || !data) {
        Alert.alert('Błąd', 'Nie udało się pobrać danych profilu.');
        return;
      }

      setFullName(data.full_name ?? '');
      setEmail(data.email ?? '');
      setPhone(data.phone ?? 'Brak numeru');

      // Ustawiamy stany przełączników na podstawie bazy danych
      setPrefs({
        notif_announcements: data.notif_announcements ?? true,
        notif_match_reminders: data.notif_match_reminders ?? true,
        notif_payments: data.notif_payments ?? false,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingUser(false);
    }
  };

  const togglePref = async (key: keyof NotificationPrefs) => {
    if (!playerId) return;

    const newValue = !prefs[key];

    // Optymistyczna zmiana stanu w interfejsie
    setPrefs((prev) => ({ ...prev, [key]: newValue }));

    // Zapis w bazie danych (czysty SQL UPDATE na tabeli players)
    const { error } = await supabase
      .from('players')
      .update({ [key]: newValue })
      .eq('id', playerId);

    if (error) {
      Alert.alert('Błąd', 'Nie udało się zapisać ustawienia powiadomień.');
      // Przywrócenie stanu w razie błędu
      setPrefs((prev) => ({ ...prev, [key]: !newValue }));
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert('Błąd', 'Wypełnij wszystkie pola dotyczące hasła.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Błąd', 'Nowe hasło musi mieć minimum 6 znaków.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Błąd', 'Nowe hasła nie są takie same.');
      return;
    }
    if (!playerId) return;

    setChangingPassword(true);

    try {
      const { data: player, error: fetchError } = await supabase
        .from('players')
        .select('password')
        .eq('id', playerId)
        .single();

      if (fetchError || !player || player.password !== oldPassword) {
        setChangingPassword(false);
        Alert.alert('Błąd', 'Stare hasło jest niepoprawne.');
        return;
      }

      const { error: updateError } = await supabase
        .from('players')
        .update({ password: newPassword })
        .eq('id', playerId);

      setChangingPassword(false);

      if (updateError) {
        Alert.alert('Błąd', updateError.message);
        return;
      }

      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Sukces', 'Hasło zostało zmienione.');
    } catch (e: any) {
      setChangingPassword(false);
      Alert.alert('Błąd', e.message || 'Wystąpił nieoczekiwany błąd.');
    }
  };

  const handleLogout = async () => {
    Alert.alert('Wylogowanie', 'Czy na pewno chcesz się wylogować?', [
      { text: 'Anuluj', style: 'cancel' },
      {
        text: 'Wyloguj',
        style: 'destructive',
        onPress: async () => {
          if (playerId) {
            await supabase
              .from('players')
              .update({ push_token: null })
              .eq('id', playerId);
          }

          await AsyncStorage.removeItem('current_player_id');
          await AsyncStorage.removeItem('remember_me_status');
          await AsyncStorage.removeItem('current_player_data');
          await AsyncStorage.removeItem('current_auth_user_id');

          router.replace('/(auth)');
        },
      },
    ]);
  };

  if (loadingUser) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['bottom', 'left', 'right']}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.headerTitle}>Profil</Text>
        <Text style={styles.headerSubtitle}>Twoje dane i ustawienia konta</Text>

        {/* Sekcja: Dane profilu */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Dane profilu</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nazwa</Text>
            <TextInput
              style={[styles.input, styles.inputReadOnly]}
              value={fullName}
              editable={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Telefon</Text>
            <TextInput
              style={[styles.input, styles.inputReadOnly]}
              value={phone}
              editable={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Adres email</Text>
            <TextInput
              style={[styles.input, styles.inputReadOnly]}
              value={email}
              editable={false}
            />
          </View>
        </View>

        {/* Sekcja: Zmiana hasła */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Zmiana hasła</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Stare hasło</Text>
            <TextInput
              style={styles.input}
              placeholder="Wpisz obecne hasło"
              placeholderTextColor={colors.mutedForeground}
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
              placeholderTextColor={colors.mutedForeground}
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
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, changingPassword && styles.buttonDisabled]}
            onPress={handleChangePassword}
            disabled={changingPassword}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>
              {changingPassword ? 'Zmienianie...' : 'Zmień hasło'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Sekcja: Powiadomienia spięta z bazą danych */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Powiadomienia</Text>

          <View style={styles.prefRow}>
            <View style={styles.prefTextWrap}>
              <Text style={styles.prefLabel}>Nowe ogłoszenia</Text>
              <Text style={styles.prefDescription}>
                Powiadom mnie, gdy pojawi się nowe ogłoszenie
              </Text>
            </View>
            <Switch
              value={prefs.notif_announcements}
              onValueChange={() => togglePref('notif_announcements')}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.prefDivider} />

          <View style={styles.prefRow}>
            <View style={styles.prefTextWrap}>
              <Text style={styles.prefLabel}>Przypomnienia o meczach</Text>
              <Text style={styles.prefDescription}>
                Tydzień, dzień, 6 rano w dniu meczu oraz na 3h przed
              </Text>
            </View>
            <Switch
              value={prefs.notif_match_reminders}
              onValueChange={() => togglePref('notif_match_reminders')}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.prefDivider} />

          <View style={styles.prefRow}>
            <View style={styles.prefTextWrap}>
              <Text style={styles.prefLabel}>Płatności po meczu</Text>
              <Text style={styles.prefDescription}>
                Przypomnij o nieopłaconym meczu po jego zakończeniu
              </Text>
            </View>
            <Switch
              value={prefs.notif_payments}
              onValueChange={() => togglePref('notif_payments')}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Przycisk Wyloguj */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Text style={styles.logoutButtonText}>Wyloguj się</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  scrollContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 },

  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.foreground,
    marginTop: 16, // Zwiększone, żeby tytuł był niżej
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.mutedForeground,
    marginTop: 4,
    marginBottom: 20,
  },

  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: 20,
    marginBottom: 16,
    ...shadow.card,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: 16,
  },

  inputGroup: { marginBottom: 14 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 15,
    backgroundColor: colors.muted,
    color: colors.foreground,
  },
  inputReadOnly: {
    color: colors.mutedForeground,
    opacity: 0.8,
  },

  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
    ...shadow.button,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    color: colors.primaryForeground,
    fontSize: 15,
    fontWeight: '700',
  },

  logoutButton: {
    backgroundColor: '#fee2e2',
    borderWidth: 1.5,
    borderColor: '#fca5a5',
    borderRadius: radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  logoutButtonText: {
    color: '#b91c1c',
    fontSize: 15,
    fontWeight: '700',
  },

  prefRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  prefTextWrap: { flex: 1, paddingRight: 12 },
  prefLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 2,
  },
  prefDescription: {
    fontSize: 12,
    color: colors.mutedForeground,
    lineHeight: 16,
  },
  prefDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
});