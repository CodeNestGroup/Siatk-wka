import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { formatMatchDate, formatTime } from '@/lib/format';
import { canCancelMatch, isMatchFinished } from '@/lib/match-rules';
import { getCurrentPlayer, type Player } from '@/lib/player';
import { resyncNotificationsForPlayer } from '@/services/notificationService';
import { afterCancel } from '@/services/registrationService';
import { removeMatchFromCalendar } from '@/services/calendarService';
import { successHaptic } from '@/lib/haptics';
import { showToast } from '@/lib/toast';
import { useAppTheme } from '@/hooks/use-theme';
import { brand, space, radius, type Palette } from '@/constants/app-theme';
import CustomAlert from '@/components/CustomAlert';
import PressableScale from '@/components/ui/PressableScale';
import Card from '@/components/ui/Card';
import Pill, { type PillVariant } from '@/components/ui/Pill';
import DateChip from '@/components/ui/DateChip';
import SegmentButtons from '@/components/ui/SegmentButtons';
import Chip from '@/components/ui/Chip';
import DangerButton from '@/components/ui/DangerButton';
import ToastHost from '@/components/ui/Toast';

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
  totalRegisteredCount?: number;
};

type TabType = 'active' | 'past';
type RangeKey = 'week' | 'month' | 'year' | 'all';
type PaymentFilter = 'all' | 'paid' | 'unpaid';

const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: 'week', label: 'Ten tydzień' },
  { key: 'month', label: 'Ten miesiąc' },
  { key: 'year', label: 'Ten rok' },
  { key: 'all', label: 'Wszystkie' },
];

const PAYMENT_FILTER_OPTIONS: { key: PaymentFilter; label: string }[] = [
  { key: 'all', label: 'Wszystkie' },
  { key: 'paid', label: 'Opłacone' },
  { key: 'unpaid', label: 'Nie opłacone' },
];

