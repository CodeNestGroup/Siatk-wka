import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { formatMatchDate, formatTime } from '@/lib/format';
import { getCurrentPlayer, Player } from '@/lib/player';
import { syncMatchNotifications } from '@/services/notificationService';

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
  totalRegistrationsCount?: number;
  capacityLimit?: number;
  isRegistered?: boolean;
  registrationStatus?: 'main' | 'waitlist';
};

type TabType = 'upcoming' | 'past';

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

export default function ScheduleScreen() {
  const router = useRouter();
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
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
    setLoading(true);
    const player = await getCurrentPlayer();
    setCurrentPlayer(player);

    const { data: matchesData, error: matchesError } = await supabase
      .from('matches')
      .select('*');

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
        totalRegistrationsCount: matchRegs.length,
        capacityLimit,
        isRegistered: !!userReg,
        registrationStatus: regStatus,
      };
    });

    setMatches(processedMatches);
    setLoading(false);

    await syncMatchNotifications(processedMatches);
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
      showAlert('Błąd', 'Nie udało się wypisać z meczu: ' + error.message);
    }
    setActionLoadingId(null);
    loadSchedule();
  };

  const handleQuickAction = async (match: MatchItem) => {
    if (!currentPlayer) {
      showAlert('Błąd', 'Nie wczytano profilu gracza.');
      return;
    }

    if (isMatchFinished(match.date, match.time_end, match.time_start) || match.status_id === 2) return;

    if (match.isRegistered) {
      if (!canCancelMatch(match.date, match.time_start)) {
        showAlert('Uwaga', 'Nie można wypisać się na mniej niż 2 godziny przed meczem.');
        return;
      }

      await executeCancellation(match);
    } else {
      setActionLoadingId(match.id);
      const { error } = await supabase.from('match_registrations').insert({
        match_id: match.id,
        player_id: currentPlayer.id,
      });

      if (error) {
        showAlert('Błąd', 'Nie udało się zapisać na mecz: ' + error.message);
      }

      setActionLoadingId(null);
      loadSchedule();
    }
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
      <SafeAreaView style={styles.loadingContainer} edges={['top', 'left', 'right']}>
        <ActivityIndicator size="large" color="#FBBF24" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        onClose={() => setAlertVisible(false)}
      />

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
          const finished = isMatchFinished(item.date, item.time_end, item.time_start);
          const isFull = (item.mainCount ?? 0) >= (item.capacityLimit ?? 10);
          const isActionLoading = actionLoadingId === item.id;
          const isWaitlist = item.registrationStatus === 'waitlist';
          
          return (
            <TouchableOpacity
              style={[styles.matchCard, isCancelled && styles.matchCardCancelled]}
              onPress={() => router.push(`/(match)/${item.id}`)}
              activeOpacity={0.9}
            >
              {!isCancelled && !finished && currentPlayer && item.isRegistered && (
                <View style={[
                  styles.sideStatusBar,
                  isWaitlist ? styles.sideBarWaitlist : styles.sideBarMain
                ]} />
              )}

              <View style={styles.cardInnerContainer}>
                <View style={styles.cardMainRow}>
                  <View style={[styles.dateBox, isCancelled && styles.dateBoxCancelled]}>
                    <Text style={[styles.dateDay, isCancelled && styles.dateDayCancelled]}>{day}</Text>
                    <Text style={[styles.dateMonth, isCancelled && styles.dateMonthCancelled]}>{month}</Text>
                  </View>

                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={styles.titleRow}>
                      <Text style={[styles.matchTitle, isCancelled && styles.matchTitleCancelled]} numberOfLines={1}>
                        {item.title || 'Trening Siatkówki'}
                      </Text>
                      
                      {isCancelled ? (
                        <View style={styles.badgeCancelledBg}>
                          <Text style={styles.badgeCancelledText}>⚠️ Odwołany</Text>
                        </View>
                      ) : (
                        currentPlayer && item.isRegistered && (
                          <View style={[
                            styles.inlineStatusBadge,
                            isWaitlist ? styles.badgeWaitlistBg : styles.badgeMainBg
                          ]}>
                            <Text style={[
                              styles.inlineStatusText,
                              isWaitlist ? styles.badgeWaitlistText : styles.badgeMainText
                            ]}>
                              {isWaitlist ? '⏳ Rezerwa' : '✅ Zapisany'}
                            </Text>
                          </View>
                        )
                      )}
                    </View>

                    <Text style={styles.matchInfo}>📍 {item.location} | 🕒 {formatTime(item.time_start)}</Text>
                    <Text style={styles.matchInfoBold}>👥 Zapisanych: {item.totalRegistrationsCount}/{item.capacityLimit}</Text>
                  </View>
                </View>

                {!finished && currentPlayer && !isCancelled && (
                  <View style={styles.cardFooter}>
                    {item.isRegistered ? (
                      <TouchableOpacity 
                        style={styles.quickCancelBtnInline} 
                        onPress={(e) => { e.stopPropagation(); handleQuickAction(item); }} 
                        disabled={isActionLoading}
                      >
                        {isActionLoading ? (
                          <ActivityIndicator size="small" color="#F87171" />
                        ) : (
                          <Text style={styles.quickCancelText}>Wypisz się z meczu</Text>
                        )}
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity 
                        style={[styles.quickSignupBtn, isFull && styles.quickWaitlistBtn]} 
                        onPress={(e) => { e.stopPropagation(); handleQuickAction(item); }} 
                        disabled={isActionLoading}
                      >
                        {isActionLoading ? (
                          <ActivityIndicator size="small" color="#0F172A" />
                        ) : (
                          <Text style={styles.quickSignupText}>
                            {isFull ? 'Zapisz się na rezerwę' : 'Zapisz się na mecz'}
                          </Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' },
  header: { paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 2, borderBottomColor: '#334155' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#FFFFFF' },
  
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 18,
    padding: 4,
    borderWidth: 2,
    borderColor: '#334155',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  tabButtonActive: { backgroundColor: '#FBBF24' },
  tabText: { fontSize: 14, fontWeight: '700', color: '#94A3B8' },
  tabTextActive: { color: '#0F172A', fontWeight: '900' },

  listContainer: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },

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
  matchInfoBold: { fontSize: 13, fontWeight: '800', color: '#FFFFFF', marginTop: 2 },

  cardFooter: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 2,
    borderTopColor: '#334155',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  quickSignupBtn: {
    backgroundColor: '#FBBF24',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flex: 1,
    alignItems: 'center',
  },
  quickWaitlistBtn: { backgroundColor: '#64748B' },
  quickSignupText: { color: '#0F172A', fontSize: 13, fontWeight: '900' },
  
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