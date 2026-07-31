import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/app-theme';

export default function TerminarzScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Text style={styles.title}>Terminarz</Text>
      <Text style={styles.subtitle}>Tu pojawi się lista rozgrywek</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  title: { fontSize: 24, fontWeight: '700', color: colors.foreground, marginTop: 8 },
  subtitle: { fontSize: 14, color: colors.mutedForeground, marginTop: 4 },
});