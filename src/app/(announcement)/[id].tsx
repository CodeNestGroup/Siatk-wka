import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, LinearTransition, ZoomIn, FadeOut } from 'react-native-reanimated';
import { supabase } from '@/lib/supabase';
import { formatMatchDate, formatTime, isDateInPast } from '@/lib/format';
import { unwrapRelation } from '@/lib/relations';
import { getCategoryMeta } from '@/lib/announcement-category';
import { canCancelMatch } from '@/lib/match-rules';
import { getCurrentPlayer, type Player } from '@/lib/player';
import { afterSignUp, afterCancel } from '@/services/registrationService';
import { fetchComments, addComment, deleteComment, type Comment } from '@/services/commentService';
import { showToast } from '@/lib/toast';
import { useAppTheme } from '@/hooks/use-theme';
import { brand, dark as darkPalette, radius, space, type Palette } from '@/constants/app-theme';
import CustomAlert from '@/components/CustomAlert';
import PressableScale from '@/components/ui/PressableScale';
import Ticket from '@/components/ui/Ticket';
import DateChip from '@/components/ui/DateChip';
import Pill from '@/components/ui/Pill';
import Card from '@/components/ui/Card';
import PrimaryButton from '@/components/ui/PrimaryButton';
import DangerButton from '@/components/ui/DangerButton';
import ToastHost from '@/components/ui/Toast';

type LinkedMatch = {
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

type NestedCategory = { id: number; name: string };
type NestedAuthor = { full_name: string; roles?: { name: string } | { name: string }[] | null };

type AnnouncementDetail = {
  id: string;
  title: string;
  content: string;
  category_id: number | null;
  is_pinned: boolean;
  author_id: string;
  created_at: string;
  match_id: string | null;
  announcements_category?: NestedCategory | NestedCategory[] | null;
  matches?: LinkedMatch | LinkedMatch[] | null;
  players?: NestedAuthor | NestedAuthor[] | null;
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function Avatar({ name, size }: { name: string; size: number }) {
  const initial = (name || '?').trim().charAt(0).toUpperCase() || '?';
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
        backgroundColor: brand.primary,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: size * 0.42 }}>{initial}</Text>
    </View>
  );
}

type AlertState = {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
};

const EMPTY_ALERT: AlertState = { visible: false, title: '', message: '', onConfirm: () => {} };

