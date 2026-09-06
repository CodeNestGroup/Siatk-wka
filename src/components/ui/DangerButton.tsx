import React from 'react';
import { Text, View, StyleSheet, ActivityIndicator, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PressableScale from './PressableScale';
import { radius, type Palette } from '@/constants/app-theme';

type Props = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  c: Palette;
  style?: StyleProp<ViewStyle>;
  icon?: keyof typeof Ionicons.glyphMap;
};

export default function DangerButton({
  label,
  onPress,
  disabled,
  loading,
  c,
  style,
  icon = 'log-out-outline',
}: Props) {
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.btn,
        { backgroundColor: c.tintR, borderColor: 'rgba(255,90,95,0.35)' },
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={c.redInk} />
      ) : (
        <View style={styles.row}>
          <Ionicons name={icon} size={17} color={c.redInk} />
          <Text style={[styles.text, { color: c.redInk }]}>{label}</Text>
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  text: { fontSize: 14, fontWeight: '800' },
});
