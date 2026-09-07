/**
 * Dane meczów i graczy — typy + pobieranie z Supabase + funkcje pomocnicze
 *
 * Co to jest: centralny moduł danych domenowych apki — definiuje typy Match/Player i dostarcza
 * zarówno pobieranie danych z bazy (mecze, transakcje, salda graczy), jak i czyste funkcje
 * pomocnicze liczące roster/listę rezerwową/płatności na podstawie tych typów.
 * Eksportuje / robi: getMatches (pobiera mecze wraz z zapisami i graczami z Supabase i mapuje je
 * na typ Match), getTransactions, getPlayerBalances oraz funkcje pomocnicze: isMatchCancelled,
 * mainRoster, waitlist, paidCount, collected, expected, formatDate, formatWeekday.
 * Używany przez: praktycznie wszystkie widoki związane z meczami, składem, płatnościami i
 * finansami (dashboard, lista meczów, szczegóły meczu, panel admina).
 * Uwagi: funkcje pomocnicze są napisane defensywnie (obsługują zarówno `match.players`, jak i
 * starsze `match.registrations`, oraz zarówno `p.paid`, jak i `p.is_paid`) — patrz komentarze
 * przy poszczególnych funkcjach.
 */
import { supabase } from './supabase'

export type PlayerStatus = "main" | "waitlist"

export type Player = {
  id: string
  name: string
  registeredAt: string
  paid: boolean
  fee: number
  // Opłacone z depozytu (Nadpłaty Graczy) zamiast świeżą gotówką za ten konkretny mecz —
  // patrz supabase/player-credit-ledger-migration.sql i handleJoinMatch w match-detail.tsx.
  paid_from_credit?: boolean
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
  // Pola surowego wiersza Supabase (snake_case) — obok mapowanych camelCase wyżej. app/page.tsx
  // i match-detail.tsx pracują bezpośrednio na wyniku `.select("*")`, nie na obiekcie z
  // getMatches() poniżej, więc oba kształty współistnieją w tym samym typie.
  title?: string
  time_start?: string
  time_end?: string
  max_players?: number
  price_per_player?: number
}

// ------------------------------------------------------------------
// POBIERANIE DANYCH Z BAZY SUPABASE
// ------------------------------------------------------------------
// Pobiera wszystkie mecze wraz z zapisami i danymi graczy, mapuje surowy wynik Supabase na typ
// Match (dolicza status upcoming/past, sortuje graczy wg kolejności zapisu). Zwraca pustą
// tablicę przy błędzie zapytania.
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

// Wspólna reguła "czy mecz jest odwołany" — używana zarówno w liście meczów, jak i w
// szczegółach meczu, żeby te dwa miejsca nigdy sobie nie przeczyły. `status_id === 4` nie
// zawsze wystarcza (nie każdy rekord ma ustawione id w tym samym schemacie), więc dorzucamy
// fallback po nazwie statusu z joina `matches_status`.
export function isMatchCancelled(m: any): boolean {
  return m.status_id === 4 || !!m.matches_status?.name?.toLowerCase().includes("odwoł")
}

// Pierwszych `capacity` zapisanych graczy — właściwy skład meczu.
export function mainRoster(match: Match): Player[] {
  const playersList = match.players || match.registrations || []
  return playersList.slice(0, match.capacity)
}

// Gracze zapisani po wyczerpaniu miejsc (powyżej `capacity`) — lista rezerwowa.
export function waitlist(match: Match): Player[] {
  const playersList = match.players || match.registrations || []
  return playersList.slice(match.capacity)
}

// Liczba graczy z głównego składu, którzy już zapłacili.
export function paidCount(match: Match): number {
  return mainRoster(match).filter((p: any) => p.paid || p.is_paid).length
}

// Suma wpłat już zebranych od graczy z głównego składu (per gracz liczy jego `fee`,
// z fallbackiem na stawkę meczu, gdy gracz nie ma własnej).
export function collected(match: Match): number {
  return mainRoster(match)
    .filter((p: any) => p.paid || p.is_paid)
    .reduce((sum, p: any) => sum + (p.fee || match.fee || 0), 0)
}

// Suma wpłat oczekiwanych od CAŁEGO głównego składu (niezależnie od tego, czy już zapłacili).
export function expected(match: Match): number {
  return mainRoster(match).reduce((sum, p: any) => sum + (p.fee || match.fee || 0), 0)
}

// Formatuje datę ISO (rrrr-mm-dd) na czytelny format "dd Mon rrrr" (np. "05 Sep 2026").
export function formatDate(iso: string): string {
  if (!iso) return ""
  const d = new Date(iso + "T00:00:00")
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

// Zwraca nazwę dnia tygodnia (pełną, po angielsku) dla podanej daty ISO.
export function formatWeekday(iso: string): string {
  if (!iso) return ""
  const d = new Date(iso + "T00:00:00")
  return d.toLocaleDateString("en-GB", { weekday: "long" })
}

// Dodaj te funkcje na końcu pliku lib/data.ts

// Pobiera wszystkie transakcje z bazy (najnowsze pierwsze). Zwraca pustą tablicę przy błędzie.
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

// Pobiera salda/nadpłaty graczy z widoku `player_balances`, posortowane alfabetycznie
// po imieniu. Zwraca pustą tablicę przy błędzie.
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

// Sezon bez `closed_at` to ten obecnie trwający — dokładnie jeden taki na raz w normalnym
// użyciu appki (patrz supabase/seasons-migration.sql). Nowe mecze (handleCreateMatch w
// app/page.tsx) dostają jego id automatycznie, żeby trafiły do właściwego okresu bez
// ręcznego wyboru sezonu przy każdym tworzeniu meczu. `null`, gdy sezonów jeszcze nie ma
// (migracja nieuruchomiona) — wywołujący ma wtedy po prostu tworzyć mecz bez `season_id`.
export async function getActiveSeasonId(): Promise<string | null> {
  const { data } = await supabase
    .from('seasons')
    .select('id')
    .is('closed_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data?.id || null
}
