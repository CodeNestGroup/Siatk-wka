import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { formatRelativeDate } from '@/lib/format';
import { unwrapRelation } from '@/lib/relations';
import { getCategoryMeta } from '@/lib/announcement-category';
import { useAppTheme } from '@/hooks/use-theme';
import { useItemBadges } from '@/hooks/use-badges';
import { brand, space, type Palette } from '@/constants/app-theme';
import PressableScale from '@/components/ui/PressableScale';
import Card from '@/components/ui/Card';
import Pill from '@/components/ui/Pill';
import Chip from '@/components/ui/Chip';

// Tablica ogłoszeń klubu. Karta jest wyłącznie linkiem do (announcement)/[id] — akcje związane
// z ewentualnym powiązanym meczem (zapis/wypis) żyją tam, nie tutaj, żeby kafelek na liście miał
// jeden jasny cel dotyku.

type AnnouncementCategory = { id: number; name: string };

type Announcement = {
  id: string;
  title: string;
  content: string;
  category_id: number | null;
  is_pinned: boolean;
  author_id: string;
  created_at: string;
  match_id: string | null;
  announcements_category?: AnnouncementCategory | AnnouncementCategory[] | null;
  players?: { full_name: string } | { full_name: string }[] | null;
  announcement_comments?: { count: number }[] | { count: number } | null;
};

function AnnouncementCard({
  item,
  isNew,
  c,
  isDark,
  onPress,
}: {
  item: Announcement;
  isNew: boolean;
  c: Palette;
  isDark: boolean;
  onPress: () => void;
}) {
  const styles = getCardStyles(c);
  const category = unwrapRelation(item.announcements_category);
  const meta = getCategoryMeta(category?.name);
  const authorName = unwrapRelation(item.players)?.full_name || 'Administrator';
  const commentCount = unwrapRelation(item.announcement_comments)?.count ?? 0;

  return (
    <PressableScale onPress={onPress} style={styles.wrap}>
      <Card c={c} isDark={isDark} accent={meta.accent}>
        <View style={styles.pillsRow}>
          <Pill c={c} variant={meta.pillVariant} label={meta.label} />
          {item.is_pinned && <Pill c={c} variant="neutral" label="PRZYPIĘTE" />}
          {isNew && <Pill c={c} variant="amber" label="NOWE" />}
        </View>

        <View style={styles.titleRow}>
          {isNew && <View style={styles.newDot} />}
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
        </View>

        <Text style={styles.content} numberOfLines={3}>
          {item.content}
        </Text>

        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            <Ionicons name="chatbubble-outline" size={14} color={c.priInk} />
            <Text style={[styles.footerCommentText, { color: c.priInk }]}>
              {commentCount > 0 ? `Komentarze (${commentCount})` : 'Skomentuj'}
            </Text>
          </View>
          <Text style={styles.footerMeta} numberOfLines={1}>
            {authorName} · {formatRelativeDate(item.created_at)}
          </Text>
        </View>
      </Card>
    </PressableScale>
  );
}

export default function AnnouncementsScreen() {
  const router = useRouter();
  const { isDark, c } = useAppTheme();
  const styles = getStyles(c);
  const badges = useItemBadges('announcements');

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [filter, setFilter] = useState<number | 'all'>('all');

  const loadData = async () => {
    // `announcement_comments ( count )` to wbudowany agregat PostgREST — liczy komentarze po
    // stronie bazy w tym samym zapytaniu, więc nie trzeba osobno odpytywać każdego ogłoszenia.
    const { data, error } = await supabase
      .from('announcements')
      .select(
        `
        id, title, content, is_pinned, category_id, match_id, created_at, author_id,
        announcements_category ( id, name ),
        players:author_id ( full_name ),
        announcement_comments ( count )
      `
      )
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      setErrorMsg(error.message);
    } else {
      setErrorMsg(null);
      setAnnouncements((data ?? []) as Announcement[]);
    }
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      badges.enter();
      loadData();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleOpen = (item: Announcement) => {
    badges.markOpened(item.id);
    router.push(`/(announcement)/${item.id}`);
  };

  const uniqueCategoriesMap = new Map<number, string>();
  announcements.forEach((a) => {
    const cat = unwrapRelation(a.announcements_category);
    if (cat) uniqueCategoriesMap.set(cat.id, cat.name);
  });

  const availableFilters = [
    { key: 'all' as const, label: 'Wszystkie' },
    ...Array.from(uniqueCategoriesMap.entries()).map(([id, name]) => ({ key: id, label: name })),
  ];

  const filtered = announcements.filter((a) => (filter === 'all' ? true : a.category_id === filter));

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['bottom', 'left', 'right']}>
        <ActivityIndicator size="large" color={brand.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brand.primary} />}
        ListHeaderComponent={
          <View>
            <Text style={styles.headerTitle}>Tablica ogłoszeń</Text>
            <Text style={styles.headerSubtitle}>Ważne komunikaty dla całego zespołu</Text>

            {errorMsg && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>Błąd wczytywania: {errorMsg}</Text>
              </View>
            )}

            {availableFilters.length > 1 && (
              <FlatList
                horizontal
                data={availableFilters}
                keyExtractor={(f) => String(f.key)}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRow}
                renderItem={({ item }) => (
                  <Chip label={item.label} active={filter === item.key} onPress={() => setFilter(item.key)} c={c} />
                )}
              />
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {announcements.length === 0 ? 'Brak ogłoszeń.' : 'Brak ogłoszeń spełniających kryteria.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <AnnouncementCard
            item={item}
            isNew={badges.isNew(item.id, item.created_at)}
            c={c}
            isDark={isDark}
            onPress={() => handleOpen(item)}
          />
        )}
      />
    </SafeAreaView>
  );
}

const getStyles = (c: Palette) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: c.bg },
    loadingContainer: { flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' },
    listContent: { paddingHorizontal: space.screen, paddingTop: 12, paddingBottom: 32 },

    headerTitle: { fontSize: 24, fontWeight: '800', color: c.ink },
    headerSubtitle: { fontSize: 12.5, color: c.ink3, marginTop: 4, marginBottom: 18, fontWeight: '500' },

    errorBox: {
      backgroundColor: c.tintR,
      borderRadius: 16,
      padding: 14,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: brand.danger,
    },
    errorText: { color: c.redInk, fontSize: 13, fontWeight: '600' },

    filterRow: { gap: 8, paddingBottom: 18 },

    emptyState: { paddingVertical: 40, alignItems: 'center' },
    emptyText: { fontSize: 14, color: c.ink2, fontWeight: '500' },
  });

const getCardStyles = (c: Palette) =>
  StyleSheet.create({
    wrap: { marginBottom: space.gap },
    pillsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 8 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },
    newDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: brand.accent },
    title: { fontSize: 15.5, fontWeight: '800', color: c.ink, flex: 1 },
    content: { fontSize: 13, fontWeight: '500', color: c.ink2, lineHeight: 19, marginBottom: 12 },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: c.line,
      paddingTop: 10,
      gap: 8,
    },
    footerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    footerCommentText: { fontSize: 12, fontWeight: '700' },
    footerMeta: { fontSize: 11.5, color: c.ink3, fontWeight: '600', flexShrink: 1 },
  });
