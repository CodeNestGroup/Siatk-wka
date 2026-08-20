import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';

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
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertBox: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#334155',
  },
  indicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 16,
    backgroundColor: '#FBBF24',
  },
  errorIndicator: {
    backgroundColor: '#F87171',
  },
  successIndicator: {
    backgroundColor: '#34D399',
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#94A3B8',
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
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderWidth: 2,
    borderColor: '#334155',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  errorButton: {
    flex: 1,
    backgroundColor: '#FBBF24',
  },
  successButton: {
    flex: 1,
    backgroundColor: '#FBBF24',
  },
  buttonText: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '900',
  },
});