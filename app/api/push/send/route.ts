import { NextResponse } from "next/server"
import webpush from "web-push"
import { supabase } from "@/lib/supabase"

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

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

  let query = supabase.from("push_subscriptions").select("*")
  if (excludePlayerId) query = query.neq("player_id", excludePlayerId)
  const { data: subscriptions, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const payload = JSON.stringify({ title, body: message, url })
  const expiredEndpoints: string[] = []

  await Promise.all(
    (subscriptions || []).map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
      } catch (err: any) {
        // 404/410 = przeglądarka odrzuciła/wycofała subskrypcję (np. odinstalowano appkę) —
        // sprzątamy ją, żeby appka nie próbowała jej używać w kółko przy każdym kolejnym wysłaniu.
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          expiredEndpoints.push(sub.endpoint)
        }
      }
    })
  )

  if (expiredEndpoints.length > 0) {
    await supabase.from("push_subscriptions").delete().in("endpoint", expiredEndpoints)
  }

  return NextResponse.json({ ok: true, sent: (subscriptions || []).length - expiredEndpoints.length })
}
