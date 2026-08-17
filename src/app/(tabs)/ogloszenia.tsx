import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { colors, radius, shadow } from '@/constants/app-theme';
import { supabase } from '@/lib/supabase';
import { formatRelativeDate } from '@/lib/format';
import { getCurrentPlayer, Player } from '@/lib/player';
import { refreshPlayerNotifications } from '@/services/matchSyncService';

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
  'ważne': { bg: '#FEE2E2', fg: '#DC2626', icon: '!', label: 'Ważne' },
  'ogólne': { bg: '#E0E7FF', fg: colors.primary, icon: 'i', label: 'Ogólne' },
  'spotkanie odwołane': { bg: '#FEE2E2', fg: '#DC2626', icon: '✕', label: 'Spotkanie odwołane' },
  'zaproszenie na spotkanie': { bg: '#DCFCE7', fg: '#16A34A', icon: '＋', label: 'Zaproszenie na spotkanie' },
  'powiadomienia o meczu': { bg: '#FEF08A', fg: '#CA8A04', icon: '🔔', label: 'Powiadomienie o meczu' },
};

const DEFAULT_META: CategoryMeta = { bg: '#F1F5F9', fg: colors.foreground, icon: '•', label: 'Ogólne' };

type CustomAlertProps = {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
};

function CustomAlert({ visible, title, message, onClose }: CustomAlertProps) {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={alertStyles.overlay}>
        <View style={alertStyles.alertBox}>
          <View style={alertStyles.indicator} />
          <Text style={alertStyles.title}>{title}</Text>
          <Text style={alertStyles.message}>{message}</Text>
          <TouchableOpacity
            style={alertStyles.button}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={alertStyles.buttonText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function getCategoryMeta(categoryName?: string | null): CategoryMeta {
  if (!categoryName) return DEFAULT_META;
  return CATEGORY_META[categoryName.toLowerCase()] ?? {
    bg: '#F1F5F9',
    fg: colors.foreground,
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
  const categoryName = item.isNotificationItem ? 'powiadomienia o meczu' : item.announcements_category?.name;
  const meta = getCategoryMeta(categoryName);
  const match = item.matches;
  const isRegistered = match ? userRegistrations.includes(match.id) : false;

  const isPast = match ? isMatchPast(match.date, match.time_start) : false;
  const isCancelled =
    (match && match.status_id === 2) || categoryName?.toLowerCase() === 'spotkanie odwołane';

  const authorName = item.players?.full_name || (item.isNotificationItem ? 'System' : 'Administrator');

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
            <Text style={styles.matchInfoText} numberOfLines={1}>
              🏐 Mecz: {match.title?.trim() || 'Trening'} ({match.date})
            </Text>

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
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [userRegistrations, setUserRegistrations] = useState<string[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [filter, setFilter] = useState<number | 'all' | 'notifications'>('all');

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

    await refreshPlayerNotifications(currentPlayer.id);
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
    await refreshPlayerNotifications(currentPlayer.id);
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
    if (a.announcements_category && !a.isNotificationItem) {
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
    if (filter === 'notifications') return a.isNotificationItem === true;
    return a.category_id === filter;
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
          />
        )}
      />
    </SafeAreaView>
  );
}

const alertStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  alertBox: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: 24,
    alignItems: 'center',
    overflow: 'hidden',
    ...shadow.card,
  },
  indicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  button: {
    width: '100%',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radius.lg,
    alignItems: 'center',
    ...shadow.button,
  },
  buttonText: {
    color: colors.primaryForeground,
    fontSize: 15,
    fontWeight: '700',
  },
});

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
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  matchInfoText: { fontSize: 12, color: colors.foreground, marginBottom: 10, fontWeight: '600' },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  viewMatchBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  viewMatchBtnText: { fontSize: 12, fontWeight: '700', color: colors.accentForeground },
  cancelMatchBtn: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  cancelMatchBtnText: { fontSize: 12, fontWeight: '700', color: '#DC2626' },
  registerMatchBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.md,
  },
  registerMatchBtnText: { fontSize: 12, fontWeight: '700', color: colors.primaryForeground },
  statusBadgeCancelled: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  statusBadgeCancelledText: { fontSize: 12, fontWeight: '700', color: '#DC2626' },
  statusBadgePast: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  statusBadgePastText: { fontSize: 12, fontWeight: '700', color: colors.mutedForeground },

  emptyState: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: colors.mutedForeground },
});