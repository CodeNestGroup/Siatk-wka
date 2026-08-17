import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { colors, radius, shadow } from '@/constants/app-theme';

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
  const isError = type === 'error';

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
                isError ? styles.errorButton : styles.successButton,
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

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
    marginBottom: 16,
  },
  errorIndicator: {
    backgroundColor: '#ef4444',
  },
  successIndicator: {
    backgroundColor: '#22c55e',
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
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  button: {
    paddingVertical: 12,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.muted,
  },
  cancelButtonText: {
    color: colors.foreground,
    fontSize: 15,
    fontWeight: '600',
  },
  errorButton: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  successButton: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  buttonText: {
    color: colors.primaryForeground,
    fontSize: 15,
    fontWeight: '700',
  },
});