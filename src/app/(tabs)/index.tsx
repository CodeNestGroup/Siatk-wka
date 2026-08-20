import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { formatMatchDate, formatTime, isDateInPast } from '@/lib/format';
import { getCurrentPlayer, Player } from '@/lib/player';
import { syncMatchNotifications } from '@/services/notificationService';

type Match = {
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
};

type Registration = {
  id: string;
  match_id: string;
  player_id: string;
  is_paid: boolean;
  created_at: string;
  players?: {
    full_name: string;
  } | {
    full_name: string;
  }[] | null;
};

type Announcement = {
  id: string;
  title: string;
  content: string;
  category_id: number | null;
  is_pinned: boolean;
  author_id: string;
  created_at: string;
  match_id?: string | null;
  players?: {
    full_name: string;
  } | {
    full_name: string;
  }[] | null;
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function formatDateToPL(dateString: string): string {
  const [year, month, day] = dateString.split('-');
  return `${day}-${month}-${year}`;
}

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

function getPlayerName(playersField: Registration['players']): string {
  if (!playersField) return 'Nieznany gracz';
  if (Array.isArray(playersField)) {
    return playersField[0]?.full_name || 'Nieznany gracz';
  }
  return playersField.full_name || 'Nieznany gracz';
}

function getAuthorName(playersField: Announcement['players']): string {
  if (!playersField) return 'Administrator';
  if (Array.isArray(playersField)) {
    return playersField[0]?.full_name || 'Administrator';
  }
  return playersField.full_name || 'Administrator';
}

export default function NearestMatchScreen() {
  const router = useRouter();

  const [match, setMatch] = useState<Match | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<0 | 1>(0);
  const horizontalScrollRef = useRef<ScrollView>(null);

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

  const loadData = useCallback(async () => {
    setLoading(true);
    const player = await getCurrentPlayer();
    setCurrentPlayer(player);

    const todayStr = new Date().toISOString().split('T')[0];

    const { data: matchData, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .gte('date', todayStr)
      .order('date', { ascending: true })
      .order('time_start', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (matchError || !matchData) {
      setMatch(null);
      setLoading(false);
      return;
    }

    setMatch(matchData);

    const { data: regsData, error: regsError } = await supabase
      .from('match_registrations')
      .select('id, match_id, player_id, is_paid, created_at, players(full_name)')
      .eq('match_id', matchData.id)
      .order('created_at', { ascending: true });

    if (!regsError) {
      setRegistrations(regsData ?? []);
    }

    const { data: annData, error: annError } = await supabase
      .from('announcements')
      .select(`
        id,
        title,
        content,
        category_id,
        is_pinned,
        author_id,
        created_at,
        match_id,
        players:author_id (
          full_name
        )
      `)
      .eq('match_id', matchData.id);

    if (!annError && annData) {
      const sortedAnnouncements = annData.sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      setAnnouncements(sortedAnnouncements);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleScrollEnd = (e: any) => {
    const contentOffsetX = e.nativeEvent.contentOffset.x;
    const currentIndex = Math.round(contentOffsetX / SCREEN_WIDTH);
    if (currentIndex === 0 || currentIndex === 1) {
      setActiveTab(currentIndex);
    }
  };

  const switchTab = (index: 0 | 1) => {
    setActiveTab(index);
    horizontalScrollRef.current?.scrollTo({
      x: index * SCREEN_WIDTH,
      animated: true,
    });
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

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top', 'bottom', 'left', 'right']}>
        <ActivityIndicator size="large" color="#FBBF24" />
      </SafeAreaView>
    );
  }

  if (!match) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top', 'bottom', 'left', 'right']}>
        <Text style={styles.emptyMainText}>Brak nadchodzących meczów w kalendarzu.</Text>
      </SafeAreaView>
    );
  }

  const isCancelled = match.status_id === 2;
  const isFinished = isDateInPast(match.date) || isCancelled;
  const capacity = match.capacity ?? match.max_players;

  const mainList = registrations.slice(0, capacity);
  const waitlist = registrations.slice(capacity);
  const isFull = registrations.length >= capacity;

  const myRegistration = registrations.find(
    (r) => String(r.player_id) === String(currentPlayer?.id)
  );
  
  const isUserInMain = mainList.some((r) => String(r.player_id) === String(currentPlayer?.id));

  const isCancellable = canCancelMatch(match.date, match.time_start);
  const title = match.title?.trim() || 'Najbliższy Trening';
  const { weekday, day, month } = formatMatchDate(match.date);

  const handleSignUp = async () => {
    if (!currentPlayer) {
      showAlert('Błąd', 'Nie zidentyfikowano zalogowanego gracza.');
      return;
    }

    if (isCancelled) {
      showAlert('Błąd', 'Nie można zapisać się na odwołany mecz.');
      return;
    }

    setActionLoading(true);
    const { error } = await supabase.from('match_registrations').insert({
      match_id: match.id,
      player_id: currentPlayer.id,
    });
    setActionLoading(false);

    if (error) {
      showAlert('Błąd', error.message);
      return;
    }

    await updateNotificationsAfterChange(currentPlayer.id);
    loadData();
  };

  const handleCancel = async () => {
    if (!currentPlayer || !match) return;

    if (isCancelled) {
      showAlert('Błąd', 'Nie można wypisać się z odwołanego meczu.');
      return;
    }

    if (!isCancellable) {
      showAlert('Błąd', 'Nie można wypisać się na mniej niż 2 godziny przed meczem.');
      return;
    }

    setActionLoading(true);
    const { error } = await supabase
      .from('match_registrations')
      .delete()
      .eq('match_id', match.id)
      .eq('player_id', currentPlayer.id);
    setActionLoading(false);

    if (error) {
      showAlert('Błąd', error.message);
      return;
    }

    await updateNotificationsAfterChange(currentPlayer.id);
    loadData();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
      <CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        onClose={handleAlertClose}
      />
      <View style={styles.heroSection}>
        <View style={styles.heroTopRow}>
          <Text style={styles.heroBadge}>NADCHODZĄCY MECZ</Text>
          <Text style={styles.heroPrice}>{Number(match.price_per_player)} PLN</Text>
        </View>

        <Text style={styles.heroTitle} numberOfLines={1}>{title}</Text>

        <View style={styles.heroInfoCard}>
          <View style={styles.heroDateBox}>
            <Text style={styles.heroDayNumber}>{day}</Text>
            <Text style={styles.heroMonthText}>{month}</Text>
          </View>

          <View style={styles.heroDetailsCol}>
            <Text style={styles.heroDateMain}>{weekday}, {formatDateToPL(match.date)}</Text>
            <Text style={styles.heroTimeMain}>🕒 {formatTime(match.time_start)} – {formatTime(match.time_end)}</Text>
            <Text style={styles.heroLocationMain} numberOfLines={1}>📍 {match.location}</Text>
          </View>
        </View>

        {isCancelled && (
          <View style={styles.cancelledBadge}>
            <Text style={styles.cancelledBadgeText}>⚠️ Mecz został odwołany</Text>
          </View>
        )}
      </View>

      <View style={styles.navSection}>
        <TouchableOpacity
          style={[styles.navButton, activeTab === 0 && styles.navButtonActive]}
          onPress={() => switchTab(0)}
        >
          <Text style={[styles.navButtonText, activeTab === 0 && styles.navButtonTextActive]}>
            Uczestnicy ({registrations.length}/{capacity})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, activeTab === 1 && styles.navButtonActive]}
          onPress={() => switchTab(1)}
        >
          <Text style={[styles.navButtonText, activeTab === 1 && styles.navButtonTextActive]}>
            Powiadomienia ({announcements.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={horizontalScrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        style={styles.bottomSectionScroll}
      >
        <View style={styles.tabContentPage}>
          <ScrollView contentContainerStyle={styles.innerListScroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionHeading}>Skład Główny ({mainList.length}/{capacity})</Text>
            {mainList.length === 0 ? (
              <Text style={styles.emptySubText}>Brak zapisanych graczy.</Text>
            ) : (
              mainList.map((item, index) => {
                const isMe = String(item.player_id) === String(currentPlayer?.id);
                const playerName = getPlayerName(item.players);
                return (
                  <View key={item.id} style={[styles.playerRow, isMe && styles.playerRowHighlight]}>
                    <Text style={[styles.playerText, isMe && styles.playerTextHighlight]}>
                      {index + 1}. {playerName} {isMe && '(Ty)'}
                    </Text>
                    <Text style={styles.playerRoleTag}>Główny</Text>
                  </View>
                );
              })
            )}

            <Text style={[styles.sectionHeading, { marginTop: 20 }]}>Lista Rezerwowa ({waitlist.length})</Text>
            {waitlist.length === 0 ? (
              <Text style={styles.emptySubText}>Brak osób na rezerwie.</Text>
            ) : (
              waitlist.map((item, index) => {
                const isMe = String(item.player_id) === String(currentPlayer?.id);
                const playerName = getPlayerName(item.players);
                return (
                  <View key={item.id} style={[styles.playerRow, isMe && styles.playerRowHighlight]}>
                    <Text style={[styles.playerText, isMe && styles.playerTextHighlight]}>
                      {index + 1}. {playerName} {isMe && '(Ty)'}
                    </Text>
                    <Text style={[styles.playerRoleTag, { backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B' }]}>
                      Rezerwa
                    </Text>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>

        <View style={styles.tabContentPage}>
          <ScrollView contentContainerStyle={styles.innerListScroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionHeading}>Powiadomienia o meczu</Text>
            {announcements.length === 0 ? (
              <Text style={styles.emptySubText}>Brak powiadomień powiązanych z tym meczem.</Text>
            ) : (
              announcements.map((item) => {
                const authorName = getAuthorName(item.players);
                return (
                  <View
                    key={item.id}
                    style={[
                      styles.notificationCard,
                      item.is_pinned && styles.notificationCardPinned,
                    ]}
                  >
                    <View style={styles.notifHeaderRow}>
                      <Text style={styles.notifTitle}>{item.title}</Text>
                      {item.is_pinned && (
                        <View style={styles.pinnedBadge}>
                          <Text style={styles.pinnedBadgeText}>📌 Przypięte</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.notifDesc}>{item.content}</Text>
                    
                    <View style={styles.notifFooter}>
                      <Text style={styles.notifAuthor}>Autor: {authorName}</Text>
                      {item.created_at && (
                        <Text style={styles.notifDate}>
                          {new Date(item.created_at).toLocaleDateString('pl-PL', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      </ScrollView>

      {!isFinished && currentPlayer && (
        <View style={styles.footerActionContainer}>
          {myRegistration ? (
            <View style={styles.footerRegisteredWrapper}>
              <Text style={styles.footerStatusText}>
                {!isUserInMain
                  ? '⏳ Jesteś na liście rezerwowej'
                  : '✅ Jesteś zapisany w składzie głównym'}
              </Text>
              {isCancellable ? (
                <TouchableOpacity
                  style={styles.footerCancelBtn}
                  onPress={handleCancel}
                  disabled={actionLoading}
                >
                  <Text style={styles.footerCancelBtnText}>Wypisz się z meczu</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.footerLockedText}>Wypis zablokowany (&lt; 2h przed meczem)</Text>
              )}
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.footerSignupBtn, actionLoading && { opacity: 0.6 }]}
              onPress={handleSignUp}
              disabled={actionLoading}
            >
              <Text style={styles.footerSignupBtnText}>
                {isFull ? 'Zapisz się na listę rezerwową' : 'Zapisz się na mecz'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
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
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#0F172A',
    paddingHorizontal: 16 
  },
  emptyMainText: { fontSize: 16, color: '#94A3B8', textAlign: 'center', fontWeight: '700' },

  heroSection: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#1E293B',
    borderBottomWidth: 2,
    borderBottomColor: '#334155',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  heroBadge: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FBBF24',
    letterSpacing: 1,
  },
  heroPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  heroInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 12,
    borderWidth: 2,
    borderColor: '#334155',
  },
  heroDateBox: {
    width: 58,
    height: 58,
    borderRadius: 14,
    backgroundColor: '#FBBF24',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  heroDayNumber: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 24,
  },
  heroMonthText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0F172A',
    textTransform: 'uppercase',
  },
  heroDetailsCol: {
    flex: 1,
  },
  heroDateMain: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 3,
  },
  heroTimeMain: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 3,
  },
  heroLocationMain: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
  },
  cancelledBadge: {
    marginTop: 10,
    backgroundColor: 'rgba(248, 113, 113, 0.15)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#F87171',
    alignItems: 'center',
  },
  cancelledBadgeText: {
    color: '#F87171',
    fontWeight: '900',
    fontSize: 13,
  },

  navSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#1E293B',
    borderBottomWidth: 2,
    borderBottomColor: '#334155',
  },
  navButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
  },
  navButtonActive: {
    backgroundColor: '#0F172A',
    borderWidth: 2,
    borderColor: '#334155',
  },
  navButtonText: { fontSize: 13, fontWeight: '700', color: '#94A3B8' },
  navButtonTextActive: { color: '#FBBF24', fontWeight: '900' },

  bottomSectionScroll: { flex: 1 },
  tabContentPage: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
  innerListScroll: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 40 },
  sectionHeading: { fontSize: 16, fontWeight: '900', color: '#FFFFFF', marginBottom: 10 },
  emptySubText: { fontSize: 14, color: '#94A3B8', fontStyle: 'italic', marginBottom: 10, fontWeight: '500' },

  playerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#334155',
  },
  playerRowHighlight: {
    borderColor: '#FBBF24',
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
  },
  playerText: { fontSize: 14, color: '#FFFFFF', fontWeight: '600' },
  playerTextHighlight: { fontWeight: '900', color: '#FBBF24' },
  playerRoleTag: { fontSize: 11, fontWeight: '800', color: '#FBBF24', backgroundColor: 'rgba(251, 191, 36, 0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },

  notificationCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#334155',
  },
  notificationCardPinned: {
    borderColor: '#FBBF24',
    backgroundColor: 'rgba(251, 191, 36, 0.05)',
  },
  notifHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  notifTitle: { fontSize: 15, fontWeight: '900', color: '#FFFFFF', flex: 1, marginRight: 8 },
  notifDesc: { fontSize: 14, color: '#94A3B8', lineHeight: 20, marginBottom: 10, fontWeight: '500' },
  pinnedBadge: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FBBF24',
  },
  pinnedBadgeText: { fontSize: 11, fontWeight: '900', color: '#FBBF24' },
  notifFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 2,
    borderTopColor: '#334155',
    paddingTop: 10,
    marginTop: 6,
  },
  notifAuthor: { fontSize: 12, color: '#94A3B8', fontWeight: '700' },
  notifDate: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },

  footerActionContainer: {
    padding: 16,
    backgroundColor: '#1E293B',
    borderTopWidth: 2,
    borderTopColor: '#334155',
  },
  footerSignupBtn: {
    backgroundColor: '#FBBF24',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  footerSignupBtnText: { color: '#0F172A', fontSize: 16, fontWeight: '900' },
  footerRegisteredWrapper: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  footerStatusText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF', marginBottom: 10, textAlign: 'center' },
  footerCancelBtn: {
    backgroundColor: '#0F172A',
    borderWidth: 2,
    borderColor: '#F87171',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  footerCancelBtnText: { color: '#F87171', fontSize: 15, fontWeight: '900' },
  footerLockedText: { fontSize: 13, color: '#94A3B8', fontStyle: 'italic', textAlign: 'center', fontWeight: '700' },
});