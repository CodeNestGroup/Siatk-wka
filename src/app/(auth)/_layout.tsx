import React from 'react';
import { Stack } from 'expo-router';
import { useAppTheme } from '@/hooks/use-theme';

export default function AuthLayout() {
  const { c } = useAppTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: {
          backgroundColor: c.bg,
        },
      }}
    />
  );
}
