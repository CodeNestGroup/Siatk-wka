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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, radius, shadow } from '@/constants/app-theme';
import { supabase } from '@/lib/supabase';

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

type CustomConfirmProps = {
  visible: boolean;
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
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
}: CustomConfirmProps) {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={alertStyles.overlay}>
        <View style={alertStyles.alertBox}>
          <View style={alertStyles.indicator} />
          <Text style={alertStyles.title}>{title}</Text>
          <Text style={alertStyles.message}>{message}</Text>
          <View style={alertStyles.confirmButtonsRow}>
            <TouchableOpacity
              style={[alertStyles.confirmButton, alertStyles.cancelButton]}
              onPress={onCancel}
              activeOpacity={0.8}
            >
              <Text style={alertStyles.cancelButtonText}>{cancelText}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                alertStyles.confirmButton,
                destructive ? alertStyles.destructiveButton : alertStyles.primaryButton,
              ]}
              onPress={onConfirm}
              activeOpacity={0.8}
            >
              <Text
                style={
                  destructive
                    ? alertStyles.destructiveButtonText
                    : alertStyles.primaryButtonText
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
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  const maskedPhone = phone ? phone.replace(/.(?=.{4})/g, '*') : 'Brak numeru';
  const maskedEmail = email ? email.replace(/(^[\w\.]{2})(.*)(@.*)/, '$1***$3') : '';

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
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
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.headerTitle}>Profil</Text>
        <Text style={styles.headerSubtitle}>Twoje dane i ustawienia konta</Text>

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
            />
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
              trackColor={{ false: colors.border, true: colors.primary }}
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
  confirmButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.muted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    color: colors.foreground,
    fontSize: 15,
    fontWeight: '700',
  },
  primaryButton: {
    backgroundColor: colors.primary,
    ...shadow.button,
  },
  primaryButtonText: {
    color: colors.primaryForeground,
    fontSize: 15,
    fontWeight: '700',
  },
  destructiveButton: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  destructiveButtonText: {
    color: '#b91c1c',
    fontSize: 15,
    fontWeight: '700',
  },
});

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
    marginTop: 16,
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

  profileHeaderBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.muted,
    padding: 14,
    borderRadius: radius.lg,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  profileAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  profileAvatarText: {
    color: colors.primaryForeground,
    fontSize: 20,
    fontWeight: '700',
  },
  profileInfoWrap: {
    flex: 1,
  },
  profileFullName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: 6,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  roleBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  roleBadgeText: {
    color: colors.primaryForeground,
    fontSize: 11,
    fontWeight: '700',
  },
  statusBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  statusBadgeText: {
    color: '#16A34A',
    fontSize: 11,
    fontWeight: '700',
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

  revealButton: {
    backgroundColor: colors.muted,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  revealButtonText: {
    color: colors.foreground,
    fontSize: 13,
    fontWeight: '600',
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
    paddingVertical: 4,
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
});