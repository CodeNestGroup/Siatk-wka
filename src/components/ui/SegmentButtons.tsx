import React, { useEffect } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { brand, radius, shadow, type Palette } from '@/constants/app-theme';
import { tapHaptic } from '@/lib/haptics';

const EASING = Easing.bezier(0.2, 0.8, 0.2, 1);
const PRIMARY_SHADOW = shadow(false).primary;

export type SegmentOption = { key: string; label: string; icon?: keyof typeof Ionicons.glyphMap };

type Props = {
  options: SegmentOption[];
  activeKey: string;
  onChange: (key: string) => void;
  c: Palette;
};

export default function SegmentButtons({ options, activeKey, onChange, c }: Props) {
  return (
    <View style={styles.row}>
      {options.map((opt) => (
        <SegmentButton
          key={opt.key}
          label={opt.label}
          icon={opt.icon}
          active={opt.key === activeKey}
          onPress={() => onChange(opt.key)}
          c={c}
        />
      ))}
    </View>
  );
}

function SegmentButton({
  label,
  icon,
  active,
  onPress,
  c,
}: {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
  c: Palette;
}) {
  const progress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(active ? 1 : 0, { duration: 240, easing: EASING });
  }, [active, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [c.card, brand.primary]),
    borderColor: interpolateColor(progress.value, [0, 1], [c.line, brand.primary]),
    shadowOpacity: progress.value * PRIMARY_SHADOW.shadowOpacity,
    elevation: progress.value * PRIMARY_SHADOW.elevation,
  }));

  const textStyle = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [c.ink2, '#FFFFFF']),
  }));

  return (
    <Pressable
      style={styles.flex}
      onPress={() => {
        tapHaptic();
        onPress();
      }}
    >
      <Animated.View
        style={[
          styles.btn,
          {
            shadowColor: PRIMARY_SHADOW.shadowColor,
            shadowOffset: PRIMARY_SHADOW.shadowOffset,
            shadowRadius: PRIMARY_SHADOW.shadowRadius,
          },
          animatedStyle,
        ]}
      >
        <View style={styles.contentRow}>
          {icon && <Ionicons name={icon} size={13} color={active ? '#FFFFFF' : c.ink2} />}
          <Animated.Text style={[styles.text, textStyle]} numberOfLines={1}>
            {label}
          </Animated.Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 9 },
  flex: { flex: 1 },
  btn: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: 13,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  text: { fontSize: 12.5, fontWeight: '800' },
});
