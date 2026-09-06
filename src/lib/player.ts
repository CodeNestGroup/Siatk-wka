import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const CURRENT_PLAYER_KEY = 'current_player_id';

export type Player = {
  id: string;
  full_name: string;
  email?: string;
  phone?: string | null;
  role?: string;
  role_id?: number | null;
  roles?: { name: string } | null;
  // Zgoda z Profilu: czy mecze, na które się zapisuje, mają trafiać do kalendarza telefonu.
  calendar_sync_enabled?: boolean;
};

// 1. Pobierz aktualnie zalogowanego gracza WYŁĄCZNIE na podstawie AsyncStorage
export async function getCurrentPlayer(): Promise<Player | null> {
  try {
    const savedPlayerId = await AsyncStorage.getItem(CURRENT_PLAYER_KEY);

    if (!savedPlayerId) {
      return null; // Nikt nie jest zalogowany
    }

    const { data, error } = await supabase
      .from('players')
      .select('*, roles:role_id ( name )')
      .eq('id', savedPlayerId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return data as Player;
  } catch (err) {
    console.error('Błąd podczas pobierania aktywnego gracza:', err);
    return null;
  }
}

// Admin widzi statusy płatności innych zawodników (patrz sekcja 4.1 instrukcji redesignu).
export function isAdminPlayer(player: Player | null): boolean {
  return player?.roles?.name === 'admin';
}

// 2. Funkcja do "logowania" – zapisuje ID wybranego gracza do AsyncStorage
export async function loginPlayer(playerId: string): Promise<boolean> {
  try {
    await AsyncStorage.setItem(CURRENT_PLAYER_KEY, playerId);
    return true;
  } catch (err) {
    console.error('Błąd zapisu sesji gracza:', err);
    return false;
  }
}

// 3. Wylogowanie – czyszczenie pamięci
export async function logoutPlayer(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CURRENT_PLAYER_KEY);
  } catch (err) {
    console.error('Błąd wylogowania:', err);
  }
}