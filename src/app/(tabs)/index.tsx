import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, shadow } from '@/constants/app-theme';
import { supabase } from '@/lib/supabase';
import { formatRelativeDate } from '@/lib/format';

type Announcement = {
  id: string;
  title: string;
  content: string;
  category: string;
  is_pinned: boolean;
  author: string;
  created_at: string;
};

type CategoryMeta = { bg: string; fg: string; icon: string; label: string };

const CATEGORY_META: Record<string, CategoryMeta> = {
  general: { bg: '#E0E7FF', fg: colors.primary, icon: 'i', label: 'Ogólne' },
  new: { bg: '#DCFCE7', fg: '#16A34A', icon: '＋', label: 'Nowe' },
  cancelled: { bg: '#FEE2E2', fg: '#DC2626', icon: '✕', label: 'Odwołane' },
  change: { bg: '#FEF3C7', fg: '#D97706', icon: '↻', label: 'Zmiana' },
  urgent: { bg: '#FEE2E2', fg: '#DC2626', icon: '!', label: 'Ważne' },
};

const DEFAULT_META: CategoryMeta = CATEGORY_META.general;

function getCategoryMeta(category: string): CategoryMeta {
  return CATEGORY_META[category] ?? DEFAULT_META;
}

function AnnouncementCard({ item }: { item: Announcement }) {
  const meta = getCategoryMeta(item.category);
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.85}>
      <View style={[styles.iconCircle, { backgroundColor: meta.bg }]}>
        <Text style={[styles.iconText, { color: meta.fg }]}>{meta.icon}</Text>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <Text style={[styles.badgeLabel, { color: meta.fg }]}>{meta.label}</Text>
          <Text style={styles.cardDate}>{formatRelativeDate(item.created_at)}</Text>
        </View>
        <View style={styles.titleRow}>
          {item.is_pinned && <Text style={styles.pinIcon}>📌</Text>}
          <Text style={styles.cardTitle}>{item.title}</Text>
        </View>
        <Text style={styles.cardDescription}>{item.content}</Text>
        <Text style={styles.cardAuthor}>— {item.author}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function AnnouncementsScreen() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');

  const loadAnnouncements = useCallback(async () => {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      setErrorMsg(error.message);
    } else {
      setErrorMsg(null);
      setAnnouncements(data ?? []);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadAnnouncements();
      setLoading(false);
    })();
  }, [loadAnnouncements]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAnnouncements();
    setRefreshing(false);
  };

  const availableFilters = [
    { key: 'all', label: 'Wszystkie' },
    ...Array.from(new Set(announcements.map((a) => a.category))).map((cat) => ({
      key: cat,
      label: getCategoryMeta(cat).label,
    })),
  ];

  const filtered = announcements.filter((a) => {
    const matchesFilter = filter === 'all' || a.category === filter;
    const matchesSearch =
      search.trim() === '' ||
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.content.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['bottom']}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.headerTitle}>Tablica ogłoszeń</Text>
                <Text style={styles.headerSubtitle}>Co się dzieje w Twojej grupie</Text>
              </View>
            </View>

            <View style={styles.searchBar}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Szukaj ogłoszeń..."
                placeholderTextColor={colors.mutedForeground}
                value={search}
                onChangeText={setSearch}
              />
            </View>

            {errorMsg && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>Błąd wczytywania: {errorMsg}</Text>
              </View>
            )}

            {availableFilters.length > 1 && (
              <FlatList
                horizontal
                data={availableFilters}
                keyExtractor={(f) => f.key}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRow}
                renderItem={({ item }) => {
                  const isActive = filter === item.key;
                  return (
                    <TouchableOpacity
                      style={[styles.filterChip, isActive && styles.filterChipActive]}
                      onPress={() => setFilter(item.key)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          isActive && styles.filterChipTextActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {announcements.length === 0
                ? 'Brak ogłoszeń.'
                : 'Brak ogłoszeń spełniających kryteria.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => <AnnouncementCard item={item} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: { padding: 16, paddingBottom: 32 },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 8,
    marginBottom: 20,
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: colors.foreground },
  headerSubtitle: { fontSize: 14, color: colors.mutedForeground, marginTop: 4 },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: { fontSize: 14, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: colors.foreground },

  errorBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 14,
  },
  errorText: { color: '#DC2626', fontSize: 13 },

  filterRow: { gap: 8, paddingBottom: 18 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radius['2xl'],
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: { fontSize: 13, fontWeight: '600', color: colors.mutedForeground },
  filterChipTextActive: { color: colors.primaryForeground },

  card: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: 14,
    marginBottom: 12,
    ...shadow.card,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconText: { fontSize: 18, fontWeight: '700' },
  cardBody: { flex: 1 },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  badgeLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  cardDate: { fontSize: 11, color: colors.mutedForeground },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  pinIcon: { fontSize: 12, marginRight: 4 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.foreground },
  cardDescription: { fontSize: 13, color: colors.mutedForeground, lineHeight: 18 },
  cardAuthor: { fontSize: 11, color: colors.mutedForeground, marginTop: 6, fontStyle: 'italic' },

  emptyState: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: colors.mutedForeground },
});