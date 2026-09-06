import { Stack } from 'expo-router';

export default function AnnouncementLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
        gestureDirection: 'horizontal',
        animationDuration: 320,
      }}
    />
  );
}
