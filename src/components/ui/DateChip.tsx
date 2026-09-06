import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatDateChip } from '@/lib/format';
import { brand, radius, type Palette } from '@/constants/app-theme';

type Props = {
  date: string;
  width?: number;
  height?: number;
  dot?: boolean;
  c: Palette;
};

export default function DateChip({ date, width = 52, height = 58, dot, c }: Props) {
  const { day, monthAbbr } = formatDateChip(date);
  // Zamiast osobnych stałych wariantów (spec wymieniał kilka rozmiarów: 46×50, 52×58, 56×62…)
  // skalujemy czcionki proporcjonalnie do 52×58 — każdy ekran może podać dowolny width/height
  // i wygląda spójnie, bez mnożenia niemal identycznych wariantów komponentu.
  const scale = Math.min(width / 52, height / 58);
  const dayFontSize = Math.round(22 * scale);
  const labelFontSize = Math.max(7.5, Math.round(8.5 * scale * 10) / 10);

  return (
    <View style={[styles.box, { width, height, borderRadius: radius.lg }]}>
      <Text style={[styles.label, { fontSize: labelFontSize }]}>{monthAbbr}</Text>
      <Text style={[styles.day, { fontSize: dayFontSize }]}>{day}</Text>
      {dot && <View style={[styles.dot, { borderColor: c.card }]} />}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontWeight: '800', letterSpacing: 1, marginBottom: 2, color: brand.ticketLabel },
  day: { fontWeight: '800', color: '#FFFFFF' },
  dot: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: brand.accent,
    borderWidth: 2,
  },
});
