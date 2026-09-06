import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, DeviceEventEmitter } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming, ZoomIn } from 'react-native-reanimated';
import PressableScale from './PressableScale';
import { radius, shadow, type Palette } from '@/constants/app-theme';
import { TOAST_EVENT, type ToastPayload } from '@/lib/toast';

const EASING = Easing.bezier(0.2, 0.8, 0.2, 1);
const DURATION = 5000;

type Props = {
  c: Palette;
  isDark: boolean;
  bottom: number;
};

// Kolejka toastów trzymana w jednym miejscu (ten hook + DeviceEventEmitter) —
// każdy ekran montuje własny ToastHost we właściwej dla siebie pozycji (nad zakładkami / nad kompozytorem).
export default function ToastHost({ c, isDark, bottom }: Props) {
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const progress = useSharedValue(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(TOAST_EVENT, (payload: ToastPayload) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setToast(payload);
      progress.value = 1;
      progress.value = withTiming(0, { duration: DURATION, easing: EASING });
      timerRef.current = setTimeout(() => setToast(null), DURATION);
    });
    return () => {
      sub.remove();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [progress]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  if (!toast) return null;

  const close = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast(null);
  };

  return (
    <Animated.View
      entering={ZoomIn.duration(260)}
      style={[styles.wrap, { bottom, backgroundColor: c.card, borderColor: c.line }, shadow(isDark).card]}
      key={toast.id}
    >
      <View style={[styles.iconBox, { backgroundColor: c.tintB }]}>
        <Ionicons name={(toast.icon as any) ?? 'checkmark-circle'} size={16} color={c.priInk} />
      </View>
      <Text style={[styles.text, { color: c.ink }]} numberOfLines={2}>
        {toast.message}
      </Text>
      <PressableScale onPress={close} hitSlop={8}>
        <Text style={[styles.close, { color: c.ink3 }]}>ZAMKNIJ</Text>
      </PressableScale>
      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, barStyle]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 14,
    right: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingBottom: 14,
    gap: 10,
    overflow: 'hidden',
    zIndex: 50,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, fontSize: 12.5, fontWeight: '700' },
  close: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.4 },
  barTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    backgroundColor: 'rgba(148,163,184,0.25)',
  },
  barFill: { height: 3, backgroundColor: '#2C4BFF' },
});
