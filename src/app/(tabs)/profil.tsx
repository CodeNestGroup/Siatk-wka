import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  ActivityIndicator,
  Platform,
  Modal,
  useColorScheme,
  DeviceEventEmitter,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import CustomAlert from '@/components/CustomAlert';

type CustomConfirmProps = {
  visible: boolean;
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  isDark: boolean;
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
  isDark,
}: CustomConfirmProps) {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={confirmStyles.overlay}>
        <View style={[confirmStyles.alertBox, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)' }]}>
          <View style={confirmStyles.indicator} />
          <Text style={[confirmStyles.title, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>{title}</Text>
          <Text style={[confirmStyles.message, { color: isDark ? '#94A3B8' : '#64748B' }]}>{message}</Text>
          <View style={confirmStyles.confirmButtonsRow}>
            <TouchableOpacity
              style={[confirmStyles.confirmButton, { backgroundColor: isDark ? '#0B1120' : '#F1F5F9', borderColor: isDark ? '#334155' : '#CBD5E1' }]}
              onPress={onCancel}
              activeOpacity={0.8}
            >
              <Text style={[confirmStyles.cancelButtonText, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>{cancelText}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                confirmStyles.confirmButton,
                destructive ? confirmStyles.destructiveButton : confirmStyles.primaryButton,
              ]}
              onPress={onConfirm}
              activeOpacity={0.8}
            >
              <Text
                style={
                  destructive
                    ? confirmStyles.destructiveButtonText
                    : confirmStyles.primaryButtonText
                }
              >
                {confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function ProfilScreen() {
  const router = useRouter();
  const systemColorScheme = useColorScheme();
  
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

  // Stany zarządzania motywem
  const [themeMode, setThemeMode] = useState<'system' | 'light' | 'dark'>('system');

  // Wyznaczanie faktycznego motywu (ciemny / jasny)
  const isDark = themeMode === 'system' ? systemColorScheme === 'dark' : themeMode === 'dark';
  const styles = getStyles(isDark);

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
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('app_theme_mode');
      if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
        setThemeMode(savedTheme);
      }
    } catch (e) {
      console.error('Błąd wczytywania motywu:', e);
    }
  };

  const changeThemeMode = async (mode: 'system' | 'light' | 'dark') => {
    setThemeMode(mode);
    try {
      await AsyncStorage.setItem('app_theme_mode', mode);
      // Natychmiastowe powiadomienie nawigatora (zakładek), że motyw się zmienił
      DeviceEventEmitter.emit('themeChanged');
    } catch (e) {
      console.error('Błąd zapisu motywu:', e);
    }
  };

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
        .select(`
          *,
          roles:role_id ( name ),
          player_status:player_status_id ( name )
        `)
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
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingUser(false);
    }
  };

  const toggleMatchReminders = async () => {
    if (!playerId) return;

    const newValue = !notifMatchReminders;
    setNotifMatchReminders(newValue);

    const { error } = await supabase
      .from('players')
      .update({ notif_match_reminders: newValue })
      .eq('id', playerId);

    if (error) {
      showAlert('Błąd', 'Nie udało się zapisać ustawienia powiadomień.');
      setNotifMatchReminders(!newValue);
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
      const { data: player, error: fetchError } = await supabase
        .from('players')
        .select('password')
        .eq('id', playerId)
        .single();

      if (fetchError || !player || player.password !== oldPassword) {
        setChangingPassword(false);
        showAlert('Błąd', 'Stare hasło jest niepoprawne.');
        return;
      }

      const { error: updateError } = await supabase
        .from('players')
        .update({ password: newPassword })
        .eq('id', playerId);

      setChangingPassword(false);

      if (updateError) {
        showAlert('Błąd', updateError.message);
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

  const handleLogoutPress = () => {
    setLogoutConfirmVisible(true);
  };

  const executeLogout = async () => {
    setLogoutConfirmVisible(false);
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
  };

  if (loadingUser) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['bottom', 'left', 'right']}>
        <ActivityIndicator size="large" color="#FFD23F" />
      </SafeAreaView>
    );
  }

  const maskedPhone = phone ? phone.replace(/.(?=.{4})/g, '*') : 'Brak numeru';
  const maskedEmail = email ? email.replace(/(^[\w\.]{2})(.*)(@.*)/, '$1***$3') : '';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        onClose={handleAlertClose}
      />

      <CustomConfirm
        visible={logoutConfirmVisible}
        title="Wylogowanie"
        message="Czy na pewno chcesz się wylogować?"
        cancelText="Anuluj"
        confirmText="Wyloguj"
        destructive
        onCancel={() => setLogoutConfirmVisible(false)}
        onConfirm={executeLogout}
        isDark={isDark}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.headerTitle}>Profil</Text>
        <Text style={styles.headerSubtitle}>Twoje dane i ustawienia konta</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Wygląd i motyw</Text>
          <Text style={[styles.prefDescription, { marginBottom: 12 }]}>
            Wybierz preferowany motyw aplikacji lub dopasuj go do ustawień urządzenia (obecny systemowy: {systemColorScheme === 'dark' ? 'Ciemny' : 'Jasny'}).
          </Text>

          <View style={styles.themeButtonsRow}>
            <TouchableOpacity
              style={[
                styles.themeButton,
                themeMode === 'system' && styles.themeButtonActive,
              ]}
              onPress={() => changeThemeMode('system')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.themeButtonText,
                  themeMode === 'system' && styles.themeButtonTextActive,
                ]}
              >
                📱 Urządzenia
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.themeButton,
                themeMode === 'light' && styles.themeButtonActive,
              ]}
              onPress={() => changeThemeMode('light')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.themeButtonText,
                  themeMode === 'light' && styles.themeButtonTextActive,
                ]}
              >
                ☀️ Biały
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.themeButton,
                themeMode === 'dark' && styles.themeButtonActive,
              ]}
              onPress={() => changeThemeMode('dark')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.themeButtonText,
                  themeMode === 'dark' && styles.themeButtonTextActive,
                ]}
              >
                🌙 Czarny
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Dane profilu</Text>

          <View style={styles.profileHeaderBox}>
            <View style={styles.profileAvatarPlaceholder}>
              <Text style={styles.profileAvatarText}>
                {fullName ? fullName.charAt(0).toUpperCase() : 'P'}
              </Text>
            </View>
            <View style={styles.profileInfoWrap}>
              <Text style={styles.profileFullName} numberOfLines={1}>
                {fullName || 'Gracz'}
              </Text>
              <View style={styles.badgesRow}>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>{roleName}</Text>
                </View>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>{playerStatusName}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nazwa (Full name)</Text>
            <TextInput
              style={[styles.input, styles.inputReadOnly]}
              value={fullName}
              editable={false}
              placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Telefon</Text>
            <TextInput
              style={[styles.input, styles.inputReadOnly]}
              value={showSensitiveData ? phone : maskedPhone}
              editable={false}
              placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Adres email</Text>
            <TextInput
              style={[styles.input, styles.inputReadOnly]}
              value={showSensitiveData ? email : maskedEmail}
              editable={false}
              placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
            />
          </View>

          <TouchableOpacity
            style={styles.revealButton}
            onPressIn={() => setShowSensitiveData(true)}
            onPressOut={() => setShowSensitiveData(false)}
            activeOpacity={0.8}
          >
            <Text style={styles.revealButtonText}>
              {showSensitiveData ? '🔓 Dane odsłonięte' : '🔒 Przytrzymaj, aby zobaczyć telefon i email'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Zmiana hasła</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Stare hasło</Text>
            <TextInput
              style={styles.input}
              placeholder="Wpisz obecne hasło"
              placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
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
              placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
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
              placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
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

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Powiadomienia</Text>

          <View style={styles.prefRow}>
            <View style={styles.prefTextWrap}>
              <Text style={styles.prefLabel}>Przypomnienia o meczach</Text>
              <Text style={styles.prefDescription}>
                Przypomnienia o nadchodzących meczach (24h przed)
              </Text>
            </View>
            <Switch
              value={notifMatchReminders}
              onValueChange={toggleMatchReminders}
              trackColor={{ false: isDark ? '#334155' : '#CBD5E1', true: '#2C4BFF' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogoutPress}
          activeOpacity={0.8}
        >
          <Text style={styles.logoutButtonText}>Wyloguj się</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const confirmStyles = StyleSheet.create({
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
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
  },
  indicator: {
    width: 48,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFD23F',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  confirmButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '800',
  },
  primaryButton: {
    backgroundColor: '#2C4BFF',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  destructiveButton: {
    backgroundColor: '#0B1120',
    borderWidth: 1,
    borderColor: '#FF5A5F',
  },
  destructiveButtonText: {
    color: '#FF5A5F',
    fontSize: 15,
    fontWeight: '800',
  },
});

const getStyles = (isDark: boolean) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: isDark ? '#0B1120' : '#F8FAFC' },
    loadingContainer: {
      flex: 1,
      backgroundColor: isDark ? '#0B1120' : '#F8FAFC',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
    },
    scrollContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },

    headerTitle: {
      fontSize: 24,
      fontWeight: '800',
      color: isDark ? '#FFFFFF' : '#0F172A',
    },
    headerSubtitle: {
      fontSize: 14,
      color: isDark ? '#94A3B8' : '#64748B',
      marginTop: 4,
      marginBottom: 20,
      fontWeight: '500',
    },

    card: {
      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
      borderRadius: 24,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: isDark ? 0.35 : 0.08,
      shadowRadius: 12,
      elevation: 6,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: isDark ? '#FFFFFF' : '#0F172A',
      marginBottom: 16,
    },

    themeButtonsRow: {
      flexDirection: 'row',
      gap: 8,
    },
    themeButton: {
      flex: 1,
      backgroundColor: isDark ? '#0B1120' : '#F1F5F9',
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#CBD5E1',
      borderRadius: 14,
      paddingVertical: 12,
      alignItems: 'center',
    },
    themeButtonActive: {
      backgroundColor: '#2C4BFF',
      borderColor: '#2C4BFF',
    },
    themeButtonText: {
      color: isDark ? '#94A3B8' : '#64748B',
      fontSize: 13,
      fontWeight: '700',
    },
    themeButtonTextActive: {
      color: '#FFFFFF',
      fontWeight: '900',
    },

    profileHeaderBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#0B1120' : '#F8FAFC',
      padding: 14,
      borderRadius: 18,
      marginBottom: 18,
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#E2E8F0',
    },
    profileAvatarPlaceholder: {
      width: 48,
      height: 48,
      borderRadius: 16,
      backgroundColor: '#FFD23F',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    profileAvatarText: {
      color: '#0B1120',
      fontSize: 20,
      fontWeight: '900',
    },
    profileInfoWrap: {
      flex: 1,
    },
    profileFullName: {
      fontSize: 16,
      fontWeight: '800',
      color: isDark ? '#FFFFFF' : '#0F172A',
      marginBottom: 6,
    },
    badgesRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    roleBadge: {
      backgroundColor: '#FFD23F',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
    },
    roleBadgeText: {
      color: '#0B1120',
      fontSize: 11,
      fontWeight: '900',
    },
    statusBadge: {
      backgroundColor: isDark ? 'rgba(0, 196, 140, 0.15)' : 'rgba(0, 196, 140, 0.1)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#00C48C',
    },
    statusBadgeText: {
      color: '#00C48C',
      fontSize: 11,
      fontWeight: '800',
    },

    inputGroup: { marginBottom: 14 },
    label: {
      fontSize: 13,
      fontWeight: '700',
      color: isDark ? '#FFFFFF' : '#0F172A',
      marginBottom: 6,
    },
    input: {
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#CBD5E1',
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: Platform.OS === 'ios' ? 12 : 10,
      fontSize: 15,
      backgroundColor: isDark ? '#0B1120' : '#F8FAFC',
      color: isDark ? '#FFFFFF' : '#0F172A',
      fontWeight: '500',
    },
    inputReadOnly: {
      color: isDark ? '#94A3B8' : '#64748B',
      opacity: 0.9,
    },

    revealButton: {
      backgroundColor: isDark ? '#0B1120' : '#F1F5F9',
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#CBD5E1',
      borderRadius: 16,
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: 6,
    },
    revealButtonText: {
      color: isDark ? '#94A3B8' : '#64748B',
      fontSize: 13,
      fontWeight: '800',
    },

    button: {
      backgroundColor: '#2C4BFF',
      borderRadius: 16,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 4,
    },
    buttonDisabled: { opacity: 0.6 },
    buttonText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '900',
    },

    logoutButton: {
      backgroundColor: isDark ? '#0B1120' : '#FFFFFF',
      borderWidth: 1,
      borderColor: '#FF5A5F',
      borderRadius: 20,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 4,
      marginBottom: 20,
    },
    logoutButtonText: {
      color: '#FF5A5F',
      fontSize: 15,
      fontWeight: '800',
    },

    prefRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 4,
    },
    prefTextWrap: { flex: 1, paddingRight: 12 },
    prefLabel: {
      fontSize: 14,
      fontWeight: '700',
      color: isDark ? '#FFFFFF' : '#0F172A',
      marginBottom: 2,
    },
    prefDescription: {
      fontSize: 12,
      color: isDark ? '#94A3B8' : '#64748B',
      lineHeight: 16,
      fontWeight: '500',
    },
  });