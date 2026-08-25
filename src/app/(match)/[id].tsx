import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { formatMatchDate, formatTime, isDateInPast } from '@/lib/format';
import { getCurrentPlayer, Player } from '@/lib/player';
import { syncMatchNotifications } from '@/services/notificationService';
import CustomAlert from '@/components/CustomAlert';

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

export default function MatchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const systemColorScheme = useColorScheme();

  const [themeMode, setThemeMode] = useState<'system' | 'light' | 'dark'>('system');
  const isDark = themeMode === 'system' ? systemColorScheme === 'dark' : themeMode === 'dark';
  const styles = getStyles(isDark);

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
      showAlert('Błąd', 'Nie udało się pobrać szczegółów meczu.', () => router.back());
      return;
    }
    setMatch(matchData);

    const { data: regsData, error: regsError } = await supabase
      .from('match_registrations')
      .select(`
        id, 
        match_id, 
        player_id, 
        is_paid, 
        created_at, 
        players:player_id (full_name)
      `)
      .eq('match_id', id)
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
      .eq('match_id', id);

    if (!annError && annData) {
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
    loadThemePreference();
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

  if (loading || !match) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top', 'bottom', 'left', 'right']}>
        <ActivityIndicator size="large" color="#2C4BFF" />
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
  const title = match.title?.trim() || 'Szczegóły Meczu';
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

      <View style={styles.topSection}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>‹ Wróć</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.heroSection}>
          <View style={styles.ticketSideAccent} />
          
          <View style={styles.heroTopRow}>
            <Text style={styles.heroBadge}>SZCZEGÓŁY WYDARZENIA</Text>
            <Text style={styles.heroPrice}>{Number(match.price_per_player)} PLN</Text>
          </View>

          <Text style={styles.heroTitle} numberOfLines={1}>{title}</Text>

          <View style={styles.heroInfoCard}>
            <View style={styles.heroDateBox}>
              <Text style={styles.heroDayNumber}>{day}</Text>
              <Text style={styles.heroMonthText}>{month}</Text>
            </View>

            <View style={styles.heroDetailsCol}>
              <Text style={styles.heroDateMain}>{weekday}</Text>
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

