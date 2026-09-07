/**
 * GET /api/cron/mvp-vote-reminder — przypomnienie o głosowaniu na MVP po dzisiejszym meczu
 *
 * Co to jest: endpoint wywoływany raz dziennie wieczorem przez Vercel Cron (patrz
 * vercel.json), a nie przez przeglądarkę. Sprawdza, czy dziś (wg czasu Europe/Warsaw) był
 * jakiś nieodwołany mecz, i jeśli tak — wysyła push "Zagłosuj na MVP" tylko do graczy z
 * JEGO głównego składu (nie do rezerwy, nie do reszty klubu — patrz `wasInPlayingRoster`
 * w components/dashboard/match-detail.tsx, ta sama zasada co przy samym głosowaniu).
 * Eksportuje / robi: GET — liczy dzisiejszą datę w polskiej strefie czasowej, pobiera
 * dzisiejsze mecze wraz z ich zapisami (`match_registrations`, posortowane po `created_at`
 * — DOKŁADNIE ten sam sposób wyznaczania składu głównego co `mainRoster()` w lib/data.ts
 * i fetchowanie w app/page.tsx), bierze pierwszych `max_players` zapisanych jako główny
 * skład, i woła `sendPushToAll` z `onlyPlayerIds` ograniczonym do nich.
 * Używany przez: Vercel Cron (harmonogram w vercel.json) — nie jest wołany z appki.
 * Uwagi: Vercel Hobby pozwala na crony maks. raz dziennie o STAŁEJ porze (UTC), więc to
 * "wieczorne przypomnienie o dzisiejszym meczu", a nie precyzyjny wyzwalacz "dokładnie w
 * momencie końca meczu" — 20:00 UTC (~21-22 czasu polskiego, zależnie od czasu letniego)
 * wypada wystarczająco długo po typowej godzinie 19:00-21:00, żeby mecz już się skończył.
 * Link w powiadomieniu (`?match=<id>`) korzysta z deep-linku dodanego dla globalnej
 * wyszukiwarki (app/page.tsx) — klik od razu otwiera szczegóły tego meczu z kartą MVP.
 */
import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { isMatchCancelled } from "@/lib/data"
import { sendPushToAll } from "@/lib/push-server"

function todayInWarsaw(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw" }).format(new Date())
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const todayStr = todayInWarsaw()

  const { data: matches, error } = await supabase
    .from("matches")
    .select("id, date, location, max_players, status_id, matches_status(name)")
    .eq("date", todayStr)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const todaysMatches = (matches || []).filter((m) => !isMatchCancelled(m))

  if (todaysMatches.length === 0) {
    return NextResponse.json({ ok: true, matches: 0, sent: 0 })
  }

  const { data: allRegs } = await supabase
    .from("match_registrations")
    .select("match_id, player_id, created_at")
    .in("match_id", todaysMatches.map((m) => m.id))
    .order("created_at", { ascending: true })

  let totalSent = 0
  for (const match of todaysMatches) {
    const capacity = Number(match.max_players || 12)
    const rosterPlayerIds = (allRegs || [])
      .filter((r) => r.match_id === match.id)
      .slice(0, capacity)
      .map((r) => r.player_id)

    if (rosterPlayerIds.length === 0) continue

    const { sent } = await sendPushToAll({
      title: "Zagłosuj na MVP dzisiejszego meczu! 🏆",
      body: match.location ? `Kto błyszczał dziś w ${match.location}? Oddaj głos.` : "Kto dziś błyszczał? Oddaj głos.",
      url: `/?match=${match.id}`,
      onlyPlayerIds: rosterPlayerIds
    })
    totalSent += sent
  }

  return NextResponse.json({ ok: true, matches: todaysMatches.length, sent: totalSent })
}
