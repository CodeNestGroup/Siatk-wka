import React from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { tapHaptic } from '@/lib/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const SPRING = { damping: 18, stiffness: 320 };

type Props = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  /** Wyłącza lekką wibrację dotyku (np. dla kontrolek, które i tak mają własny, mocniejszy sygnał). */
  disableHaptic?: boolean;
  children?: React.ReactNode;
};

// Wspólny "klikalny" element całej aplikacji: skalowanie przy dotyku + jedno miejsce,
// z którego każdy przycisk/kafelek dostaje lekką wibrację (zob. src/lib/haptics.ts).
export default function PressableScale({
  style,
  scaleTo = 0.972,
  disableHaptic,
  onPressIn,
  onPressOut,
  children,
  ...rest
}: Props) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      style={[animatedStyle, style]}
      android_ripple={{ color: 'rgba(124,147,255,0.14)' }}
      onPressIn={(e) => {
        scale.value = withSpring(scaleTo, SPRING);
        if (!disableHaptic) tapHaptic();
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, SPRING);
        onPressOut?.(e);
      }}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