const getStyles = (isDark: boolean) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: isDark ? '#0B1120' : '#F8FAFC' },
    loadingContainer: { 
      flex: 1, 
      justifyContent: 'center', 
      alignItems: 'center', 
      backgroundColor: isDark ? '#0B1120' : '#F8FAFC',
      paddingHorizontal: 16 
    },

    topSection: {
      backgroundColor: isDark ? '#0B1120' : '#F8FAFC',
    },
    headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
    backButton: { paddingVertical: 6, paddingHorizontal: 4 },
    backButtonText: { fontSize: 16, fontWeight: '800', color: '#2C4BFF' },

    heroSection: {
      marginHorizontal: 20,
      marginTop: 8,
      padding: 16,
      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
      borderRadius: 20,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
      position: 'relative',
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.35 : 0.06,
      shadowRadius: 12,
      elevation: 6,
    },
    ticketSideAccent: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 6,
      backgroundColor: '#2C4BFF',
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
      color: '#2C4BFF',
      letterSpacing: 1.2,
    },
    heroPrice: {
      fontSize: 15,
      fontWeight: '800',
      color: isDark ? '#FFFFFF' : '#0F172A',
    },
    heroTitle: {
      fontSize: 22,
      fontWeight: '900',
      color: isDark ? '#FFFFFF' : '#0F172A',
      marginBottom: 12,
    },
    heroInfoCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#0B1120' : '#F8FAFC',
      borderRadius: 16,
      padding: 12,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
    },
    heroDateBox: {
      width: 58,
      height: 58,
      borderRadius: 14,
      backgroundColor: '#2C4BFF',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    heroDayNumber: {
      fontSize: 22,
      fontWeight: '900',
      color: '#FFFFFF',
      lineHeight: 24,
    },
    heroMonthText: {
      fontSize: 11,
      fontWeight: '900',
      color: '#FFFFFF',
      textTransform: 'uppercase',
    },
    heroDetailsCol: {
      flex: 1,
    },
    heroDateMain: {
      fontSize: 15,
      fontWeight: '800',
      color: isDark ? '#FFFFFF' : '#0F172A',
      marginBottom: 3,
    },
    heroTimeMain: {
      fontSize: 13,
      fontWeight: '700',
      color: isDark ? '#94A3B8' : '#64748B',
      marginBottom: 3,
    },
    heroLocationMain: {
      fontSize: 13,
      fontWeight: '700',
      color: isDark ? '#94A3B8' : '#64748B',
    },
    cancelledBadge: {
      marginTop: 10,
      backgroundColor: isDark ? 'rgba(255, 90, 95, 0.15)' : '#FEF2F2',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#FF5A5F',
      alignItems: 'center',
    },
    cancelledBadgeText: {
      color: '#FF5A5F',
      fontWeight: '900',
      fontSize: 13,
    },

    navSection: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingVertical: 12,
      backgroundColor: isDark ? '#0B1120' : '#F8FAFC',
    },
    navButton: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      borderRadius: 16,
    },
    navButtonActive: {
      backgroundColor: '#2C4BFF',
      shadowColor: '#2C4BFF',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 3,
    },
    navButtonText: { fontSize: 13, fontWeight: '700', color: isDark ? '#94A3B8' : '#64748B' },
    navButtonTextActive: { color: '#FFFFFF', fontWeight: '900' },

    bottomSectionScroll: { flex: 1 },
    tabContentPage: {
      width: SCREEN_WIDTH,
      flex: 1,
    },
    innerListScroll: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40 },
    sectionHeading: { fontSize: 16, fontWeight: '900', color: isDark ? '#FFFFFF' : '#0F172A', marginBottom: 10 },
    emptySubText: { fontSize: 14, color: isDark ? '#94A3B8' : '#64748B', fontStyle: 'italic', marginBottom: 10, fontWeight: '500' },

    playerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 16,
      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
      marginBottom: 8,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.2 : 0.03,
      shadowRadius: 4,
      elevation: 2,
    },
    playerRowHighlight: {
      borderColor: '#2C4BFF',
      backgroundColor: isDark ? 'rgba(44, 75, 255, 0.08)' : '#EFF6FF',
    },
    playerText: { fontSize: 14, color: isDark ? '#FFFFFF' : '#0F172A', fontWeight: '600' },
    playerTextHighlight: { fontWeight: '900', color: '#2C4BFF' },
  
    notificationCard: {
      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
      borderRadius: 20,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.2 : 0.03,
      shadowRadius: 4,
      elevation: 2,
    },
    notificationCardPinned: {
      borderColor: '#2C4BFF',
      backgroundColor: isDark ? 'rgba(44, 75, 255, 0.05)' : '#EFF6FF',
    },
    notifHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    notifTitle: { fontSize: 15, fontWeight: '900', color: isDark ? '#FFFFFF' : '#0F172A', flex: 1, marginRight: 8 },
    notifDesc: { fontSize: 14, color: isDark ? '#94A3B8' : '#64748B', lineHeight: 20, marginBottom: 10, fontWeight: '500' },
    pinnedBadge: {
      backgroundColor: isDark ? 'rgba(44, 75, 255, 0.15)' : '#EFF6FF',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#2C4BFF',
    },
    pinnedBadgeText: { fontSize: 11, fontWeight: '900', color: '#2C4BFF' },
    notifFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9',
      paddingTop: 10,
      marginTop: 6,
    },
    notifAuthor: { fontSize: 12, color: isDark ? '#94A3B8' : '#64748B', fontWeight: '700' },
    notifDate: { fontSize: 12, color: isDark ? '#94A3B8' : '#64748B', fontWeight: '600' },

    footerActionContainer: {
      padding: 16,
      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
    },
    footerSignupBtn: {
      backgroundColor: '#2C4BFF',
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: 'center',
      shadowColor: '#2C4BFF',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    footerSignupBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
    footerRegisteredWrapper: {
      flexDirection: 'column',
      alignItems: 'stretch',
    },
    footerStatusText: { fontSize: 14, fontWeight: '800', color: isDark ? '#FFFFFF' : '#0F172A', marginBottom: 10, textAlign: 'center' },
    footerCancelBtn: {
      backgroundColor: isDark ? '#0B1120' : '#FEF2F2',
      borderWidth: 1,
      borderColor: '#FF5A5F',
      borderRadius: 16,
      paddingVertical: 14,
      alignItems: 'center',
    },
    footerCancelBtnText: { color: '#FF5A5F', fontSize: 15, fontWeight: '900' },
    footerLockedText: { fontSize: 13, color: isDark ? '#94A3B8' : '#64748B', fontStyle: 'italic', textAlign: 'center', fontWeight: '700' },
  });