function RegistrationCard({
  reg,
  onCancel,
  onPress,
  onLongPress,
  cancelling,
  activeTab,
  isSelectionMode,
  isSelected,
  c,
  isDark,
}: {
  reg: MyRegistration;
  onCancel: (reg: MyRegistration) => void;
  onPress: () => void;
  onLongPress: () => void;
  cancelling: boolean;
  activeTab: TabType;
  isSelectionMode: boolean;
  isSelected: boolean;
  c: Palette;
  isDark: boolean;
}) {
  if (!reg.matches) return null;
  const styles = getCardStyles(c);

  const match = reg.matches;
  const title = match.title?.trim() || 'Trening Siatkówki';
  const isWaitlist = reg.registrationStatus === 'waitlist';
  const isCancelled = match.status_id === 2;
  const finished = isMatchFinished(match.date, match.time_end, match.time_start);
  const { weekday } = formatMatchDate(match.date);

  let statusLabel = 'NADCHODZĄCY';
  let statusVariant: PillVariant = 'blue';
  if (isCancelled) {
    statusLabel = '⚠ ODWOŁANY';
    statusVariant = 'red';
  } else if (finished) {
    statusLabel = 'ZAKOŃCZONY';
    statusVariant = 'neutral';
  }

  return (
    <PressableScale onPress={onPress} onLongPress={onLongPress} delayLongPress={420} style={styles.wrap}>
      <Card
        c={c}
        isDark={isDark}
        danger={isCancelled}
        style={isSelectionMode && isSelected ? styles.cardSelected : undefined}
      >
        <View style={styles.mainRow}>
          {isSelectionMode && (
            <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
              {isSelected && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
            </View>
          )}
          <DateChip date={match.date} width={48} height={54} c={c} />
          <View style={styles.infoCol}>
            <Text style={[styles.title, isCancelled && styles.titleCancelled]} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {weekday} · {formatTime(match.time_start)}–{formatTime(match.time_end)} · {match.location}
            </Text>
            <View style={styles.pillsRow}>
              <Pill c={c} variant={statusVariant} label={statusLabel} />
              {!isCancelled && (
                <Pill c={c} variant={isWaitlist ? 'amber' : 'green'} label={isWaitlist ? 'REZERWA' : 'SKŁAD GŁÓWNY'} />
              )}
              <Pill c={c} variant={reg.is_paid ? 'green' : 'amber'} label={reg.is_paid ? 'OPŁACONE' : 'NIE OPŁACONE'} />
            </View>
          </View>
        </View>

        {!isSelectionMode && activeTab === 'active' && !isCancelled && (
          <View style={styles.footerWrap}>
            <DangerButton
              label="Wypisz się z meczu"
              onPress={() => onCancel(reg)}
              loading={cancelling}
              c={c}
              icon="exit-outline"
            />
          </View>
        )}
      </Card>
    </PressableScale>
  );
}

export default function MojeZapisyScreen() {
  const router = useRouter();
  const { isDark, c } = useAppTheme();
  const styles = useMemo(() => getStyles(c), [c]);

  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [registrations, setRegistrations] = useState<MyRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedRegIds, setSelectedRegIds] = useState<string[]>([]);
  const [selectedRange, setSelectedRange] = useState<RangeKey | null>(null);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [footerHeight, setFooterHeight] = useState(0);

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
          return { ...reg, matches: null } as MyRegistration;
        }

        const matchAllRegs = allRegs.filter((r) => r.match_id === match.id);
        const capacityLimit = match.capacity ?? match.max_players ?? 10;
        const mainList = matchAllRegs.slice(0, capacityLimit);
        const isInMain = mainList.some((r) => r.player_id === player.id);

        return {
          ...reg,
          matches: match,
          registrationStatus: isInMain ? 'main' : 'waitlist',
          totalRegisteredCount: matchAllRegs.length,
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
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const executeCancellation = async (reg: MyRegistration) => {
    setCancellingId(reg.id);

    const { error } = await supabase.from('match_registrations').delete().eq('id', reg.id);

    setCancellingId(null);

    if (error) {
      showAlert('Błąd', error.message);
      return;
    }

    if (currentPlayer && reg.matches) {
      const capacityLimit = reg.matches.capacity ?? reg.matches.max_players ?? 10;
      const willPromote = reg.registrationStatus === 'main' && (reg.totalRegisteredCount ?? 0) > capacityLimit;
      await afterCancel(reg.matches, currentPlayer, { willPromote });
    }
    await loadData();
  };

  const handleCancel = (reg: MyRegistration) => {
    if (reg.matches) {
      if (reg.matches.status_id === 2) {
        showAlert('Błąd', 'Nie można wypisać się z odwołanego meczu.');
        return;
      }
      if (!canCancelMatch(reg.matches.date, reg.matches.time_start)) {
        showAlert('Błąd', 'Nie można wypisać się na mniej niż 2 godziny przed meczem.');
        return;
      }
    }
    executeCancellation(reg);
  };

  const handlePressMatch = (matchId: string) => {
    router.push(`/(match)/${matchId}?from=moje-zapisy`);
  };

  const filteredRegistrations = registrations
    .filter((reg) => {
      if (!reg.matches) return false;
      const finished = isMatchFinished(reg.matches.date, reg.matches.time_end, reg.matches.time_start);
      if (activeTab === 'active' ? finished : !finished) return false;
      if (paymentFilter === 'paid' && !reg.is_paid) return false;
      if (paymentFilter === 'unpaid' && reg.is_paid) return false;
      return true;
    })
    .sort((a, b) => {
      if (!a.matches || !b.matches) return 0;
      const timeA = new Date(`${a.matches.date}T${a.matches.time_start}`).getTime();
      const timeB = new Date(`${b.matches.date}T${b.matches.time_start}`).getTime();
      return activeTab === 'active' ? timeA - timeB : timeB - timeA;
    });

  const toggleSelectReg = (regId: string) => {
    setSelectedRegIds((prev) => (prev.includes(regId) ? prev.filter((id) => id !== regId) : [...prev, regId]));
  };

  const handleLongPressCard = (regId: string) => {
    if (activeTab !== 'active') return;
    if (!isSelectionMode) {
      setIsSelectionMode(true);
      setSelectedRegIds([regId]);
    } else {
      toggleSelectReg(regId);
    }
  };

  const handleCardPress = (reg: MyRegistration) => {
    if (isSelectionMode) {
      toggleSelectReg(reg.id);
    } else if (reg.matches) {
      handlePressMatch(reg.matches.id);
    }
  };

  const handleRangeSelect = (range: RangeKey) => {
    setSelectedRange(range);
    const now = new Date();
    const idsToSelect: string[] = [];

    filteredRegistrations.forEach((reg) => {
      // Zakresy zaznaczają tylko mecze, z których faktycznie da się jeszcze wypisać:
      // pomijamy odwołane i te, które wpadły już w okno "mniej niż 2h do startu".
      if (!reg.matches || reg.matches.status_id === 2) return;
      if (!canCancelMatch(reg.matches.date, reg.matches.time_start)) return;

      const matchDate = new Date(reg.matches.date);
      const diffDays = (matchDate.getTime() - now.getTime()) / (1000 * 3600 * 24);

      let matchesCriteria = false;
      if (range === 'week' && diffDays >= 0 && diffDays <= 7) matchesCriteria = true;
      else if (range === 'month' && diffDays >= 0 && diffDays <= 30) matchesCriteria = true;
      else if (range === 'year' && diffDays >= 0 && diffDays <= 365) matchesCriteria = true;
      else if (range === 'all' && diffDays >= 0) matchesCriteria = true;

      if (matchesCriteria) idsToSelect.push(reg.id);
    });

    setSelectedRegIds(idsToSelect);
  };

  const handleDeselectAll = () => {
    setSelectedRange(null);
    setSelectedRegIds([]);
  };

  const handleBulkCancel = async () => {
    if (selectedRegIds.length === 0) return;
    setBulkActionLoading(true);

    const { error } = await supabase.from('match_registrations').delete().in('id', selectedRegIds);

    setBulkActionLoading(false);

    if (error) {
      showAlert('Błąd', error.message);
      return;
    }

    if (currentPlayer) {
      await resyncNotificationsForPlayer(currentPlayer.id);
      successHaptic();

      if (currentPlayer.calendar_sync_enabled) {
        // Zbiorczy wypis może obejmować kilka różnych meczów — usuwamy każde wydarzenie osobno.
        const matchIds = registrations
          .filter((r) => selectedRegIds.includes(r.id) && r.matches)
          .map((r) => r.matches!.id);
        await Promise.all(matchIds.map((id) => removeMatchFromCalendar(id)));
      }
    }

    showToast(`Wypisano Cię z ${selectedRegIds.length} meczów.`, 'exit-outline');

    setIsSelectionMode(false);
    setSelectedRegIds([]);
    setSelectedRange(null);

    await loadData();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['bottom', 'left', 'right']}>
        <ActivityIndicator size="large" color={brand.primary} />
      </SafeAreaView>
    );
  }

  const showBulkFooter = isSelectionMode && activeTab === 'active';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <CustomAlert visible={alertVisible} title={alertTitle} message={alertMessage} onClose={handleAlertClose} />

      <FlatList
        data={filteredRegistrations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brand.primary} />}
        ListHeaderComponent={
          <View>
            <Text style={styles.headerTitle}>Moje zapisy</Text>
            <Text style={styles.headerSubtitle}>
              Mecze, na które się zapisałeś (przytrzymaj kafelek, aby zaznaczyć wiele)
            </Text>

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

            {isSelectionMode && activeTab === 'active' && (
              <View style={styles.selectionToolbar}>
                <View style={styles.selectionTopRow}>
                  <Text style={styles.selectionCount}>
                    Zaznaczono {selectedRegIds.length} z {filteredRegistrations.length}
                  </Text>
                  <PressableScale
                    onPress={() => {
                      setIsSelectionMode(false);
                      setSelectedRegIds([]);
                      setSelectedRange(null);
                    }}
                  >
                    <Text style={styles.cancelSelectionText}>Anuluj</Text>
                  </PressableScale>
                </View>

                <FlatList
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  data={[...RANGE_OPTIONS, { key: 'deselect' as const, label: 'Odznacz' }]}
                  keyExtractor={(item) => item.key}
                  contentContainerStyle={styles.rangeRow}
                  renderItem={({ item }) => (
                    <Chip
                      label={item.label}
                      active={item.key !== 'deselect' && selectedRange === item.key}
                      onPress={() =>
                        item.key === 'deselect' ? handleDeselectAll() : handleRangeSelect(item.key as RangeKey)
                      }
                      c={c}
                    />
                  )}
                />
              </View>
            )}

            <View style={styles.segmentWrap}>
              <SegmentButtons
                c={c}
                activeKey={activeTab}
                onChange={(key) => {
                  setActiveTab(key as TabType);
                  setIsSelectionMode(false);
                  setSelectedRegIds([]);
                  setSelectedRange(null);
                }}
                options={[
                  { key: 'active', label: 'Nadchodzące' },
                  { key: 'past', label: 'Zakończone' },
                ]}
              />
            </View>

            <View style={styles.paymentFilterRow}>
              {PAYMENT_FILTER_OPTIONS.map((opt) => (
                <Chip
                  key={opt.key}
                  label={opt.label}
                  active={paymentFilter === opt.key}
                  onPress={() => setPaymentFilter(opt.key)}
                  c={c}
                />
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {paymentFilter !== 'all'
                ? 'Brak zapisów spełniających wybrany filtr płatności.'
                : activeTab === 'active'
                  ? 'Brak nadchodzących zapisów.'
                  : 'Brak zakończonych zapisów.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <RegistrationCard
            reg={item}
            onCancel={handleCancel}
            onPress={() => handleCardPress(item)}
            onLongPress={() => handleLongPressCard(item.id)}
            cancelling={cancellingId === item.id}
            activeTab={activeTab}
            isSelectionMode={isSelectionMode && activeTab === 'active'}
            isSelected={selectedRegIds.includes(item.id)}
            c={c}
            isDark={isDark}
          />
        )}
      />

      {showBulkFooter && (
        <View style={styles.bulkFooter} onLayout={(e) => setFooterHeight(e.nativeEvent.layout.height)}>
          <DangerButton
            label={`Wypisz się z zaznaczonych (${selectedRegIds.length})`}
            onPress={handleBulkCancel}
            disabled={selectedRegIds.length === 0}
            loading={bulkActionLoading}
            c={c}
            icon="exit-outline"
          />
        </View>
      )}

      <ToastHost c={c} isDark={isDark} bottom={(showBulkFooter ? footerHeight : 0) + 10} />
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
    segmentWrap: { marginTop: 12, marginBottom: 6 },
    paymentFilterRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },

    errorBox: { backgroundColor: c.tintR, borderRadius: 16, padding: 14, marginTop: 14, borderWidth: 1, borderColor: brand.danger },
    errorText: { color: c.redInk, fontSize: 13, fontWeight: '600' },
    warnBox: { backgroundColor: c.tintA, borderRadius: 16, padding: 14, marginTop: 14, borderWidth: 1, borderColor: brand.accent },
    warnText: { color: c.amberInk, fontSize: 13, fontWeight: '600' },

    selectionToolbar: {
      backgroundColor: c.tintB,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: 'rgba(44,75,255,0.35)',
      padding: 14,
      marginTop: 14,
    },
    selectionTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    selectionCount: { fontSize: 13, fontWeight: '800', color: c.priInk },
    cancelSelectionText: { fontSize: 12.5, fontWeight: '800', color: c.ink2 },
    rangeRow: { gap: 8 },

    emptyState: { paddingVertical: 40, alignItems: 'center' },
    emptyText: { fontSize: 15, color: c.ink2, fontWeight: '500' },

    bulkFooter: {
      padding: space.screen,
      paddingTop: 14,
      backgroundColor: c.card,
      borderTopWidth: 1,
      borderTopColor: c.line,
    },
  });

const getCardStyles = (c: Palette) =>
  StyleSheet.create({
    wrap: { marginBottom: space.gap },
    cardSelected: { borderColor: brand.primary, backgroundColor: c.tintB },
    mainRow: { flexDirection: 'row', alignItems: 'center' },
    checkbox: {
      width: 26,
      height: 26,
      borderRadius: radius.xs,
      borderWidth: 2,
      borderColor: brand.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
      backgroundColor: c.card2,
    },
    checkboxChecked: { backgroundColor: brand.primary },
    infoCol: { flex: 1, marginLeft: 12 },
    title: { fontSize: 14.5, fontWeight: '800', color: c.ink, marginBottom: 3 },
    titleCancelled: { textDecorationLine: 'line-through', color: c.ink2 },
    meta: { fontSize: 11.5, fontWeight: '600', color: c.ink2, marginBottom: 6 },
    pillsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
    footerWrap: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.line },
  });
