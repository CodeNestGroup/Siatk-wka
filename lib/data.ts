import { supabase } from './supabase'

export type PlayerStatus = "main" | "waitlist"

export type Player = {
  id: string
  name: string
  registeredAt: string
  paid: boolean
  fee: number
}

export type MatchStatus = "upcoming" | "past"

export type Match = {
  id: string
  date: string
  startTime: string
  endTime: string
  location: string
  capacity: number
  fee: number
  status: MatchStatus
  rating: number
  players: Player[]
  registrations?: any[]
}

// ------------------------------------------------------------------
// POBIERANIE DANYCH Z BAZY SUPABASE
// ------------------------------------------------------------------
export async function getMatches(): Promise<Match[]> {
  const { data: supabaseMatches, error } = await supabase
    .from('matches')
    .select(`
      id,
      date,
      time_start,
      time_end,
      location,
      max_players,
      price_per_player,
      match_registrations (
        is_paid,
        created_at,
        players (
          id,
          full_name
        )
      )
    `)
    .order('date', { ascending: false });

  if (error) {
    console.error("Błąd pobierania meczów:", error);
    return [];
  }

  // Dzisiejsza data do sprawdzania statusu (nadchodzący / przeszły)
  const today = new Date().toISOString().split('T')[0];

  return supabaseMatches.map((row: any) => {
    // 1. Mapowanie i sortowanie graczy (kto pierwszy ten lepszy)
    const mappedPlayers: Player[] = (row.match_registrations || [])
      .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map((reg: any) => {
        const dateObj = new Date(reg.created_at || Date.now());
        const hours = String(dateObj.getHours()).padStart(2, '0');
        const minutes = String(dateObj.getMinutes()).padStart(2, '0');

        return {
          id: reg.players?.id || "unknown",
          name: reg.players?.full_name || "Nieznany Gracz",
          registeredAt: `${hours}:${minutes}`,
          paid: reg.is_paid || false,
          fee: Number(row.price_per_player || 0)
        };
      });

    // 2. Formatowanie czasu (z HH:MM:SS na HH:MM)
    const startTime = row.time_start ? row.time_start.substring(0, 5) : "19:00";
    const endTime = row.time_end ? row.time_end.substring(0, 5) : "21:00";

    // 3. Status meczu
    const matchStatus: MatchStatus = row.date >= today ? "upcoming" : "past";

    return {
      id: row.id,
      date: row.date,
      startTime: startTime,
      endTime: endTime,
      location: row.location || "",
      capacity: row.max_players || 12,
      fee: Number(row.price_per_player || 0),
      status: matchStatus,
      rating: 0,
      players: mappedPlayers
    };
  });
}

// ------------------------------------------------------------------
// FUNKCJE POMOCNICZE (Zabezpieczone przed brakującymi polami)
// ------------------------------------------------------------------

export function mainRoster(match: Match): Player[] {
  const playersList = match.players || match.registrations || []
  return playersList.slice(0, match.capacity)
}

export function waitlist(match: Match): Player[] {
  const playersList = match.players || match.registrations || []
  return playersList.slice(match.capacity)
}

export function paidCount(match: Match): number {
  return mainRoster(match).filter((p: any) => p.paid || p.is_paid).length
}

export function collected(match: Match): number {
  return mainRoster(match)
    .filter((p: any) => p.paid || p.is_paid)
    .reduce((sum, p: any) => sum + (p.fee || match.fee || 0), 0)
}

export function expected(match: Match): number {
  return mainRoster(match).reduce((sum, p: any) => sum + (p.fee || match.fee || 0), 0)
}

export function formatDate(iso: string): string {
  if (!iso) return ""
  const d = new Date(iso + "T00:00:00")
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export function formatWeekday(iso: string): string {
  if (!iso) return ""
  const d = new Date(iso + "T00:00:00")
  return d.toLocaleDateString("en-GB", { weekday: "long" })
}

// Dodaj te funkcje na końcu pliku lib/data.ts

export async function getTransactions() {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('date', { ascending: false })

  if (error) {
    console.error("Błąd pobierania transakcji:", error)
    return []
  }
  return data || []
}

export async function getPlayerBalances() {
  const { data, error } = await supabase
    .from('player_balances')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    console.error("Błąd pobierania nadpłat:", error)
    return []
  }
  return data || []
}
