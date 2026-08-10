import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, shadow } from '@/constants/app-theme';
import { supabase } from '@/lib/supabase';

// Własny komponent CustomAlert w stylu aplikacji
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

export default function RegisterScreen() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Stany dla własnego custom alertu
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

  // Stany dla ekstremalnej Captcha
  const [captchaCode, setCaptchaCode] = useState('');
  const [userCaptchaInput, setUserCaptchaInput] = useState('');
  const [captchaChars, setCaptchaChars] = useState<Array<{char: string, rotate: string, topOffset: number, fontSize: number, color: string}>>([]);
  const [noiseElements, setNoiseElements] = useState<Array<{top: number, left: number, width: number, height: number, rotate: string, backgroundColor: string}>>([]);

  // Generowanie ekstremalnie trudnej captchy znak po znaku
  const generateCaptcha = () => {
    const charsPool = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghijkmnpqrstuvwxyz'; 
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += charsPool.charAt(Math.floor(Math.random() * charsPool.length));
    }
    setCaptchaCode(code);
    setUserCaptchaInput('');

    // Rozbijanie kodu na tablicę obiektów z losowymi transformacjami wizualnymi
    const colorsList = ['#38bdf8', '#f43f5e', '#10b981', '#fbbf24', '#a855f7', '#ffffff'];
    const formattedChars = code.split('').map((char) => ({
      char,
      rotate: `${Math.floor(Math.random() * 50) - 25}deg`, // Losowy kąt od -25 do 25 stopni
      topOffset: Math.floor(Math.random() * 12) - 6, // Losowe "skakanie" góra-dół
      fontSize: Math.floor(Math.random() * 6) + 20, // Losowa wielkość od 20 do 26
      color: colorsList[Math.floor(Math.random() * colorsList.length)], // Losowy kolor każdego znaku
    }));
    setCaptchaChars(formattedChars);

    // Generowanie gęstego szumu (linie oraz kropki/kwadraciki utrudniające OCR)
    const noise = [];
    // Linie zakłócające
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
    // Drobne plamy/kropki szumu w tle
    for (let i = 0; i < 10; i++) {
      noise.push({
        top: Math.floor(Math.random() * 50),
        left: Math.floor(Math.random() * 220),
        width: Math.floor(Math.random() * 6) + 4,
        height: Math.floor(Math.random() * 6) + 4,
        rotate: '0deg',
        backgroundColor: '#64748b',
      });
    }
    setNoiseElements(noise);
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      showAlert('Błąd', 'Wypełnij wszystkie wymagane pola.');
      return;
    }
    if (!email.includes('@')) {
      showAlert('Błąd', 'Podaj poprawny adres email.');
      return;
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{6,}$/;
    if (!passwordRegex.test(password)) {
      showAlert(
        'Błąd',
        'Hasło musi mieć co najmniej 6 znaków, zawierać jedną wielką literę, jedną cyfrę oraz jeden znak specjalny.'
      );
      return;
    }

    if (password !== confirmPassword) {
      showAlert('Błąd', 'Hasła nie są takie same.');
      return;
    }

    // Walidacja dokładnego kodu (z uwzględnieniem wielkości liter)
    if (!userCaptchaInput.trim() || userCaptchaInput.trim() !== captchaCode) {
      showAlert('Błąd weryfikacji', 'Wpisany kod jest niepoprawny (uwzględnij wielkość liter). Spróbuj ponownie.');
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
        showAlert('Błąd', 'Nie udało się zweryfikować unikalności danych.');
        generateCaptcha();
        return;
      }

      if (existingUsers && existingUsers.length > 0) {
        setLoading(false);
        const emailTaken = existingUsers.some((u) => u.email === cleanEmail);
        const nameTaken = existingUsers.some((u) => u.full_name === cleanName);

        if (emailTaken && nameTaken) {
          showAlert('Błąd', 'Ten adres email oraz nazwa są już zajęte.');
        } else if (emailTaken) {
          showAlert('Błąd', 'Ten adres email jest już zajęty.');
        } else {
          showAlert('Błąd', 'Ta nazwa użytkownika jest już zajęta.');
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
        showAlert('Błąd rejestracji', insertError?.message || 'Nie udało się utworzyć konta.');
        generateCaptcha();
        return;
      }

      setLoading(false);
      
      showAlert(
        'Rejestracja zakończona sukcesem',
        'Twoje konto zostało utworzone i czeka na zatwierdzenie przez administratora.',
        () => router.back()
      );

    } catch (err) {
      setLoading(false);
      showAlert('Błąd', 'Wystąpił nieoczekiwany błąd podczas rejestracji.');
      generateCaptcha();
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
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.backButtonText}>‹ Wstecz</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.logoCircle}>
              <Text style={styles.logo}>🏐</Text>
            </View>
            <Text style={styles.title}>Dołącz do gry</Text>
            <Text style={styles.subtitle}>Załóż konto i zapisuj się na mecze</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nazwa (Imię i nazwisko)</Text>
              <TextInput
                style={styles.input}
                placeholder="Jan Kowalski"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="words"
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="twoj@email.com"
                placeholderTextColor={colors.mutedForeground}
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
                placeholderTextColor={colors.mutedForeground}
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
                placeholderTextColor={colors.mutedForeground}
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
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>

            {/* Ekstremalnie trudna Captcha (znaki generowane osobno z rotacją i szumem) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Zabezpieczenie przed botami (przepisz kod)</Text>
              <View style={styles.captchaBoxContainer}>
                <View style={styles.captchaVisualBox}>
                  {/* Elementy szumu w tle i na wierzchu */}
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

                  {/* Zniekształcone znaki renderowane pojedynczo */}
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
                style={[styles.input, { marginTop: 8 }]}
                placeholder="Wpisz dokładnie powyższy kod"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                autoCorrect={false}
                value={userCaptchaInput}
                onChangeText={setUserCaptchaInput}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Tworzenie konta...' : 'Zarejestruj się'}
              </Text>
            </TouchableOpacity>
          </View>

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
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  backButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  header: { alignItems: 'center', marginBottom: 28 },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    ...shadow.card,
  },
  logo: { fontSize: 36 },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  form: {
    backgroundColor: colors.card,
    borderRadius: radius['2xl'],
    padding: 24,
    ...shadow.card,
  },
  inputGroup: { marginBottom: 16 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    fontSize: 16,
    backgroundColor: colors.muted,
    color: colors.foreground,
  },
  captchaBoxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  captchaVisualBox: {
    flex: 1,
    height: 60,
    backgroundColor: '#090d16',
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
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
    marginHorizontal: 3,
  },
  noiseItem: {
    position: 'absolute',
    opacity: 0.5,
    zIndex: 1,
  },
  refreshButton: {
    backgroundColor: colors.muted,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    height: 60,
  },
  refreshButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.foreground,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    ...shadow.button,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    color: colors.primaryForeground,
    fontSize: 16,
    fontWeight: '700',
  },
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  loginText: { color: colors.mutedForeground, fontSize: 14 },
  loginLink: { color: colors.primary, fontSize: 14, fontWeight: '700' },
});