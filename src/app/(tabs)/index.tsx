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
import { colors, radius, shadow } from '@/constants/app-theme';
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

  // Pomocnicza funkcja do odświeżania powiadomień po zmianie statusu zapisu
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
        <ActivityIndicator size="large" color={colors.primary} />
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

    // Synchronizacja powiadomień po zapisaniu na mecz
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

    // Synchronizacja powiadomień po wypisaniu się z meczu
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
            <Text style={styles.heroDateMain}>{weekday}, {match.date}</Text>
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
                    <Text style={[styles.playerRoleTag, { backgroundColor: '#FEF3C7', color: '#D97706' }]}>
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
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: colors.background,
    paddingHorizontal: 16 
  },
  emptyMainText: { fontSize: 16, color: colors.mutedForeground, textAlign: 'center', fontWeight: '600' },

  heroSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...shadow.card,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  heroBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 1,
  },
  heroPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.foreground,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.foreground,
    marginBottom: 10,
  },
  heroInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroDateBox: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  heroDayNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    lineHeight: 22,
  },
  heroMonthText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  heroDetailsCol: {
    flex: 1,
  },
  heroDateMain: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: 2,
  },
  heroTimeMain: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.mutedForeground,
    marginBottom: 2,
  },
  heroLocationMain: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  cancelledBadge: {
    marginTop: 8,
    backgroundColor: '#FEF2F2',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    alignItems: 'center',
  },
  cancelledBadgeText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 12,
  },

  navSection: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  navButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: radius.md,
  },
  navButtonActive: {
    backgroundColor: colors.accent,
  },
  navButtonText: { fontSize: 13, fontWeight: '600', color: colors.mutedForeground },
  navButtonTextActive: { color: colors.accentForeground, fontWeight: '700' },

  bottomSectionScroll: { flex: 1 },
  tabContentPage: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
  innerListScroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },
  sectionHeading: { fontSize: 15, fontWeight: '700', color: colors.foreground, marginBottom: 8 },
  emptySubText: { fontSize: 13, color: colors.mutedForeground, fontStyle: 'italic', marginBottom: 8 },

  playerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    backgroundColor: colors.card,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  playerRowHighlight: {
    borderColor: colors.primary,
    backgroundColor: '#eff6ff',
  },
  playerText: { fontSize: 14, color: colors.foreground, fontWeight: '500' },
  playerTextHighlight: { fontWeight: '700', color: colors.primary },
  playerRoleTag: { fontSize: 10, fontWeight: '700', color: colors.mutedForeground, backgroundColor: colors.muted, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },

  notificationCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 10,
    ...shadow.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notificationCardPinned: {
    borderColor: colors.primary,
    backgroundColor: '#f8fafc',
  },
  notifHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notifTitle: { fontSize: 14, fontWeight: '700', color: colors.foreground, flex: 1, marginRight: 8 },
  notifDesc: { fontSize: 13, color: colors.mutedForeground, lineHeight: 18, marginBottom: 8 },
  pinnedBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  pinnedBadgeText: { fontSize: 10, fontWeight: '700', color: colors.primary },
  notifFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    marginTop: 4,
  },
  notifAuthor: { fontSize: 11, color: colors.mutedForeground, fontWeight: '600' },
  notifDate: { fontSize: 11, color: colors.mutedForeground },

  footerActionContainer: {
    padding: 16,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerSignupBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    ...shadow.card,
  },
  footerSignupBtnText: { color: colors.primaryForeground, fontSize: 15, fontWeight: '700' },
  footerRegisteredWrapper: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  footerStatusText: { fontSize: 13, fontWeight: '600', color: colors.foreground, marginBottom: 8, textAlign: 'center' },
  footerCancelBtn: {
    backgroundColor: colors.destructive,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  footerCancelBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  footerLockedText: { fontSize: 12, color: colors.mutedForeground, fontStyle: 'italic', textAlign: 'center' },
});