export default function AnnouncementDetailScreen() {
  const { id, fromMatch } = useLocalSearchParams<{ id: string; fromMatch?: string }>();
  const router = useRouter();
  const { isDark, c } = useAppTheme();
  const styles = useMemo(() => getStyles(c), [c]);

  const [announcement, setAnnouncement] = useState<AnnouncementDetail | null>(null);
  const [matchRegs, setMatchRegs] = useState<{ player_id: string }[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [matchActionLoading, setMatchActionLoading] = useState(false);

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [composerFocused, setComposerFocused] = useState(false);
  const [composerHeight, setComposerHeight] = useState(0);

  const [alertState, setAlertState] = useState<AlertState>(EMPTY_ALERT);

  const showAlert = (title: string, message: string, onConfirm?: () => void) => {
    setAlertState({
      visible: true,
      title,
      message,
      confirmText: 'OK',
      onConfirm: () => {
        setAlertState(EMPTY_ALERT);
        onConfirm?.();
      },
    });
  };

  const showConfirm = (title: string, message: string, confirmText: string, onConfirm: () => void) => {
    setAlertState({
      visible: true,
      title,
      message,
      confirmText,
      cancelText: 'Anuluj',
      onConfirm: () => {
        setAlertState(EMPTY_ALERT);
        onConfirm();
      },
      onCancel: () => setAlertState(EMPTY_ALERT),
    });
  };

  const loadAll = useCallback(async (silent?: boolean) => {
    if (!id) return;
    // Po zapisie/wypisie z powiązanego meczu (silent=true) nie pokazujemy pełnoekranowego
    // spinnera — inaczej odmontowywał ToastHost i ucinał toast zanim zdążył się pokazać.
    if (!silent) setLoading(true);

    const [player, annRes] = await Promise.all([
      getCurrentPlayer(),
      supabase
        .from('announcements')
        .select(
          `
          id, title, content, category_id, is_pinned, author_id, created_at, match_id,
          announcements_category ( id, name ),
          matches ( id, title, date, time_start, time_end, location, max_players, capacity, price_per_player, status_id ),
          players:author_id ( full_name, roles:role_id ( name ) )
        `
        )
        .eq('id', id)
        .single(),
    ]);

    setCurrentPlayer(player);

    if (annRes.error || !annRes.data) {
      setLoading(false);
      showAlert('Błąd', 'Nie udało się pobrać ogłoszenia.', () => router.back());
      return;
    }

    const ann = annRes.data as unknown as AnnouncementDetail;
    setAnnouncement(ann);

    const linkedMatch = unwrapRelation(ann.matches);
    if (linkedMatch) {
      const { data: regsData } = await supabase
        .from('match_registrations')
        .select('player_id')
        .eq('match_id', linkedMatch.id);
      setMatchRegs(regsData ?? []);
    } else {
      setMatchRegs([]);
    }

    try {
      const commentsData = await fetchComments(id);
      setComments(commentsData);
    } catch (e) {
      console.error('Błąd pobierania komentarzy:', e);
    }

    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll])
  );

  if (loading || !announcement) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top', 'bottom', 'left', 'right']}>
        <ActivityIndicator size="large" color={brand.primary} />
        <CustomAlert
          visible={alertState.visible}
          title={alertState.title}
          message={alertState.message}
          confirmText={alertState.confirmText}
          cancelText={alertState.cancelText}
          onClose={alertState.onConfirm}
          onCancel={alertState.onCancel}
        />
      </SafeAreaView>
    );
  }

  const category = unwrapRelation(announcement.announcements_category);
  const meta = getCategoryMeta(category?.name);
  const author = unwrapRelation(announcement.players);
  const authorName = author?.full_name || 'Administrator';
  const linkedMatch = unwrapRelation(announcement.matches);

  const matchIsCancelled = linkedMatch?.status_id === 2;
  const matchIsFinished = linkedMatch ? isDateInPast(linkedMatch.date) || matchIsCancelled : false;
  const matchCapacity = linkedMatch ? linkedMatch.capacity ?? linkedMatch.max_players : 0;
  const matchIsFull = matchRegs.length >= matchCapacity;
  const myMatchReg = linkedMatch
    ? matchRegs.find((r) => String(r.player_id) === String(currentPlayer?.id))
    : undefined;
  const matchIsCancellable = linkedMatch ? canCancelMatch(linkedMatch.date, linkedMatch.time_start) : false;
  const matchWeekday = linkedMatch ? formatMatchDate(linkedMatch.date).weekday : '';
  const isUserInMain =
    !!myMatchReg && matchRegs.slice(0, matchCapacity).some((r) => String(r.player_id) === String(currentPlayer?.id));

  const myComment = comments.find((cm) => cm.author_id === currentPlayer?.id);

  const handleMatchSignUp = async () => {
    if (!linkedMatch || !currentPlayer) return;
    if (matchIsCancelled) {
      showAlert('Błąd', 'Nie można zapisać się na odwołany mecz.');
      return;
    }
    setMatchActionLoading(true);
    const { error } = await supabase
      .from('match_registrations')
      .insert({ match_id: linkedMatch.id, player_id: currentPlayer.id });
    setMatchActionLoading(false);
    if (error) {
      showAlert('Błąd', error.message);
      return;
    }
    await afterSignUp(linkedMatch, currentPlayer, { isFull: matchIsFull });
    loadAll(true);
  };

  const handleMatchCancel = async () => {
    if (!linkedMatch || !currentPlayer) return;
    if (matchIsCancelled) {
      showAlert('Błąd', 'Nie można wypisać się z odwołanego meczu.');
      return;
    }
    if (!matchIsCancellable) {
      showAlert('Błąd', 'Nie można wypisać się na mniej niż 2 godziny przed meczem.');
      return;
    }
    const willPromote = isUserInMain && matchRegs.length > matchCapacity;
    setMatchActionLoading(true);
    const { error } = await supabase
      .from('match_registrations')
      .delete()
      .eq('match_id', linkedMatch.id)
      .eq('player_id', currentPlayer.id);
    setMatchActionLoading(false);
    if (error) {
      showAlert('Błąd', error.message);
      return;
    }
    await afterCancel(linkedMatch, currentPlayer, { willPromote });
    loadAll(true);
  };

  const handleSend = async () => {
    if (!currentPlayer || !draft.trim() || sending) return;
    setSending(true);
    try {
      const created = await addComment(id, currentPlayer.id, draft.trim());
      if (created) {
        setComments((prev) => [...prev, created]);
        setDraft('');
        showToast('Dodano komentarz.', 'chatbubble-ellipses');
      }
    } catch (e: any) {
      showAlert('Błąd', e?.message || 'Nie udało się dodać komentarza.');
    } finally {
      setSending(false);
    }
  };

  const executeDeleteComment = async (commentId: string) => {
    if (!currentPlayer) return;
    try {
      await deleteComment(commentId, currentPlayer.id);
      setComments((prev) => prev.filter((cm) => cm.id !== commentId));
      showToast('Usunięto komentarz.', 'trash-outline');
    } catch (e: any) {
      showAlert('Błąd', e?.message || 'Nie udało się usunąć komentarza.');
    }
  };

  const confirmDeleteComment = (cm: Comment) => {
    showConfirm('Usuń komentarz', 'Czy na pewno chcesz usunąć swój komentarz?', 'Usuń', () =>
      executeDeleteComment(cm.id)
    );
  };

  const renderComment = (cm: Comment) => {
    const isMe = cm.author_id === currentPlayer?.id;
    const commentAuthor = cm.players;
    const commentRole = commentAuthor ? unwrapRelation(commentAuthor.roles) : undefined;
    const isCommentAdmin = commentRole?.name === 'admin';
    const kind: 'own' | 'admin' | 'other' = isMe ? 'own' : isCommentAdmin ? 'admin' : 'other';
    const name = commentAuthor?.full_name || 'Użytkownik';

    return (
      <Animated.View
        key={cm.id}
        entering={ZoomIn.duration(340)}
        exiting={FadeOut.duration(220)}
        layout={LinearTransition.springify()}
        style={[
          styles.commentCard,
          kind === 'own' && styles.commentOwn,
          kind === 'admin' && styles.commentAdmin,
        ]}
      >
        <View style={styles.commentHeaderRow}>
          <Avatar name={name} size={32} />
          <View style={styles.commentAuthorCol}>
            <View style={styles.commentAuthorRow}>
              <Text style={styles.commentAuthorName} numberOfLines={1}>
                {name}
              </Text>
              {kind === 'own' && <Pill c={c} variant="green" label="TY" />}
              {kind === 'admin' && <Pill c={c} variant="blue" label="ADMIN" />}
            </View>
            <Text style={styles.commentDate}>{formatDateTime(cm.created_at)}</Text>
          </View>
          {kind === 'own' && (
            <PressableScale onPress={() => confirmDeleteComment(cm)} style={[styles.trashBtn, { backgroundColor: c.tintR }]}>
              <Ionicons name="trash-outline" size={16} color={c.redInk} />
            </PressableScale>
          )}
        </View>
        <Text style={styles.commentContent}>{cm.content}</Text>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
      <CustomAlert
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        confirmText={alertState.confirmText}
        cancelText={alertState.cancelText}
        onClose={alertState.onConfirm}
        onCancel={alertState.onCancel}
      />

      <View style={styles.topBar}>
        <PressableScale onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={20} color={c.ink} />
        </PressableScale>
        <Text style={styles.topBarTitle}>SZCZEGÓŁY OGŁOSZENIA</Text>
        <View style={styles.backBtnSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.flexOne}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(340)}>
            <Card c={c} isDark={isDark} accent={meta.accent}>
              <View style={styles.pillsRow}>
                <Pill c={c} variant={meta.pillVariant} label={meta.label} />
                {announcement.is_pinned && <Pill c={c} variant="neutral" label="PRZYPIĘTE" />}
              </View>

              <Text style={styles.title}>{announcement.title}</Text>

              <View style={styles.authorRow}>
                <Avatar name={authorName} size={32} />
                <View style={styles.authorTextCol}>
                  <Text style={styles.authorName} numberOfLines={1}>
                    {authorName}
                  </Text>
                  <Text style={styles.authorDate}>{formatDateTime(announcement.created_at)}</Text>
                </View>
              </View>

              <View style={styles.hairline} />

              <Text style={styles.content}>{announcement.content}</Text>
            </Card>

            {linkedMatch && (
              <>
                <PressableScale
                  onPress={() => {
                    // Ten sam zabieg co w MatchView.renderAnnouncement, w drugą stronę: jeśli to
                    // mecz, z którego przyszliśmy do tego ogłoszenia, wracamy zamiast pchać nowy
                    // ekran — zapobiega pętli mecz↔ogłoszenie rosnącej w nieskończoność na stosie.
                    if (fromMatch && linkedMatch.id === fromMatch) {
                      router.back();
                    } else {
                      router.push(`/(match)/${linkedMatch.id}?from=ogloszenie&fromId=${id}`);
                    }
                  }}
                >
                  <Ticket style={styles.miniTicketWrap}>
                    <View style={styles.miniTicketRow}>
                      <DateChip date={linkedMatch.date} width={46} height={50} c={darkPalette} />
                      <View style={styles.miniTicketCol}>
                        <Text style={styles.miniTicketLabel}>POWIĄZANY MECZ</Text>
                        <Text
                          style={[styles.miniTicketTitle, matchIsCancelled && styles.miniTicketTitleCancelled]}
                          numberOfLines={1}
                        >
                          {linkedMatch.title?.trim() || 'Trening Siatkówki'}
                        </Text>
                        <Text style={styles.miniTicketMeta} numberOfLines={1}>
                          {matchWeekday} · {formatTime(linkedMatch.time_start)}–{formatTime(linkedMatch.time_end)}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={brand.ticketLabel} />
                    </View>
                  </Ticket>
                </PressableScale>

                <View style={styles.matchActionWrap}>
                  {matchIsFinished ? (
                    <Pill c={c} variant={matchIsCancelled ? 'red' : 'neutral'} label={matchIsCancelled ? 'Mecz odwołany' : 'Mecz zakończony'} />
                  ) : !currentPlayer ? null : myMatchReg ? (
                    matchIsCancellable ? (
                      <DangerButton
                        label="Wypisz się z meczu"
                        onPress={handleMatchCancel}
                        loading={matchActionLoading}
                        c={c}
                        icon="exit-outline"
                      />
                    ) : (
                      <Text style={styles.lockedText}>Wypis zablokowany (&lt; 2h przed meczem)</Text>
                    )
                  ) : (
                    <PrimaryButton
                      label={matchIsFull ? 'Zapisz się na listę rezerwową' : 'Zapisz się na mecz'}
                      onPress={handleMatchSignUp}
                      loading={matchActionLoading}
                    />
                  )}
                </View>
              </>
            )}

            <Text style={styles.sectionHeading}>KOMENTARZE ({comments.length})</Text>
            {comments.length === 0 ? (
              <Text style={styles.emptyText}>Brak komentarzy — bądź pierwszy.</Text>
            ) : (
              comments.map((cm) => renderComment(cm))
            )}

            <View style={{ height: composerHeight + 16 }} />
          </Animated.View>
        </ScrollView>

        <View
          style={[styles.composerOuter, { backgroundColor: c.bg, borderTopColor: c.line }]}
          onLayout={(e) => setComposerHeight(e.nativeEvent.layout.height)}
        >
          {myComment ? (
            <View style={[styles.myCommentBar, { backgroundColor: c.tintG }]}>
              <Ionicons name="checkmark-circle" size={16} color={c.greenInk} />
              <Text style={[styles.myCommentText, { color: c.greenInk }]}>
                Dodałeś swój komentarz. Możesz go usunąć.
              </Text>
            </View>
          ) : (
            <View style={styles.composerRow}>
              <TextInput
                style={[
                  styles.composerInput,
                  { backgroundColor: c.card2, borderColor: composerFocused ? brand.primary : c.line, color: c.ink },
                ]}
                placeholder="Napisz komentarz..."
                placeholderTextColor={c.ink3}
                value={draft}
                onChangeText={setDraft}
                onFocus={() => setComposerFocused(true)}
                onBlur={() => setComposerFocused(false)}
                multiline
              />
              <PressableScale
                onPress={handleSend}
                disabled={sending || !draft.trim()}
                style={[styles.sendBtn, (sending || !draft.trim()) && styles.sendBtnDisabled]}
              >
                {sending ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name="paper-plane" size={20} color="#FFFFFF" />}
              </PressableScale>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>

      <ToastHost c={c} isDark={isDark} bottom={composerHeight + 10} />
    </SafeAreaView>
  );
}

const getStyles = (c: Palette) =>
  StyleSheet.create({
    flexOne: { flex: 1 },
    safeArea: { flex: 1, backgroundColor: c.bg },
    loadingContainer: { flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' },

    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: space.screen,
      paddingTop: 6,
      paddingBottom: 10,
    },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: radius.sm,
      backgroundColor: c.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    backBtnSpacer: { width: 38 },
    topBarTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 1, color: c.ink3 },

    scrollContent: { paddingHorizontal: space.screen, paddingBottom: 12 },

    pillsRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
    title: { fontSize: 22, fontWeight: '800', color: c.ink, marginBottom: 14 },
    authorRow: { flexDirection: 'row', alignItems: 'center', paddingBottom: 14 },
    authorTextCol: { marginLeft: 10 },
    authorName: { fontSize: 12.5, fontWeight: '700', color: c.ink },
    authorDate: { fontSize: 11, fontWeight: '600', color: c.ink3, marginTop: 2 },
    hairline: { height: 1, backgroundColor: c.line, marginBottom: 14 },
    content: { fontSize: 14, fontWeight: '500', color: c.ink2, lineHeight: 23 },

    miniTicketWrap: { marginTop: 14 },
    miniTicketRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
    miniTicketCol: { flex: 1 },
    miniTicketLabel: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.8, color: brand.accent },
    miniTicketTitle: { fontSize: 15, fontWeight: '800', color: brand.ticketInk, marginTop: 2 },
    miniTicketTitleCancelled: { textDecorationLine: 'line-through', color: brand.ticketMuted },
    miniTicketMeta: { fontSize: 11.5, fontWeight: '700', color: brand.ticketInk2, marginTop: 2 },

    matchActionWrap: { marginTop: 12 },
    lockedText: { fontSize: 13, color: c.ink2, fontStyle: 'italic', textAlign: 'center', fontWeight: '700' },

    sectionHeading: {
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.8,
      color: c.ink3,
      textTransform: 'uppercase',
      marginTop: 22,
      marginBottom: 12,
    },
    emptyText: { fontSize: 13, color: c.ink2, fontWeight: '500' },

    commentCard: {
      backgroundColor: c.card,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: c.line,
      padding: 13,
      marginBottom: 10,
    },
    commentOwn: { backgroundColor: c.tintG, borderColor: 'rgba(16,185,129,0.4)', borderLeftWidth: 3, borderLeftColor: brand.success },
    commentAdmin: { backgroundColor: c.tintB, borderColor: 'rgba(44,75,255,0.45)', borderLeftWidth: 3, borderLeftColor: brand.primary },
    commentHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    commentAuthorCol: { flex: 1, marginLeft: 10 },
    commentAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    commentAuthorName: { fontSize: 13, fontWeight: '700', color: c.ink, flexShrink: 1 },
    commentDate: { fontSize: 10.5, fontWeight: '600', color: c.ink3, marginTop: 2 },
    trashBtn: { width: 32, height: 32, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
    commentContent: { fontSize: 13, fontWeight: '500', color: c.ink2, lineHeight: 20 },

    composerOuter: { padding: 14, borderTopWidth: 1 },
    myCommentBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: radius.lg,
      paddingVertical: 12,
      paddingHorizontal: 14,
    },
    myCommentText: { fontSize: 12.5, fontWeight: '700', flexShrink: 1 },
    composerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
    composerInput: {
      flex: 1,
      minHeight: 50,
      maxHeight: 120,
      borderRadius: radius.lg,
      borderWidth: 1,
      paddingHorizontal: 14,
      paddingVertical: 13,
      fontSize: 14,
    },
    sendBtn: {
      width: 52,
      height: 50,
      borderRadius: radius.lg,
      backgroundColor: brand.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendBtnDisabled: { opacity: 0.5 },
  });
