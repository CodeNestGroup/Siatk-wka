import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { Palette } from '@/constants/app-theme';

type Props = {
  c: Palette;
  compact?: boolean;
};

// Bilet ma overflow:'hidden', więc koła wysunięte o -11 są wizualnie "wycinane" przez krawędź.
export default function TicketPerforation({ c, compact }: Props) {
  const height = compact ? 16 : 20;
  return (
    <View style={[styles.wrap, { height }]}>
      <View style={[styles.circle, { backgroundColor: c.bg, left: -11 }]} />
      <View style={[styles.circle, { backgroundColor: c.bg, right: -11 }]} />
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { justifyContent: 'center' },
  circle: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    top: '50%',
    marginTop: -11,
  },
  line: {
    marginHorizontal: 16,
    borderTopWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.16)',
  },
});
