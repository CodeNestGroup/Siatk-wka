import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MojeZapisyScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Text style={styles.title}>Moje zapisy</Text>
      <Text style={styles.subtitle}>Tu zobaczysz gry, na które się zapisałeś</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f8', padding: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#1a1a1a', marginTop: 8 },
  subtitle: { fontSize: 14, color: '#8a8a8e', marginTop: 4 },
});