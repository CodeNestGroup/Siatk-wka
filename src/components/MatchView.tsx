import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { supabase } from '@/lib/supabase';
import { formatMatchDate, formatTime, isDateInPast } from '@/lib/format';
import { getCurrentPlayer, isAdminPlayer, type Player } from '@/lib/player';
import { afterSignUp, afterCancel } from '@/services/registrationService';
import { useAppTheme } from '@/hooks/use-theme';
import { useItemBadges } from '@/hooks/use-badges';
import { unwrapRelation } from '@/lib/relations';
import { canCancelMatch } from '@/lib/match-rules';
import { brand, dark as darkPalette, radius, space, shadow, type Palette } from '@/constants/app-theme';
import CustomAlert from '@/components/CustomAlert';
import PressableScale from './ui/PressableScale';
import Ticket from './ui/Ticket';
import TicketPerforation from './ui/TicketPerforation';
import DateChip from './ui/DateChip';
import Pill, { type PillVariant } from './ui/Pill';
import Card from './ui/Card';
import PrimaryButton from './ui/PrimaryButton';
import DangerButton from './ui/DangerButton';
import SegmentButtons from './ui/SegmentButtons';
import ToastHost from './ui/Toast';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

type NestedRole = { name: string } | { name: string }[] | null | undefined;
type NestedPlayer =
  | { full_name: string; roles?: NestedRole }
  | { full_name: string; roles?: NestedRole }[]
  | null
  | undefined;

type Registration = {
  id: string;
  match_id: string;
  player_id: string;
  is_paid: boolean;
  created_at: string;
  players?: NestedPlayer;
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
  players?: NestedPlayer;
};

function getPlayerInfo(playersField: NestedPlayer): { name: string; isAdmin: boolean } {
  const p = unwrapRelation(playersField);
  if (!p) return { name: 'Nieznany gracz', isAdmin: false };
  const role = unwrapRelation(p.roles);
  return { name: p.full_name || 'Nieznany gracz', isAdmin: role?.name === 'admin' };
}

function getAuthorName(playersField: NestedPlayer): string {
  const p = unwrapRelation(playersField);
  return p?.full_name || 'Administrator';
}

function ProgressBar({ pct, height = 7 }: { pct: number; height?: number }) {
  const clamped = Math.max(0, Math.min(1, pct));
  const tipWidth = Math.max(8, height * 1.6);
  return (
    <View style={[progressStyles.track, { height, borderRadius: height / 2 }]}>
      <View style={[progressStyles.fill, { width: `${clamped * 100}%`, borderRadius: height / 2 }]}>
        {clamped > 0.06 && (
          <View
            style={[
              progressStyles.tip,
              {
                width: tipWidth,
                borderTopRightRadius: height / 2,
                borderBottomRightRadius: height / 2,
              },
            ]}
          />
        )}
      </View>
    </View>
  );
}

const progressStyles = StyleSheet.create({
  track: { backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: brand.primary },
  tip: { position: 'absolute', right: 0, top: 0, bottom: 0, backgroundColor: brand.accent },
});

type Props = {
  matchId?: string;
  compact?: boolean;
  showBack?: boolean;
  backLabel?: string;
};

