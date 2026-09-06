/**
 * POST/DELETE /api/push/subscribe — zapisywanie i usuwanie subskrypcji push
 *
 * Co to jest: endpoint API zarządzający subskrypcjami Web Push w tabeli `push_subscriptions`
 * (jeden rekord = jedno urządzenie/przeglądarka jednego gracza).
 * Eksportuje / robi: POST — zapisuje/aktualizuje subskrypcję (upsert po `endpoint`) dla danego
 * `playerId`; DELETE — usuwa subskrypcję po `endpoint` (np. przy wyłączeniu powiadomień).
 * Używany przez: `lib/push.ts` (`subscribeToPush`/`unsubscribeFromPush`), wywoływane z ustawień
 * powiadomień gracza w przeglądarce.
 * Uwagi: `endpoint` jest unikalny per przeglądarka, stąd upsert po nim — patrz komentarz niżej.
 */
import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

// Zapisuje (albo aktualizuje) subskrypcję Web Push jednego urządzenia/przeglądarki.
// `endpoint` jest unikalny per przeglądarka — upsert na nim pozwala temu samemu
// urządzeniu bezpiecznie "zasubskrybować się" wielokrotnie (np. po zalogowaniu na
// inne konto) bez duplikatów w bazie.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const playerId = body?.playerId
  const subscription = body?.subscription

  if (!playerId || !subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return NextResponse.json({ error: "Brak wymaganych danych subskrypcji" }, { status: 400 })
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        player_id: playerId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth
      },
      { onConflict: "endpoint" }
    )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

// Usunięcie subskrypcji tego urządzenia (np. gdy użytkownik wyłącza powiadomienia).
export async function DELETE(request: Request) {
  const body = await request.json().catch(() => null)
  const endpoint = body?.endpoint

  if (!endpoint) {
    return NextResponse.json({ error: "Brak endpointu" }, { status: 400 })
  }

  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint)
  return NextResponse.json({ ok: true })
}
