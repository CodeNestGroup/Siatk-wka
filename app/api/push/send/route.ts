/**
 * POST /api/push/send — wysyłka powiadomienia push do zapisanych urządzeń
 *
 * Co to jest: endpoint API (Next.js Route Handler) wysyłający prawdziwe powiadomienie systemowe
 * (Web Push, VAPID) do wszystkich zapisanych subskrypcji w tabeli `push_subscriptions`.
 * Eksportuje / robi: POST — czyta `title`/`body`/`url`/`excludePlayerId` z body i deleguje
 * faktyczną wysyłkę do `sendPushToAll` (lib/push-server.ts).
 * Używany przez: `lib/push.ts` (`notifyPush`) — wywoływane fire-and-forget po utworzeniu
 * meczu/ogłoszenia/wpłaty, z przeglądarki.
 * Uwagi: to jedyny endpoint wywoływany bezpośrednio z klienta; cron (przypomnienia o
 * meczu, app/api/cron/match-reminders/route.ts) woła `sendPushToAll` bezpośrednio,
 * bez przechodzenia przez ten route.
 */
import { NextResponse } from "next/server"
import { sendPushToAll } from "@/lib/push-server"

// Wywoływane przez appkę zaraz po utworzeniu meczu / ogłoszenia / wpłaty. Wysyła
// prawdziwe powiadomienie systemowe do KAŻDEGO zapisanego urządzenia — poza tymi
// należącymi do autora zmiany (`excludePlayerId`), żeby admin nie dostawał buczenia
// o rzeczy, którą właśnie sam dodał.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const title: string | undefined = body?.title
  const message: string | undefined = body?.body
  const url: string = body?.url || "/"
  const excludePlayerId: string | undefined = body?.excludePlayerId

  if (!title || !message) {
    return NextResponse.json({ error: "Brak tytułu lub treści powiadomienia" }, { status: 400 })
  }

  const { sent } = await sendPushToAll({ title, body: message, url, excludePlayerId })
  return NextResponse.json({ ok: true, sent })
}
