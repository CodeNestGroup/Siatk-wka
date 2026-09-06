import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { formatMatchDate, formatTime } from '@/lib/format';
import { isMatchFinished } from '@/lib/match-rules';
import { getCurrentPlayer, type Player } from '@/lib/player';
import { syncMatchNotifications } from '@/services/notificationService';
import { useAppTheme } from '@/hooks/use-theme';
import { useItemBadges } from '@/hooks/use-badges';
import { brand, space, type Palette } from '@/constants/app-theme';
import CustomAlert from '@/components/CustomAlert';
import PressableScale from '@/components/ui/PressableScale';
import Card from '@/components/ui/Card';
import Pill, { type PillVariant } from '@/components/ui/Pill';
import DateChip from '@/components/ui/DateChip';
import SegmentButtons from '@/components/ui/SegmentButtons';

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
  created_at: string;
  mainCount?: number;
  totalRegistrationsCount?: number;
  capacityLimit?: number;
  isRegistered?: boolean;
  registrationStatus?: 'main' | 'waitlist';
};

type TabType = 'upcoming' | 'past';

// Pełna lista meczów (nadchodzące/zakończone), tylko do przeglądania — zapis/wypis dzieje się
// dopiero po wejściu w szczegóły (MatchView), stąd ten ekran tylko liczy skład/rezerwę do
// wyświetlenia i nie ma tu żadnych mutacji match_registrations.
export default function ScheduleScreen() {
  const router = useRouter();
  const { isDark, c } = useAppTheme();
  const styles = useMemo(() => getStyles(c), [c]);
  const badges = useItemBadges('matches');

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

  const loadSchedule = useCallback(async () => {
    const player = await getCurrentPlayer();
    setCurrentPlayer(player);

    const { data: matchesData, error: matchesError } = await supabase.from('matches').select('*');

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

      // Jak wszędzie indziej: brak osobnej flagi rezerwy w bazie — pierwsze `capacityLimit`
      // zapisów (posortowanych po created_at) to skład główny, reszta to lista rezerwowa.
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

    // Terminarz widzi wszystkie mecze na raz, więc to najwygodniejsze miejsce, żeby po każdym
    // odświeżeniu przeplanować lokalne przypomnienia (24h przed startem) dla zapisanych meczów.
    await syncMatchNotifications(processedMatches);
  }, []);

  useFocusEffect(
    useCallback(() => {
      badges.enter();
      loadSchedule();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadSchedule])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSchedule();
    setRefreshing(false);
  };

  const handlePress = (item: MatchItem) => {
    badges.markOpened(item.id);
    router.push(`/(match)/${item.id}?from=terminarz`);
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
        <ActivityIndicator size="large" color={brand.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <CustomAlert visible={alertVisible} title={alertTitle} message={alertMessage} onClose={() => setAlertVisible(false)} />

      <FlatList
        data={filteredMatches}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brand.primary} />}
        ListHeaderComponent={
          <View>
            <Text style={styles.headerTitle}>Terminarz Meczów</Text>
            <Text style={styles.headerSubtitle}>Wszystkie nadchodzące i archiwalne spotkania</Text>

            <View style={styles.segmentWrap}>
              <SegmentButtons
                c={c}
                activeKey={activeTab}
                onChange={(key) => setActiveTab(key as TabType)}
                options={[
                  { key: 'upcoming', label: 'Nadchodzące' },
                  { key: 'past', label: 'Zakończone' },
                ]}
              />
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
          const isCancelled = item.status_id === 2;
          const finished = isMatchFinished(item.date, item.time_end, item.time_start);
          const title = item.title?.trim() || 'Trening Siatkówki';
          const capacityLimit = item.capacityLimit ?? 10;
          const currentSigned = item.totalRegistrationsCount ?? 0;
          const { weekday } = formatMatchDate(item.date);

          let statusLabel = 'NADCHODZĄCY';
          let statusVariant: PillVariant = 'blue';
          if (isCancelled) {
            statusLabel = '⚠ ODWOŁANY';
            statusVariant = 'red';
          } else if (finished) {
            statusLabel = 'ZAKOŃCZONY';
            statusVariant = 'neutral';
          }

          const isNew = badges.isNew(item.id, item.created_at);

          return (
            <PressableScale onPress={() => handlePress(item)} style={styles.rowWrap}>
              <Card c={c} isDark={isDark} danger={isCancelled}>
                <View style={styles.rowMain}>
                  <DateChip date={item.date} width={52} height={58} dot={isNew} c={c} />
                  <View style={styles.rowInfo}>
                    <View style={styles.pillsRow}>
                      <Pill c={c} variant={statusVariant} label={statusLabel} />
                      {!isCancelled && currentPlayer && item.isRegistered && (
                        <Pill c={c} variant="green" label="JESTEŚ W SKŁADZIE" />
                      )}
                      {isNew && <Pill c={c} variant="amber" label="NOWY" />}
                    </View>
                    <Text style={[styles.title, isCancelled && styles.titleCancelled]} numberOfLines={1}>
                      {title}
                    </Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {weekday} · {formatTime(item.time_start)}–{formatTime(item.time_end)} · {item.location}
                    </Text>
                  </View>
                  <View style={styles.countCol}>
                    <Text style={styles.countValue}>
                      {currentSigned}/{capacityLimit}
                    </Text>
                    <Text style={styles.countLabel}>SKŁAD</Text>
                  </View>
                </View>
              </Card>
            </PressableScale>
          );
        }}
      />
    </SafeAreaView>
  );
}

const getStyles = (c: Palette) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: c.bg },
    loadingContainer: { flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' },
    listContent: { paddingHorizontal: space.screen, paddingTop: 12, paddingBottom: 32 },

    headerTitle: { fontSize: 24, fontWeight: '800', color: c.ink },
    headerSubtitle: { fontSize: 12.5, color: c.ink3, marginTop: 4, marginBottom: 4, fontWeight: '500' },
    segmentWrap: { marginTop: 16, marginBottom: 6 },

    rowWrap: { marginBottom: space.gap },
    rowMain: { flexDirection: 'row', alignItems: 'center' },
    rowInfo: { flex: 1, marginLeft: 12, marginRight: 10 },
    pillsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 6 },
    title: { fontSize: 14.5, fontWeight: '800', color: c.ink, marginBottom: 3 },
    titleCancelled: { textDecorationLine: 'line-through', color: c.ink2 },
    meta: { fontSize: 11.5, fontWeight: '600', color: c.ink2 },
    countCol: { alignItems: 'flex-end' },
    countValue: { fontSize: 15, fontWeight: '800', color: c.priInk },
    countLabel: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.6, color: c.ink3, marginTop: 2 },

    emptyState: { paddingVertical: 40, alignItems: 'center' },
    emptyText: { fontSize: 15, color: c.ink2, fontWeight: '500' },
  });
