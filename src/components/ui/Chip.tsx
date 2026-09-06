import React from 'react';
import { Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import PressableScale from './PressableScale';
import { brand, radius, shadow, type Palette } from '@/constants/app-theme';

const PRIMARY_SHADOW = shadow(false).primary;

type Props = {
  label: string;
  active?: boolean;
  onPress?: () => void;
  c: Palette;
  style?: StyleProp<ViewStyle>;
};

export default function Chip({ label, active, onPress, c, style }: Props) {
  return (
    <PressableScale
      onPress={onPress}
      style={[
        styles.chip,
        { backgroundColor: active ? brand.primary : c.chip, borderColor: active ? brand.primary : c.line },
        active ? PRIMARY_SHADOW : null,
        style,
      ]}
    >
      <Text style={[styles.text, { color: active ? '#FFFFFF' : c.ink2 }]} numberOfLines={1}>
        {label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 15,
    paddingVertical: 9,
  },
  text: { fontSize: 12, fontWeight: '800' },
});
