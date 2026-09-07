import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useHumanCheck } from '@/lib/antiBot';
import { useAppTheme } from '@/hooks/use-theme';
import { brand, radius, space, type Palette } from '@/constants/app-theme';
import CustomAlert from '@/components/CustomAlert';
import Card from '@/components/ui/Card';
import PressableScale from '@/components/ui/PressableScale';
import PrimaryButton from '@/components/ui/PrimaryButton';
import SliderCaptcha from '@/components/SliderCaptcha';

export default function RegisterScreen() {
  const router = useRouter();
  const { isDark, c } = useAppTheme();
  const styles = getStyles(c);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

  const human = useHumanCheck();

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

    if (!human.verifyHuman()) {
      showAlert('Błąd weryfikacji', 'Nie udało się potwierdzić, że formularz wypełnia człowiek. Spróbuj ponownie.', 'error');
      human.regenerate();
      return;
    }

    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const cleanPhone = phone.trim();

    try {
      // players.full_name jest UNIQUE w bazie, tak samo jak email — dwóch graczy nie może
      // nazywać się identycznie, nie tylko mieć tego samego adresu email. Sprawdzamy oba pola
      // z wyprzedzeniem, żeby dać konkretny komunikat zamiast surowego błędu bazy przy insercie.
      const { data: existingUsers, error: checkError } = await supabase
        .from('players')
        .select('id, email, full_name')
        .or(`email.eq.${cleanEmail},full_name.eq.${cleanName}`);

      if (checkError) {
        setLoading(false);
        showAlert('Błąd', 'Nie udało się zweryfikować unikalności danych.', 'error');
        human.regenerate();
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
        human.regenerate();
        return;
      }

      // Wysyłamy hasło jawnym tekstem w tym insercie, ale nim faktycznie trafi do bazy, trigger
      // po stronie Supabase zamienia je na hash bcrypt — players.password nigdy nie przechowuje
      // czystego tekstu (potwierdzone empirycznie: to samo dzieje się przy każdym UPDATE hasła).
      // Nowe konto dostaje domyślnie role_id "pending" — stąd komunikat o oczekiwaniu na admina.
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
        human.regenerate();
        return;
      }

      setLoading(false);

      showAlert('Rejestracja zakończona sukcesem', 'Twoje konto zostało utworzone i czeka na zatwierdzenie przez administratora.', 'success', () =>
        router.back()
      );
    } catch (err) {
      setLoading(false);
      showAlert('Błąd', 'Wystąpił nieoczekiwany błąd podczas rejestracji.', 'error');
      human.regenerate();
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
          <PressableScale style={styles.backButton} onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.backButtonText}>‹ Wstecz</Text>
          </PressableScale>

          <View style={styles.header}>
            <View style={styles.logoSquare}>
              <Image source={require('@/assets/images/icon.png')} style={styles.logoImage} resizeMode="cover" />
            </View>
            <Text style={styles.title}>Dołącz do gry</Text>
            <Text style={styles.subtitle}>Załóż konto i zapisuj się na mecze</Text>
          </View>

          <Card c={c} isDark={isDark} style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nazwa (Imię i nazwisko)</Text>
              <TextInput
                style={styles.input}
                placeholder="Jan Kowalski"
                placeholderTextColor={c.ink3}
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
                placeholderTextColor={c.ink3}
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
                placeholderTextColor={c.ink3}
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
                placeholderTextColor={c.ink3}
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
                placeholderTextColor={c.ink3}
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>

            {/* Honeypot: pole niewidoczne dla człowieka. Boty wypełniające każdy input w drzewie
                komponentów zwykle je uzupełniają — jeśli tak, traktujemy zgłoszenie jako boty
                (patrz src/lib/antiBot.ts).
                WAŻNE: importantForAutofill="no" jest tu krytyczne na Androidzie — bez tego usługa
                autouzupełniania (np. Google Autofill) potrafi sama wypełnić to pole (np. zapisanym
                adresem URL), co blokowało rejestrację KAŻDEMU realnemu użytkownikowi (honeypot
                "wykrywał bota" tam, gdzie było tylko autouzupełnianie telefonu). To osobny
                mechanizm od importantForAccessibility (ten dotyczy czytników ekranu, nie autofill). */}
            <View style={styles.honeypot} pointerEvents="none">
              <Text nativeID="website">Strona internetowa</Text>
              <TextInput
                accessibilityLabel="Strona internetowa"
                autoComplete="off"
                importantForAutofill="no"
                importantForAccessibility="no-hide-descendants"
                tabIndex={-1}
                value={human.honeypot}
                onChangeText={human.setHoneypot}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Zabezpieczenie przed botami</Text>
              <SliderCaptcha key={human.widgetResetKey} c={c} onVerified={human.setSliderVerified} />
            </View>

            <PrimaryButton
              label={loading ? 'Tworzenie konta...' : 'ZAREJESTRUJ SIĘ'}
              onPress={handleRegister}
              loading={loading}
            />
          </Card>

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Masz już konto? </Text>
            <PressableScale onPress={() => router.back()} hitSlop={8}>
              <Text style={styles.loginLink}>Zaloguj się</Text>
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
    scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 24 },
    backButton: { alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 4, marginBottom: 12 },
    backButtonText: { color: c.priInk, fontSize: 16, fontWeight: '700' },
    header: { alignItems: 'center', marginBottom: 24 },
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
    title: { fontSize: 24, fontWeight: '800', color: c.ink, marginBottom: 8, letterSpacing: 0.3 },
    subtitle: { fontSize: 14.5, color: c.ink2, fontWeight: '500', textAlign: 'center' },
    form: { padding: space.cardPad },
    inputGroup: { marginBottom: 16 },
    label: { fontSize: 13.5, fontWeight: '700', color: c.ink, marginBottom: 7 },
    input: {
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.md,
      paddingHorizontal: 16,
      paddingVertical: Platform.OS === 'ios' ? 14 : 12,
      fontSize: 15,
      backgroundColor: c.card2,
      color: c.ink,
    },
    // Poza ekranem i o zerowym rozmiarze — honeypot musi być niewidoczny i niedotykalny dla człowieka.
    honeypot: { position: 'absolute', width: 0, height: 0, overflow: 'hidden', opacity: 0 },
    loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 26 },
    loginText: { color: c.ink2, fontSize: 14.5 },
    loginLink: { color: c.priInk, fontSize: 14.5, fontWeight: '800' },
  });
