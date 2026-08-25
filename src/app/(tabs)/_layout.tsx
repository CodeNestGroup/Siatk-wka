import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, useColorScheme, DeviceEventEmitter, LayoutChangeEvent } from 'react-native';
import { createMaterialTopTabNavigator } from 'expo-router/js-top-tabs';
import { withLayoutContext, useFocusEffect } from 'expo-router';
import { ParamListBase, TabNavigationState, RouteProp } from 'expo-router/react-navigation';
import { 
  MaterialTopTabNavigationOptions, 
  MaterialTopTabNavigationEventMap 
} from '@react-navigation/material-top-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

const TAB_CONFIG: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  index: { active: 'home', inactive: 'home-outline' },
  ogloszenia: { active: 'megaphone', inactive: 'megaphone-outline' },
  terminarz: { active: 'calendar', inactive: 'calendar-outline' },
  'moje-zapisy': { active: 'checkbox', inactive: 'checkbox-outline' },
  profil: { active: 'person', inactive: 'person-outline' },
};

type TopTabBarProps = {
  state: TabNavigationState<ParamListBase>;
  navigation: any;
};

// Pełnoekranowy dolny pasek nawigacyjny do samego dołu ekranu
function BottomTabBar({ state, navigation }: TopTabBarProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const tabLayouts = useRef<{ [key: number]: { x: number; width: number } }>({});
  const insets = useSafeAreaInsets();
  
  const systemColorScheme = useColorScheme();
  const [isDark, setIsDark] = useState(systemColorScheme === 'dark');

  useEffect(() => {
    const checkTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('app_theme_mode');
        if (savedTheme) {
          setIsDark(savedTheme === 'system' ? systemColorScheme === 'dark' : savedTheme === 'dark');
        } else {
          setIsDark(systemColorScheme === 'dark');
        }
      } catch (e) {
        // fallback
      }
    };
    checkTheme();

    const sub = DeviceEventEmitter.addListener('themeChanged', checkTheme);
    return () => sub.remove();
  }, [systemColorScheme]);

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
        x: Math.max(0, layout.x - 40), 
        animated: true,
      });
    }
  };

  useEffect(() => {
    const currentIndex = state.index;
    const layout = tabLayouts.current[currentIndex];
    if (layout && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        x: Math.max(0, layout.x - 40),
        animated: true,
      });
    }
  }, [state.index]);

  const styles = getStyles(isDark, insets.bottom);

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabBar}
      >
        {state.routes.map((route, index: number) => {
          const isFocused = state.index === index;
          const icons = TAB_CONFIG[route.name] || { active: 'ellipse', inactive: 'ellipse-outline' };

          return (
            <View
              key={route.key}
              onLayout={(event: LayoutChangeEvent) => {
                const { x, width } = event.nativeEvent.layout;
                tabLayouts.current[index] = { x, width };
              }}
              style={styles.tabItemWrapper}
            >
              <View 
                style={[styles.tabItem, isFocused && styles.tabItemActive]}
                onTouchEnd={() => handleTabPress(route, index, isFocused)}
              >
                <Ionicons 
                  name={isFocused ? icons.active : icons.inactive} 
                  size={22} 
                  color={isFocused ? (isDark ? '#0B1120' : '#FFFFFF') : (isDark ? '#94A3B8' : '#64748B')} 
                />
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default function TabsLayout() {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<'system' | 'light' | 'dark'>('system');
  const [refreshKey, setRefreshKey] = useState(0);

  const isDark = themeMode === 'system' ? systemColorScheme === 'dark' : themeMode === 'dark';

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('app_theme_mode');
      if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
        setThemeMode(savedTheme);
      }
    } catch (e) {
      console.error('Błąd wczytywania motywu w nawigatorze:', e);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadThemePreference();
    }, [])
  );

  useEffect(() => {
    loadThemePreference();

    const subscription = DeviceEventEmitter.addListener('themeChanged', () => {
      loadThemePreference();
      setRefreshKey((prev) => prev + 1);
    });

    return () => {
      subscription.remove();
    };
  }, []);

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
      key={`${themeMode}-${refreshKey}`}
      tabBar={(props: any) => <BottomTabBar {...props} />}
      tabBarPosition="bottom"
      screenOptions={{
        swipeEnabled: true,
        animationEnabled: true,
        lazy: false,
        // Automatyczne odsuwanie zawartości każdej karty w górę, aby pasek jej nie zasłaniał
        sceneStyle: {
          backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
        },
      }}
    >
      <MaterialTopTabs.Screen name="index" options={{ title: 'Start' }} />
      <MaterialTopTabs.Screen name="ogloszenia" options={{ title: 'Ogłoszenia' }} />
      <MaterialTopTabs.Screen name="terminarz" options={{ title: 'Terminarz' }} />
      <MaterialTopTabs.Screen name="moje-zapisy" options={{ title: 'Moje zapisy' }} />
      <MaterialTopTabs.Screen name="profil" options={{ title: 'Profil' }} />
    </MaterialTopTabs>
  );
}

const getStyles = (isDark: boolean, bottomInset: number) =>
  StyleSheet.create({
    container: {
      width: '100%',
      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
      paddingTop: 5,
      paddingBottom: 40,
      
      elevation: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowRadius: 10,
      shadowOpacity: isDark ? 0.3 : 0.05,
    },
    tabBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      width: '100%',
      paddingHorizontal: 16,
    },
    tabItemWrapper: {
      flex: 1,
      alignItems: 'center',
    },
    tabItem: {
      width: 50,
      height: 42,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'transparent',
    },
    tabItemActive: {
      backgroundColor: '#2C4BFF',
      shadowColor: '#2C4BFF',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 3,
    },
  });