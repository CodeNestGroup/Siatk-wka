/**
 * GET /api/cron/match-reminders — codzienne przypomnienie push o dzisiejszych meczach
 *
 * Co to jest: endpoint wywoływany raz dziennie rano przez Vercel Cron (patrz vercel.json),
 * a nie przez przeglądarkę. Sprawdza, czy dziś (wg czasu Europe/Warsaw) jest jakiś
 * nieodwołany mecz, i jeśli tak — wysyła push "Dziś masz mecz!" do wszystkich urządzeń.
 * Eksportuje / robi: GET — liczy dzisiejszą datę w polskiej strefie czasowej (uwzględnia
 * czas letni/zimowy), pobiera mecze na tę datę, odfiltrowuje odwołane (`isMatchCancelled`),
 * i dla każdego pozostałego woła `sendPushToAll` z godziną i miejscem meczu w treści.
 * Używany przez: Vercel Cron (harmonogram w vercel.json) — nie jest wołany z appki.
 * Uwagi: Vercel Hobby pozwala na crony maks. raz dziennie (stąd "poranne przypomnienie
 * o dzisiejszym meczu", a nie precyzyjne "za 2h masz mecz"). Endpoint jest zabezpieczony
 * nagłówkiem `Authorization: Bearer $CRON_SECRET` — Vercel dołącza go automatycznie do
 * wywołań cronowych, gdy zmienna środowiskowa CRON_SECRET jest ustawiona w projekcie;
 * bez poprawnego sekretu ktokolwiek zgadujący ten URL mógłby masowo spamować graczy.
 */
import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { isMatchCancelled } from "@/lib/data"
import { sendPushToAll } from "@/lib/push-server"

// "Dziś" liczone w polskiej strefie czasowej, niezależnie od tego, o której godzinie
// UTC faktycznie odpala się serwer Vercel (i niezależnie od zmiany czasu lato/zima) —
// inaczej porównanie dat mogłoby się przesunąć o dzień w okolicach północy.
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
    .select("id, date, time_start, location, status_id, matches_status(name)")
    .eq("date", todayStr)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const todaysMatches = (matches || []).filter((m) => !isMatchCancelled(m))

  let totalSent = 0
  for (const match of todaysMatches) {
    const time = match.time_start ? String(match.time_start).slice(0, 5) : null
    const body = [time ? `Dziś o ${time}` : "Dziś", match.location].filter(Boolean).join(" • ")

    const { sent } = await sendPushToAll({
      title: "Dziś masz mecz! 🏐",
      body,
      url: "/"
    })
    totalSent += sent
  }

  return NextResponse.json({ ok: true, date: todayStr, matches: todaysMatches.length, sent: totalSent })
}
