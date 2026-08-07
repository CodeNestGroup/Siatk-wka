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
import { formatMatchDate, formatTime, isDateInPast } from '@/lib/format';
import { getCurrentPlayer, Player } from '@/lib/player';

type MatchInfo = {
  id: string;
  title: string | null;
  date: string;
  time_start: string;
  time_end: string;
  location: string;
  price_per_player: number;
  max_players: number;
  capacity: number | null;
  status_id: number;
};

type MyRegistration = {
  id: string;
  match_id: string;
  player_id: string;
  is_paid: boolean;
  created_at: string;
  matches: MatchInfo | null;
  registrationStatus?: 'main' | 'waitlist';
};

type TabType = 'active' | 'past';

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

function RegistrationCard({
  reg,
  onCancel,
  onPress,
  cancelling,
  activeTab,
}: {
  reg: MyRegistration;
  onCancel: (reg: MyRegistration) => void;
  onPress: (matchId: string) => void;
  cancelling: boolean;
  activeTab: TabType;
}) {
  if (!reg.matches) return null;

  const { weekday, day, month } = formatMatchDate(reg.matches.date);
  const title = reg.matches.title?.trim() || 'Trening Siatkówki';
  const isWaitlist = reg.registrationStatus === 'waitlist';
  const isCancelled = reg.matches.status_id === 2;

  return (
    <TouchableOpacity
      style={[styles.card, isCancelled && styles.cardCancelled]}
      activeOpacity={0.8}
      onPress={() => reg.matches && onPress(reg.matches.id)}
    >
      <View style={[styles.dateBox, isCancelled && styles.dateBoxCancelled]}>
        <Text style={[styles.dateDay, isCancelled && styles.dateDayCancelled]}>{day}</Text>
        <Text style={[styles.dateMonth, isCancelled && styles.dateMonthCancelled]}>{month}</Text>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <Text style={[styles.matchTitle, isCancelled && styles.matchTitleCancelled]} numberOfLines={1}>
            {title}
          </Text>
          <View
            style={[
              styles.badge,
              { backgroundColor: isWaitlist ? '#FEF3C7' : '#DCFCE7' },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                { color: isWaitlist ? '#D97706' : '#16A34A' },
              ]}
            >
              {isWaitlist ? 'Lista rezerwowa' : 'Zapisany'}
            </Text>
          </View>
        </View>

        <Text style={styles.weekday}>{weekday}</Text>
        <Text style={styles.location}>📍 {reg.matches.location}</Text>
        <Text style={styles.time}>
          🕒 {formatTime(reg.matches.time_start)} – {formatTime(reg.matches.time_end)}
        </Text>

        <View style={styles.footerRow}>
          <Text
            style={[
              styles.paymentStatus,
              { color: reg.is_paid ? '#16A34A' : colors.mutedForeground },
            ]}
          >
            {reg.is_paid ? '✓ Opłacone' : 'Brak statusu płatności'}
          </Text>
          <Text style={styles.footerText}>{Number(reg.matches.price_per_player)} PLN</Text>
        </View>

        {activeTab === 'active' && !isCancelled && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => onCancel(reg)}
            disabled={cancelling}
            activeOpacity={0.7}
          >
            {cancelling ? (
              <ActivityIndicator size="small" color="#DC2626" />
            ) : (
              <Text style={styles.cancelButtonText}>Wypisz się z meczu</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function MojeZapisyScreen() {
  const router = useRouter();
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [registrations, setRegistrations] = useState<MyRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabType>('active');

  const loadData = async () => {
    try {
      const player = await getCurrentPlayer();
      setCurrentPlayer(player);

      if (!player) {
        setRegistrations([]);
        setLoading(false);
        return;
      }

      const { data: userRegs, error: regError } = await supabase
        .from('match_registrations')
        .select(
          'id, match_id, player_id, is_paid, created_at, matches(id, title, date, time_start, time_end, location, price_per_player, max_players, capacity, status_id)'
        )
        .eq('player_id', player.id);

      if (regError) {
        setErrorMsg(regError.message);
        setLoading(false);
        return;
      }

      if (!userRegs || userRegs.length === 0) {
        setRegistrations([]);
        setErrorMsg(null);
        setLoading(false);
        return;
      }

      const matchIds = userRegs.map((r) => r.match_id);
      const { data: allRegsForMatches, error: allRegsError } = await supabase
        .from('match_registrations')
        .select('match_id, player_id, created_at')
        .in('match_id', matchIds)
        .order('created_at', { ascending: true });

      if (allRegsError) {
        console.error('Błąd pobierania list meczowych:', allRegsError);
      }

      const allRegs = allRegsForMatches ?? [];

      const processed: MyRegistration[] = userRegs.map((reg: any) => {
        const match: MatchInfo | null = Array.isArray(reg.matches) ? reg.matches[0] ?? null : reg.matches;

        if (!match) {
          return {
            ...reg,
            matches: null,
          } as MyRegistration;
        }

        const matchAllRegs = allRegs.filter((r) => r.match_id === match.id);
        const capacityLimit = match.capacity ?? match.max_players ?? 10;
        const mainList = matchAllRegs.slice(0, capacityLimit);

        const isInMain = mainList.some((r) => r.player_id === player.id);

        return {
          ...reg,
          matches: match,
          registrationStatus: isInMain ? 'main' : 'waitlist',
        } as MyRegistration;
      });

      setErrorMsg(null);
      setRegistrations(processed);
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

  const executeCancellation = async (regId: string) => {
    setCancellingId(regId);
    const { error } = await supabase
      .from('match_registrations')
      .delete()
      .eq('id', regId);
    setCancellingId(null);

    if (error) {
      Alert.alert('Błąd', error.message);
      return;
    }
    await loadData();
  };

  const handleCancel = (reg: MyRegistration) => {
    if (reg.matches) {
      if (reg.matches.status_id === 2) {
        Alert.alert('Błąd', 'Nie można wypisać się z odwołanego meczu.');
        return;
      }
      if (!canCancelMatch(reg.matches.date, reg.matches.time_start)) {
        Alert.alert('Błąd', 'Nie można wypisać się na mniej niż 2 godziny przed meczem.');
        return;
      }
    }

    Alert.alert(
      'Wypisz się z meczu',
      'Czy na pewno chcesz wypisać się z tego meczu?',
      [
        { text: 'Nie', style: 'cancel' },
        {
          text: 'Tak, wypisz się',
          style: 'destructive',
          onPress: () => executeCancellation(reg.id),
        },
      ]
    );
  };

  const handlePressMatch = (matchId: string) => {
    router.push(`/(match)/${matchId}`);
  };

  const filteredRegistrations = registrations
    .filter((reg) => {
      if (!reg.matches) return false;
      const isPastDate = isDateInPast(reg.matches.date);
      const isPast = isPastDate;

      if (activeTab === 'active') {
        return !isPast;
      } else {
        return isPast;
      }
    })
    .sort((a, b) => {
      if (!a.matches || !b.matches) return 0;
      const timeA = new Date(`${a.matches.date}T${a.matches.time_start}`).getTime();
      const timeB = new Date(`${b.matches.date}T${b.matches.time_start}`).getTime();

      if (activeTab === 'active') {
        return timeA - timeB;
      } else {
        return timeB - timeA;
      }
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
        data={filteredRegistrations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <View>
            <Text style={styles.headerTitle}>Moje zapisy</Text>
            <Text style={styles.headerSubtitle}>Mecze, na które się zapisałeś</Text>

            {errorMsg && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>Błąd wczytywania: {errorMsg}</Text>
              </View>
            )}

            {!currentPlayer && !loading && (
              <View style={styles.warnBox}>
                <Text style={styles.warnText}>Nie znaleziono Twojego profilu gracza.</Text>
              </View>
            )}

            <View style={styles.tabsContainer}>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'active' && styles.tabButtonActive]}
                onPress={() => setActiveTab('active')}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>
                  Nadchodzące
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'past' && styles.tabButtonActive]}
                onPress={() => setActiveTab('past')}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, activeTab === 'past' && styles.tabTextActive]}>
                  Zakończone / Odwołane
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {activeTab === 'active'
                ? 'Brak nadchodzących zapisów.'
                : 'Brak zakończonych lub odwołanych zapisów.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <RegistrationCard
            reg={item}
            onCancel={handleCancel}
            onPress={handlePressMatch}
            cancelling={cancellingId === item.id}
            activeTab={activeTab}
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

  headerTitle: { fontSize: 24, fontWeight: '700', color: colors.foreground, marginTop: 16 },
  headerSubtitle: { fontSize: 14, color: colors.mutedForeground, marginTop: 4, marginBottom: 16 },

  errorBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 14,
  },
  errorText: { color: '#DC2626', fontSize: 13 },

  warnBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 14,
  },
  warnText: { color: '#92400E', fontSize: 13 },

  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  tabTextActive: {
    color: colors.primaryForeground,
    fontWeight: '700',
  },

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
  cardCancelled: { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' },
  dateBox: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  dateBoxCancelled: { backgroundColor: '#FEE2E2' },
  dateDay: { fontSize: 20, fontWeight: '700', color: colors.accentForeground },
  dateDayCancelled: { color: '#DC2626' },
  dateMonth: { fontSize: 11, color: colors.accentForeground, textTransform: 'uppercase' },
  dateMonthCancelled: { color: '#DC2626' },

  cardBody: { flex: 1 },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
    gap: 8,
  },
  matchTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.foreground },
  matchTitleCancelled: { textDecorationLine: 'line-through', color: '#DC2626' },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.sm },
  badgeText: { fontSize: 11, fontWeight: '700' },

  weekday: { fontSize: 12, color: colors.mutedForeground, marginBottom: 6, fontWeight: '600' },
  location: { fontSize: 13, color: colors.mutedForeground, marginBottom: 2 },
  time: { fontSize: 13, color: colors.mutedForeground, marginBottom: 8 },

  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    marginBottom: 10,
  },
  footerText: { fontSize: 12, color: colors.mutedForeground },
  paymentStatus: { fontSize: 12, fontWeight: '700' },

  cancelButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  cancelButtonText: { fontSize: 12, fontWeight: '700', color: '#DC2626' },

  emptyState: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: colors.mutedForeground },
});