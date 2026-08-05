import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, radius, shadow } from '@/constants/app-theme';
import { supabase } from '@/lib/supabase';
import { formatMatchDate, formatTime, isDateInPast } from '@/lib/format';
import { getCurrentPlayer, Player } from '@/lib/player';

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
  status: string | null;
};

type Registration = {
  id: string;
  match_id: string;
  player_id: string;
  status: 'main' | 'waitlist';
  is_paid: boolean;
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
  category: string | null;
  is_pinned: boolean;
  author: string | null;
  created_at: string;
  match_id?: string | null;
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

export default function MatchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [match, setMatch] = useState<Match | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<0 | 1>(0);
  const horizontalScrollRef = useRef<ScrollView>(null);

  const loadData = useCallback(async () => {
    if (!id) return;
    const player = await getCurrentPlayer();
    setCurrentPlayer(player);

    const { data: matchData, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .eq('id', id)
      .single();

    if (matchError || !matchData) {
      Alert.alert('Błąd', 'Nie udało się pobrać szczegółów meczu.');
      router.back();
      return;
    }
    setMatch(matchData);

    const { data: regsData, error: regsError } = await supabase
      .from('match_registrations')
      .select('id, match_id, player_id, status, is_paid, players(full_name)')
      .eq('match_id', id);

    if (!regsError) {
      setRegistrations(regsData ?? []);
    }

    // Pobieranie powiadomień/ogłoszeń powiązanych z tym meczem
    const { data: annData, error: annError } = await supabase
      .from('announcements')
      .select('*')
      .eq('match_id', id);

    if (!annError && annData) {
      // Sortowanie: najpierw przypięte (is_pinned = true), potem reszta po dacie
      const sortedAnnouncements = annData.sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      setAnnouncements(sortedAnnouncements);
    }

    setLoading(false);
  }, [id, router]);

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

  if (loading || !match) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top', 'bottom', 'left', 'right']}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  const isFinished = isDateInPast(match.date) || match.status === 'cancelled';
  const capacity = match.capacity ?? match.max_players;
  const mainList = registrations.filter((r) => r.status === 'main');
  const waitlist = registrations.filter((r) => r.status === 'waitlist');
  const isFull = mainList.length >= capacity;

  const myRegistration = registrations.find((r) => r.player_id === currentPlayer?.id);
  const isCancellable = canCancelMatch(match.date, match.time_start);
  const title = match.title?.trim() || 'Trening Siatkówki';
  const { weekday, day, month } = formatMatchDate(match.date);

  const handleSignUp = async () => {
    if (!currentPlayer) return;
    const status = isFull ? 'waitlist' : 'main';

    setActionLoading(true);
    const { error } = await supabase.from('match_registrations').insert({
      match_id: match.id,
      player_id: currentPlayer.id,
      status,
    });
    setActionLoading(false);

    if (error) {
      Alert.alert('Błąd', error.message);
      return;
    }
    loadData();
  };

  const handleCancel = async () => {
    if (!currentPlayer) return;
    if (!isCancellable) {
      Alert.alert('Błąd', 'Nie można wypisać się na mniej niż 2 godziny przed meczem.');
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
      Alert.alert('Błąd', error.message);
      return;
    }
    loadData();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.topSection}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Wróć</Text>
          </TouchableOpacity>
          <Text style={styles.matchIdTitle} numberOfLines={1}>
            {title}
          </Text>
        </View>

        <View style={styles.matchInfoCard}>
          <View style={styles.dateBoxSm}>
            <Text style={styles.dateDaySm}>{day}</Text>
            <Text style={styles.dateMonthSm}>{month}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTextBold}>{weekday}, {match.date}</Text>
            <Text style={styles.infoText}>📍 {match.location}</Text>
            <Text style={styles.infoText}>
              🕒 {formatTime(match.time_start)} – {formatTime(match.time_end)}
            </Text>
            <Text style={styles.infoText}>
              👥 Zapisanych: <Text style={styles.bold}>{mainList.length}/{capacity}</Text> |{' '}
              {Number(match.price_per_player)} PLN
            </Text>
          </View>
        </View>

        {!isFinished && currentPlayer && (
          <View style={styles.actionContainer}>
            {myRegistration ? (
              <View style={styles.registeredRow}>
                <Text style={styles.statusTextInfo}>
                  {myRegistration.status === 'waitlist'
                    ? '⏳ Jesteś na liście rezerwowej'
                    : '✅ Jesteś zapisany w składzie głównym'}
                </Text>
                {isCancellable ? (
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={handleCancel}
                    disabled={actionLoading}
                  >
                    <Text style={styles.cancelBtnText}>Wypisz się</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.lockedText}>Wypis zablokowany (&lt; 2h)</Text>
                )}
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.signupBtn, actionLoading && { opacity: 0.6 }]}
                onPress={handleSignUp}
                disabled={actionLoading}
              >
                <Text style={styles.signupBtnText}>
                  {isFull ? 'Zapisz się na listę rezerwową' : 'Zapisz się na mecz'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Informacja o statusie płatności dla zakończonego meczu, jeśli użytkownik był zapisany */}
        {isFinished && currentPlayer && myRegistration && (
          <View style={styles.finishedPaymentContainer}>
            <Text
              style={[
                styles.finishedPaymentText,
                { color: myRegistration.is_paid ? '#16A34A' : colors.destructive },
              ]}
            >
              {myRegistration.is_paid
                ? '✓ Mecz zakończony – Twój udział został opłacony'
                : '✕ Mecz zakończony – Twój udział nie został opłacony'}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.navSection}>
        <TouchableOpacity
          style={[styles.navButton, activeTab === 0 && styles.navButtonActive]}
          onPress={() => switchTab(0)}
        >
          <Text style={[styles.navButtonText, activeTab === 0 && styles.navButtonTextActive]}>
            Uczestnicy ({registrations.length})
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
                const isMe = item.player_id === currentPlayer?.id;
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
                const isMe = item.player_id === currentPlayer?.id;
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
              announcements.map((item) => (
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
                  
                  {(item.author || item.created_at) && (
                    <View style={styles.notifFooter}>
                      {item.author && <Text style={styles.notifAuthor}>Autor: {item.author}</Text>}
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
                  )}
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: colors.background,
    paddingHorizontal: 16 
  },

  topSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, marginTop: 4 },
  backButton: { marginRight: 12, paddingVertical: 4 },
  backButtonText: { fontSize: 14, fontWeight: '700', color: colors.primary },
  matchIdTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.foreground },

  matchInfoCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 12,
    ...shadow.card,
    alignItems: 'center',
  },
  dateBoxSm: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dateDaySm: { fontSize: 16, fontWeight: '700', color: colors.accentForeground },
  dateMonthSm: { fontSize: 10, color: colors.accentForeground },
  infoTextBold: { fontSize: 13, fontWeight: '700', color: colors.foreground, marginBottom: 2 },
  infoText: { fontSize: 12, color: colors.mutedForeground, marginBottom: 2 },
  bold: { fontWeight: '700', color: colors.foreground },

  actionContainer: { marginTop: 12 },
  signupBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 10,
    alignItems: 'center',
  },
  signupBtnText: { color: colors.primaryForeground, fontSize: 13, fontWeight: '700' },
  registeredRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusTextInfo: { fontSize: 12, fontWeight: '600', color: colors.foreground, flex: 1 },
  cancelBtn: {
    borderWidth: 1,
    borderColor: colors.destructive,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  cancelBtnText: { color: colors.destructive, fontSize: 12, fontWeight: '700' },
  lockedText: { fontSize: 11, color: colors.mutedForeground, fontStyle: 'italic' },

  finishedPaymentContainer: {
    marginTop: 12,
    padding: 10,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  finishedPaymentText: {
    fontSize: 12,
    fontWeight: '700',
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
});