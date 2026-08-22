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
import { supabase } from '@/lib/supabase';
import { formatMatchDate, formatTime } from '@/lib/format';
import { getCurrentPlayer, Player } from '@/lib/player';
import { syncMatchNotifications } from '@/services/notificationService';

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

  const { day, month } = formatMatchDate(reg.matches.date);
  const title = reg.matches.title?.trim() || 'Trening Siatkówki';
  const isWaitlist = reg.registrationStatus === 'waitlist';
  const isCancelled = reg.matches.status_id === 2;
  const finished = isMatchFinished(reg.matches.date, reg.matches.time_end, reg.matches.time_start);

  return (
    <TouchableOpacity
      style={[
        styles.matchCard,
        isCancelled && styles.matchCardCancelled,
        isSelectionMode && isSelected && {
          borderColor: '#FBBF24',
          borderWidth: 2,
          backgroundColor: '#1E293B',
        },
      ]}
      activeOpacity={0.9}
      onPress={() => {
        if (isSelectionMode) {
          onLongPress();
        } else {
          reg.matches && onPress(reg.matches.id);
        }
      }}
      onLongPress={onLongPress}
    >
      {!isCancelled && !finished && !isSelectionMode && (
        <View style={[
          styles.sideStatusBar,
          isWaitlist ? styles.sideBarWaitlist : styles.sideBarMain
        ]} />
      )}

      {isSelectionMode && (
        <View style={styles.checkboxContainer}>
          <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
            {isSelected && <Text style={styles.checkmark}>✓</Text>}
          </View>
        </View>
      )}

      <View style={styles.cardInnerContainer}>
        <View style={styles.cardMainRow}>
          <View style={[styles.dateBox, isCancelled && styles.dateBoxCancelled]}>
            <Text style={[styles.dateDay, isCancelled && styles.dateDayCancelled]}>
              {day}
            </Text>
            <Text style={[styles.dateMonth, isCancelled && styles.dateMonthCancelled]}>
              {month}
            </Text>
          </View>

          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={styles.titleRow}>
              <Text
                style={[
                  styles.matchTitle,
                  isCancelled && styles.matchTitleCancelled,
                ]}
                numberOfLines={1}
              >
                {title}
              </Text>
              
              {isCancelled ? (
                <View style={styles.badgeCancelledBg}>
                  <Text style={styles.badgeCancelledText}>⚠️ Odwołany</Text>
                </View>
              ) : (
                <View
                  style={[
                    styles.inlineStatusBadge,
                    isWaitlist ? styles.badgeWaitlistBg : styles.badgeMainBg,
                  ]}
                >
                  <Text
                    style={[
                      styles.inlineStatusText,
                      isWaitlist ? styles.badgeWaitlistText : styles.badgeMainText,
                    ]}
                  >
                    {isWaitlist ? '⏳ Rezerwa' : '✅ Zapisany'}
                  </Text>
                </View>
              )}
            </View>

            <Text style={styles.matchInfo}>📍 {reg.matches.location} | 🕒 {formatTime(reg.matches.time_start)}</Text>
            
            <View style={styles.subInfoRow}>
              <Text
                style={[
                  styles.paymentStatus,
                  { color: reg.is_paid ? '#34D399' : '#94A3B8' },
                ]}
              >
                {reg.is_paid ? '✓ Opłacone' : 'Brak statusu płatności'}
              </Text>
              <Text style={styles.priceText}>{Number(reg.matches.price_per_player)} PLN</Text>
            </View>
          </View>
        </View>

        {activeTab === 'active' && !isCancelled && !isSelectionMode && (
          <View style={styles.cardFooter}>
            <TouchableOpacity
              style={styles.quickCancelBtnInline}
              onPress={(e) => {
                e.stopPropagation();
                onCancel(reg);
              }}
              disabled={cancelling}
              activeOpacity={0.7}
            >
              {cancelling ? (
                <ActivityIndicator size="small" color="#F87171" />
              ) : (
                <Text style={styles.quickCancelText}>Wypisz się z meczu</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

function currentPlayerIsMain(reg: MyRegistration): boolean {
  return reg.registrationStatus === 'main';
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

  const updateNotificationsAfterChange = async (playerId: string) => {
    const { data: matchesData } = await supabase.from('matches').select('*');
    const { data: regsData } = await supabase
      .from('match_registrations')
      .select('match_id, player_id')
      .eq('player_id', playerId);

    if (matchesData) {
      const registeredMatchIds = new Set((regsData || []).map((r) => r.match_id));
      const formattedMatches = matchesData.map((m) => ({
        id: m.id,
        title: m.title,
        date: m.date,
        time_start: m.time_start,
        location: m.location,
        status_id: m.status_id,
        isRegistered: registeredMatchIds.has(m.id),
      }));
      await syncMatchNotifications(formattedMatches);
    }
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
      await updateNotificationsAfterChange(currentPlayer.id);
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

      const finished = isMatchFinished(
        reg.matches.date,
        reg.matches.time_end,
        reg.matches.time_start
      );

      if (activeTab === 'active') {
        return !finished;
      } else {
        return finished;
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
      await updateNotificationsAfterChange(currentPlayer.id);
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
        <ActivityIndicator size="large" color="#FBBF24" />
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
            tintColor="#FBBF24"
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
                        color="#0F172A"
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
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  alertBox: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#334155',
  },
  indicator: {
    width: 48,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FBBF24',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  button: {
    width: '100%',
    backgroundColor: '#FBBF24',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '800',
  },
});

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0F172A' },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  listContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32 },

  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 16,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
    marginBottom: 16,
    fontWeight: '500',
  },

  selectionToolbar: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 14,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#334155',
  },
  toolbarTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  rangeScroll: { marginBottom: 10 },
  rangeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#0F172A',
    marginRight: 6,
    borderWidth: 2,
    borderColor: '#334155',
  },
  rangeChipActive: {
    backgroundColor: '#FBBF24',
    borderColor: '#FBBF24',
  },
  rangeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  rangeTextActive: {
    color: '#0F172A',
    fontWeight: '800',
  },
  toolbarActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bulkCancelBtn: {
    backgroundColor: '#F87171',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  bulkCancelText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '800',
  },
  closeSelectionBtn: {
    borderWidth: 2,
    borderColor: '#334155',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#0F172A',
  },
  closeSelectionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  checkboxContainer: {
    marginRight: 10,
    justifyContent: 'center',
    paddingLeft: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FBBF24',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
  },
  checkboxChecked: {
    backgroundColor: '#FBBF24',
  },
  checkmark: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '900',
  },

  errorBox: {
    backgroundColor: 'rgba(248, 113, 113, 0.15)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F87171',
  },
  errorText: {
    color: '#F87171',
    fontSize: 14,
    fontWeight: '600',
  },

  warnBox: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FBBF24',
  },
  warnText: {
    color: '#FBBF24',
    fontSize: 14,
    fontWeight: '600',
  },

  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 18,
    padding: 4,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#334155',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 14,
  },
  tabButtonActive: {
    backgroundColor: '#FBBF24',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
  },
  tabTextActive: {
    color: '#0F172A',
    fontWeight: '900',
  },

  matchCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    marginBottom: 14,
    borderWidth: 0,
    overflow: 'hidden',
    position: 'relative',
  },
  matchCardCancelled: { backgroundColor: '#1E293B' },

  sideStatusBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
  },
  sideBarMain: { backgroundColor: '#FBBF24' },
  sideBarWaitlist: { backgroundColor: '#64748B' },

  cardInnerContainer: {
    padding: 14,
    paddingLeft: 18,
  },
  cardMainRow: { flexDirection: 'row', alignItems: 'center' },
  dateBox: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#334155',
  },
  dateBoxCancelled: { borderColor: '#F87171' },
  dateDay: { fontSize: 20, fontWeight: '800', color: '#FBBF24' },
  dateDayCancelled: { color: '#F87171' },
  dateMonth: { fontSize: 12, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase' },
  dateMonthCancelled: { color: '#F87171' },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  matchTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', flex: 1, marginRight: 6 },
  matchTitleCancelled: { textDecorationLine: 'line-through', color: '#F87171' },

  inlineStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeMainBg: { backgroundColor: '#0F172A', borderWidth: 2, borderColor: '#FBBF24' },
  badgeWaitlistBg: { backgroundColor: '#0F172A', borderWidth: 2, borderColor: '#64748B' },
  inlineStatusText: { fontSize: 11, fontWeight: '800' },
  badgeMainText: { color: '#FBBF24' },
  badgeWaitlistText: { color: '#94A3B8' },

  badgeCancelledBg: { backgroundColor: '#0F172A', borderWidth: 2, borderColor: '#F87171', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeCancelledText: { fontSize: 11, fontWeight: '800', color: '#F87171' },

  matchInfo: { fontSize: 13, color: '#94A3B8', marginBottom: 6, fontWeight: '500' },
  
  subInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  paymentStatus: {
    fontSize: 12,
    fontWeight: '700',
  },
  priceText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  cardFooter: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 2,
    borderTopColor: '#334155',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  quickCancelBtnInline: {
    borderWidth: 2,
    borderColor: '#F87171',
    borderRadius: 14,
    paddingVertical: 10,
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  quickCancelText: { color: '#F87171', fontSize: 13, fontWeight: '800' },

  emptyState: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: 15, color: '#94A3B8', fontStyle: 'italic', fontWeight: '500' },
});