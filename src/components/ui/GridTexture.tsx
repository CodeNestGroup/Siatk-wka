import React, { useCallback, useState } from 'react';
import { View, StyleSheet, type LayoutChangeEvent } from 'react-native';

const STEP = 22;
const LINE_COLOR = 'rgba(255,255,255,0.045)';

export default function GridTexture() {
  const [size, setSize] = useState({ width: 0, height: 0 });

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  }, []);

  const cols = Math.ceil(size.width / STEP);
  const rows = Math.ceil(size.height / STEP);

  return (
    <View style={[StyleSheet.absoluteFill, styles.noPointerEvents]} onLayout={onLayout}>
      {Array.from({ length: cols }).map((_, i) => (
        <View key={`v${i}`} style={[styles.vLine, { left: i * STEP }]} />
      ))}
      {Array.from({ length: rows }).map((_, i) => (
        <View key={`h${i}`} style={[styles.hLine, { top: i * STEP }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  noPointerEvents: { pointerEvents: 'none' },
  vLine: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: LINE_COLOR },
  hLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: LINE_COLOR },
});
