import { supabase } from "@/lib/supabase"

// Wspólne "co już widziałem" dla dzwoneczka i kropek w bocznym pasku — wcześniej każdy
// z nich trzymał to osobno w localStorage ("volley_read_matches" itp.), więc telefon
// i komputer miały niezsynchronizowane liczniki, a wyczyszczenie danych przeglądarki
// cofało wszystko do "nieprzeczytane" (stąd np. "+40 znowu przy kolejnym logowaniu").
// Teraz to jeden wspólny stan w bazie, per gracz, więc każde urządzenie widzi to samo.

export async function fetchReadKeys(playerId: string): Promise<Set<string>> {
  if (!playerId) return new Set()
  const { data, error } = await supabase
    .from("notification_reads")
    .select("item_key")
    .eq("player_id", playerId)

  if (error) {
    console.error("Błąd pobierania przeczytanych powiadomień:", error.message)
    return new Set()
  }
  return new Set((data || []).map((r) => r.item_key))
}

export async function markKeysRead(playerId: string, itemKeys: string[]): Promise<void> {
  if (!playerId || itemKeys.length === 0) return
  await supabase
    .from("notification_reads")
    .upsert(
      itemKeys.map((item_key) => ({ player_id: playerId, item_key })),
      { onConflict: "player_id,item_key" }
    )
}
