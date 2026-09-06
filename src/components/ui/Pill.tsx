import React from 'react';
import { Text, View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { brand, radius, type Palette } from '@/constants/app-theme';

export type PillVariant =
  | 'blue'
  | 'amber'
  | 'green'
  | 'red'
  | 'neutral'
  | 'solidAmber'
  | 'solidBlue'
  | 'solidGreen';

type Props = {
  label: string;
  variant?: PillVariant;
  c: Palette;
  style?: StyleProp<ViewStyle>;
};

function colorsFor(variant: PillVariant, c: Palette): { bg: string; fg: string } {
  switch (variant) {
    case 'blue':
      return { bg: c.tintB, fg: c.priInk };
    case 'amber':
      return { bg: c.tintA, fg: c.amberInk };
    case 'green':
      return { bg: c.tintG, fg: c.greenInk };
    case 'red':
      return { bg: c.tintR, fg: c.redInk };
    case 'solidAmber':
      return { bg: brand.accent, fg: '#4A2D00' };
    case 'solidBlue':
      return { bg: brand.primary, fg: '#FFFFFF' };
    case 'solidGreen':
      return { bg: brand.success, fg: '#04281D' };
    case 'neutral':
    default:
      return { bg: 'rgba(148,163,184,0.18)', fg: c.ink2 };
  }
}

export default function Pill({ label, variant = 'neutral', c, style }: Props) {
  const { bg, fg } = colorsFor(variant, c);
  return (
    <View style={[styles.pill, { backgroundColor: bg }, style]}>
      <Text style={[styles.text, { color: fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 9,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
});
