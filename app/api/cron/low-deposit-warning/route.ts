/**
 * GET /api/cron/low-deposit-warning — przypomnienie "Twój depozyt się kończy"
 *
 * Co to jest: endpoint wywoływany raz dziennie rano przez Vercel Cron (patrz vercel.json),
 * a nie przez przeglądarkę. Sprawdza salda z `player_balances` (Nadpłaty Graczy — patrz
 * supabase/player-credit-ledger-migration.sql) i wysyła spersonalizowany push do każdego
 * gracza, którego depozyt jest DODATNI, ale niższy niż cena najbliższego meczu — czyli za
 * mało, żeby automatycznie pokryć kolejny zapis (handleJoinMatch w match-detail.tsx).
 * Eksportuje / robi: GET — ustala próg jako cenę najbliższego, nieodwołanego meczu (fallback
 * 25 zł, gdy żaden nie jest zaplanowany), pobiera `player_balances` z `0 < balance < próg`,
 * i dla każdego woła `sendPushToAll` z `onlyPlayerIds: [gracz]` (jeden, spersonalizowany push
 * na osobę — inni gracze nic nie dostają).
 * Używany przez: Vercel Cron (harmonogram w vercel.json) — nie jest wołany z appki.
 * Uwagi: celowo `balance > 0` (nie `>= 0`) — gracz z zerowym/wyczerpanym depozytem po prostu
 * wraca do płacenia gotówką na hali, to nie jest "kończący się" depozyt, tylko już skończony;
 * to osobna, mniej pilna sytuacja niż ta, którą łapie ten cron. Sprawdza się codziennie od
 * nowa, więc przypomnienie wraca, dopóki gracz nie doładuje (ta sama filozofia co
 * settlement-reminders — lepiej przypomnieć kilka razy niż zgubić przypomnienie na dobre).
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

  // Kilka najbliższych zamiast tylko jednego — żeby nie trafić przypadkiem na odwołany mecz
  // i zostać bez żadnej ceny odniesienia.
  const { data: upcomingMatches } = await supabase
    .from("matches")
    .select("price_per_player, status_id, matches_status(name)")
    .gte("date", todayStr)
    .order("date", { ascending: true })
    .limit(5)

  const nextMatch = (upcomingMatches || []).find((m) => !isMatchCancelled(m))
  const threshold = Number(nextMatch?.price_per_player) || 25

  const { data: lowBalances, error } = await supabase
    .from("player_balances")
    .select("id, name, balance")
    .gt("balance", 0)
    .lt("balance", threshold)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!lowBalances || lowBalances.length === 0) {
    return NextResponse.json({ ok: true, threshold, warned: 0, sent: 0 })
  }

  let totalSent = 0
  for (const player of lowBalances) {
    const balanceStr = Number(player.balance).toFixed(2).replace(/\.00$/, "")
    const { sent } = await sendPushToAll({
      title: "Twój depozyt się kończy",
      body: `Zostało Ci ${balanceStr} zł — dopłać w Ustawieniach, żeby kolejny zapis znów pokrył się automatycznie.`,
      url: "/settings",
      onlyPlayerIds: [player.id]
    })
    totalSent += sent
  }

  return NextResponse.json({ ok: true, threshold, warned: lowBalances.length, sent: totalSent })
}
