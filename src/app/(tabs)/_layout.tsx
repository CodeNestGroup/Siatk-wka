import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform, LayoutChangeEvent } from 'react-native';
import { createMaterialTopTabNavigator } from 'expo-router/js-top-tabs';
import { withLayoutContext } from 'expo-router';
import { ParamListBase, TabNavigationState, RouteProp } from 'expo-router/react-navigation';
import { 
  MaterialTopTabNavigationOptions, 
  MaterialTopTabNavigationEventMap 
} from '@react-navigation/material-top-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '@/constants/app-theme';

const { Navigator } = createMaterialTopTabNavigator();

export const MaterialTopTabs = withLayoutContext<
  MaterialTopTabNavigationOptions,
  typeof Navigator,
  TabNavigationState<ParamListBase>,
  MaterialTopTabNavigationEventMap
>(Navigator);

const TAB_LABELS: Record<string, string> = {
  index: 'Nadchodzący mecz',
  ogloszenia: 'Ogłoszenia',
  terminarz: 'Terminarz',
  'moje-zapisy': 'Moje zapisy',
  profil: 'Profil',
};

type TopTabBarProps = {
  state: TabNavigationState<ParamListBase>;
  navigation: any;
};

function TopTabBar({ state, navigation }: TopTabBarProps) {
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
        x: Math.max(0, layout.x - 80), 
        animated: true,
      });
    }
  };

  React.useEffect(() => {
    const currentIndex = state.index;
    const layout = tabLayouts.current[currentIndex];
    if (layout && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        x: Math.max(0, layout.x - 80),
        animated: true,
      });
    }
  }, [state.index]);

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 12 : 16) }]}>
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
              activeOpacity={0.7}
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
  return (
    <MaterialTopTabs
      tabBar={(props: any) => <TopTabBar {...props} />}
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

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 4,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  tabItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius['2xl'],
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.muted + '40',
  },
  tabItemActive: {
    backgroundColor: colors.primary,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  tabLabelActive: {
    color: colors.primaryForeground,
  },
});