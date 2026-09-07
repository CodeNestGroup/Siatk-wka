import React, { useCallback, useState } from 'react';
import { StyleSheet, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  interpolateColor,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { brand, radius, shadow, type Palette } from '@/constants/app-theme';
import { successHaptic } from '@/lib/haptics';

const HANDLE_SIZE = 44;
const TRACK_HEIGHT = 50;
const PRIMARY_SHADOW = shadow(false).primary;
// Dociągnięcie do co najmniej tej części toru liczy się jako potwierdzenie — nie trzeba
// dojechać idealnie do samej krawędzi piksel w piksel.
const SUCCESS_THRESHOLD = 0.92;

type Props = {
  onVerified: (verified: boolean) => void;
  c: Palette;
};

// Zamiennik Cloudflare Turnstile (widget webowy w WebView zawodził na realnych telefonach —
// zależność od zewnętrznej domeny/klucza witryny i niestabilnego renderowania w WebView).
// To w pełni natywna, lokalna weryfikacja "przesuń, aby potwierdzić" — bez sieci, bez
// zewnętrznych usług, więc nie może wywrócić się z powodu problemu po stronie trzeciej.
// Tak jak honeypot i minimalny czas wypełniania (patrz src/lib/antiBot.ts), to nie jest
// kryptograficzne zabezpieczenie — podnosi tylko poprzeczkę dla prostych botów wypełniających
// formularz programowo, bez symulowania gestu przeciągnięcia.
//
// Kolorystyka pożyczona wprost z reszty systemu projektowego, żeby nie wyglądało jak wklejony
// gotowiec: brand.primary (ten sam niebieski co PrimaryButton) w trakcie przeciągania, brand.success
// (ta sama zieleń co plakietka "OPŁACONE"/"TY") po potwierdzeniu, radius.lg i cień PrimaryButtona.
export default function SliderCaptcha({ onVerified, c }: Props) {
  const [trackWidth, setTrackWidth] = useState(0);
  const translateX = useSharedValue(0);
  const verified = useSharedValue(false);
  const maxTranslate = useSharedValue(0);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    setTrackWidth(width);
    maxTranslate.value = Math.max(0, width - HANDLE_SIZE);
  }, [maxTranslate]);

  const [iconVerified, setIconVerified] = useState(false);

  const handleVerified = useCallback(() => {
    successHaptic();
    setIconVerified(true);
    onVerified(true);
  }, [onVerified]);

  const pan = Gesture.Pan()
    // Ekran rejestracji jest w pionowym ScrollView — bez jawnych progów aktywacji poziomy gest
    // przeciągnięcia bywa "wygrywany" przez scroll strony (albo w ogóle nie aktywuje się przy
    // przeciąganiu palcem, bo scroll rozpoznaje ruch pierwszy). activeOffsetX aktywuje pan przy
    // najmniejszym ruchu w poziomie; failOffsetY oddaje gest scrollowi przy ruchu w pionie.
    .activeOffsetX([-5, 5])
    .failOffsetY([-12, 12])
    .onChange((e) => {
      if (verified.value) return;
      const next = translateX.value + e.changeX;
      translateX.value = Math.max(0, Math.min(maxTranslate.value, next));
    })
    .onEnd(() => {
      if (verified.value) return;
      if (maxTranslate.value > 0 && translateX.value >= maxTranslate.value * SUCCESS_THRESHOLD) {
        translateX.value = withTiming(maxTranslate.value, { duration: 150 });
        verified.value = true;
        runOnJS(handleVerified)();
      } else {
        translateX.value = withSpring(0, { damping: 16 });
      }
    });

  const handleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    backgroundColor: interpolateColor(verified.value ? 1 : 0, [0, 1], [brand.primary, brand.success]),
  }));

  const fillStyle = useAnimatedStyle(() => ({
    width: translateX.value + HANDLE_SIZE / 2,
    backgroundColor: interpolateColor(verified.value ? 1 : 0, [0, 1], [c.tintB, c.tintG]),
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: maxTranslate.value > 0 ? 1 - translateX.value / maxTranslate.value : 1,
  }));

  const trackAnimatedStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(verified.value ? 1 : 0, [0, 1], [c.line, 'rgba(16,185,129,0.4)']),
  }));

  return (
    <Animated.View
      style={[styles.track, { backgroundColor: c.card2 }, trackAnimatedStyle]}
      onLayout={onLayout}
    >
      <Animated.View style={[styles.fill, fillStyle]} />
      <Animated.Text style={[styles.label, { color: c.ink2 }, labelStyle]} numberOfLines={1}>
        Przesuń, aby potwierdzić że jesteś człowiekiem
      </Animated.Text>
      {trackWidth > 0 && (
        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.handle, PRIMARY_SHADOW, handleStyle]}>
            <Ionicons name={iconVerified ? 'checkmark' : 'chevron-forward'} size={20} color="#FFFFFF" />
          </Animated.View>
        </GestureDetector>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: TRACK_HEIGHT,
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  label: {
    textAlign: 'center',
    fontSize: 12.5,
    fontWeight: '700',
  },
  handle: {
    position: 'absolute',
    left: 0,
    top: 3,
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: HANDLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
