import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { colors, radius, shadow } from '@/constants/app-theme';
import { supabase } from '@/lib/supabase';
import { formatMatchDate, formatTime, isDateInPast } from '@/lib/format';
import { getCurrentPlayer, Player } from '@/lib/player';
import { refreshPlayerNotifications } from '@/services/matchSyncService';

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
  onLongPress,
  cancelling,
  activeTab,
  isSelectionMode,
  isSelected,
}: {
  reg: MyRegistration;
  onCancel: (reg: MyRegistration) => void;
  onPress: (matchId: string) => void;
  onLongPress: () => void;
  cancelling: boolean;
  activeTab: TabType;
  isSelectionMode: boolean;
  isSelected: boolean;
}) {
  if (!reg.matches) return null;

  const { weekday, day, month } = formatMatchDate(reg.matches.date);
  const title = reg.matches.title?.trim() || 'Trening Siatkówki';
  const isWaitlist = reg.registrationStatus === 'waitlist';
  const isCancelled = reg.matches.status_id === 2;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isCancelled && styles.cardCancelled,
        isSelectionMode && isSelected && {
          borderColor: colors.primary,
          borderWidth: 2,
          backgroundColor: '#eff6ff',
        },
      ]}
      activeOpacity={0.8}
      onPress={() => {
        if (isSelectionMode) {
          onLongPress();
        } else {
          reg.matches && onPress(reg.matches.id);
        }
      }}
      onLongPress={onLongPress}
    >
      {isSelectionMode && (
        <View style={styles.checkboxContainer}>
          <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
            {isSelected && <Text style={styles.checkmark}>✓</Text>}
          </View>
        </View>
      )}

      <View style={[styles.dateBox, isCancelled && styles.dateBoxCancelled]}>
        <Text style={[styles.dateDay, isCancelled && styles.dateDayCancelled]}>
          {day}
        </Text>
        <Text style={[styles.dateMonth, isCancelled && styles.dateMonthCancelled]}>
          {month}
        </Text>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <Text
            style={[
              styles.matchTitle,
              isCancelled && styles.matchTitleCancelled,
            ]}
            numberOfLines={1}
          >
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
          🕒 {formatTime(reg.matches.time_start)} –{' '}
          {formatTime(reg.matches.time_end)}
        </Text>

        <View style={styles.footerRow}>
          <View>
            <Text
              style={[
                styles.paymentStatus,
                { color: reg.is_paid ? '#16A34A' : colors.mutedForeground },
              ]}
            >
              {reg.is_paid ? '✓ Opłacone' : 'Brak statusu płatności'}
            </Text>
            <Text style={styles.footerText}>
              {Number(reg.matches.price_per_player)} PLN
            </Text>
          </View>

          {activeTab === 'active' && !isCancelled && !isSelectionMode && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => onCancel(reg)}
              disabled={cancelling}
              activeOpacity={0.7}
            >
              {cancelling ? (
                <ActivityIndicator size="small" color="#DC2626" />
              ) : (
                <Text style={styles.cancelButtonText}>Wypisz się</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
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

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedRegIds, setSelectedRegIds] = useState<string[]>([]);
  const [selectedRange, setSelectedRange] = useState<
    'week' | 'month' | 'quarter' | 'year' | 'all' | null
  >(null);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertCallback, setAlertCallback] = useState<(() => void) | null>(null);

  const showAlert = (
    title: string,
    message: string,
    onCloseCallback?: () => void
  ) => {
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
        const match: MatchInfo | null = Array.isArray(reg.matches)
          ? reg.matches[0] ?? null
          : reg.matches;

        if (!match) {
          return {
            ...reg,
            matches: null,
          } as MyRegistration;
        }

        const matchAllRegs = allRegs.filter((r) => r.match_id === match.id);
        const capacityLimit = match.capacity ?? match.max_players ?? 10;
        const mainList = matchAllRegs.slice(0, capacityLimit);

        const isInMain = mainList.some(
          (r) => r.player_id === player.id
        );

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
      showAlert('Błąd', error.message);
      return;
    }

    if (currentPlayer) {
      await refreshPlayerNotifications(currentPlayer.id);
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
        showAlert(
          'Błąd',
          'Nie można wypisać się na mniej niż 2 godziny przed meczem.'
        );
        return;
      }
    }

    executeCancellation(reg.id);
  };

  const handlePressMatch = (matchId: string) => {
    router.push(`/(match)/${matchId}`);
  };

  const filteredRegistrations = registrations
    .filter((reg) => {
      if (!reg.matches) return false;

      const isPast = isDateInPast(reg.matches.date);

      if (activeTab === 'active') {
        return !isPast;
      } else {
        return isPast;
      }
    })
    .sort((a, b) => {
      if (!a.matches || !b.matches) return 0;

      const timeA = new Date(
        `${a.matches.date}T${a.matches.time_start}`
      ).getTime();

      const timeB = new Date(
        `${b.matches.date}T${b.matches.time_start}`
      ).getTime();

      if (activeTab === 'active') {
        return timeA - timeB;
      } else {
        return timeB - timeA;
      }
    });

  const toggleSelectReg = (regId: string) => {
    if (selectedRegIds.includes(regId)) {
      setSelectedRegIds(
        selectedRegIds.filter((id) => id !== regId)
      );
    } else {
      setSelectedRegIds([...selectedRegIds, regId]);
    }
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

  const handleRangeSelect = (
    range: 'week' | 'month' | 'quarter' | 'year' | 'all'
  ) => {
    setSelectedRange(range);

    const now = new Date();
    const idsToSelect: string[] = [];

    filteredRegistrations.forEach((reg) => {
      if (!reg.matches || reg.matches.status_id === 2) return;

      const matchDate = new Date(reg.matches.date);
      const diffTime = matchDate.getTime() - now.getTime();
      const diffDays = diffTime / (1000 * 3600 * 24);

      let matchesCriteria = false;

      if (range === 'week' && diffDays >= 0 && diffDays <= 7) {
        matchesCriteria = true;
      } else if (range === 'month' && diffDays >= 0 && diffDays <= 30) {
        matchesCriteria = true;
      } else if (range === 'quarter' && diffDays >= 0 && diffDays <= 90) {
        matchesCriteria = true;
      } else if (range === 'year' && diffDays >= 0 && diffDays <= 365) {
        matchesCriteria = true;
      } else if (range === 'all' && diffDays >= 0) {
        matchesCriteria = true;
      }

      if (matchesCriteria) {
        idsToSelect.push(reg.id);
      }
    });

    setSelectedRegIds(idsToSelect);
  };

  const handleBulkCancel = async () => {
    if (selectedRegIds.length === 0) return;

    setBulkActionLoading(true);

    const { error } = await supabase
      .from('match_registrations')
      .delete()
      .in('id', selectedRegIds);

    setBulkActionLoading(false);

    if (error) {
      showAlert('Błąd', error.message);
      return;
    }

    if (currentPlayer) {
      await refreshPlayerNotifications(currentPlayer.id);
    }

    setIsSelectionMode(false);
    setSelectedRegIds([]);
    setSelectedRange(null);

    await loadData();
  };

  if (loading) {
    return (
      <SafeAreaView
        style={styles.loadingContainer}
        edges={['bottom', 'left', 'right']}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['bottom', 'left', 'right']}
    >
      <CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        onClose={handleAlertClose}
      />

      <FlatList
        data={filteredRegistrations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View>
            <Text style={styles.headerTitle}>Moje zapisy</Text>
            <Text style={styles.headerSubtitle}>
              Mecze, na które się zapisałeś (przytrzymaj kafelek, aby
              zaznaczyć wiele)
            </Text>

            {errorMsg && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>
                  Błąd wczytywania: {errorMsg}
                </Text>
              </View>
            )}

            {!currentPlayer && !loading && (
              <View style={styles.warnBox}>
                <Text style={styles.warnText}>
                  Nie znaleziono Twojego profilu gracza.
                </Text>
              </View>
            )}

            {isSelectionMode && activeTab === 'active' && (
              <View style={styles.selectionToolbar}>
                <Text style={styles.toolbarTitle}>
                  Wybierz zakres dat:
                </Text>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.rangeScroll}
                >
                  <TouchableOpacity
                    style={[
                      styles.rangeChip,
                      selectedRange === 'week' &&
                        styles.rangeChipActive,
                    ]}
                    onPress={() => handleRangeSelect('week')}
                  >
                    <Text
                      style={[
                        styles.rangeText,
                        selectedRange === 'week' &&
                          styles.rangeTextActive,
                      ]}
                    >
                      Tydzień
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.rangeChip,
                      selectedRange === 'month' &&
                        styles.rangeChipActive,
                    ]}
                    onPress={() => handleRangeSelect('month')}
                  >
                    <Text
                      style={[
                        styles.rangeText,
                        selectedRange === 'month' &&
                          styles.rangeTextActive,
                      ]}
                    >
                      Miesiąc
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.rangeChip,
                      selectedRange === 'quarter' &&
                        styles.rangeChipActive,
                    ]}
                    onPress={() => handleRangeSelect('quarter')}
                  >
                    <Text
                      style={[
                        styles.rangeText,
                        selectedRange === 'quarter' &&
                          styles.rangeTextActive,
                      ]}
                    >
                      Kwartał
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.rangeChip,
                      selectedRange === 'year' &&
                        styles.rangeChipActive,
                    ]}
                    onPress={() => handleRangeSelect('year')}
                  >
                    <Text
                      style={[
                        styles.rangeText,
                        selectedRange === 'year' &&
                          styles.rangeTextActive,
                      ]}
                    >
                      Rok
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.rangeChip,
                      selectedRange === 'all' &&
                        styles.rangeChipActive,
                    ]}
                    onPress={() => handleRangeSelect('all')}
                  >
                    <Text
                      style={[
                        styles.rangeText,
                        selectedRange === 'all' &&
                          styles.rangeTextActive,
                      ]}
                    >
                      Wszystko
                    </Text>
                  </TouchableOpacity>
                </ScrollView>

                <View style={styles.toolbarActionsRow}>
                  <TouchableOpacity
                    style={[
                      styles.bulkCancelBtn,
                      bulkActionLoading && { opacity: 0.6 },
                    ]}
                    onPress={handleBulkCancel}
                    disabled={
                      selectedRegIds.length === 0 ||
                      bulkActionLoading
                    }
                  >
                    {bulkActionLoading ? (
                      <ActivityIndicator
                        size="small"
                        color="#fff"
                      />
                    ) : (
                      <Text style={styles.bulkCancelText}>
                        Wypisz zaznaczone ({selectedRegIds.length})
                      </Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.closeSelectionBtn}
                    onPress={() => {
                      setIsSelectionMode(false);
                      setSelectedRegIds([]);
                      setSelectedRange(null);
                    }}
                  >
                    <Text style={styles.closeSelectionText}>
                      Zamknij
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={styles.tabsContainer}>
              <TouchableOpacity
                style={[
                  styles.tabButton,
                  activeTab === 'active' &&
                    styles.tabButtonActive,
                ]}
                onPress={() => {
                  setActiveTab('active');
                  setIsSelectionMode(false);
                  setSelectedRegIds([]);
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === 'active' &&
                      styles.tabTextActive,
                  ]}
                >
                  Nadchodzące
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tabButton,
                  activeTab === 'past' &&
                    styles.tabButtonActive,
                ]}
                onPress={() => {
                  setActiveTab('past');
                  setIsSelectionMode(false);
                  setSelectedRegIds([]);
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === 'past' &&
                      styles.tabTextActive,
                  ]}
                >
                  Zakończone
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
                : 'Brak zakończonych zapisów.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <RegistrationCard
            reg={item}
            onCancel={handleCancel}
            onPress={handlePressMatch}
            onLongPress={() => handleLongPressCard(item.id)}
            cancelling={cancellingId === item.id}
            activeTab={activeTab}
            isSelectionMode={
              isSelectionMode && activeTab === 'active'
            }
            isSelected={selectedRegIds.includes(item.id)}
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

  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.foreground,
    marginTop: 16,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.mutedForeground,
    marginTop: 4,
    marginBottom: 16,
  },

  selectionToolbar: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  toolbarTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: 6,
  },
  rangeScroll: { marginBottom: 8 },
  rangeChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
    backgroundColor: colors.muted,
    marginRight: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rangeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  rangeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  rangeTextActive: {
    color: colors.primaryForeground,
    fontWeight: '700',
  },
  toolbarActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bulkCancelBtn: {
    backgroundColor: colors.destructive,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  bulkCancelText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  closeSelectionBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  closeSelectionText: {
    color: colors.foreground,
    fontSize: 12,
    fontWeight: '600',
  },

  checkboxContainer: {
    marginRight: 10,
    justifyContent: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
  },
  checkmark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  errorBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 14,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
  },

  warnBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 14,
  },
  warnText: {
    color: '#92400E',
    fontSize: 13,
  },

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
    borderRadius: radius.md,
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
    ...shadow.button,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.mutedForeground,
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
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  cardCancelled: {
    opacity: 0.7,
    backgroundColor: '#F8FAFC',
  },
  dateBox: {
    width: 54,
    height: 54,
    borderRadius: radius.lg,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dateBoxCancelled: {
    backgroundColor: colors.muted,
  },
  dateDay: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  dateDayCancelled: {
    color: colors.mutedForeground,
  },
  dateMonth: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
  },
  dateMonthCancelled: {
    color: colors.mutedForeground,
  },
  cardBody: {
    flex: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  matchTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.foreground,
    flex: 1,
    marginRight: 8,
  },
  matchTitleCancelled: {
    textDecorationLine: 'line-through',
    color: colors.mutedForeground,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  weekday: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginBottom: 4,
  },
  location: {
    fontSize: 13,
    color: colors.foreground,
    marginBottom: 2,
  },
  time: {
    fontSize: 13,
    color: colors.mutedForeground,
    marginBottom: 10,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  paymentStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  footerText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.foreground,
    marginTop: 2,
  },
  cancelButton: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  cancelButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.mutedForeground,
  },
});