import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import GridTexture from './GridTexture';
import { brand, radius, shadow } from '@/constants/app-theme';

const TICKET_SHADOW = shadow(false).ticket;
// Większy promień niż poprzednio + niższa siła w centrum — dokładniej odwzorowuje delikatną,
// mocno rozmytą poświatę biletu na stronie WWW klubu (tam: 20%/10% krycia plus duży blur),
// zamiast intensywnego, skoncentrowanego koła.
const GLOW_SIZE = 360;

type Props = {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

// Gradient 135° granatu (identyczny jak na esco-volleymanager.vercel.app) plus dwie miękkie
// "poświaty" w rogach — niebieska i złota. Prawdziwy, płynnie zanikający do przezroczystości
// gradient radialny (SVG), a nie płaskie koło z twardą krawędzią jak we wcześniejszej wersji.
export default function Ticket({ style, children }: Props) {
  return (
    <View style={[styles.shell, TICKET_SHADOW, style]}>
      <LinearGradient
        colors={brand.ticketGradient}
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Svg width={GLOW_SIZE} height={GLOW_SIZE} style={styles.glowBlue} pointerEvents="none">
        <Defs>
          <RadialGradient id="glowBlue" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={brand.primary} stopOpacity={0.2} />
            <Stop offset="55%" stopColor={brand.primary} stopOpacity={0.08} />
            <Stop offset="100%" stopColor={brand.primary} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width={GLOW_SIZE} height={GLOW_SIZE} fill="url(#glowBlue)" />
      </Svg>
      <Svg width={GLOW_SIZE} height={GLOW_SIZE} style={styles.glowGold} pointerEvents="none">
        <Defs>
          <RadialGradient id="glowGold" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={brand.ticketAccent} stopOpacity={0.1} />
            <Stop offset="55%" stopColor={brand.ticketAccent} stopOpacity={0.04} />
            <Stop offset="100%" stopColor={brand.ticketAccent} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width={GLOW_SIZE} height={GLOW_SIZE} fill="url(#glowGold)" />
      </Svg>
      <GridTexture />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: radius.ticket,
    overflow: 'hidden',
    position: 'relative',
  },
  glowBlue: {
    position: 'absolute',
    top: -GLOW_SIZE * 0.4,
    right: -GLOW_SIZE * 0.4,
  },
  glowGold: {
    position: 'absolute',
    bottom: -GLOW_SIZE * 0.4,
    left: -GLOW_SIZE * 0.4,
  },
  content: {
    position: 'relative',
  },
});
