import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type CustomAlertProps = {
  visible: boolean;
  title: string;
  message: string;
  type?: 'error' | 'success' | 'info';
  confirmText?: string;
  cancelText?: string;
  onClose: () => void;
  onCancel?: () => void;
};

export default function CustomAlert({
  visible,
  title,
  message,
  type = 'error',
  confirmText = 'OK',
  cancelText,
  onClose,
  onCancel,
}: CustomAlertProps) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<'system' | 'light' | 'dark'>('system');

  const isDark = themeMode === 'system' ? systemColorScheme === 'dark' : themeMode === 'dark';
  const styles = getStyles(isDark);
  const isError = type === 'error';

  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('app_theme_mode');
        if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
          setThemeMode(savedTheme);
        }
      } catch (e) {
        console.error('Błąd wczytywania motywu w CustomAlert:', e);
      }
    };
    if (visible) {
      loadThemePreference();
    }
  }, [visible]);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.alertBox}>
          <View style={[styles.indicator, isError ? styles.errorIndicator : styles.successIndicator]} />

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.buttonContainer}>
            {cancelText && onCancel && (
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onCancel}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>{cancelText}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.button, 
                styles.actionButton,
                cancelText ? { flex: 1 } : { width: '100%' }
              ]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const getStyles = (isDark: boolean) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    alertBox: {
      width: '100%',
      maxWidth: 340,
      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
      borderRadius: 24,
      padding: 24,
      alignItems: 'center',
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: isDark ? 0.4 : 0.1,
      shadowRadius: 12,
      elevation: 6,
    },
    indicator: {
      width: 40,
      height: 4,
      borderRadius: 2,
      marginBottom: 16,
    },
    errorIndicator: {
      backgroundColor: '#FF5A5F',
    },
    successIndicator: {
      backgroundColor: '#2C4BFF',
    },
    title: {
      fontSize: 18,
      fontWeight: '800',
      color: isDark ? '#FFFFFF' : '#0F172A',
      marginBottom: 8,
      textAlign: 'center',
    },
    message: {
      fontSize: 14,
      color: isDark ? '#94A3B8' : '#64748B',
      textAlign: 'center',
      marginBottom: 24,
      lineHeight: 20,
      fontWeight: '500',
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: 10,
      width: '100%',
    },
    button: {
      paddingVertical: 14,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelButton: {
      flex: 1,
      // Poprawiono kontrast w trybie jasnym i ciemnym dla przycisku anulowania / drugorzędnego
      backgroundColor: isDark ? '#0B1120' : '#F1F5F9',
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#CBD5E1',
    },
    cancelButtonText: {
      // Czytelny kolor tekstu zależny od motywu
      color: isDark ? '#F1F5F9' : '#334155',
      fontSize: 15,
      fontWeight: '700',
    },
    actionButton: {
      // Główny przycisk akcji (np. Wyloguj / Potwierdź) z wyrazistym, spójnym tłem
      backgroundColor: '#2C4BFF',
    },
    buttonText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '800',
    },
  });