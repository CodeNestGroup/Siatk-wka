/**
 * Wysyłka Web Push — logika serwerowa (współdzielona)
 *
 * Co to jest: pojedyncza funkcja `sendPushToAll`, która robi faktyczną wysyłkę przez
 * `web-push` do wszystkich zapisanych subskrypcji w `push_subscriptions`, czyszcząc
 * po drodze wygasłe subskrypcje (404/410).
 * Używany przez: app/api/push/send/route.ts (wywołanie z przeglądarki, fire-and-forget
 * po utworzeniu meczu/ogłoszenia/wpłaty) oraz app/api/cron/match-reminders/route.ts
 * (wywołanie z Vercel Cron, raz dziennie rano).
 * Uwagi: wydzielone z app/api/push/send/route.ts, żeby cron mógł wysyłać powiadomienia
 * bez robienia HTTP-fetcha do samego siebie (nie ma tam żądania przeglądarki, więc nie
 * ma naturalnego "origin" do zbudowania pełnego URL-a) — to zwykła funkcja w procesie.
 */
import webpush from "web-push"
import { supabase } from "@/lib/supabase"

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function sendPushToAll(payload: {
  title: string
  body: string
  url?: string
  excludePlayerId?: string
}): Promise<{ sent: number }> {
  let query = supabase.from("push_subscriptions").select("*")
  if (payload.excludePlayerId) query = query.neq("player_id", payload.excludePlayerId)
  const { data: subscriptions, error } = await query

  if (error || !subscriptions) return { sent: 0 }

  const message = JSON.stringify({ title: payload.title, body: payload.body, url: payload.url || "/" })
  const expiredEndpoints: string[] = []

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          message
        )
      } catch (err: any) {
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          expiredEndpoints.push(sub.endpoint)
        }
      }
    })
  )

  if (expiredEndpoints.length > 0) {
    await supabase.from("push_subscriptions").delete().in("endpoint", expiredEndpoints)
  }

  return { sent: subscriptions.length - expiredEndpoints.length }
}
