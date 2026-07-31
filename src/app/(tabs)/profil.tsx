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
import { colors, radius, shadow } from '@/constants/app-theme';
import { supabase } from '@/lib/supabase';

type NotificationPrefs = {
  newAnnouncements: boolean;
  scheduleChanges: boolean;
  signupReminders: boolean;
  payments: boolean;
};

export default function ProfilScreen() {
  const [loadingUser, setLoadingUser] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const [prefs, setPrefs] = useState<NotificationPrefs>({
    newAnnouncements: true,
    scheduleChanges: true,
    signupReminders: true,
    payments: false,
  });

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    setLoadingUser(true);
    const { data, error } = await supabase.auth.getUser();

    if (!error && data.user) {
      setEmail(data.user.email ?? '');

      const fullName: string = data.user.user_metadata?.full_name ?? '';
      const parts = fullName.trim().split(' ');
      setFirstName(parts[0] ?? '');
      setLastName(parts.slice(1).join(' ') ?? '');
    }

    setLoadingUser(false);
  };

  const handleChangePassword = async () => {
    if (!newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert('Błąd', 'Wypełnij oba pola hasła.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Błąd', 'Nowe hasło musi mieć minimum 6 znaków.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Błąd', 'Hasła nie są takie same.');
      return;
    }

    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);

    if (error) {
      Alert.alert('Błąd', error.message);
      return;
    }

    setNewPassword('');
    setConfirmPassword('');
    Alert.alert('Sukces', 'Hasło zostało zmienione.');
  };

  const togglePref = (key: keyof NotificationPrefs) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
    // TODO: zapisać ustawienia powiadomień w bazie (np. tabela profiles / user_settings)
  };

  if (loadingUser) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['bottom']}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
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
            <Text style={styles.label}>Imię</Text>
            <TextInput
              style={[styles.input, styles.inputReadOnly]}
              value={firstName}
              editable={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nazwisko</Text>
            <TextInput
              style={[styles.input, styles.inputReadOnly]}
              value={lastName}
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
              placeholder="Powtórz hasło"
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
              {changingPassword ? 'Zapisywanie...' : 'Zmień hasło'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Sekcja: Powiadomienia */}
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
              value={prefs.newAnnouncements}
              onValueChange={() => togglePref('newAnnouncements')}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.prefDivider} />

          <View style={styles.prefRow}>
            <View style={styles.prefTextWrap}>
              <Text style={styles.prefLabel}>Zmiany w terminarzu</Text>
              <Text style={styles.prefDescription}>
                Powiadom o zmianie godziny lub odwołaniu meczu
              </Text>
            </View>
            <Switch
              value={prefs.scheduleChanges}
              onValueChange={() => togglePref('scheduleChanges')}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.prefDivider} />

          <View style={styles.prefRow}>
            <View style={styles.prefTextWrap}>
              <Text style={styles.prefLabel}>Przypomnienia o zapisach</Text>
              <Text style={styles.prefDescription}>
                Przypomnij mi przed zamknięciem zapisów na mecz
              </Text>
            </View>
            <Switch
              value={prefs.signupReminders}
              onValueChange={() => togglePref('signupReminders')}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.prefDivider} />

          <View style={styles.prefRow}>
            <View style={styles.prefTextWrap}>
              <Text style={styles.prefLabel}>Płatności</Text>
              <Text style={styles.prefDescription}>
                Powiadom o statusie płatności za mecz
              </Text>
            </View>
            <Switch
              value={prefs.payments}
              onValueChange={() => togglePref('payments')}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>
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
  },
  scrollContent: { padding: 16, paddingBottom: 40 },

  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.foreground,
    marginTop: 8,
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