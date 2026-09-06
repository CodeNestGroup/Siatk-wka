import React from 'react';
import { Text, StyleSheet, ActivityIndicator, type StyleProp, type ViewStyle } from 'react-native';
import PressableScale from './PressableScale';
import { brand, radius, shadow } from '@/constants/app-theme';

const PRIMARY_SHADOW = shadow(false).primary;

type Props = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export default function PrimaryButton({ label, onPress, disabled, loading, style }: Props) {
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.btn, PRIMARY_SHADOW, (disabled || loading) && styles.disabled, style]}
    >
      {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.text}>{label}</Text>}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: brand.primary,
    borderRadius: radius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.6 },
  text: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});
