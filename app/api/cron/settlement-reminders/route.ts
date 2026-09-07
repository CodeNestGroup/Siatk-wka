/**
 * GET /api/cron/settlement-reminders — codzienne przypomnienie dla admina o nierozliczonych meczach
 *
 * Co to jest: endpoint wywoływany raz dziennie rano przez Vercel Cron (patrz vercel.json),
 * a nie przez przeglądarkę. Szuka WSZYSTKICH minionych, nieodwołanych meczów, których
 * admin nie kliknął "Zatwierdź i rozlicz" (is_settled = false), i wysyła jedno zbiorcze
 * przypomnienie — tylko do adminów, nie do wszystkich graczy.
 * Eksportuje / robi: GET — liczy dzisiejszą datę w Europe/Warsaw, pobiera mecze z datą
 * wcześniejszą, odfiltrowuje odwołane (`isMatchCancelled`) i już rozliczone, znajduje
 * adminów (`players.role_id === 1`) i woła `sendPushToAll` z `onlyPlayerIds` ograniczonym
 * do ich subskrypcji.
 * Używany przez: Vercel Cron (harmonogram w vercel.json) — nie jest wołany z appki.
 * Uwagi: celowo sprawdza WSZYSTKIE zaległe mecze, nie tylko wczorajszy — jeśli admin
 * przegapi jedno przypomnienie, dostanie kolejne następnego dnia, dopóki nie rozliczy.
 * Bez tego zaległości cicho by się piętrzyły (patrz uwaga w vercel.json o tym, że kod
 * już wcześniej znalazł kilka takich zapomnianych meczów w bazie).
 */
import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { isMatchCancelled } from "@/lib/data"
import { formatDatePL } from "@/lib/utils"
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
    .select("id, date, is_settled, status_id, matches_status(name)")
    .lt("date", todayStr)
    .order("date", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const unsettled = (matches || []).filter((m) => !m.is_settled && !isMatchCancelled(m))

  if (unsettled.length === 0) {
    return NextResponse.json({ ok: true, unsettled: 0, sent: 0 })
  }

  const { data: admins } = await supabase.from("players").select("id").eq("role_id", 1)
  const adminIds = (admins || []).map((a) => a.id)

  const dateList = unsettled.map((m) => formatDatePL(m.date)).join(", ")
  const title = unsettled.length === 1 ? "Nierozliczony mecz" : `Nierozliczone mecze (${unsettled.length})`
  const body = `${dateList} — kliknij "Zatwierdź i rozlicz" w szczegółach meczu`

  const { sent } = await sendPushToAll({
    title,
    body,
    url: "/",
    onlyPlayerIds: adminIds
  })

  return NextResponse.json({ ok: true, unsettled: unsettled.length, sent })
}
