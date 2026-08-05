import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { colors, radius, shadow } from '@/constants/app-theme';
import { supabase } from '@/lib/supabase';
import { formatRelativeDate } from '@/lib/format';
import { getCurrentPlayer, Player } from '@/lib/player';

type MatchDetails = {
  id: string;
  title: string | null;
  date: string;
  time_start: string;
  time_end: string;
  location: string;
  status: string | null;
};

type Announcement = {
  id: string;
  title: string;
  content: string;
  category: string;
  is_pinned: boolean;
  author: string;
  created_at: string;
  match_id: string | null;
  matches?: MatchDetails | null;
};

type CategoryMeta = { bg: string; fg: string; icon: string; label: string };

const CATEGORY_META: Record<string, CategoryMeta> = {
  general: { bg: '#E0E7FF', fg: colors.primary, icon: 'i', label: 'Ogólne' },
  new: { bg: '#DCFCE7', fg: '#16A34A', icon: '＋', label: 'Nowe' },
  cancelled: { bg: '#FEE2E2', fg: '#DC2626', icon: '✕', label: 'Odwołane' },
  change: { bg: '#FEF3C7', fg: '#D97706', icon: '↻', label: 'Zmiana' },
  urgent: { bg: '#FEE2E2', fg: '#DC2626', icon: '!', label: 'Ważne' },
};

const DEFAULT_META: CategoryMeta = CATEGORY_META.general;

