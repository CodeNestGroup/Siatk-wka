import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform, LayoutChangeEvent } from 'react-native';
import { createMaterialTopTabNavigator } from 'expo-router/js-top-tabs';
import { withLayoutContext } from 'expo-router';
import { ParamListBase, TabNavigationState, RouteProp } from 'expo-router/react-navigation';
import { 
  MaterialTopTabNavigationOptions, 
  MaterialTopTabNavigationEventMap 
} from '@react-navigation/material-top-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getCurrentPlayer } from '@/lib/player';
import { supabase } from '@/lib/supabase';
import { syncMatchNotifications } from '@/services/notificationService';

const { Navigator } = createMaterialTopTabNavigator();

export const MaterialTopTabs = withLayoutContext<
  MaterialTopTabNavigationOptions,
  typeof Navigator,
  TabNavigationState<ParamListBase>,
  MaterialTopTabNavigationEventMap
>(Navigator);

// Etykiety zakładek dostosowane dla czytelności
const TAB_LABELS: Record<string, string> = {
  index: 'Nadchodzący',
  ogloszenia: 'Ogłoszenia',
  terminarz: 'Terminarz',
  'moje-zapisy': 'Moje zapisy',
  profil: 'Profil',
};

type TopTabBarProps = {
  state: TabNavigationState<ParamListBase>;
  navigation: any;
};

// Dolny pasek nawigacyjny w stylu Mikasy (zoptymalizowany pod obsługę kciukiem)
function BottomTabBar({ state, navigation }: TopTabBarProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const tabLayouts = useRef<{ [key: number]: { x: number; width: number } }>({});
  const insets = useSafeAreaInsets();

  const handleTabPress = (route: RouteProp<ParamListBase>, index: number, isFocused: boolean) => {
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });
    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name);
    }

    const layout = tabLayouts.current[index];
    if (layout && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        x: Math.max(0, layout.x - 60), 
        animated: true,
      });
    }
  };

  useEffect(() => {
    const currentIndex = state.index;
    const layout = tabLayouts.current[currentIndex];
    if (layout && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        x: Math.max(0, layout.x - 60),
        animated: true,
      });
    }
  }, [state.index]);

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabBar}
      >
        {state.routes.map((route, index: number) => {
          const isFocused = state.index === index;
          const label = TAB_LABELS[route.name] ?? route.name;

          return (
            <TouchableOpacity
              key={route.key}
              onPress={() => handleTabPress(route, index, isFocused)}
              onLayout={(event: LayoutChangeEvent) => {
                const { x, width } = event.nativeEvent.layout;
                tabLayouts.current[index] = { x, width };
              }}
              style={[styles.tabItem, isFocused && styles.tabItemActive]}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default function TabsLayout() {
  // Synchronizacja powiadomień po uruchomieniu zakładek
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
        console.error('Błąd podczas synchronizacji powiadomień w tle:', error);
      }
    };

    initializeNotifications();
  }, []);

  return (
    <MaterialTopTabs
      // Przeniesienie paska zakładek na dół (pozycja tabów jako 'bottom')
      tabBar={(props: any) => <BottomTabBar {...props} />}
      screenOptions={{
        swipeEnabled: true,
        animationEnabled: true,
      }}
    >
      <MaterialTopTabs.Screen name="index" />
      <MaterialTopTabs.Screen name="ogloszenia" />
      <MaterialTopTabs.Screen name="terminarz" />
      <MaterialTopTabs.Screen name="moje-zapisy" />
      <MaterialTopTabs.Screen name="profil" />
    </MaterialTopTabs>
  );
}

// Stylizacja zgodna z motywem Mikasy oraz nastawiona na dużą czytelność
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0F172A', // Głęboki granat/grafit (tło aplikacji)
    borderTopWidth: 2,
    borderTopColor: '#1E293B',
    paddingTop: 8,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 35,
    paddingBottom: 0,
    gap: 10,
  },
  tabItem: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E293B', // Nieaktywny kafel
    minHeight: 48, // Wygodny obszar kliknięcia dla starszych osób
  },
  tabItemActive: {
    backgroundColor: '#FBBF24', // Żółty Mikasa dla aktywnego elementu
  },
  tabLabel: {
    fontSize: 16, // Większa czcionka dla lepszej czytelności
    fontWeight: '700',
    color: '#94A3B8',
  },
  tabLabelActive: {
    color: '#0F172A', // Kontrastowy ciemny tekst na żółtym tle
    fontWeight: '800',
  },
});