import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { colors, radius, shadow } from '@/constants/app-theme';
import { supabase } from '@/lib/supabase';
import { formatMatchDate, formatTime, isDateInPast } from '@/lib/format';
import { getCurrentPlayer, Player } from '@/lib/player';

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
  capacityLimit?: number;
  isRegistered?: boolean;
  registrationStatus?: 'main' | 'waitlist';
};

type TabType = 'upcoming' | 'past';

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

export default function ScheduleScreen() {
  const router = useRouter();
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');

  const loadSchedule = useCallback(async () => {
    setLoading(true);
    const player = await getCurrentPlayer();
    setCurrentPlayer(player);

    const { data: matchesData, error: matchesError } = await supabase
      .from('matches')
      .select('*');

    if (matchesError || !matchesData) {
      Alert.alert('Błąd', 'Nie udało się pobrać listy meczów.');
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
      const capacityLimit = match.capacity ?? match.max_players;

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
        capacityLimit,
        isRegistered: !!userReg,
        registrationStatus: regStatus,
      };
    });

    setMatches(processedMatches);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSchedule();
    }, [loadSchedule])
  );

  const executeCancellation = async (match: MatchItem) => {
    if (!currentPlayer) return;

    setActionLoadingId(match.id);
    const { error } = await supabase
      .from('match_registrations')
      .delete()
      .eq('match_id', match.id)
      .eq('player_id', currentPlayer.id);

    if (error) {
      Alert.alert('Błąd', error.message);
    }
    setActionLoadingId(null);
    loadSchedule();
  };

  const handleQuickAction = async (match: MatchItem) => {
    if (!currentPlayer) {
      Alert.alert('Błąd', 'Nie wczytano profilu gracza.');
      return;
    }

    if (isDateInPast(match.date) || match.status_id === 2) return;

    if (match.isRegistered) {
      if (!canCancelMatch(match.date, match.time_start)) {
        Alert.alert('Błąd', 'Nie można wypisać się na mniej niż 2 godziny przed meczem.');
        return;
      }

      Alert.alert(
        'Wypisz się z meczu',
        'Czy na pewno chcesz wypisać się z tego meczu?',
        [
          { text: 'Nie', style: 'cancel' },
          {
            text: 'Tak, wypisz się',
            style: 'destructive',
            onPress: () => executeCancellation(match),
          },
        ]
      );
    } else {
      setActionLoadingId(match.id);
      const { error } = await supabase.from('match_registrations').insert({
        match_id: match.id,
        player_id: currentPlayer.id,
      });

      if (error) Alert.alert('Błąd', error.message);

      setActionLoadingId(null);
      loadSchedule();
    }
  };

  const filteredMatches = matches
    .filter((match) => {
      const isPastDate = isDateInPast(match.date);
      const isPast = isPastDate;
      return activeTab === 'upcoming' ? !isPast : isPast;
    })
    .sort((a, b) => {
      const timeA = new Date(`${a.date}T${a.time_start}`).getTime();
      const timeB = new Date(`${b.date}T${b.time_start}`).getTime();
      return timeA - timeB;
    });

  if (loading && matches.length === 0) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top', 'left', 'right']}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Terminarz Meczów</Text>
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'upcoming' && styles.tabButtonActive]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.tabTextActive]}>Nadchodzące</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'past' && styles.tabButtonActive]}
          onPress={() => setActiveTab('past')}
        >
          <Text style={[styles.tabText, activeTab === 'past' && styles.tabTextActive]}>Zakończone</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredMatches}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {activeTab === 'upcoming' ? 'Brak nadchodzących meczów.' : 'Brak zakończonych lub odwołanych meczów.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const { day, month } = formatMatchDate(item.date);
          const isCancelled = item.status_id === 2;
          const isFinished = isDateInPast(item.date) || isCancelled;
          const isFull = (item.mainCount ?? 0) >= (item.capacityLimit ?? 10);
          const isActionLoading = actionLoadingId === item.id;
          
          return (
            <TouchableOpacity
              style={[styles.matchCard, isCancelled && styles.matchCardCancelled]}
              onPress={() => router.push(`/(match)/${item.id}`)}
            >
              <View style={styles.cardContent}>
                <View style={[styles.dateBox, isCancelled && styles.dateBoxCancelled]}>
                  <Text style={[styles.dateDay, isCancelled && styles.dateDayCancelled]}>{day}</Text>
                  <Text style={[styles.dateMonth, isCancelled && styles.dateMonthCancelled]}>{month}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.matchTitle, isCancelled && styles.matchTitleCancelled]}>{item.title || 'Trening'}</Text>
                  <Text style={styles.matchInfo}>🕒 {formatTime(item.time_start)} | 📍 {item.location}</Text>
                  <Text style={styles.matchInfoBold}>👥 Zapisanych: {item.mainCount}/{item.capacityLimit}</Text>
                </View>
              </View>
              {!isFinished && currentPlayer && !isCancelled && (
                <View style={styles.cardFooter}>
                  {item.isRegistered ? (
                    <View style={styles.registeredBadgeRow}>
                      <Text style={styles.registeredText}>{item.registrationStatus === 'waitlist' ? '⏳ Rezerwa' : '✅ Zapisany'}</Text>
                      <TouchableOpacity style={styles.quickCancelBtn} onPress={(e) => { e.stopPropagation(); handleQuickAction(item); }} disabled={isActionLoading}>
                        {isActionLoading ? <ActivityIndicator size="small" color={colors.destructive} /> : <Text style={styles.quickCancelText}>Wypisz się</Text>}
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity style={[styles.quickSignupBtn, isFull && styles.quickWaitlistBtn]} onPress={(e) => { e.stopPropagation(); handleQuickAction(item); }} disabled={isActionLoading}>
                      {isActionLoading ? <ActivityIndicator size="small" color={colors.primaryForeground} /> : <Text style={styles.quickSignupText}>{isFull ? 'Zapisz się na rezerwę' : 'Zapisz się'}</Text>}
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.foreground },
  
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: radius.lg,
    padding: 4,
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
  tabButtonActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 12, fontWeight: '600', color: colors.mutedForeground },
  tabTextActive: { color: colors.primaryForeground, fontWeight: '700' },

  listContainer: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 },

  matchCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 12,
    marginBottom: 12,
    ...shadow.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  matchCardCancelled: { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' },
  cardContent: { flexDirection: 'row', alignItems: 'center' },
  dateBox: {
    width: 50,
    height: 50,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateBoxCancelled: { backgroundColor: '#FEE2E2' },
  dateDay: { fontSize: 18, fontWeight: '700', color: colors.accentForeground },
  dateDayCancelled: { color: '#DC2626' },
  dateMonth: { fontSize: 11, color: colors.accentForeground, textTransform: 'uppercase' },
  dateMonthCancelled: { color: '#DC2626' },

  matchTitle: { fontSize: 15, fontWeight: '700', color: colors.foreground, marginBottom: 2 },
  matchTitleCancelled: { textDecorationLine: 'line-through', color: '#DC2626' },
  matchInfo: { fontSize: 12, color: colors.mutedForeground, marginBottom: 2 },
  matchInfoBold: { fontSize: 12, fontWeight: '700', color: colors.foreground, marginTop: 2 },

  cardFooter: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  quickSignupBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  quickWaitlistBtn: { backgroundColor: '#D97706' },
  quickSignupText: { color: colors.primaryForeground, fontSize: 12, fontWeight: '700' },
  registeredBadgeRow: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  registeredText: { fontSize: 12, fontWeight: '600', color: colors.foreground },
  quickCancelBtn: {
    borderWidth: 1,
    borderColor: colors.destructive,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  quickCancelText: { color: colors.destructive, fontSize: 11, fontWeight: '700' },

  emptyState: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: colors.mutedForeground },
});