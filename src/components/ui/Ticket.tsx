import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import GridTexture from './GridTexture';
import { brand, radius, shadow } from '@/constants/app-theme';

const TICKET_SHADOW = shadow(false).ticket;

type Props = {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

// Bez expo-linear-gradient (brak w zależnościach) — pasmo ticketFrom u góry
// nad pełnym tłem ticketBase przybliża gradient z makiety bez nowej paczki.
export default function Ticket({ style, children }: Props) {
  return (
    <View style={[styles.shell, TICKET_SHADOW, style]}>
      <View style={styles.gradientTop} />
      <GridTexture />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: brand.ticketBase,
    borderRadius: radius.ticket,
    overflow: 'hidden',
    position: 'relative',
  },
  gradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%',
    backgroundColor: brand.ticketFrom,
    opacity: 0.9,
  },
  content: {
    position: 'relative',
  },
});
