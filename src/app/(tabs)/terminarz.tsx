import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { formatMatchDate, formatTime } from '@/lib/format';
import { getCurrentPlayer, Player } from '@/lib/player';
import { syncMatchNotifications } from '@/services/notificationService';
import CustomAlert from '@/components/CustomAlert';

type MatchItem = {
  id: string;
  title: string | null;
  date: string;
  time_start: string;
  time_end: string;
  location: string;
  max_players: number;
  capacity: number | null;
  price_per_player: number;
  status_id: number;
  mainCount?: number;
  totalRegistrationsCount?: number;
  capacityLimit?: number;
  isRegistered?: boolean;
  registrationStatus?: 'main' | 'waitlist';
};

type TabType = 'upcoming' | 'past';

function isMatchFinished(dateStr: string, timeEndStr: string, timeStartStr: string): boolean {
  try {
    const timeString = timeEndStr || timeStartStr || '23:59';
    const matchDateTime = new Date(`${dateStr}T${timeString}`);
    const now = new Date();
    return matchDateTime.getTime() < now.getTime();
  } catch {
    return false;
  }
}

export default function ScheduleScreen() {
  const router = useRouter();
  const systemColorScheme = useColorScheme();

  const [themeMode, setThemeMode] = useState<'system' | 'light' | 'dark'>('system');
  const isDark = themeMode === 'system' ? systemColorScheme === 'dark' : themeMode === 'dark';
  const styles = getStyles(isDark);

  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  const showAlert = (title: string, message: string) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertVisible(true);
  };

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('app_theme_mode');
      if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
        setThemeMode(savedTheme);
      }
    } catch (e) {
      console.error('Błąd wczytywania motywu:', e);
    }
  };

  const loadSchedule = useCallback(async () => {
    const player = await getCurrentPlayer();
    setCurrentPlayer(player);

    const { data: matchesData, error: matchesError } = await supabase
      .from('matches')
      .select('*');

    if (matchesError || !matchesData) {
      showAlert('Błąd', 'Nie udało się pobrać listy meczów: ' + (matchesError?.message || ''));
      setLoading(false);
      return;
    }

    const { data: regsData, error: regsError } = await supabase
      .from('match_registrations')
      .select('match_id, player_id, is_paid, created_at')
      .order('created_at', { ascending: true });

    if (regsError) {
      console.error('Błąd pobierania rejestracji:', regsError);
    }

    const registrations = regsData ?? [];

    const processedMatches: MatchItem[] = matchesData.map((match) => {
      const matchRegs = registrations.filter((r) => r.match_id === match.id);
      const capacityLimit = match.capacity ?? match.max_players ?? 10;

      const mainList = matchRegs.slice(0, capacityLimit);
      const userReg = player ? matchRegs.find((r) => r.player_id === player.id) : null;
      
      let regStatus: 'main' | 'waitlist' | undefined = undefined;
      if (userReg) {
        const isInMain = mainList.some((r) => r.player_id === player?.id);
        regStatus = isInMain ? 'main' : 'waitlist';
      }

      return {
        ...match,
        mainCount: mainList.length,
        totalRegistrationsCount: matchRegs.length,
        capacityLimit,
        isRegistered: !!userReg,
        registrationStatus: regStatus,
      };
    });

    setMatches(processedMatches);
    setLoading(false);

    await syncMatchNotifications(processedMatches);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadThemePreference();
      loadSchedule();
    }, [loadSchedule])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadThemePreference();
    await loadSchedule();
    setRefreshing(false);
  };

  const filteredMatches = matches
    .filter((match) => {
      const finished = isMatchFinished(match.date, match.time_end, match.time_start);
      return activeTab === 'upcoming' ? !finished : finished;
    })
    .sort((a, b) => {
      const timeA = new Date(`${a.date}T${a.time_start}`).getTime();
      const timeB = new Date(`${b.date}T${b.time_start}`).getTime();
      return activeTab === 'upcoming' ? timeA - timeB : timeB - timeA;
    });

  if (loading && matches.length === 0) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['bottom', 'left', 'right']}>
        <ActivityIndicator size="large" color="#2C4BFF" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        onClose={() => setAlertVisible(false)}
      />

      <FlatList
        data={filteredMatches}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#2C4BFF"
          />
        }
        ListHeaderComponent={
          <View>
            <Text style={styles.headerTitle}>Terminarz Meczów</Text>
            <Text style={styles.headerSubtitle}>Wszystkie nadchodzące i archiwalne spotkania</Text>

            <View style={styles.tabsContainer}>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'upcoming' && styles.tabButtonActive]}
                onPress={() => setActiveTab('upcoming')}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, activeTab === 'upcoming' && styles.tabTextActive]}>Nadchodzące</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'past' && styles.tabButtonActive]}
                onPress={() => setActiveTab('past')}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, activeTab === 'past' && styles.tabTextActive]}>Zakończone</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {activeTab === 'upcoming' ? 'Brak nadchodzących meczów.' : 'Brak zakończonych meczów.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const { day, month } = formatMatchDate(item.date);
          const isCancelled = item.status_id === 2;
          const finished = isMatchFinished(item.date, item.time_end, item.time_start);
          const isWaitlist = item.registrationStatus === 'waitlist';
          const title = item.title?.trim() || 'Trening Siatkówki';
          const capacityLimit = item.capacityLimit ?? 10;
          const currentSigned = item.totalRegistrationsCount ?? 0;
          
          return (
            <TouchableOpacity
              style={[styles.matchCard, isCancelled && styles.matchCardCancelled]}
              onPress={() => router.push(`/(match)/${item.id}`)}
              activeOpacity={0.9}
            >
              {!isCancelled && !finished && currentPlayer && item.isRegistered && (
                <View style={[
                  styles.sideStatusBar,
                  isWaitlist ? styles.sideBarWaitlist : styles.sideBarMain
                ]} />
              )}

              <View style={styles.cardInnerContainer}>
                <View style={styles.cardMainRow}>
                  <View style={[styles.dateBox, isCancelled && styles.dateBoxCancelled]}>
                    <Text style={[styles.dateDay, isCancelled && styles.dateDayCancelled]}>{day}</Text>
                    <Text 
                      style={[styles.dateMonth, isCancelled && styles.dateMonthCancelled]} 
                      numberOfLines={1} 
                      adjustsFontSizeToFit
                    >
                      {month}
                    </Text>
                  </View>

                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={styles.titleRow}>
                      <Text style={[styles.matchTitle, isCancelled && styles.matchTitleCancelled]} numberOfLines={1}>
                        {title}
                      </Text>
                      
                      {isCancelled ? (
                        <View style={styles.badgeCancelledBg}>
                          <Text style={styles.badgeCancelledText}>⚠️ Odwołany</Text>
                        </View>
                      ) : (
                        currentPlayer && item.isRegistered && (
                          <View style={[
                            styles.inlineStatusBadge,
                            isWaitlist ? styles.badgeWaitlistBg : styles.badgeMainBg,
                          ]}>
                            <Text style={[
                              styles.inlineStatusText,
                              isWaitlist ? styles.badgeWaitlistText : styles.badgeMainText,
                            ]}>
                              {isWaitlist ? '⏳ Rezerwa' : '✅ Zapisany'}
                            </Text>
                          </View>
                        )
                      )}
                    </View>

                    <View style={styles.iconInfoRow}>
                      <View style={styles.iconContainer}>
                        <Text style={styles.containerIconText}>📍</Text>
                      </View>
                      <Text style={styles.matchInfo} numberOfLines={1}>{item.location}</Text>
                    </View>

                    <View style={styles.iconInfoRow2}>
                      <View style={styles.infoPill}>
                        <Text style={styles.infoPillIcon}>🕒</Text>
                        <Text style={styles.infoPillText}>{formatTime(item.time_start)}</Text>
                      </View>

                      <View style={styles.infoPill}>
                        <Text style={styles.infoPillIcon}>👥</Text>
                        <Text style={styles.infoPillText}>{currentSigned}/{capacityLimit}</Text>
                      </View>

                      <Text style={styles.priceText}>{Number(item.price_per_player)} PLN</Text>
                    </View>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const getStyles = (isDark: boolean) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: isDark ? '#0B1120' : '#F8FAFC' },
    loadingContainer: {
      flex: 1,
      backgroundColor: isDark ? '#0B1120' : '#F8FAFC',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
    },
    listContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32 },

    headerTitle: {
      fontSize: 24,
      fontWeight: '800',
      color: isDark ? '#FFFFFF' : '#0F172A',
    },
    headerSubtitle: {
      fontSize: 14,
      color: isDark ? '#94A3B8' : '#64748B',
      marginTop: 4,
      marginBottom: 16,
      fontWeight: '500',
    },

    tabsContainer: {
      flexDirection: 'row',
      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
      borderRadius: 24,
      padding: 4,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.03,
      shadowRadius: 4,
      elevation: 2,
    },
    tabButton: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
      borderRadius: 20,
    },
    tabButtonActive: {
      backgroundColor: '#2C4BFF',
    },
    tabText: {
      fontSize: 14,
      fontWeight: '700',
      color: isDark ? '#94A3B8' : '#64748B',
    },
    tabTextActive: {
      color: '#FFFFFF',
      fontWeight: '900',
    },

    matchCard: {
      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
      borderRadius: 24,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
      overflow: 'hidden',
      position: 'relative',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.3 : 0.06,
      shadowRadius: 8,
      elevation: 3,
      flexDirection: 'row',
      alignItems: 'stretch',
    },
    matchCardCancelled: { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' },

    sideStatusBar: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 6,
    },
    sideBarMain: { backgroundColor: '#2C4BFF' },
    sideBarWaitlist: { backgroundColor: '#94A3B8' },

    cardInnerContainer: {
      flex: 1,
      padding: 16,
      paddingLeft: 20,
    },
    cardMainRow: { flexDirection: 'row', alignItems: 'center' },
    
    dateBox: {
      width: 68,
      height: 68,
      borderRadius: 18,
      backgroundColor: isDark ? '#0B1120' : '#F8FAFC',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#E2E8F0',
      paddingHorizontal: 4,
    },
    dateBoxCancelled: { borderColor: '#FF5A5F' },
    dateDay: { fontSize: 20, fontWeight: '800', color: '#2C4BFF' },
    dateDayCancelled: { color: '#FF5A5F' },
    dateMonth: { 
      fontSize: 11, 
      fontWeight: '700', 
      color: isDark ? '#94A3B8' : '#64748B', 
      textTransform: 'uppercase',
      textAlign: 'center',
      width: '100%',
    },
    dateMonthCancelled: { color: '#FF5A5F' },

    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    matchTitle: { fontSize: 16, fontWeight: '800', color: isDark ? '#FFFFFF' : '#0F172A', flex: 1, marginRight: 6 },
    matchTitleCancelled: { textDecorationLine: 'line-through', color: isDark ? '#64748B' : '#94A3B8' },

    inlineStatusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10,
    },
    badgeMainBg: { 
      backgroundColor: isDark ? 'rgba(44, 75, 255, 0.25)' : '#EFF6FF', 
      borderWidth: 1, 
      borderColor: isDark ? '#4F6FFF' : '#BFDBFE' 
    },
    badgeWaitlistBg: { 
      backgroundColor: isDark ? 'rgba(148, 163, 184, 0.2)' : '#F1F5F9', 
      borderWidth: 1, 
      borderColor: isDark ? '#64748B' : '#CBD5E1' 
    },
    inlineStatusText: { fontSize: 11, fontWeight: '800' },
    badgeMainText: { color: isDark ? '#93C5FD' : '#2C4BFF' },
    badgeWaitlistText: { color: isDark ? '#CBD5E1' : '#475569' },

    badgeCancelledBg: { backgroundColor: isDark ? 'rgba(255, 90, 95, 0.2)' : '#FEF2F2', borderWidth: 1, borderColor: '#FF5A5F', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    badgeCancelledText: { fontSize: 11, fontWeight: '800', color: '#FF5A5F' },

    iconInfoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
    },
    iconInfoRow2: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 2,
    },
    iconContainer: {
      width: 24,
      height: 24,
      borderRadius: 6,
      backgroundColor: isDark ? '#0B1120' : '#F8FAFC',
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#E2E8F0',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 6,
    },
    containerIconText: {
      fontSize: 11,
    },
    matchInfo: { fontSize: 13, color: isDark ? '#94A3B8' : '#64748B', fontWeight: '500', flex: 1 },
    
    infoPill: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#0B1120' : '#F8FAFC',
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#E2E8F0',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 10,
      marginRight: 6,
    },
    infoPillIcon: {
      fontSize: 11,
      marginRight: 4,
    },
    infoPillText: {
      fontSize: 12,
      fontWeight: '700',
      color: isDark ? '#FFFFFF' : '#0F172A',
    },

    priceText: {
      fontSize: 14,
      fontWeight: '800',
      color: isDark ? '#FFFFFF' : '#0F172A',
    },

    emptyState: { paddingVertical: 40, alignItems: 'center' },
    emptyText: { fontSize: 15, color: isDark ? '#94A3B8' : '#64748B', fontStyle: 'italic', fontWeight: '500' },
  });