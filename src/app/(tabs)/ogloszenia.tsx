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
import * as Notifications from 'expo-notifications';
import { supabase } from '@/lib/supabase';
import { formatRelativeDate } from '@/lib/format';
import { getCurrentPlayer, Player } from '@/lib/player';
import CustomAlert from '@/components/CustomAlert';

type MatchDetails = {
  id: string;
  title: string | null;
  date: string;
  time_start: string;
  time_end: string;
  location: string;
  status_id: number;
};

type AnnouncementCategory = {
  id: number;
  name: string;
};

type Announcement = {
  id: string;
  title: string;
  content: string;
  category_id: number | null;
  is_pinned: boolean;
  author_id: string;
  created_at: string;
  match_id: string | null;
  announcements_category?: AnnouncementCategory | null;
  matches?: MatchDetails | null;
  players?: { full_name: string } | null;
  isNotificationItem?: boolean;
};

type CategoryMeta = { bg: string; fg: string; icon: string; label: string };

const CATEGORY_META: Record<string, CategoryMeta> = {
  'ważne': { bg: 'rgba(255, 90, 95, 0.15)', fg: '#FF5A5F', icon: '!', label: 'Ważne' },
  'ogólne': { bg: 'rgba(44, 75, 255, 0.15)', fg: '#2C4BFF', icon: 'i', label: 'Ogólne' },
  'spotkanie odwołane': { bg: 'rgba(255, 90, 95, 0.15)', fg: '#FF5A5F', icon: '✕', label: 'Spotkanie odwołane' },
  'zaproszenie na spotkanie': { bg: 'rgba(0, 196, 140, 0.15)', fg: '#00C48C', icon: '＋', label: 'Zaproszenie na spotkanie' },
};

const DEFAULT_META: CategoryMeta = { bg: '#334155', fg: '#FFFFFF', icon: '•', label: 'Ogólne' };

function getCategoryMeta(categoryName?: string | null): CategoryMeta {
  if (!categoryName) return DEFAULT_META;
  return CATEGORY_META[categoryName.toLowerCase()] ?? {
    bg: '#334155',
    fg: '#FFFFFF',
    icon: '•',
    label: categoryName,
  };
}

function isMatchPast(matchDateStr: string, matchTimeStartStr: string): boolean {
  try {
    const matchDateTime = new Date(`${matchDateStr}T${matchTimeStartStr}`);
    const now = new Date();
    return matchDateTime.getTime() < now.getTime();
  } catch {
    return false;
  }
}

function canCancelMatch(matchDateStr: string, matchTimeStartStr: string): boolean {
  try {
    const matchDateTime = new Date(`${matchDateStr}T${matchTimeStartStr}`);
    const now = new Date();
    const diffMs = matchDateTime.getTime() - now.getTime();
    return diffMs / (1000 * 60 * 60) > 2;
  } catch {
    return true;
  }
}

async function scheduleMatchReminder(match: MatchDetails) {
  try {
    const matchDateTime = new Date(`${match.date}T${match.time_start}`);
    const triggerTime = new Date(matchDateTime.getTime() - 24 * 60 * 60 * 1000);

    if (triggerTime.getTime() <= Date.now()) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Przypomnienie o meczu',
        body: `Jutro odbędzie się mecz: ${match.title?.trim() || 'Trening'} o godzinie ${match.time_start}.`,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerTime,
      },
      identifier: `match-reminder-${match.id}`,
    });
  } catch (error) {
    console.error('Błąd podczas planowania powiadomienia:', error);
  }
}

async function cancelMatchReminder(matchId: string) {
  try {
    await Notifications.cancelScheduledNotificationAsync(`match-reminder-${matchId}`);
  } catch (error) {
    console.error('Błąd podczas anulowania powiadomienia:', error);
  }
}

