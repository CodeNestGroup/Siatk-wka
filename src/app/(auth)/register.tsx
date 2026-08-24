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
import { supabase } from '@/lib/supabase';

// Własny komponent CustomAlert dopasowany do czytelności starszych osób
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

  // Stany formularza rejestracji
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Stany dedykowanego okna alertu
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

  // Stany dla zabezpieczenia Captcha
  const [captchaCode, setCaptchaCode] = useState('');
  const [userCaptchaInput, setUserCaptchaInput] = useState('');
  const [captchaChars, setCaptchaChars] = useState<Array<{char: string, rotate: string, topOffset: number, fontSize: number, color: string}>>([]);
  const [noiseElements, setNoiseElements] = useState<Array<{top: number, left: number, width: number, height: number, rotate: string, backgroundColor: string}>>([]);

  // Funkcja generująca zaawansowaną captchę ze zniekształceniami i szumem
  const generateCaptcha = () => {
    const charsPool = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghijkmnpqrstuvwxyz'; 
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += charsPool.charAt(Math.floor(Math.random() * charsPool.length));
    }
    setCaptchaCode(code);
    setUserCaptchaInput('');

    const colorsList = ['#38bdf8', '#f43f5e', '#10b981', '#fbbf24', '#a855f7', '#ffffff'];
    const formattedChars = code.split('').map((char) => ({
      char,
      rotate: `${Math.floor(Math.random() * 50) - 25}deg`,
      topOffset: Math.floor(Math.random() * 12) - 6,
      fontSize: Math.floor(Math.random() * 6) + 22,
      color: colorsList[Math.floor(Math.random() * colorsList.length)],
    }));
    setCaptchaChars(formattedChars);

    const noise = [];
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

  // Główna logika rejestracji użytkownika (hasło przesyłane w czystym tekście – baza zaszyfruje je triggerem)[cite: 1, 2]
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
      // Sprawdzenie unikalności danych w bazie Supabase
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

      // Dodanie nowego gracza do bazy (trigger trg_hash_player_password automatycznie zahashuje hasło)[cite: 1, 2]
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
          {/* Przycisk powrotu */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.backButtonText}>‹ Wstecz</Text>
          </TouchableOpacity>

          {/* Nagłówek ekranu */}
          <View style={styles.header}>
            <View style={styles.logoCircle}>
              <Text style={styles.logo}>🏐</Text>
            </View>
            <Text style={styles.title}>Dołącz do gry</Text>
            <Text style={styles.subtitle}>Załóż konto i zapisuj się na mecze</Text>
          </View>

          {/* Formularz rejestracji */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nazwa (Imię i nazwisko)</Text>
              <TextInput
                style={styles.input}
                placeholder="Jan Kowalski"
                placeholderTextColor="#64748B"
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
                placeholderTextColor="#64748B"
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
                placeholderTextColor="#64748B"
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
                placeholderTextColor="#64748B"
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
                placeholderTextColor="#64748B"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>

            {/* Zabezpieczenie Captcha */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Zabezpieczenie przed botami (przepisz kod)</Text>
              <View style={styles.captchaBoxContainer}>
                <View style={styles.captchaVisualBox}>
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
                style={[styles.input, { marginTop: 10 }]}
                placeholder="Wpisz dokładnie powyższy kod"
                placeholderTextColor="#64748B"
                autoCapitalize="none"
                autoCorrect={false}
                value={userCaptchaInput}
                onChangeText={setUserCaptchaInput}
              />
            </View>

            {/* Główny przycisk rejestracji w kolorze Mikasy */}
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Tworzenie konta...' : 'ZAREJESTRUJ SIĘ'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Powrót do logowania */}
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

// Stylizacja ekranu rejestracji (Motyw Mikasy: Granat + Żółty, duża czytelność)
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
    paddingVertical: 24,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  backButtonText: {
    color: '#FBBF24',
    fontSize: 18,
    fontWeight: '700',
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
  },
  logo: { 
    fontSize: 48 
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '500',
    textAlign: 'center',
  },
  form: {
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 24,
    borderWidth: 2,
    borderColor: '#334155',
  },
  inputGroup: { 
    marginBottom: 18 
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F1F5F9',
    marginBottom: 8,
  },
  input: {
    borderWidth: 2,
    borderColor: '#334155',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    fontSize: 18,
    backgroundColor: '#0F172A',
    color: '#FFFFFF',
  },
  captchaBoxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  captchaVisualBox: {
    flex: 1,
    height: 64,
    backgroundColor: '#090D16',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#334155',
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
    marginHorizontal: 4,
  },
  noiseItem: {
    position: 'absolute',
    opacity: 0.6,
    zIndex: 1,
  },
  refreshButton: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    height: 64,
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  button: {
    backgroundColor: '#FBBF24', // Żółty kolor piłki Mikasa
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonDisabled: { 
    opacity: 0.6 
  },
  buttonText: {
    color: '#0F172A', // Ciemny kontrastowy tekst na żółtym przycisku
    fontSize: 18,
    fontWeight: '800',
  },
  loginRow: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    marginTop: 28 
  },
  loginText: { 
    color: '#94A3B8', 
    fontSize: 16 
  },
  loginLink: { 
    color: '#FBBF24', 
    fontSize: 16, 
    fontWeight: '800' 
  },
});