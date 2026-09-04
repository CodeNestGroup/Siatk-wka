"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Space_Grotesk, Oswald } from "next/font/google"
import {
  BarChart3,
  Trophy,
  Users,
  Calendar,
  Crown,
  Percent,
  Search,
  X,
  Coffee,
  Medal,
  ChevronDown
} from "lucide-react"
import { Sidebar } from "@/components/dashboard/sidebar"
import { NotificationsBell, type NotificationItem } from "@/components/dashboard/notifications-bell"
import { SupportModal } from "@/components/dashboard/support-modal"
import { supabase } from "@/lib/supabase"
import { cn, normalizeSearchText, fuzzySearchMatch } from "@/lib/utils"

// ────────────────────────────────────────────────────────────────
// Te same tokeny co reszta dashboardu ("Under the Lights")
// ────────────────────────────────────────────────────────────────
const display = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"] })
const score = Oswald({ subsets: ["latin"], weight: ["500", "600", "700"] })

const INK = "#0B1120"
const INK_SOFT = "#121B33"
const COBALT = "#2C4BFF"
const YELLOW = "#FFD23F"
const MINT = "#00C48C"
const VIOLET = "#7A5CFF"
const SILVER = "#94A3B8"
const BRONZE = "#C97C3D"

const netPattern: React.CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 16px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 16px)"
}

// Jedyny realny sponsor na dziś to ESCO — reszta to świadomie oznaczone wolne miejsca
// (ten sam zestaw co w Finansach — patrz app/finances/page.tsx).
const sponsors: { code: string; name: string; color: string; logo?: string }[] = [
  { code: "ESCO", name: "ESCO Jaworze", color: "#FF5A5F", logo: "/logos/esco.png" },
  { code: "+", name: "Zostań Sponsorem", color: COBALT },
  { code: "+", name: "Zostań Sponsorem", color: MINT },
  { code: "+", name: "Zostań Sponsorem", color: YELLOW },
]

