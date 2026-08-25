import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { formatMatchDate, formatTime } from '@/lib/format';
import { getCurrentPlayer, Player } from '@/lib/player';
import { syncMatchNotifications } from '@/services/notificationService';
import CustomAlert from '@/components/CustomAlert';

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
  isDark,
}: {
  reg: MyRegistration;
  onCancel: (reg: MyRegistration) => void;
  onPress: (matchId: string) => void;
  onLongPress: () => void;
  cancelling: boolean;
  activeTab: TabType;
  isSelectionMode: boolean;
  isSelected: boolean;
  isDark: boolean;
}) {
  if (!reg.matches) return null;

  const styles = getStyles(isDark);
  const { day, month } = formatMatchDate(reg.matches.date);
  const title = reg.matches.title?.trim() || 'Trening Siatkówki';
  const isWaitlist = reg.registrationStatus === 'waitlist';
  const isCancelled = reg.matches.status_id === 2;
  const finished = isMatchFinished(reg.matches.date, reg.matches.time_end, reg.matches.time_start);

  const capacityLimit = reg.matches.capacity ?? reg.matches.max_players ?? 10;
  const currentSigned = reg.totalRegisteredCount ?? 0;

  return (
    <TouchableOpacity
      style={[
        styles.matchCard,
        isCancelled && styles.matchCardCancelled,
        isSelectionMode && isSelected && styles.matchCardSelected,
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
            <Text 
              style={[styles.dateMonth, isCancelled && styles.dateMonthCancelled]} 
              numberOfLines={1} 
              adjustsFontSizeToFit
            >
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

            <View style={styles.iconInfoRow}>
              <View style={styles.iconContainer}>
                <Text style={styles.containerIconText}>📍</Text>
              </View>
              <Text style={styles.matchInfo} numberOfLines={1}>{reg.matches.location}</Text>
            </View>

            <View style={styles.iconInfoRow2}>
              <View style={styles.infoPill}>
                <Text style={styles.infoPillIcon}>🕒</Text>
                <Text style={styles.infoPillText}>{formatTime(reg.matches.time_start)}</Text>
              </View>

              <View style={styles.infoPill}>
                <Text style={styles.infoPillIcon}>👥</Text>
                <Text style={styles.infoPillText}>{currentSigned}/{capacityLimit}</Text>
              </View>

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
                <ActivityIndicator size="small" color="#DC2626" />
              ) : (
                <Text style={styles.quickCancelText}>Wypisz się</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function MojeZapisyScreen() {
  const router = useRouter();
  const systemColorScheme = useColorScheme();

  const [themeMode, setThemeMode] = useState<'system' | 'light' | 'dark'>('system');
  const isDark = themeMode === 'system' ? systemColorScheme === 'dark' : themeMode === 'dark';
  const styles = getStyles(isDark);

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
        data={filteredRegistrations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#2C4BFF"
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
                        color="#FFFFFF"
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

    headerTitle: {
      fontSize: 24,
      fontWeight: '800',
      color: isDark ? '#FFFFFF' : '#0F172A',
    },
    headerSubtitle: {
      fontSize: 14,
      color: isDark ? '#94A3B8' : '#64748B',
      marginTop: 4,
      marginBottom: 16,
      fontWeight: '500',
    },

    selectionToolbar: {
      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
      borderRadius: 24,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 3,
    },
    toolbarTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: isDark ? '#FFFFFF' : '#0F172A',
      marginBottom: 8,
    },
    rangeScroll: { marginBottom: 10 },
    rangeChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 14,
      backgroundColor: isDark ? '#0B1120' : '#F1F5F9',
      marginRight: 6,
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#E2E8F0',
    },
    rangeChipActive: {
      backgroundColor: '#2C4BFF',
      borderColor: '#2C4BFF',
    },
    rangeText: {
      fontSize: 12,
      fontWeight: '600',
      color: isDark ? '#94A3B8' : '#64748B',
    },
    rangeTextActive: {
      color: '#FFFFFF',
      fontWeight: '800',
    },
    toolbarActionsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    bulkCancelBtn: {
      backgroundColor: '#FF5A5F',
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 10,
      flex: 1,
      marginRight: 8,
      alignItems: 'center',
    },
    bulkCancelText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '800',
    },
    closeSelectionBtn: {
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#CBD5E1',
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: isDark ? '#0B1120' : '#F1F5F9',
    },
    closeSelectionText: {
      color: isDark ? '#FFFFFF' : '#0F172A',
      fontSize: 13,
      fontWeight: '700',
    },

    // Zwiększony margines i padding checkboxa, żeby nie dotykał krawędzi kafelka
    checkboxContainer: {
      marginLeft: 14,
      marginRight: 4,
      justifyContent: 'center',
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: '#2C4BFF',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? '#0B1120' : '#FFFFFF',
    },
    checkboxChecked: {
      backgroundColor: '#2C4BFF',
    },
    checkmark: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '900',
    },

    errorBox: {
      backgroundColor: isDark ? 'rgba(255, 90, 95, 0.15)' : '#FEF2F2',
      borderRadius: 16,
      padding: 14,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: '#FF5A5F',
    },
    errorText: {
      color: '#FF5A5F',
      fontSize: 14,
      fontWeight: '600',
    },

    warnBox: {
      backgroundColor: isDark ? 'rgba(255, 210, 63, 0.15)' : '#FEFCE8',
      borderRadius: 16,
      padding: 14,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: '#FFD23F',
    },
    warnText: {
      color: isDark ? '#FFD23F' : '#CA8A04',
      fontSize: 14,
      fontWeight: '600',
    },

    tabsContainer: {
      flexDirection: 'row',
      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
      borderRadius: 24,
      padding: 4,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.03,
      shadowRadius: 4,
      elevation: 2,
    },
    tabButton: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
      borderRadius: 20,
    },
    tabButtonActive: {
      backgroundColor: '#2C4BFF',
    },
    tabText: {
      fontSize: 14,
      fontWeight: '700',
      color: isDark ? '#94A3B8' : '#64748B',
    },
    tabTextActive: {
      color: '#FFFFFF',
      fontWeight: '900',
    },

    matchCard: {
      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
      borderRadius: 24,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
      overflow: 'hidden',
      position: 'relative',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.3 : 0.06,
      shadowRadius: 8,
      elevation: 3,
      flexDirection: 'row',
      alignItems: 'stretch',
    },
    matchCardCancelled: { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' },
    matchCardSelected: {
      borderColor: '#2C4BFF',
      borderWidth: 2,
      backgroundColor: isDark ? '#162032' : '#F8FAFC',
    },

    sideStatusBar: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 6,
    },
    sideBarMain: { backgroundColor: '#2C4BFF' },
    sideBarWaitlist: { backgroundColor: '#94A3B8' },

    cardInnerContainer: {
      flex: 1,
      padding: 16,
      paddingLeft: 20,
    },
    cardMainRow: { flexDirection: 'row', alignItems: 'center' },
    
    dateBox: {
      width: 68,
      height: 68,
      borderRadius: 18,
      backgroundColor: isDark ? '#0B1120' : '#F8FAFC',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#E2E8F0',
      paddingHorizontal: 4,
    },
    dateBoxCancelled: { borderColor: '#FF5A5F' },
    dateDay: { fontSize: 20, fontWeight: '800', color: '#2C4BFF' },
    dateDayCancelled: { color: '#FF5A5F' },
    dateMonth: { 
      fontSize: 11, 
      fontWeight: '700', 
      color: isDark ? '#94A3B8' : '#64748B', 
      textTransform: 'uppercase',
      textAlign: 'center',
      width: '100%',
    },
    dateMonthCancelled: { color: '#FF5A5F' },

    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    matchTitle: { fontSize: 16, fontWeight: '800', color: isDark ? '#FFFFFF' : '#0F172A', flex: 1, marginRight: 6 },
    matchTitleCancelled: { textDecorationLine: 'line-through', color: isDark ? '#64748B' : '#94A3B8' },

    inlineStatusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10,
    },
    // Poprawiona czytelność: mocniejsze tło i pełny kontrast napisów statusu na ciemnym tle
    badgeMainBg: { 
      backgroundColor: isDark ? 'rgba(44, 75, 255, 0.25)' : '#EFF6FF', 
      borderWidth: 1, 
      borderColor: isDark ? '#4F6FFF' : '#BFDBFE' 
    },
    badgeWaitlistBg: { 
      backgroundColor: isDark ? 'rgba(148, 163, 184, 0.2)' : '#F1F5F9', 
      borderWidth: 1, 
      borderColor: isDark ? '#64748B' : '#CBD5E1' 
    },
    inlineStatusText: { fontSize: 11, fontWeight: '800' },
    badgeMainText: { color: isDark ? '#93C5FD' : '#2C4BFF' },
    badgeWaitlistText: { color: isDark ? '#CBD5E1' : '#475569' },

    badgeCancelledBg: { backgroundColor: isDark ? 'rgba(255, 90, 95, 0.2)' : '#FEF2F2', borderWidth: 1, borderColor: '#FF5A5F', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    badgeCancelledText: { fontSize: 11, fontWeight: '800', color: '#FF5A5F' },

    iconInfoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
    },
    iconInfoRow2: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 2,
    },
    iconContainer: {
      width: 24,
      height: 24,
      borderRadius: 6,
      backgroundColor: isDark ? '#0B1120' : '#F8FAFC',
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#E2E8F0',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 6,
    },
    containerIconText: {
      fontSize: 11,
    },
    matchInfo: { fontSize: 13, color: isDark ? '#94A3B8' : '#64748B', fontWeight: '500', flex: 1 },
    
    infoPill: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#0B1120' : '#F8FAFC',
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#E2E8F0',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 10,
      marginRight: 6,
    },
    infoPillIcon: {
      fontSize: 11,
      marginRight: 4,
    },
    infoPillText: {
      fontSize: 12,
      fontWeight: '700',
      color: isDark ? '#FFFFFF' : '#0F172A',
    },

    priceText: {
      fontSize: 14,
      fontWeight: '800',
      color: isDark ? '#FFFFFF' : '#0F172A',
    },

    cardFooter: {
      marginTop: 12,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9',
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
    },
    quickCancelBtnInline: {
      borderWidth: 1,
      borderColor: '#FF5A5F',
      borderRadius: 12,
      paddingVertical: 8,
      paddingHorizontal: 16,
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(255, 90, 95, 0.12)' : '#FEF2F2',
    },
    quickCancelText: { color: '#FF5A5F', fontSize: 12, fontWeight: '800' },

    emptyState: { paddingVertical: 40, alignItems: 'center' },
    emptyText: { fontSize: 15, color: isDark ? '#94A3B8' : '#64748B', fontStyle: 'italic', fontWeight: '500' },
  });