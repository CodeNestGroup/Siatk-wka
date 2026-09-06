import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { brand, radius, space, shadow, type Palette } from '@/constants/app-theme';

export type CardAccent = 'blue' | 'amber' | 'green' | 'red';

type Props = {
  c: Palette;
  isDark: boolean;
  accent?: CardAccent;
  /** Subtelne czerwone tło + obramowanie — np. dla odwołanego meczu. Celowo stonowane (tintR), nie pełna czerwień. */
  danger?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

const ACCENT_COLOR: Record<CardAccent, string> = {
  blue: brand.primary,
  amber: brand.accent,
  green: brand.success,
  red: brand.danger,
};

export default function Card({ c, isDark, accent, danger, style, children }: Props) {
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: c.card, borderColor: c.line },
        shadow(isDark).card,
        danger ? { backgroundColor: c.tintR, borderColor: 'rgba(255,90,95,0.35)' } : null,
        accent ? { borderLeftWidth: 4, borderLeftColor: ACCENT_COLOR[accent] } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: space.cardPad,
  },
});