// Płynne podliczanie liczb — ten sam komponent co na pozostałych stronach
function CountUp({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const [displayValue, setDisplayValue] = useState(value)
  const prevValue = useRef(value)

  useEffect(() => {
    const from = prevValue.current
    const to = value
    if (from === to) return

    // Karta otwarta w tle (np. inna zakładka aktywna) nigdy nie odpala requestAnimationFrame —
    // bez tego licznik zamrażałby się na starej wartości w nieskończoność zamiast pokazać prawdziwą,
    // już załadowaną liczbę.
    if (document.hidden) {
      setDisplayValue(to)
      prevValue.current = to
      return
    }

    const duration = 700
    const start = performance.now()
    let raf: number

    function tick(now: number) {
      const progress = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayValue(from + (to - from) * eased)
      if (progress < 1) raf = requestAnimationFrame(tick)
      else prevValue.current = to
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])

  return <>{displayValue.toFixed(decimals)}</>
}

export default function StatsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [showAllStats, setShowAllStats] = useState(false)
  useEffect(() => {
    setShowAllStats(false)
  }, [searchTerm])
  const [isLoading, setIsLoading] = useState(true)
  const [showSupportModal, setShowSupportModal] = useState(false)

  const [matches, setMatches] = useState<any[]>([])
  const [players, setPlayers] = useState<any[]>([])

  useEffect(() => {
    const localUser = localStorage.getItem("volley_user")
    if (localUser) {
      setUser(JSON.parse(localUser))
    } else {
      setUser(null)
    }

    loadStatsData()
  }, [])

  // Poprawione pobieranie z bazy uwzględniające relacje w Supabase (match_registrations)
  async function loadStatsData() {
    setIsLoading(true)

    // Jawna lista kolumn dla graczy zamiast "*" — celowo pomija `password`. Patrz supabase/harden-anon-access.sql.
    const [{ data: matchesData }, { data: playersData }, { data: registrationsData }] = await Promise.all([
      supabase.from("matches").select("*"),
      supabase.from("players").select("id, full_name, email, phone, created_at, notif_announcements, notif_match_reminders, role_id, player_status_id, is_core_roster, core_order, core_added_at"),
      supabase.from("match_registrations").select("*")
    ])

    // Doklejamy zarejestrowanych graczy z nowej tabeli do każdego meczu, żeby statystyki widziały obecność i wpłaty
    const processedMatches = (matchesData || []).map((match: any) => {
      const matchRegs = (registrationsData || []).filter((r: any) => r.match_id === match.id)
      const matchPlayers = matchRegs.map((reg: any) => {
        const foundPlayer = (playersData || []).find((p: any) => p.id === reg.player_id)
        return {
          id: reg.player_id,
          name: foundPlayer?.full_name || "Zawodnik",
          full_name: foundPlayer?.full_name || "Zawodnik",
          paid: reg.is_paid || reg.paid
        }
      })

      return {
        ...match,
        players: matchPlayers.length > 0 ? matchPlayers : (match.players || [])
      }
    })

    setMatches(processedMatches)
    setPlayers(playersData || [])
    setIsLoading(false)
  }

  async function handleLogout() {
    localStorage.removeItem("volley_user")
    sessionStorage.clear()
    await supabase.auth.signOut()
    setUser(null)
    window.location.href = "/login"
  }

  // Zliczanie statystyk z meczów rozegranych — ta sama definicja "rozegrany" co na stronie
  // głównej (app/page.tsx: isMatchPast). Samo `status_id === 3`/`is_settled` nie wystarczało:
  // admin rzadko ręcznie oznacza mecz jako rozegrany/rozliczony, więc realnie o tym decyduje
  // data. Bez tego Statystyki pokazywały "sezon się nie zaczął" mimo 11 realnie odbytych meczów
  // widocznych na stronie głównej — dwie strony liczyły to samo pojęcie inaczej.
  const todayStr = new Date().toISOString().split("T")[0]
  const completedMatches = useMemo(() => {
    return matches.filter(m => {
      if (m.status_id === 4) return false // odwołany
      return m.date < todayStr || m.status_id === 3 || m.is_settled === true
    })
  }, [matches, todayStr])

  const totalMatches = completedMatches.length

  const playerStats = useMemo(() => {
    const statsMap: Record<string, { name: string; matches: number; paidCount: number; unpaidCount: number }> = {}

    players.forEach((p) => {
      const pName = p.full_name || p.name
      if (pName && !pName.toLowerCase().includes("główny admin")) {
        statsMap[pName] = { name: pName, matches: 0, paidCount: 0, unpaidCount: 0 }
      }
    })

    completedMatches.forEach((m) => {
      if (Array.isArray(m.players)) {
        m.players.forEach((p: any) => {
          const pName = p.name || p.full_name
          if (!pName || pName.toLowerCase().includes("główny admin")) return

          if (!statsMap[pName]) {
            statsMap[pName] = { name: pName, matches: 0, paidCount: 0, unpaidCount: 0 }
          }

          statsMap[pName].matches += 1
          if (p.paid || p.is_paid) {
            statsMap[pName].paidCount += 1
          } else {
            statsMap[pName].unpaidCount += 1
          }
        })
      }
    })

    return Object.values(statsMap).sort((a, b) => b.matches - a.matches)
  }, [completedMatches, players])

  const topPlayer = playerStats[0] || { name: "Brak danych", matches: 0 }
  const podium = playerStats.slice(0, 3)

  // Własna karta zawodnika nad tabelą — bez niej jedyny sposób sprawdzenia "jak sobie radzę"
  // to szukanie siebie wzrokiem w rankingu. Ta sama reguła dopasowania co podświetlenie
  // wiersza w tabeli niżej (po id, potem po pełnym imieniu, potem po nazwie z localStorage).
  const myStats = useMemo(() => {
    if (!user) return null
    return (
      playerStats.find(
        (p) =>
          user?.id === p.name ||
          user?.full_name?.toLowerCase() === p.name.toLowerCase() ||
          user?.name?.toLowerCase() === p.name.toLowerCase()
      ) || null
    )
  }, [playerStats, user])
  const myRank = myStats ? playerStats.findIndex((p) => p.name === myStats.name) + 1 : null
  const myParticipationRate = myStats && totalMatches > 0 ? Math.round((myStats.matches / totalMatches) * 100) : 0

  const totalRosterEntries = completedMatches.reduce((acc, m) => acc + (Array.isArray(m.players) ? m.players.length : 0), 0)
  const avgAttendance = totalMatches > 0 ? (totalRosterEntries / totalMatches) : 0

  const totalPaidEntries = completedMatches.reduce((acc, m) => {
    if (Array.isArray(m.players)) {
      return acc + m.players.filter((p: any) => p.paid || p.is_paid).length
    }
    return acc
  }, 0)
  const paymentRate = totalRosterEntries > 0 ? Math.round((totalPaidEntries / totalRosterEntries) * 100) : 0

  const filteredPlayerStats = playerStats.filter((p) =>
    fuzzySearchMatch(normalizeSearchText(p.name).split(/[^a-z0-9]+/).filter(Boolean), searchTerm)
  )

  // Skrócony ranking na mobile — miejsca 15-30 to niska wartość informacyjna przy
  // pierwszym wejściu, a lista jest już posortowana malejąco, więc obcięcie to nadal
  // realna czołówka, nie przypadkowy fragment.
  const STATS_PREVIEW_LIMIT = 8
  const isStatsListTruncated = !searchTerm && filteredPlayerStats.length > STATS_PREVIEW_LIMIT
  const visiblePlayerStats = isStatsListTruncated && !showAllStats ? filteredPlayerStats.slice(0, STATS_PREVIEW_LIMIT) : filteredPlayerStats

  if (!user) return null

  return (
    <div className="flex min-h-screen bg-[#F5F6FA] text-[#14181F]">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
        onLogout={handleLogout}
      />

      <div className="relative flex min-w-0 flex-1 flex-col">
        <div
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            background:
              "radial-gradient(640px circle at 10% -8%, rgba(44,75,255,0.07), transparent 60%), radial-gradient(520px circle at 92% 16%, rgba(255,210,63,0.10), transparent 55%), radial-gradient(760px circle at 45% 100%, rgba(0,196,140,0.05), transparent 60%)"
          }}
        />

        {/* Ustandaryzowany górny pasek ze sponsorami i dzwoneczkiem */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/80 bg-white/80 pl-16 pr-6 py-3.5 lg:px-6 backdrop-blur-md">
          <style jsx>{`
            @keyframes marquee { 0% { transform: translateX(0%); } 100% { transform: translateX(-50%); } }
            .animate-marquee { display: flex; width: max-content; animation: marquee 30s linear infinite; }
            .animate-marquee:hover { animation-play-state: paused; }
          `}</style>
          <div className="flex-1 overflow-hidden">
            <div className="animate-marquee gap-8 flex items-center">
              {[...sponsors, ...sponsors].map((s, index) => (
                <div key={index} className="flex items-center gap-2 shrink-0">
                  {s.logo ? (
                    <img src={s.logo} alt={s.name} className="h-6 w-6 rounded-lg object-contain" />
                  ) : (
                    <span
                      className="flex h-6 w-6 items-center justify-center rounded-lg font-black text-[9px] text-white"
                      style={{ background: s.color }}
                    >
                      {s.code}
                    </span>
                  )}
                  <span className="text-xs font-extrabold text-slate-500">{s.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 ml-6">
            <button
              onClick={() => setShowSupportModal(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFD23F]/90 text-[#0B1120] shadow-sm cursor-pointer active:scale-90 transition-transform"
              title="Postaw kawę"
            >
              <Coffee className="h-4 w-4" />
            </button>
            <NotificationsBell
              playerId={user?.id}
              onNotificationClick={(notif: NotificationItem) => {}}
            />
          </div>
        </header>

        <main className="relative z-10 mx-auto w-full max-w-7xl flex-1 space-y-8 px-6 py-8 pb-24 lg:pb-8">

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#2C4BFF] border border-slate-200 shadow-xs">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <h1 className={cn(display.className, "text-xl font-bold text-slate-900 tracking-tight")}>Statystyki Zespołu</h1>
                <p className="text-xs font-medium text-slate-500">Podsumowanie występów, frekwencji i terminowości wpłat w obecnym sezonie.</p>
              </div>
            </div>
          </div>

          {/* HERO — lider frekwencji + podium TOP 3, w stylu głównego dashboardu.
              Dopóki nie ma ani jednego rozegranego meczu, podium z samymi zerami wyglądało
              jak zepsuta strona ("zwycięzca" z 0 meczami) — zamiast tego spokojny placeholder. */}
          {totalMatches > 0 ? (
            <div
              className="relative overflow-hidden rounded-[28px] p-6 sm:p-8 text-white shadow-[0_24px_60px_-24px_rgba(11,17,32,0.55)] border border-white/10 animate-in fade-in slide-in-from-top-3 duration-500 fill-mode-both"
              style={{ background: `linear-gradient(135deg, ${INK} 0%, ${INK_SOFT} 55%, #16204a 100%)` }}
            >
              <div className="absolute inset-0 pointer-events-none opacity-70" style={netPattern} />
              <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#FFD23F]/15 blur-3xl pointer-events-none" />
              <div className="absolute -left-20 -bottom-20 h-72 w-72 rounded-full bg-[#2C4BFF]/15 blur-3xl pointer-events-none" />

              <div className="relative z-10 space-y-6">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFD23F]/20 border border-[#FFD23F]/40 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#FFD23F]">
                    <Crown className="h-3 w-3" />
                    Lider Frekwencji Sezonu
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FFD23F]/15 border border-[#FFD23F]/30 text-[#FFD23F] shrink-0">
                    <Trophy className="h-8 w-8" />
                  </div>
                  <div className="min-w-0">
                    <h2 className={cn(display.className, "text-3xl font-bold text-white truncate")}>{topPlayer.name}</h2>
                    <p className="text-sm text-slate-300 font-medium mt-0.5">{topPlayer.matches} rozegranych meczów w tym sezonie</p>
                  </div>
                </div>

                {podium.length > 1 && (
                  <div className="flex items-end gap-3 pt-2 border-t border-white/10">
                    {[podium[1], podium[0], podium[2]].filter(Boolean).map((p, i) => {
                      // środkowa pozycja (i===1) to zawsze #1 — klasyczny układ podium
                      const place = i === 1 ? 1 : i === 0 ? 2 : 3
                      const color = place === 1 ? YELLOW : place === 2 ? SILVER : BRONZE
                      const height = place === 1 ? "h-20" : place === 2 ? "h-14" : "h-10"
                      return (
                        <div key={p.name} className="flex-1 flex flex-col items-center gap-1.5 pt-3">
                          <span
                            className={cn(score.className, "flex h-8 w-8 items-center justify-center rounded-xl text-xs font-semibold text-[#0B1120] shrink-0")}
                            style={{ background: color }}
                          >
                            {place}
                          </span>
                          <p className="text-[11px] font-bold text-white truncate max-w-full px-1">{p.name}</p>
                          <p className="text-[10px] text-slate-400">{p.matches} mecze</p>
                          <div className={cn("w-full rounded-t-lg mt-1", height)} style={{ background: `${color}30`, borderTop: `2px solid ${color}` }} />
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div
              className="relative overflow-hidden rounded-[28px] p-6 sm:p-8 text-white shadow-[0_24px_60px_-24px_rgba(11,17,32,0.55)] border border-white/10 animate-in fade-in slide-in-from-top-3 duration-500 fill-mode-both"
              style={{ background: `linear-gradient(135deg, ${INK} 0%, ${INK_SOFT} 55%, #16204a 100%)` }}
            >
              <div className="absolute inset-0 pointer-events-none opacity-70" style={netPattern} />
              <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#2C4BFF]/15 blur-3xl pointer-events-none" />

              <div className="relative z-10 flex flex-col items-center gap-3 py-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 border border-white/15 text-slate-300">
                  <Trophy className="h-7 w-7" />
                </div>
                <h2 className={cn(display.className, "text-xl font-bold text-white")}>Sezon jeszcze się nie zaczął</h2>
                <p className="text-sm text-slate-400 font-medium max-w-sm">
                  Statystyki, lider frekwencji i podium pojawią się tutaj automatycznie po pierwszym rozegranym meczu.
                </p>
              </div>
            </div>
          )}

          {/* Twoja karta — jedyne miejsce na stronie mówiące wprost "jak Ty sobie radzisz",
              zamiast zmuszania do szukania siebie w tabeli rankingu niżej. */}
          {myStats && totalMatches > 0 && (
            <div className="flex items-center gap-4 rounded-[24px] border border-[#2C4BFF]/25 bg-[#2C4BFF]/[0.05] p-4 sm:p-5 animate-in fade-in slide-in-from-top-2 duration-500 fill-mode-both">
              <div className={cn(score.className, "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#2C4BFF] text-sm font-semibold text-white shadow-md shadow-[#2C4BFF]/30")}>
                #{myRank}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900">Twoja frekwencja w tym sezonie</p>
                <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                  {myStats.matches} z {totalMatches} meczów ({myParticipationRate}%) • {myStats.paidCount}/{myStats.matches} opłaconych • #{myRank} w rankingu
                </p>
              </div>
            </div>
          )}

          {/* Kafelki Podsumowania */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-[24px] border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#2C4BFF]">Rozegrane Sesje</p>
                <h3 className={cn(score.className, "mt-1 text-xl font-semibold text-slate-900 tabular-nums")}><CountUp value={totalMatches} /> Meczów</h3>
                <p className="mt-0.5 text-[11px] font-medium text-slate-400">Rozliczone w sezonie</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2C4BFF]/10 text-[#2C4BFF] border border-[#2C4BFF]/20 shrink-0">
                <Calendar className="h-6 w-6" />
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#7A5CFF]">Średnia Frekwencja</p>
                <h3 className={cn(score.className, "mt-1 text-xl font-semibold text-slate-900 tabular-nums")}><CountUp value={avgAttendance} decimals={1} /> / 12</h3>
                <p className="mt-0.5 text-[11px] font-medium text-slate-400">Graczy na mecz</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#7A5CFF]/10 text-[#7A5CFF] border border-[#7A5CFF]/20 shrink-0">
                <Users className="h-6 w-6" />
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#00875F]">Wpłacalność Składek</p>
                <h3 className={cn(score.className, "mt-1 text-xl font-semibold text-slate-900 tabular-nums")}><CountUp value={paymentRate} />%</h3>
                <p className="mt-0.5 text-[11px] font-medium text-slate-400">Terminowe uregulowania</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#00C48C]/10 text-[#00875F] border border-[#00C48C]/20 shrink-0">
                <Percent className="h-6 w-6" />
              </div>
            </div>
          </div>

          {/* TABELA LEADERBOARDU */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-[24px] border border-slate-200/90 shadow-xs">
              <h2 className={cn(display.className, "text-sm font-bold text-slate-900 flex items-center gap-2")}>
                <Trophy className="h-4 w-4 text-[#FFD23F]" />
                Ranking Aktywności i Występów Zawodników
              </h2>

              <div className="relative max-w-xs w-full">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Szukaj gracza w rankingu…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-2 pl-10 pr-9 text-xs font-medium outline-none focus:border-[#2C4BFF] focus:ring-2 focus:ring-[#2C4BFF]/20 focus:bg-white transition-all"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200/90 bg-white overflow-hidden shadow-xs">
              {isLoading ? (
                <div className="p-4 space-y-2">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4 rounded-2xl border border-slate-100 p-4 animate-pulse" style={{ animationDelay: `${i * 100}ms` }}>
                      <div className="h-8 w-8 shrink-0 rounded-xl bg-slate-100" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3.5 w-40 rounded-md bg-slate-100" />
                        <div className="h-3 w-24 rounded-md bg-slate-100" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredPlayerStats.length === 0 ? (
                <div className="flex flex-col items-center gap-3 p-12 text-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                    <Search className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-semibold text-slate-500">
                    {searchTerm ? `Brak wyników dla „${searchTerm}”.` : "Brak statystyk do wyświetlenia."}
                  </p>
                </div>
              ) : (
                <>
                  {/* Tabela — od md w górę */}
                  <div className="hidden md:block overflow-x-auto animate-in fade-in duration-300">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-100 bg-slate-50/80 text-slate-400 uppercase text-[10px] font-extrabold tracking-wider">
                        <tr>
                          <th className="p-4">Miejsce</th>
                          <th className="p-4">Zawodnik</th>
                          <th className="p-4 text-center">Rozegrane mecze</th>
                          <th className="p-4 text-center">Wskaźnik udziału</th>
                          <th className="p-4 text-right">Opłacone mecze</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {filteredPlayerStats.map((p, idx) => {
                          const participationRate = totalMatches > 0 ? Math.round((p.matches / totalMatches) * 100) : 0
                          const isTop3 = idx < 3
                          const medalColor = idx === 0 ? YELLOW : idx === 1 ? SILVER : BRONZE

                          const isCurrentUser =
                            user?.id === p.name ||
                            user?.full_name?.toLowerCase() === p.name.toLowerCase() ||
                            user?.name?.toLowerCase() === p.name.toLowerCase()

                          return (
                            <tr key={p.name} className={cn("transition-colors", isCurrentUser ? "bg-[#2C4BFF]/[0.05] font-semibold" : "hover:bg-slate-50/80")}>
                              <td className="p-4 font-black">
                                {isTop3 ? (
                                  <span className="inline-flex items-center gap-1" style={{ color: medalColor }}>
                                    <Medal className="h-4 w-4" /> #{idx + 1}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">#{idx + 1}</span>
                                )}
                              </td>

                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <span className={cn(
                                    "flex h-8 w-8 items-center justify-center rounded-xl font-black text-xs border",
                                    isCurrentUser ? "bg-[#2C4BFF] text-white border-[#2C4BFF] shadow-xs" : isTop3 ? "border-transparent text-[#0B1120]" : "bg-slate-100 text-slate-500 border-slate-200/60"
                                  )}
                                  style={isTop3 && !isCurrentUser ? { background: medalColor } : undefined}
                                  >
                                    {p.name.charAt(0).toUpperCase()}
                                  </span>
                                  <span className={cn("font-bold", isCurrentUser ? "text-[#2C4BFF] font-extrabold" : "text-slate-900")}>
                                    {p.name} {isCurrentUser && <span className="ml-1 rounded-md bg-[#2C4BFF]/10 px-1.5 py-0.5 text-[9px] font-black uppercase text-[#2C4BFF]">(Ty)</span>}
                                  </span>
                                </div>
                              </td>

                              <td className="p-4 text-center font-black text-sm text-slate-900">
                                {p.matches}
                              </td>

                              <td className="p-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/50">
                                    <div
                                      className="h-full rounded-full transition-all duration-500"
                                      style={{ width: `${participationRate}%`, background: `linear-gradient(90deg, ${COBALT}, ${YELLOW})` }}
                                    />
                                  </div>
                                  <span className="font-bold text-[11px] text-slate-500">{participationRate}%</span>
                                </div>
                              </td>

                              <td className="p-4 text-right font-black text-[#00875F]">
                                {p.paidCount} / {p.matches}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Karty — poniżej md, żeby uniknąć poziomego scrolla tabeli */}
                  <div className="md:hidden divide-y divide-slate-100">
                    {visiblePlayerStats.map((p, idx) => {
                      const participationRate = totalMatches > 0 ? Math.round((p.matches / totalMatches) * 100) : 0
                      const isTop3 = idx < 3
                      const medalColor = idx === 0 ? YELLOW : idx === 1 ? SILVER : BRONZE
                      const isCurrentUser =
                        user?.id === p.name ||
                        user?.full_name?.toLowerCase() === p.name.toLowerCase() ||
                        user?.name?.toLowerCase() === p.name.toLowerCase()

                      return (
                        <div key={p.name} className={cn("p-4 space-y-2.5", isCurrentUser && "bg-[#2C4BFF]/[0.05]")}>
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <span
                                className={cn(
                                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-black text-xs border",
                                  isCurrentUser ? "bg-[#2C4BFF] text-white border-[#2C4BFF]" : isTop3 ? "border-transparent text-[#0B1120]" : "bg-slate-100 text-slate-500 border-slate-200/60"
                                )}
                                style={isTop3 && !isCurrentUser ? { background: medalColor } : undefined}
                              >
                                {p.name.charAt(0).toUpperCase()}
                              </span>
                              <div className="min-w-0">
                                <p className={cn("font-bold text-xs truncate", isCurrentUser ? "text-[#2C4BFF]" : "text-slate-900")}>{p.name}</p>
                                <p className="text-[10px] text-slate-400 font-bold">#{idx + 1} w rankingu</p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-black text-sm text-slate-900">{p.matches} mecze</p>
                              <p className="text-[10px] font-bold text-[#00875F]">{p.paidCount}/{p.matches} opłacone</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/50">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${participationRate}%`, background: `linear-gradient(90deg, ${COBALT}, ${YELLOW})` }}
                              />
                            </div>
                            <span className="font-bold text-[11px] text-slate-500 shrink-0">{participationRate}%</span>
                          </div>
                        </div>
                      )
                    })}

                    {isStatsListTruncated && !showAllStats && (
                      <button
                        onClick={() => setShowAllStats(true)}
                        className="flex w-full items-center justify-center gap-2 py-3.5 text-xs font-bold text-slate-500 transition-all hover:text-[#1D3AE8] cursor-pointer active:scale-[0.99]"
                      >
                        Pokaż cały ranking ({filteredPlayerStats.length})
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

        </main>
      </div>

      <SupportModal open={showSupportModal} onClose={() => setShowSupportModal(false)} />
    </div>
  )
}
