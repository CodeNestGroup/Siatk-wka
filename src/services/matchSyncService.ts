import { supabase } from '@/lib/supabase';
import { syncMatchNotifications } from './notificationService';

export async function refreshPlayerNotifications(playerId: string) {
  try {
    const { data: matchesData, error: matchesError } = await supabase.from('matches').select('*');
    if (matchesError || !matchesData) return;

    const { data: regsData } = await supabase
      .from('match_registrations')
      .select('match_id, player_id')
      .eq('player_id', playerId);

    const userRegistrations = regsData ?? [];

    const matchesWithRegistrationStatus = matchesData.map((match) => ({
      ...match,
      isRegistered: userRegistrations.some((r) => r.match_id === match.id),
    }));

    await syncMatchNotifications(matchesWithRegistrationStatus);
  } catch (error) {
    console.error('Błąd odświeżania powiadomień:', error);
  }
}