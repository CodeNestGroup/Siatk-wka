import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, shadow } from '@/constants/app-theme';

type AnnouncementType = 'new' | 'cancelled' | 'info' | 'change';

type Announcement = {
  id: string;
  type: AnnouncementType;
  title: string;
  description: string;
  date: string;
};

const MOCK_ANNOUNCEMENTS: Announcement[] = [
  {
    id: '1',
    type: 'new',
    title: 'Nowy mecz dodany!',
    description: 'Sobota 18:00, Hala Sportowa ESCO Jaworze. Zapisy otwarte.',
    date: 'Dziś, 10:30',
  },
  {
    id: '2',
    type: 'cancelled',
    title: 'Mecz odwołany',
    description: 'Środowy trening o 19:00 odwołany z powodu braku hali.',
    date: 'Wczoraj, 14:00',
  },
  {
    id: '3',
    type: 'change',
    title: 'Zmiana godziny',
    description: 'Niedzielna gra przesunięta z 17:00 na 18:30.',
    date: '2 dni temu',
  },
  {
    id: '4',
    type: 'info',
    title: 'Nowy sponsor drużyny',
    description: 'Witamy AZ-Cloud Solutions jako partnera infrastruktury IT.',
    date: '3 dni temu',
  },
];

const TYPE_META: Record <
  AnnouncementType,
  { bg: string; fg: string; icon: string; label: string }
> = {
  new: { bg: '#DCFCE7', fg: '#16A34A', icon: '＋', label: 'Nowe' },
  cancelled: { bg: '#FEE2E2', fg: '#DC2626', icon: '✕', label: 'Odwołane' },
  change: { bg: '#FEF3C7', fg: '#D97706', icon: '↻', label: 'Zmiana' },
  info: { bg: '#E0E7FF', fg: colors.primary, icon: 'i', label: 'Info' },
};

const FILTERS: { key: 'all' | AnnouncementType; label: string }[] = [
  { key: 'all', label: 'Wszystkie' },
  { key: 'new', label: 'Nowe' },
  { key: 'cancelled', label: 'Odwołane' },
  { key: 'change', label: 'Zmiany' },
];

function AnnouncementCard({ item }: { item: Announcement }) {
  const meta = TYPE_META[item.type];
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.85}>
      <View style={[styles.iconCircle, { backgroundColor: meta.bg }]}>
        <Text style={[styles.iconText, { color: meta.fg }]}>{meta.icon}</Text>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <Text style={[styles.badgeLabel, { color: meta.fg }]}>{meta.label}</Text>
          <Text style={styles.cardDate}>{item.date}</Text>
        </View>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardDescription}>{item.description}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function AnnouncementsScreen() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | AnnouncementType>('all');

  const filtered = useMemo(() => {
    return MOCK_ANNOUNCEMENTS.filter((a) => {
      const matchesFilter = filter === 'all' || a.type === filter;
      const matchesSearch =
        search.trim() === '' ||
        a.title.toLowerCase().includes(search.toLowerCase()) ||
        a.description.toLowerCase().includes(search.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [search, filter]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.headerTitle}>Tablica ogłoszeń</Text>
                <Text style={styles.headerSubtitle}>Co się dzieje w Twojej grupie</Text>
              </View>
              <View style={styles.bellWrap}>
                <Text style={styles.bellIcon}>🔔</Text>
                <View style={styles.bellDot} />
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

            <FlatList
              horizontal
              data={FILTERS}
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
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Brak ogłoszeń spełniających kryteria.</Text>
          </View>
        }
        renderItem={({ item }) => <AnnouncementCard item={item} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
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

  bellWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  bellIcon: { fontSize: 18 },
  bellDot: {
    position: 'absolute',
    top: 8,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.destructive,
  },

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
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.foreground, marginBottom: 3 },
  cardDescription: { fontSize: 13, color: colors.mutedForeground, lineHeight: 18 },

  emptyState: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: colors.mutedForeground },
});