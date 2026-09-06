import React, { useEffect } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { createMaterialTopTabNavigator } from 'expo-router/js-top-tabs';
import { withLayoutContext } from 'expo-router';
import { ParamListBase, TabNavigationState, RouteProp } from 'expo-router/react-navigation';
import {
  MaterialTopTabNavigationOptions,
  MaterialTopTabNavigationEventMap,
} from '@react-navigation/material-top-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { getCurrentPlayer } from '@/lib/player';
import { supabase } from '@/lib/supabase';
import { syncMatchNotifications } from '@/services/notificationService';
import { tapHaptic } from '@/lib/haptics';
import { useAppTheme } from '@/hooks/use-theme';
import { useBadgeCounts } from '@/hooks/use-badges';
import { brand, radius, shadow, type Palette } from '@/constants/app-theme';

const { Navigator } = createMaterialTopTabNavigator();

export const MaterialTopTabs = withLayoutContext<
  MaterialTopTabNavigationOptions,
  typeof Navigator,
  TabNavigationState<ParamListBase>,
  MaterialTopTabNavigationEventMap
>(Navigator);

const EASING = Easing.bezier(0.2, 0.8, 0.2, 1);
const PRIMARY_SHADOW = shadow(false).primary;

const TAB_META: Record<
  string,
  { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap; label: string }
> = {
  ogloszenia: { active: 'megaphone', inactive: 'megaphone-outline', label: 'Ogłoszenia' },
  terminarz: { active: 'calendar', inactive: 'calendar-outline', label: 'Terminarz' },
  index: { active: 'home', inactive: 'home-outline', label: 'Start' },
  'moje-zapisy': { active: 'checkbox', inactive: 'checkbox-outline', label: 'Moje zapisy' },
  profil: { active: 'person', inactive: 'person-outline', label: 'Profil' },
};

type TopTabBarProps = {
  state: TabNavigationState<ParamListBase>;
  navigation: any;
};

function TabButton({
  routeName,
  isFocused,
  onPress,
  c,
  showDot,
}: {
  routeName: string;
  isFocused: boolean;
  onPress: () => void;
  c: Palette;
  showDot: boolean;
}) {
  const meta = TAB_META[routeName] ?? { active: 'ellipse', inactive: 'ellipse-outline', label: routeName };
  const progress = useSharedValue(isFocused ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(isFocused ? 1 : 0, { duration: 240, easing: EASING });
  }, [isFocused, progress]);

  const pillStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], ['transparent', brand.primary]),
    transform: [{ translateY: progress.value * -2 }],
    shadowOpacity: progress.value * PRIMARY_SHADOW.shadowOpacity,
    elevation: progress.value * PRIMARY_SHADOW.elevation,
  }));

  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [c.ink2, c.priInk]),
  }));

  return (
    <Pressable
      style={styles.tabItemWrapper}
      onPress={() => {
        tapHaptic();
        onPress();
      }}
      hitSlop={4}
    >
      <Animated.View
        style={[
          styles.pill,
          {
            shadowColor: PRIMARY_SHADOW.shadowColor,
            shadowOffset: PRIMARY_SHADOW.shadowOffset,
            shadowRadius: PRIMARY_SHADOW.shadowRadius,
          },
          pillStyle,
        ]}
      >
        <Ionicons name={isFocused ? meta.active : meta.inactive} size={21} color={isFocused ? '#FFFFFF' : c.ink2} />
        {showDot && <View style={[styles.dot, { borderColor: c.card }]} />}
      </Animated.View>
      <Animated.Text style={[styles.label, labelStyle, isFocused && styles.labelActive]} numberOfLines={1}>
        {meta.label}
      </Animated.Text>
    </Pressable>
  );
}

// Pełnoekranowy dolny pasek nawigacyjny do samego dołu ekranu
function BottomTabBar({ state, navigation }: TopTabBarProps) {
  const insets = useSafeAreaInsets();
  const { c } = useAppTheme();
  const { announcementsCount, matchesCount } = useBadgeCounts();

  const handleTabPress = (route: RouteProp<ParamListBase>, isFocused: boolean) => {
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });
    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: c.card, borderTopColor: c.line }]}>
      <View style={styles.tabBar}>
        {state.routes.map((route, index: number) => {
          const isFocused = state.index === index;
          const showDot =
            (route.name === 'ogloszenia' && announcementsCount > 0) ||
            (route.name === 'terminarz' && matchesCount > 0);

          return (
            <TabButton
              key={route.key}
              routeName={route.name}
              isFocused={isFocused}
              onPress={() => handleTabPress(route, isFocused)}
              c={c}
              showDot={showDot}
            />
          );
        })}
      </View>
      <View style={[styles.systemButtonsSpacer, { height: Math.max(insets.bottom, 26), backgroundColor: c.card }]} />
    </View>
  );
}

export default function TabsLayout() {
  const { isDark, c } = useAppTheme();

  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        const player = await getCurrentPlayer();
        if (!player) return;

        const { data: matchesData } = await supabase.from('matches').select('*');
        const { data: regsData } = await supabase
          .from('match_registrations')
          .select('match_id, player_id')
          .eq('player_id', player.id);

        if (matchesData) {
          const registeredMatchIds = new Set((regsData || []).map((r) => r.match_id));
          const formattedMatches = matchesData.map((m) => ({
            id: m.id,
            title: m.title,
            date: m.date,
            time_start: m.time_start,
            location: m.location,
            status_id: m.status_id,
            isRegistered: registeredMatchIds.has(m.id),
          }));
          await syncMatchNotifications(formattedMatches);
        }
      } catch (error) {
        console.error('Błąd synchronizacji powiadomień:', error);
      }
    };

    initializeNotifications();
  }, []);

  return (
    <MaterialTopTabs
      key={isDark ? 'dark' : 'light'}
      tabBar={(props: any) => <BottomTabBar {...props} />}
      tabBarPosition="bottom"
      screenOptions={{
        swipeEnabled: true,
        animationEnabled: true,
        lazy: false,
        sceneStyle: {
          backgroundColor: c.bg,
        },
      }}
    >
      <MaterialTopTabs.Screen name="ogloszenia" options={{ title: 'Ogłoszenia' }} />
      <MaterialTopTabs.Screen name="terminarz" options={{ title: 'Terminarz' }} />
      <MaterialTopTabs.Screen name="index" options={{ title: 'Start' }} />
      <MaterialTopTabs.Screen name="moje-zapisy" options={{ title: 'Moje zapisy' }} />
      <MaterialTopTabs.Screen name="profil" options={{ title: 'Profil' }} />
    </MaterialTopTabs>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderTopWidth: 1,
  },
  systemButtonsSpacer: {
    width: '100%',
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    paddingTop: 8,
    paddingBottom: 6,
    paddingHorizontal: 8,
  },
  tabItemWrapper: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  pill: {
    width: 52,
    height: 32,
    borderRadius: radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    position: 'absolute',
    top: 2,
    right: 8,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: brand.accent,
    borderWidth: 2,
  },
  label: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  labelActive: {
    fontWeight: '800',
  },
});
