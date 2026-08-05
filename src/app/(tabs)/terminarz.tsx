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
  status: string | null;
  // Pola wyliczane dynamicznie dla każdego meczu
  mainCount?: number;
  capacityLimit?: number;
  isRegistered?: boolean;
  registrationStatus?: 'main' | 'waitlist';
};

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

  const loadSchedule = useCallback(async () => {
    setLoading(true);
    const player = await getCurrentPlayer();
    setCurrentPlayer(player);

    // 1. Pobierz wszystkie mecze
    const { data: matchesData, error: matchesError } = await supabase
      .from('matches')
      .select('*')
      .order('date', { ascending: false });

    if (matchesError || !matchesData) {
      Alert.alert('Błąd', 'Nie udało się pobrać listy meczów.');
      setLoading(false);
      return;
    }

    // 2. Pobierz wszystkie rejestracje dla tych meczów, żeby policzyć miejsca i sprawdzić stan usera
    const { data: regsData, error: regsError } = await supabase
      .from('match_registrations')
      .select('match_id, player_id, status');

    if (regsError) {
      console.error('Błąd pobierania rejestracji:', regsError);
    }

    const registrations = regsData ?? [];

    // 3. Wzbogać mecze o dane o zapisach
    const processedMatches: MatchItem[] = matchesData.map((match) => {
      const matchRegs = registrations.filter((r) => r.match_id === match.id);
      const mainList = matchRegs.filter((r) => r.status === 'main');
      const capacityLimit = match.capacity ?? match.max_players;

      const userReg = player ? matchRegs.find((r) => r.player_id === player.id) : null;

      return {
        ...match,
        mainCount: mainList.length,
        capacityLimit,
        isRegistered: !!userReg,
        registrationStatus: userReg?.status,
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

  const handleQuickAction = async (match: MatchItem) => {
    if (!currentPlayer) {
      Alert.alert('Błąd', 'Nie wczytano profilu gracza.');
      return;
    }

    const isFinished = isDateInPast(match.date) || match.status === 'cancelled';
    if (isFinished) return;

    if (match.isRegistered) {
      // Sprawdź limit 2 godzin przed wypisaniem
      if (!canCancelMatch(match.date, match.time_start)) {
        Alert.alert('Błąd', 'Nie można wypisać się na mniej niż 2 godziny przed meczem.');
        return;
      }
    }

    setActionLoadingId(match.id);

    if (match.isRegistered) {
      // Wypisz się
      const { error } = await supabase
        .from('match_registrations')
        .delete()
        .eq('match_id', match.id)
        .eq('player_id', currentPlayer.id);

      if (error) {
        Alert.alert('Błąd', error.message);
      }
    } else {
      // Zapisz się (jeśli pełny -> rezerwa)
      const status = (match.mainCount ?? 0) >= (match.capacityLimit ?? 10) ? 'waitlist' : 'main';
      const { error } = await supabase.from('match_registrations').insert({
        match_id: match.id,
        player_id: currentPlayer.id,
        status,
      });

      if (error) {
        Alert.alert('Błąd', error.message);
      }
    }

    setActionLoadingId(null);
    loadSchedule();
  };

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

      <FlatList
        data={matches}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const { weekday, day, month } = formatMatchDate(item.date);
          const isFinished = isDateInPast(item.date) || item.status === 'cancelled';
          const isFull = (item.mainCount ?? 0) >= (item.capacityLimit ?? 10);
          const isActionLoading = actionLoadingId === item.id;
          const title = item.title?.trim() || 'Trening Siatkówki';

          return (
            <TouchableOpacity
              style={styles.matchCard}
              activeOpacity={0.9}
              onPress={() => router.push(`/(match)/${item.id}`)}
            >
              <View style={styles.cardContent}>
                <View style={styles.dateBox}>
                  <Text style={styles.dateDay}>{day}</Text>
                  <Text style={styles.dateMonth}>{month}</Text>
                </View>

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.matchTitle} numberOfLines={1}>{title}</Text>
                  <Text style={styles.matchInfo}>{weekday}, {item.date}</Text>
                  <Text style={styles.matchInfo}>🕒 {formatTime(item.time_start)} | 📍 {item.location}</Text>
                  <Text style={styles.matchInfoBold}>
                    👥 Zapisanych: {item.mainCount}/{item.capacityLimit} | {Number(item.price_per_player)} PLN
                  </Text>
                </View>
              </View>

              {/* Dolny pasek karty z przyciskiem szybkiego zapisu/wypisu */}
              {!isFinished && currentPlayer && (
                <View style={styles.cardFooter}>
                  {item.isRegistered ? (
                    <View style={styles.registeredBadgeRow}>
                      <Text style={styles.registeredText}>
                        {item.registrationStatus === 'waitlist' ? '⏳ Na rezerwie' : '✅ Zapisany'}
                      </Text>
                      <TouchableOpacity
                        style={styles.quickCancelBtn}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleQuickAction(item);
                        }}
                        disabled={isActionLoading}
                      >
                        {isActionLoading ? (
                          <ActivityIndicator size="small" color={colors.destructive} />
                        ) : (
                          <Text style={styles.quickCancelText}>Wypisz się</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.quickSignupBtn, isFull && styles.quickWaitlistBtn]}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleQuickAction(item);
                      }}
                      disabled={isActionLoading}
                    >
                      {isActionLoading ? (
                        <ActivityIndicator size="small" color={colors.primaryForeground} />
                      ) : (
                        <Text style={styles.quickSignupText}>
                          {isFull ? 'Zapisz się na rezerwę' : 'Zapisz się'}
                        </Text>
                      )}
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
  header: { paddingHorizontal: 16, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.foreground },
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
  cardContent: { flexDirection: 'row', alignItems: 'center' },
  dateBox: {
    width: 50,
    height: 50,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateDay: { fontSize: 18, fontWeight: '700', color: colors.accentForeground },
  dateMonth: { fontSize: 11, color: colors.accentForeground, textTransform: 'uppercase' },

  matchTitle: { fontSize: 15, fontWeight: '700', color: colors.foreground, marginBottom: 2 },
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
  quickWaitlistBtn: {
    backgroundColor: '#D97706',
  },
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
});