function AnnouncementCard({
  item,
  userRegistrations,
  onCancelRegistration,
  onRegisterMatch,
  onPressMatch,
  isDark,
}: {
  item: Announcement;
  userRegistrations: string[];
  onCancelRegistration: (matchId: string) => void;
  onRegisterMatch: (matchId: string) => void;
  onPressMatch: (matchId: string) => void;
  isDark: boolean;
}) {
  const styles = getStyles(isDark);
  const categoryName = item.announcements_category?.name;
  const meta = getCategoryMeta(categoryName);
  const match = item.matches;
  const isRegistered = match ? userRegistrations.includes(match.id) : false;

  const isPast = match ? isMatchPast(match.date, match.time_start) : false;
  const isCancelled =
    (match && match.status_id === 2) || categoryName?.toLowerCase() === 'spotkanie odwołane';

  const authorName = item.players?.full_name || 'Administrator';

  return (
    <View style={styles.card}>
      <View style={[styles.iconCircle, { backgroundColor: meta.bg }]}>
        <Text style={[styles.iconText, { color: meta.fg }]}>{meta.icon}</Text>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <Text style={[styles.badgeLabel, { color: meta.fg }]}>{meta.label}</Text>
          <Text style={styles.cardDate}>{formatRelativeDate(item.created_at)}</Text>
        </View>

        <View style={styles.titleRow}>
          {item.is_pinned && <Text style={styles.pinIcon}>📌</Text>}
          <Text style={styles.cardTitle}>{item.title}</Text>
        </View>

        <Text style={styles.cardDescription}>{item.content}</Text>
        <Text style={styles.cardAuthor}>— {authorName}</Text>

        {match && (
          <View style={styles.matchActionBox}>
            <View style={styles.matchInfoContainer}>
              <View style={styles.miniIconContainer}>
                <Text style={styles.miniIconText}>🏐</Text>
              </View>
              <Text style={styles.matchInfoText} numberOfLines={1}>
                {match.title?.trim() || 'Trening'} ({match.date})
              </Text>
            </View>

            <View style={styles.actionButtonsRow}>
              {isCancelled ? (
                <>
                  <TouchableOpacity
                    style={styles.viewMatchBtn}
                    onPress={() => onPressMatch(match.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.viewMatchBtnText}>Szczegóły meczu</Text>
                  </TouchableOpacity>

                  <View style={styles.statusBadgeCancelled}>
                    <Text style={styles.statusBadgeCancelledText}>Odwołany</Text>
                  </View>
                </>
              ) : isRegistered ? (
                <>
                  <TouchableOpacity
                    style={styles.viewMatchBtn}
                    onPress={() => onPressMatch(match.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.viewMatchBtnText}>Szczegóły meczu</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.cancelMatchBtn}
                    onPress={() => onCancelRegistration(match.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelMatchBtnText}>Wypisz się z meczu</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.viewMatchBtn}
                    onPress={() => onPressMatch(match.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.viewMatchBtnText}>Szczegóły meczu</Text>
                  </TouchableOpacity>

                  {!isPast && (
                    <TouchableOpacity
                      style={styles.registerMatchBtn}
                      onPress={() => onRegisterMatch(match.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.registerMatchBtnText}>Zapisz się</Text>
                    </TouchableOpacity>
                  )}

                  {isPast && (
                    <View style={styles.statusBadgePast}>
                      <Text style={styles.statusBadgePastText}>Zakończone</Text>
                    </View>
                  )}
                </>
              )}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

export default function AnnouncementsScreen() {
  const router = useRouter();
  const systemColorScheme = useColorScheme();

  const [themeMode, setThemeMode] = useState<'system' | 'light' | 'dark'>('system');
  const isDark = themeMode === 'system' ? systemColorScheme === 'dark' : themeMode === 'dark';
  const styles = getStyles(isDark);

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [userRegistrations, setUserRegistrations] = useState<string[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [filter, setFilter] = useState<number | 'all'>('all');

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertCallback, setAlertCallback] = useState<(() => void) | null>(null);

  const showAlert = (title: string, message: string, onCloseCallback?: () => void) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertCallback(() => onCloseCallback || null);
    setAlertVisible(true);
  };

  const handleAlertClose = () => {
    setAlertVisible(false);
    if (alertCallback) {
      alertCallback();
      setAlertCallback(null);
    }
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

  const loadData = async () => {
    try {
      const player = await getCurrentPlayer();
      setCurrentPlayer(player);

      const annQuery = supabase
        .from('announcements')
        .select(`
          id,
          title,
          content,
          is_pinned,
          category_id,
          match_id,
          created_at,
          author_id,
          announcements_category (
            id,
            name
          ),
          matches (
            id,
            title,
            date,
            time_start,
            time_end,
            location,
            status_id
          ),
          players:author_id (
            full_name
          )
        `)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      const [{ data: annData, error: annError }, regDataRes] = await Promise.all([
        annQuery,
        player
          ? supabase.from('match_registrations').select('match_id').eq('player_id', player.id)
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (annError) {
        setErrorMsg(annError.message);
      } else {
        setErrorMsg(null);
        const mappedAnnouncements: Announcement[] = (annData ?? []).map((item: any) => ({
          ...item,
          matches: Array.isArray(item.matches) ? item.matches[0] ?? null : item.matches,
          players: Array.isArray(item.players) ? item.players[0] ?? null : item.players,
        }));

        setAnnouncements(mappedAnnouncements);
      }

      if (regDataRes && !regDataRes.error && regDataRes.data) {
        setUserRegistrations(regDataRes.data.map((r: { match_id: string }) => r.match_id));
      } else {
        setUserRegistrations([]);
      }
    } catch (e: any) {
      setErrorMsg(e?.message || 'Wystąpił nieznany błąd');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadThemePreference();
      loadData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadThemePreference();
    await loadData();
    setRefreshing(false);
  };

  const handleRegisterMatch = async (matchId: string) => {
    if (!currentPlayer) {
      showAlert('Błąd', 'Nie znaleziono profilu gracza.');
      return;
    }

    const targetAnnouncement = announcements.find((a) => a.matches?.id === matchId);
    const match = targetAnnouncement?.matches;

    if (match) {
      if (isMatchPast(match.date, match.time_start)) {
        showAlert('Błąd', 'Nie można zapisać się na miniony mecz.');
        return;
      }
      if (
        match.status_id === 2 ||
        targetAnnouncement?.announcements_category?.name?.toLowerCase() === 'spotkanie odwołane'
      ) {
        showAlert('Błąd', 'Nie można zapisać się na odwołany mecz.');
        return;
      }
    }

    const { error } = await supabase.from('match_registrations').insert({
      match_id: matchId,
      player_id: currentPlayer.id,
    });

    if (error) {
      showAlert('Błąd', error.message);
      return;
    }

    setUserRegistrations((prev: string[]) => [...prev, matchId]);

    if (match) {
      await scheduleMatchReminder(match);
    }

    loadData();
  };

  const executeCancellation = async (matchId: string) => {
    if (!currentPlayer) return;

    const { error } = await supabase
      .from('match_registrations')
      .delete()
      .eq('match_id', matchId)
      .eq('player_id', currentPlayer.id);

    if (error) {
      showAlert('Błąd', error.message);
      return;
    }

    setUserRegistrations((prev: string[]) => prev.filter((id) => id !== matchId));
    await cancelMatchReminder(matchId);
    loadData();
  };

  const handleCancelRegistration = (matchId: string) => {
    if (!currentPlayer) return;

    const targetAnnouncement = announcements.find((a) => a.matches?.id === matchId);
    const match = targetAnnouncement?.matches;

    if (match && match.status_id === 2) {
      showAlert('Błąd', 'Nie można wypisać się z odwołanego meczu.');
      return;
    }

    if (match && !canCancelMatch(match.date, match.time_start)) {
      showAlert('Błąd', 'Nie można wypisać się na mniej niż 2 godziny przed meczem.');
      return;
    }

    executeCancellation(matchId);
  };

  const handlePressMatch = (matchId: string) => {
    router.push(`/(match)/${matchId}`);
  };

  const uniqueCategoriesMap = new Map<number, string>();
  announcements.forEach((a) => {
    if (a.announcements_category) {
      uniqueCategoriesMap.set(a.announcements_category.id, a.announcements_category.name);
    }
  });

  const availableFilters = [
    { key: 'all' as const, label: 'Wszystkie' },
    ...Array.from(uniqueCategoriesMap.entries()).map(([id, name]) => ({
      key: id,
      label: name,
    })),
  ];

  const filtered = announcements.filter((a) => {
    if (filter === 'all') return true;
    return a.category_id === filter;
  });

  if (loading) {
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
        onClose={handleAlertClose}
      />
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2C4BFF" />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.headerTitle}>Tablica ogłoszeń</Text>
                <Text style={styles.headerSubtitle}>Co się dzieje w Twojej grupie</Text>
              </View>
            </View>

            {errorMsg && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>Błąd wczytywania: {errorMsg}</Text>
              </View>
            )}

            {availableFilters.length > 1 && (
              <FlatList
                horizontal
                data={availableFilters}
                keyExtractor={(f) => String(f.key)}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRow}
                renderItem={({ item }) => {
                  const isActive = filter === item.key;
                  return (
                    <TouchableOpacity
                      style={[styles.filterChip, isActive && styles.filterChipActive]}
                      onPress={() => setFilter(item.key)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          isActive && styles.filterChipTextActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {announcements.length === 0
                ? 'Brak ogłoszeń.'
                : 'Brak ogłoszeń spełniających kryteria.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <AnnouncementCard
            item={item}
            userRegistrations={userRegistrations}
            onCancelRegistration={handleCancelRegistration}
            onRegisterMatch={handleRegisterMatch}
            onPressMatch={handlePressMatch}
            isDark={isDark}
          />
        )}
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

    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 20,
    },
    headerTitle: { fontSize: 24, fontWeight: '800', color: isDark ? '#FFFFFF' : '#0F172A' },
    headerSubtitle: { fontSize: 14, color: isDark ? '#94A3B8' : '#64748B', marginTop: 4, fontWeight: '500' },

    errorBox: {
      backgroundColor: isDark ? 'rgba(255, 90, 95, 0.15)' : '#FEF2F2',
      borderRadius: 16,
      padding: 14,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: '#FF5A5F',
    },
    errorText: { color: '#FF5A5F', fontSize: 13, fontWeight: '600' },

    filterRow: { gap: 8, paddingBottom: 18 },
    filterChip: {
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderRadius: 16,
      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
    },
    filterChipActive: {
      backgroundColor: '#2C4BFF',
      borderColor: '#2C4BFF',
    },
    filterChipText: { fontSize: 13, fontWeight: '700', color: isDark ? '#94A3B8' : '#64748B' },
    filterChipTextActive: { color: '#FFFFFF', fontWeight: '900' },

    card: {
      flexDirection: 'row',
      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
      borderRadius: 24,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.3 : 0.06,
      shadowRadius: 8,
      elevation: 3,
    },
    iconCircle: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0',
    },
    iconText: { fontSize: 18, fontWeight: '800' },
    cardBody: { flex: 1 },
    cardTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    badgeLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
    cardDate: { fontSize: 11, color: isDark ? '#94A3B8' : '#64748B', fontWeight: '500' },
    titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    pinIcon: { fontSize: 12, marginRight: 4 },
    cardTitle: { fontSize: 15, fontWeight: '800', color: isDark ? '#FFFFFF' : '#0F172A' },
    cardDescription: { fontSize: 13, color: isDark ? '#94A3B8' : '#64748B', lineHeight: 18, fontWeight: '500', marginTop: 2 },
    cardAuthor: { fontSize: 11, color: isDark ? '#94A3B8' : '#64748B', marginTop: 8, fontStyle: 'italic', fontWeight: '500' },

    matchActionBox: {
      marginTop: 14,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9',
      paddingTop: 12,
    },
    matchInfoContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
    },
    miniIconContainer: {
      width: 24,
      height: 24,
      borderRadius: 8,
      backgroundColor: isDark ? '#0B1120' : '#F8FAFC',
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#E2E8F0',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 6,
    },
    miniIconText: {
      fontSize: 11,
    },
    matchInfoText: { fontSize: 12, color: isDark ? '#FFFFFF' : '#0F172A', fontWeight: '700', flex: 1 },
    actionButtonsRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
      alignItems: 'center',
      flexWrap: 'wrap',
    },
    viewMatchBtn: {
      backgroundColor: isDark ? '#0B1120' : '#F8FAFC',
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#CBD5E1',
    },
    viewMatchBtnText: { fontSize: 12, fontWeight: '800', color: isDark ? '#FFFFFF' : '#0F172A' },
    cancelMatchBtn: {
      backgroundColor: isDark ? '#0B1120' : '#FEF2F2',
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#FF5A5F',
    },
    cancelMatchBtnText: { fontSize: 12, fontWeight: '800', color: '#FF5A5F' },
    registerMatchBtn: {
      backgroundColor: '#2C4BFF',
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 14,
    },
    registerMatchBtnText: { fontSize: 12, fontWeight: '900', color: '#FFFFFF' },
    statusBadgeCancelled: {
      backgroundColor: isDark ? '#0B1120' : '#FEF2F2',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#FF5A5F',
    },
    statusBadgeCancelledText: { fontSize: 12, fontWeight: '800', color: '#FF5A5F' },
    statusBadgePast: {
      backgroundColor: isDark ? '#0B1120' : '#F1F5F9',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#CBD5E1',
    },
    statusBadgePastText: { fontSize: 12, fontWeight: '800', color: isDark ? '#94A3B8' : '#64748B' },

    emptyState: { paddingVertical: 40, alignItems: 'center' },
    emptyText: { fontSize: 14, color: isDark ? '#94A3B8' : '#64748B', fontWeight: '500' },
  });