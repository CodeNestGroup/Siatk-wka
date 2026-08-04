import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, shadow } from '@/constants/app-theme';
import { supabase } from '@/lib/supabase';
import { formatMatchDate, formatTime } from '@/lib/format';
import { getCurrentPlayer, Player } from '@/lib/player';

type MatchInfo = {
  id: string;
  title: string | null;
  date: string;
  time_start: string;
  time_end: string;
  location: string;
  price_per_player: number;
};

type MyRegistration = {
  id: string;
  status: string;
  is_paid: boolean;
  matches: MatchInfo | null;
};

function RegistrationCard({
  reg,
  onCancel,
  cancelling,
}: {
  reg: MyRegistration;
  onCancel: (registrationId: string) => void;
  cancelling: boolean;
}) {
  if (!reg.matches) return null;

  const { weekday, day, month } = formatMatchDate(reg.matches.date);
  const title = reg.matches.title?.trim() || 'Trening Siatkówki';

  return (
    <View style={styles.card}>
      <View style={styles.dateBox}>
        <Text style={styles.dateDay}>{day}</Text>
        <Text style={styles.dateMonth}>{month}</Text>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <Text style={styles.matchTitle} numberOfLines={1}>
            {title}
          </Text>
          <View
            style={[
              styles.badge,
              { backgroundColor: reg.status === 'waitlist' ? '#FEF3C7' : '#DCFCE7' },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                { color: reg.status === 'waitlist' ? '#D97706' : '#16A34A' },
              ]}
            >
              {reg.status === 'waitlist' ? 'Lista rezerwowa' : 'Zapisany'}
            </Text>
          </View>
        </View>

        <Text style={styles.weekday}>{weekday}</Text>
        <Text style={styles.location}>📍 {reg.matches.location}</Text>
        <Text style={styles.time}>
          🕒 {formatTime(reg.matches.time_start)} – {formatTime(reg.matches.time_end)}
        </Text>

        <View style={styles.footerRow}>
          <Text
            style={[
              styles.paymentStatus,
              { color: reg.is_paid ? '#16A34A' : colors.destructive },
            ]}
          >
            {reg.is_paid ? '✓ Opłacone' : '✕ Nieopłacone'}
          </Text>
          <Text style={styles.footerText}>{Number(reg.matches.price_per_player)} PLN</Text>
        </View>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => onCancel(reg.id)}
          disabled={cancelling}
        >
          <Text style={styles.cancelButtonText}>Wypisz się</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function MojeZapisyScreen() {
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [registrations, setRegistrations] = useState<MyRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const player = await getCurrentPlayer();
    setCurrentPlayer(player);

    if (!player) {
      setRegistrations([]);
      return;
    }

    const { data, error } = await supabase
      .from('match_registrations')
      .select(
        'id, status, is_paid, matches(id, title, date, time_start, time_end, location, price_per_player)'
      )
      .eq('player_id', player.id)
      .order('created_at', { ascending: false });

    if (error) {
      setErrorMsg(error.message);
    } else {
      setErrorMsg(null);
      setRegistrations((data as any) ?? []);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadData();
      setLoading(false);
    })();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCancel = (registrationId: string) => {
    Alert.alert('Wypisać się?', 'Na pewno chcesz wypisać się z tego meczu?', [
      { text: 'Anuluj', style: 'cancel' },
      {
        text: 'Wypisz się',
        style: 'destructive',
        onPress: async () => {
          setCancellingId(registrationId);
          const { error } = await supabase
            .from('match_registrations')
            .delete()
            .eq('id', registrationId);
          setCancellingId(null);

          if (error) {
            Alert.alert('Błąd', error.message);
            return;
          }
          await loadData();
        },
      },
    ]);
  };

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
        data={registrations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <View>
            <Text style={styles.headerTitle}>Moje zapisy</Text>
            <Text style={styles.headerSubtitle}>Mecze, na które się zapisałeś</Text>

            {errorMsg && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>Błąd wczytywania: {errorMsg}</Text>
              </View>
            )}

            {!currentPlayer && !loading && (
              <View style={styles.warnBox}>
                <Text style={styles.warnText}>Nie znaleziono Twojego profilu gracza.</Text>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Nie zapisałeś się jeszcze na żaden mecz.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <RegistrationCard
            reg={item}
            onCancel={handleCancel}
            cancelling={cancellingId === item.id}
          />
        )}
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

  headerTitle: { fontSize: 24, fontWeight: '700', color: colors.foreground, marginTop: 8 },
  headerSubtitle: { fontSize: 14, color: colors.mutedForeground, marginTop: 4, marginBottom: 16 },

  errorBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 14,
  },
  errorText: { color: '#DC2626', fontSize: 13 },

  warnBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 14,
  },
  warnText: { color: '#92400E', fontSize: 13 },

  card: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: 14,
    marginBottom: 12,
    ...shadow.card,
  },
  dateBox: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  dateDay: { fontSize: 20, fontWeight: '700', color: colors.accentForeground },
  dateMonth: { fontSize: 11, color: colors.accentForeground },

  cardBody: { flex: 1 },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
    gap: 8,
  },
  matchTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.foreground },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.sm },
  badgeText: { fontSize: 11, fontWeight: '700' },

  weekday: { fontSize: 12, color: colors.mutedForeground, marginBottom: 6, fontWeight: '600' },
  location: { fontSize: 13, color: colors.mutedForeground, marginBottom: 2 },
  time: { fontSize: 13, color: colors.mutedForeground, marginBottom: 8 },

  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    marginBottom: 10,
  },
  footerText: { fontSize: 12, color: colors.mutedForeground },
  paymentStatus: { fontSize: 12, fontWeight: '700' },

  cancelButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.destructive,
  },
  cancelButtonText: { color: colors.destructive, fontSize: 12, fontWeight: '700' },

  emptyState: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: colors.mutedForeground },
});