function getCategoryMeta(category: string): CategoryMeta {
  if (!category) return DEFAULT_META;
  return CATEGORY_META[category.toLowerCase()] ?? {
    bg: '#F1F5F9',
    fg: colors.foreground,
    icon: '•',
    label: category.charAt(0).toUpperCase() + category.slice(1),
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

function AnnouncementCard({
  item,
  userRegistrations,
  onCancelRegistration,
  onRegisterMatch,
  onPressMatch,
}: {
  item: Announcement;
  userRegistrations: string[];
  onCancelRegistration: (matchId: string) => void;
  onRegisterMatch: (matchId: string) => void;
  onPressMatch: (matchId: string) => void;
}) {
  const meta = getCategoryMeta(item.category);
  const match = item.matches;
  const isRegistered = match ? userRegistrations.includes(match.id) : false;

  const isPast = match ? isMatchPast(match.date, match.time_start) : false;
  const isCancelled =
    (match && match.status === 'cancelled') || item.category.toLowerCase() === 'cancelled';

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
        <Text style={styles.cardAuthor}>— {item.author}</Text>

        {match && (
          <View style={styles.matchActionBox}>
            <Text style={styles.matchInfoText} numberOfLines={1}>
              🏐 Mecz: {match.title?.trim() || 'Trening'} ({match.date})
            </Text>

            <View style={styles.actionButtonsRow}>
              {isRegistered ? (
                <>
                  <TouchableOpacity
                    style={styles.viewMatchBtn}
                    onPress={() => onPressMatch(match.id)}
                  >
                    <Text style={styles.viewMatchBtnText}>Szczegóły meczu</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.cancelMatchBtn}
                    onPress={() => onCancelRegistration(match.id)}
                  >
                    <Text style={styles.cancelMatchBtnText}>Wypisz się</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.viewMatchBtn}
                    onPress={() => onPressMatch(match.id)}
                  >
                    <Text style={styles.viewMatchBtnText}>Szczegóły meczu</Text>
                  </TouchableOpacity>

                  {!isPast && !isCancelled && (
                    <TouchableOpacity
                      style={styles.registerMatchBtn}
                      onPress={() => onRegisterMatch(match.id)}
                    >
                      <Text style={styles.registerMatchBtnText}>Zapisz się</Text>
                    </TouchableOpacity>
                  )}

                  {isCancelled && (
                    <View style={styles.statusBadgeCancelled}>
                      <Text style={styles.statusBadgeCancelledText}>Odwołany</Text>
                    </View>
                  )}

                  {isPast && !isCancelled && (
                    <View style={styles.statusBadgePast}>
                      <Text style={styles.statusBadgePastText}>Zakończony</Text>
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
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [userRegistrations, setUserRegistrations] = useState<string[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [filter, setFilter] = useState<string>('all');

  const loadData = async () => {
    try {
      const player = await getCurrentPlayer();
      setCurrentPlayer(player);

      const [{ data: annData, error: annError }, regDataRes] = await Promise.all([
        supabase
          .from('announcements')
          .select(`
            *,
            matches (
              id,
              title,
              date,
              time_start,
              time_end,
              location,
              status
            )
          `)
          .order('is_pinned', { ascending: false })
          .order('created_at', { ascending: false }),
        player
          ? supabase.from('match_registrations').select('match_id').eq('player_id', player.id)
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (annError) {
        setErrorMsg(annError.message);
      } else {
        setErrorMsg(null);
        setAnnouncements(annData ?? []);
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
      loadData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleRegisterMatch = async (matchId: string) => {
    if (!currentPlayer) {
      Alert.alert('Błąd', 'Nie znaleziono profilu gracza.');
      return;
    }

    const targetAnnouncement = announcements.find((a) => a.matches?.id === matchId);
    const match = targetAnnouncement?.matches;

    if (match) {
      if (isMatchPast(match.date, match.time_start)) {
        Alert.alert('Błąd', 'Nie można zapisać się na miniony mecz.');
        return;
      }
      if (match.status === 'cancelled' || targetAnnouncement?.category.toLowerCase() === 'cancelled') {
        Alert.alert('Błąd', 'Nie można zapisać się na odwołany mecz.');
        return;
      }
    }

    const { error } = await supabase.from('match_registrations').insert({
      match_id: matchId,
      player_id: currentPlayer.id,
    });

    if (error) {
      Alert.alert('Błąd zapisu', error.message);
      return;
    }

    setUserRegistrations((prev) => [...prev, matchId]);
  };

  const handleCancelRegistration = async (matchId: string) => {
    if (!currentPlayer) return;

    const targetAnnouncement = announcements.find((a) => a.matches?.id === matchId);
    const match = targetAnnouncement?.matches;

    if (match && !canCancelMatch(match.date, match.time_start)) {
      Alert.alert('Błąd', 'Nie można wypisać się na mniej niż 2 godziny przed meczem.');
      return;
    }

    Alert.alert('Wypisać się?', 'Na pewno chcesz wypisać się z tego meczu?', [
      { text: 'Anuluj', style: 'cancel' },
      {
        text: 'Wypisz się',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase
            .from('match_registrations')
            .delete()
            .eq('match_id', matchId)
            .eq('player_id', currentPlayer.id);

          if (error) {
            Alert.alert('Błąd', error.message);
            return;
          }

          setUserRegistrations((prev) => prev.filter((id) => id !== matchId));
        },
      },
    ]);
  };

  const handlePressMatch = (matchId: string) => {
    router.push(`/(match)/${matchId}`);
  };

  const availableFilters = [
    { key: 'all', label: 'Wszystkie' },
    ...Array.from(new Set(announcements.map((a) => a.category).filter(Boolean))).map((cat) => ({
      key: cat,
      label: getCategoryMeta(cat).label,
    })),
  ];

  const filtered = announcements.filter((a) => {
    const matchesFilter = filter === 'all' || a.category === filter;
    return matchesFilter;
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['bottom', 'left', 'right']}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
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
                keyExtractor={(f) => f.key}
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
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 10, 
    marginBottom: 20,
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: colors.foreground },
  headerSubtitle: { fontSize: 14, color: colors.mutedForeground, marginTop: 4 },

  errorBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 14,
  },
  errorText: { color: '#DC2626', fontSize: 13 },

  filterRow: { gap: 8, paddingBottom: 18 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radius['2xl'],
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: { fontSize: 13, fontWeight: '600', color: colors.mutedForeground },
  filterChipTextActive: { color: colors.primaryForeground },

  card: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: 14,
    marginBottom: 12,
    ...shadow.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconText: { fontSize: 18, fontWeight: '700' },
  cardBody: { flex: 1 },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  badgeLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  cardDate: { fontSize: 11, color: colors.mutedForeground },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  pinIcon: { fontSize: 12, marginRight: 4 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.foreground },
  cardDescription: { fontSize: 13, color: colors.mutedForeground, lineHeight: 18 },
  cardAuthor: { fontSize: 11, color: colors.mutedForeground, marginTop: 6, fontStyle: 'italic' },

  matchActionBox: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  matchInfoText: { fontSize: 12, color: colors.mutedForeground, marginBottom: 8, fontWeight: '500' },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    alignItems: 'center',
  },
  cancelMatchBtn: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  cancelMatchBtnText: { fontSize: 11, fontWeight: '700', color: '#DC2626' },
  viewMatchBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  viewMatchBtnText: { fontSize: 11, fontWeight: '700', color: colors.accentForeground },
  registerMatchBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  registerMatchBtnText: { fontSize: 11, fontWeight: '700', color: colors.primaryForeground },
  statusBadgeCancelled: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  statusBadgeCancelledText: { fontSize: 11, fontWeight: '700', color: '#DC2626' },
  statusBadgePast: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  statusBadgePastText: { fontSize: 11, fontWeight: '700', color: colors.mutedForeground },

  emptyState: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: colors.mutedForeground },
});