export default function MatchView({ matchId, compact = false, showBack = false, backLabel = 'TERMINARZ' }: Props) {
  const router = useRouter();
  const { isDark, c } = useAppTheme();
  const styles = useMemo(() => getStyles(c, isDark), [c, isDark]);

  const [match, setMatch] = useState<Match | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<'participants' | 'notifications'>('participants');
  const horizontalScrollRef = useRef<ScrollView>(null);
  const [footerHeight, setFooterHeight] = useState(0);

  const matchBadges = useItemBadges('matches');
  useEffect(() => {
    // Wejście w konkretny mecz (z dowolnego miejsca) gasi jego kropkę nowości w Terminarzu.
    if (matchId) matchBadges.markOpened(matchId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

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

  const loadData = useCallback(async (silent?: boolean) => {
    // Odświeżenie po zapisie/wypisie (silent=true) nie pokazuje pełnoekranowego spinnera —
    // inaczej podmieniało całe drzewo na <ActivityIndicator>, odmontowując ToastHost i ucinając
    // dopiero co pokazany toast z podsumowaniem akcji, zanim zdążył się pokazać na 5 sekund.
    if (!silent) setLoading(true);
    const player = await getCurrentPlayer();
    setCurrentPlayer(player);

    const matchQuery = matchId
      ? supabase.from('matches').select('*').eq('id', matchId).single()
      : supabase
          .from('matches')
          .select('*')
          .gte('date', new Date().toISOString().split('T')[0])
          .order('date', { ascending: true })
          .order('time_start', { ascending: true })
          .limit(1)
          .maybeSingle();

    const { data: matchData, error: matchError } = await matchQuery;

    if (matchError || !matchData) {
      setMatch(null);
      setLoading(false);
      if (matchId) {
        showAlert('Błąd', 'Nie udało się pobrać szczegółów meczu.', () => router.back());
      }
      return;
    }

    setMatch(matchData);

    const { data: regsData, error: regsError } = await supabase
      .from('match_registrations')
      .select('id, match_id, player_id, is_paid, created_at, players:player_id ( full_name, roles:role_id ( name ) )')
      .eq('match_id', matchData.id)
      .order('created_at', { ascending: true });

    if (!regsError) {
      setRegistrations(regsData ?? []);
    }

    const { data: annData, error: annError } = await supabase
      .from('announcements')
      .select(
        `
        id, title, content, category_id, is_pinned, author_id, created_at, match_id,
        players:author_id ( full_name )
      `
      )
      .eq('match_id', matchData.id);

    if (!annError && annData) {
      const sorted = [...annData].sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      setAnnouncements(sorted);
    }

    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleScrollEnd = (e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveTab(idx === 1 ? 'notifications' : 'participants');
  };

  const switchTab = (key: string) => {
    const tab: 'participants' | 'notifications' = key === 'notifications' ? 'notifications' : 'participants';
    setActiveTab(tab);
    horizontalScrollRef.current?.scrollTo({ x: tab === 'notifications' ? SCREEN_WIDTH : 0, animated: true });
  };

  if (loading) {
    return (
      <SafeAreaView
        style={styles.loadingContainer}
        edges={showBack ? ['top', 'bottom', 'left', 'right'] : ['top', 'left', 'right']}
      >
        <ActivityIndicator size="large" color={brand.primary} />
      </SafeAreaView>
    );
  }

  if (!match) {
    if (matchId) {
      return (
        <SafeAreaView style={styles.loadingContainer} edges={['top', 'bottom', 'left', 'right']}>
          <CustomAlert visible={alertVisible} title={alertTitle} message={alertMessage} onClose={handleAlertClose} />
        </SafeAreaView>
      );
    }
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top', 'left', 'right']}>
        <Text style={styles.emptyMainText}>Brak nadchodzących meczów w kalendarzu.</Text>
      </SafeAreaView>
    );
  }

  const isCancelled = match.status_id === 2;
  const isFinished = isDateInPast(match.date) || isCancelled;
  const capacity = match.capacity ?? match.max_players;
  // Nie ma osobnej flagi "rezerwa" w bazie — rejestracje są posortowane po created_at (kto pierwszy),
  // więc pierwsze `capacity` zapisów to skład główny, a reszta automatycznie trafia na listę rezerwową.
  const mainList = registrations.slice(0, capacity);
  const waitlist = registrations.slice(capacity);
  const isFull = registrations.length >= capacity;
  const myRegistration = registrations.find((r) => String(r.player_id) === String(currentPlayer?.id));
  const isUserInMain = mainList.some((r) => String(r.player_id) === String(currentPlayer?.id));
  const isCancellable = canCancelMatch(match.date, match.time_start);
  const title = match.title?.trim() || (matchId ? 'Szczegóły Meczu' : 'Najbliższy Trening');
  const { weekday } = formatMatchDate(match.date);
  const viewerIsAdmin = isAdminPlayer(currentPlayer);
  const pct = capacity > 0 ? Math.min(1, registrations.length / capacity) : 0;

  const getStatusInfo = (fullLabel: boolean): { label: string; variant: PillVariant } => {
    if (isCancelled) return { label: '⚠ ODWOŁANY', variant: 'red' };
    if (isFinished) return { label: 'ZAKOŃCZONY', variant: 'neutral' };
    return { label: fullLabel ? 'NADCHODZĄCY MECZ' : 'NADCHODZĄCY', variant: 'blue' };
  };

  const getUserStatusInfo = (): { label: string; variant: PillVariant } => {
    if (isCancelled) return { label: '⚠ Mecz odwołany', variant: 'red' };
    if (!myRegistration) return { label: 'Nie jesteś zapisany', variant: 'neutral' };
    return isUserInMain
      ? { label: '✓ Jesteś w składzie głównym', variant: 'green' }
      : { label: '⏳ Jesteś na liście rezerwowej', variant: 'amber' };
  };

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

    await afterSignUp(match, currentPlayer, { isFull });
    loadData(true);
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

    const willPromote = isUserInMain && waitlist.length > 0;

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

    await afterCancel(match, currentPlayer, { willPromote });
    loadData(true);
  };

  const renderParticipant = (item: Registration, index: number) => {
    const isMe = String(item.player_id) === String(currentPlayer?.id);
    const info = getPlayerInfo(item.players);
    // "Własny" wygrywa z "admin", jeśli to samo (spójne z regułą kart komentarzy).
    const rowKind: 'own' | 'admin' | 'other' = isMe ? 'own' : info.isAdmin ? 'admin' : 'other';
    // Status płatności innych osób widzi tylko admin — zwykły gracz widzi wyłącznie swój.
    const canSeePayment = isMe || viewerIsAdmin;

    return (
      <Animated.View
        key={item.id}
        entering={FadeInDown.delay(Math.min(index, 10) * 60).duration(450)}
        layout={LinearTransition.springify()}
        style={[
          styles.participantRow,
          rowKind === 'own' && styles.participantRowOwn,
          rowKind === 'admin' && styles.participantRowAdmin,
        ]}
      >
        <Text style={styles.participantNumber}>{index + 1}</Text>
        <View style={styles.participantInfo}>
          <Text style={styles.participantName} numberOfLines={1}>
            {info.name}
          </Text>
          <View style={styles.participantPillsRow}>
            {rowKind === 'own' && <Pill c={c} variant="green" label="TY" />}
            {rowKind === 'admin' && <Pill c={c} variant="blue" label="ADMIN" />}
            {canSeePayment && (
              <Pill
                c={c}
                variant={item.is_paid ? 'green' : 'amber'}
                label={item.is_paid ? 'OPŁACONE' : 'NIE OPŁACONE'}
              />
            )}
          </View>
        </View>
      </Animated.View>
    );
  };

  const renderAnnouncement = (item: Announcement, index: number) => {
    const authorName = getAuthorName(item.players);
    return (
      <Animated.View
        key={item.id}
        entering={FadeInDown.delay(Math.min(index, 10) * 60).duration(450)}
        layout={LinearTransition.springify()}
        style={styles.notifCardWrap}
      >
        <PressableScale onPress={() => router.push(`/(announcement)/${item.id}`)}>
          <Card c={c} isDark={isDark} accent="blue">
            <View style={styles.notifTopRow}>
              <Text style={styles.notifTitle} numberOfLines={1}>
                {item.title}
              </Text>
              {item.is_pinned && <Pill c={c} variant="amber" label="PRZYPIĘTE" />}
            </View>
            <Text style={styles.notifContent} numberOfLines={2}>
              {item.content}
            </Text>
            <View style={styles.notifFooter}>
              <Text style={styles.notifFooterText} numberOfLines={1}>
                {authorName}
              </Text>
              <Text style={styles.notifFooterText}>
                {new Date(item.created_at).toLocaleDateString('pl-PL', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          </Card>
        </PressableScale>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={showBack ? ['top', 'bottom', 'left', 'right'] : ['top', 'left', 'right']}
    >
      <CustomAlert visible={alertVisible} title={alertTitle} message={alertMessage} onClose={handleAlertClose} />

      <Animated.View style={styles.flexOne} entering={!showBack ? FadeInDown.duration(340) : undefined}>
        {showBack && (
          <View style={styles.topBar}>
            <PressableScale onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={20} color={c.ink} />
            </PressableScale>
            <View style={styles.topBarTextCol}>
              <Text style={styles.backToLabel} numberOfLines={1}>
                WRÓĆ DO: {backLabel}
              </Text>
              <Text style={styles.topBarTitle} numberOfLines={1}>
                Szczegóły meczu
              </Text>
            </View>
            <Pill c={c} variant={getStatusInfo(false).variant} label={getStatusInfo(false).label} />
          </View>
        )}

        <View style={styles.ticketWrap}>
          {compact ? (
            <Ticket>
              <View style={styles.compactRow}>
                <DateChip date={match.date} width={46} height={52} c={darkPalette} />
                <View style={styles.compactInfoCol}>
                  <Text style={[styles.compactTitle, isCancelled && styles.titleCancelled]} numberOfLines={1}>
                    {title}
                  </Text>
                  <Text style={styles.compactMeta} numberOfLines={1}>
                    {weekday} · {formatTime(match.time_start)}–{formatTime(match.time_end)} · {match.location}
                  </Text>
                </View>
                <View style={styles.compactPriceCol}>
                  <Text style={styles.compactPrice}>{Number(match.price_per_player)} PLN</Text>
                  <Text style={styles.compactPerPerson}>ZA OSOBĘ</Text>
                </View>
              </View>
              <TicketPerforation c={c} compact />
              <View style={styles.compactFooterRow}>
                <Text style={styles.compactZapisani} numberOfLines={1}>
                  ZAPISANI {registrations.length}/{capacity}
                </Text>
                <View style={styles.compactProgressWrap}>
                  <ProgressBar pct={pct} height={6} />
                </View>
                <Text style={styles.compactRez}>rez. {waitlist.length}</Text>
              </View>
            </Ticket>
          ) : (
            <Ticket>
              <View style={styles.fullTop}>
                <View style={styles.fullTopRow}>
                  <Pill c={darkPalette} variant={getStatusInfo(true).variant} label={getStatusInfo(true).label} />
                  <Text style={styles.fullPrice}>{Number(match.price_per_player)} PLN / os.</Text>
                </View>
                <Text style={[styles.fullTitle, isCancelled && styles.titleCancelled]} numberOfLines={1}>
                  {title}
                </Text>
                <View style={styles.fullDateRow}>
                  <DateChip date={match.date} width={56} height={62} c={darkPalette} />
                  <View style={styles.fullDateCol}>
                    <Text style={styles.fullWeekday}>{weekday}</Text>
                    <View style={styles.fullMetaRow}>
                      <Ionicons name="time-outline" size={14} color={brand.ticketLabel} />
                      <Text style={styles.fullMetaText}>
                        {formatTime(match.time_start)} – {formatTime(match.time_end)}
                      </Text>
                    </View>
                    <View style={styles.fullMetaRow}>
                      <Ionicons name="location-outline" size={14} color={brand.ticketLabel} />
                      <Text style={styles.fullMetaText} numberOfLines={1}>
                        {match.location}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
              <TicketPerforation c={c} compact={false} />
              <View style={styles.fullBottom}>
                <View style={styles.zapisaniRow}>
                  <Text style={styles.zapisaniLabel}>ZAPISANI</Text>
                  <Text style={styles.zapisaniValue}>
                    {registrations.length} / {capacity}
                  </Text>
                </View>
                <ProgressBar pct={pct} height={7} />
                <Pill
                  c={darkPalette}
                  variant={getUserStatusInfo().variant}
                  label={getUserStatusInfo().label}
                  style={styles.userStatusPill}
                />
                <Text style={styles.subMetaText}>
                  Skład główny {mainList.length} / {capacity} · rezerwa {waitlist.length}
                </Text>
              </View>
            </Ticket>
          )}
        </View>

        <View style={styles.segmentWrap}>
          <SegmentButtons
            c={c}
            activeKey={activeTab}
            onChange={switchTab}
            options={[
              { key: 'participants', label: `Uczestnicy (${registrations.length}/${capacity})` },
              { key: 'notifications', label: `Powiadomienia (${announcements.length})` },
            ]}
          />
        </View>

        <ScrollView
          ref={horizontalScrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScrollEnd}
          style={styles.pagerScroll}
        >
          <View style={styles.page}>
            <ScrollView contentContainerStyle={styles.pageContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.sectionHeading}>
                Skład Główny ({mainList.length}/{capacity})
              </Text>
              {mainList.length === 0 ? (
                <Text style={styles.emptySubText}>Brak zapisanych graczy.</Text>
              ) : (
                mainList.map((item, index) => renderParticipant(item, index))
              )}

              <Text style={[styles.sectionHeading, styles.sectionHeadingSpaced]}>
                Lista Rezerwowa ({waitlist.length})
              </Text>
              {waitlist.length === 0 ? (
                <Text style={styles.emptySubText}>Brak osób na rezerwie.</Text>
              ) : (
                waitlist.map((item, index) => renderParticipant(item, index))
              )}
            </ScrollView>
          </View>

          <View style={styles.page}>
            <ScrollView contentContainerStyle={styles.pageContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.sectionHeading}>Powiadomienia o meczu</Text>
              {announcements.length === 0 ? (
                <Text style={styles.emptySubText}>Brak powiadomień powiązanych z tym meczem.</Text>
              ) : (
                announcements.map((item, index) => renderAnnouncement(item, index))
              )}
            </ScrollView>
          </View>
        </ScrollView>

        {!isFinished && currentPlayer && (
          <View style={styles.footerBar} onLayout={(e) => setFooterHeight(e.nativeEvent.layout.height)}>
            {myRegistration ? (
              isCancellable ? (
                <DangerButton
                  label="Wypisz się z meczu"
                  onPress={handleCancel}
                  loading={actionLoading}
                  c={c}
                  icon="exit-outline"
                />
              ) : (
                <Text style={styles.lockedText}>Wypis zablokowany (&lt; 2h przed meczem)</Text>
              )
            ) : (
              <PrimaryButton
                label={isFull ? 'Zapisz się na listę rezerwową' : 'Zapisz się na mecz'}
                onPress={handleSignUp}
                loading={actionLoading}
              />
            )}
          </View>
        )}

        <ToastHost c={c} isDark={isDark} bottom={(footerHeight || 0) + 10} />
      </Animated.View>
    </SafeAreaView>
  );
}

const getStyles = (c: Palette, isDark: boolean) =>
  StyleSheet.create({
    flexOne: { flex: 1 },
    safeArea: { flex: 1, backgroundColor: c.bg },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: c.bg,
      paddingHorizontal: 16,
    },
    emptyMainText: { fontSize: 15, color: c.ink2, textAlign: 'center', fontWeight: '700' },

    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: space.screen,
      paddingTop: 6,
      paddingBottom: 10,
      gap: 12,
    },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: radius.sm,
      backgroundColor: c.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    topBarTextCol: { flex: 1 },
    backToLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1, color: c.ink3, textTransform: 'uppercase' },
    topBarTitle: { fontSize: 16, fontWeight: '800', color: c.ink, marginTop: 2 },

    ticketWrap: { paddingHorizontal: space.screen, marginTop: 4 },

    fullTop: { padding: 16 },
    fullTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    fullPrice: { fontSize: 13, fontWeight: '800', color: brand.accent },
    fullTitle: { fontSize: 22, fontWeight: '800', color: brand.ticketInk, marginBottom: 14 },
    titleCancelled: { textDecorationLine: 'line-through', color: brand.ticketMuted },
    fullDateRow: { flexDirection: 'row', alignItems: 'center' },
    fullDateCol: { flex: 1, marginLeft: 14 },
    fullWeekday: { fontSize: 15, fontWeight: '800', color: brand.ticketInk, marginBottom: 5 },
    fullMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
    fullMetaText: { fontSize: 12.5, fontWeight: '700', color: brand.ticketInk2, flexShrink: 1 },

    fullBottom: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16 },
    zapisaniRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    zapisaniLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1, color: brand.ticketLabel },
    zapisaniValue: { fontSize: 15, fontWeight: '800', color: brand.ticketInk },
    userStatusPill: { marginTop: 10 },
    subMetaText: { fontSize: 11, fontWeight: '700', color: brand.ticketLabel, marginTop: 8 },

    compactRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
    compactInfoCol: { flex: 1, marginLeft: 12, marginRight: 10 },
    compactTitle: { fontSize: 16, fontWeight: '800', color: brand.ticketInk },
    compactMeta: { fontSize: 11.5, fontWeight: '700', color: brand.ticketInk2, marginTop: 3 },
    compactPriceCol: { alignItems: 'flex-end' },
    compactPrice: { fontSize: 14, fontWeight: '800', color: brand.accent },
    compactPerPerson: { fontSize: 8, fontWeight: '800', letterSpacing: 0.6, color: brand.ticketMuted, marginTop: 2 },
    compactFooterRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
    compactZapisani: { fontSize: 10, fontWeight: '800', color: brand.ticketLabel },
    compactProgressWrap: { flex: 1 },
    compactRez: { fontSize: 10, fontWeight: '700', color: brand.ticketLabel },

    segmentWrap: { paddingHorizontal: space.screen, marginTop: 14, marginBottom: 12 },

    pagerScroll: { flex: 1 },
    page: { width: SCREEN_WIDTH, flex: 1 },
    pageContent: { paddingHorizontal: space.screen, paddingBottom: 24 },

    sectionHeading: { fontSize: 15, fontWeight: '800', color: c.ink, marginBottom: 10 },
    sectionHeadingSpaced: { marginTop: 18 },
    emptySubText: { fontSize: 13, color: c.ink2, fontWeight: '500', marginBottom: 10 },

    participantRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 9,
      paddingHorizontal: 12,
      borderRadius: radius.md,
      marginBottom: 6,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.line,
    },
    participantRowOwn: {
      backgroundColor: c.tintG,
      borderColor: 'rgba(16,185,129,0.4)',
      borderLeftWidth: 3,
      borderLeftColor: brand.success,
    },
    participantRowAdmin: {
      backgroundColor: c.tintB,
      borderColor: 'rgba(44,75,255,0.45)',
      borderLeftWidth: 3,
      borderLeftColor: brand.primary,
    },
    participantNumber: { width: 22, fontSize: 13, fontWeight: '800', color: c.ink3 },
    participantInfo: { flex: 1, marginLeft: 6 },
    participantName: { fontSize: 13, fontWeight: '700', color: c.ink },
    participantPillsRow: { flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' },

    notifCardWrap: { marginBottom: space.gap },
    notifTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 6 },
    notifTitle: { fontSize: 15, fontWeight: '800', color: c.ink, flex: 1 },
    notifContent: { fontSize: 13, fontWeight: '500', color: c.ink2, lineHeight: 19, marginBottom: 10 },
    notifFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: c.line,
      paddingTop: 9,
    },
    notifFooterText: { fontSize: 11.5, fontWeight: '600', color: c.ink3 },

    footerBar: {
      padding: space.screen,
      paddingTop: 14,
      backgroundColor: c.card,
      borderTopWidth: 1,
      borderTopColor: c.line,
      ...shadow(isDark).card,
      shadowOffset: { width: 0, height: -8 },
    },
    lockedText: { fontSize: 13, color: c.ink2, fontStyle: 'italic', textAlign: 'center', fontWeight: '700' },
  });
