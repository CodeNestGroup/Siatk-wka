"use client"

import { useState, useEffect, useMemo } from "react"
import {
  BarChart3,
  Trophy,
  Users,
  Calendar,
  Crown,
  Percent,
  Search,
  Loader2
} from "lucide-react"
import { Sidebar } from "@/components/dashboard/sidebar"
import { NotificationsBell, type NotificationItem } from "@/components/dashboard/notifications-bell"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"

const sponsors = [
  { code: "BSC", name: "Beskid Sport Center", desc: "Partner Sprzętowy", color: "bg-emerald-100 text-emerald-700" },
  { code: "SKO", name: "Skoczów Park", desc: "Oficjalny Partner", color: "bg-amber-100 text-amber-700" },
  { code: "VOLLEY", name: "VolleyStore", desc: "Sklep Siatkarski", color: "bg-purple-100 text-purple-700" },
  { code: "AZ", name: "AZ-Cloud Solutions", desc: "Infrastruktura IT", color: "bg-blue-100 text-blue-700" },
  { code: "ESCO", name: "ESCO Jaworze", desc: "Sponsor Tytularny", color: "bg-indigo-100 text-indigo-700" },
]

export default function StatsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)

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

    const [{ data: matchesData }, { data: playersData }, { data: registrationsData }] = await Promise.all([
      supabase.from("matches").select("*"),
      supabase.from("players").select("*"),
      supabase.from("match_registrations").select("*")
    ])

    // Doklejamy zarejestrowanych graczy z nowej tabeli do każdego meczu, żeby statystyki widziały obecność i wpłaty
    const processedMatches = (matchesData || []).map((match: any) => {
      const matchRegs = (registrationsData || []).filter((r: any) => r.match_id === match.id)
      const matchPlayers = matchRegs.map((reg: any) => {
        const foundPlayer = (playersData || []).find((p: any) => p.id === reg.player_id)
        return {
          id: reg.player_id,
          name: foundPlayer?.full_name || foundPlayer?.name || "Zawodnik",
          full_name: foundPlayer?.full_name || foundPlayer?.name || "Zawodnik",
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
    localStorage.clear()
    sessionStorage.clear()
    await supabase.auth.signOut()
    setUser(null)
    window.location.href = "/login"
  }

  // Zliczanie statystyk z meczów rozegranych lub rozliczonych (status_id lub is_settled)
  const completedMatches = useMemo(() => {
    return matches.filter(m => m.status_id === 2 || m.status_id === 3 || m.is_settled === true || m.status === "past")
  }, [matches])

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

  const totalRosterEntries = completedMatches.reduce((acc, m) => acc + (Array.isArray(m.players) ? m.players.length : 0), 0)
  const avgAttendance = totalMatches > 0 ? (totalRosterEntries / totalMatches).toFixed(1) : "0"

  const totalPaidEntries = completedMatches.reduce((acc, m) => {
    if (Array.isArray(m.players)) {
      return acc + m.players.filter((p: any) => p.paid || p.is_paid).length
    }
    return acc
  }, 0)
  const paymentRate = totalRosterEntries > 0 ? Math.round((totalPaidEntries / totalRosterEntries) * 100) : 0

  const filteredPlayerStats = playerStats.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (!user) return null

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-900">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
        onLogout={handleLogout}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Ustandaryzowany górny pasek ze sponsorami i dzwoneczkiem */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/80 bg-white/80 px-6 py-3.5 backdrop-blur-md">
          <style jsx>{`
            @keyframes marquee { 0% { transform: translateX(0%); } 100% { transform: translateX(-50%); } }
            .animate-marquee { display: flex; width: max-content; animation: marquee 30s linear infinite; }
            .animate-marquee:hover { animation-play-state: paused; }
          `}</style>
          <div className="flex-1 overflow-hidden">
            <div className="animate-marquee gap-8 flex items-center">
              {[...sponsors, ...sponsors].map((s, index) => (
                <div key={index} className="flex items-center gap-2 shrink-0">
                  <span className={cn("flex h-6 w-6 items-center justify-center rounded-lg font-black text-[9px]", s.color)}>{s.code}</span>
                  <span className="text-xs font-extrabold text-slate-500">{s.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 ml-6">
            <NotificationsBell
              onNotificationClick={(notif: NotificationItem) => {
                // obsługa powiadomień
              }}
            />
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 space-y-8 px-6 py-8">

          {/* Nagłówek spójny z resztą aplikacji */}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 shadow-sm">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight text-slate-900">Statystyki Zespołu</h1>
                <p className="text-xs font-medium text-slate-500">Podsumowanie występów, frekwencji i terminowości wpłat w obecnym sezonie.</p>
              </div>
            </div>
          </div>

          {/* Kafelki Podsumowania */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

            <div className="rounded-3xl border border-amber-200/80 bg-gradient-to-br from-amber-50/60 to-white p-5 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600">Lider Frekwencji</p>
                <h3 className="mt-1 text-xl font-black text-slate-900 truncate max-w-[150px]">
                  {topPlayer.name}
                </h3>
                <p className="mt-0.5 text-[11px] font-medium text-slate-400">{topPlayer.matches} rozegranych meczów</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 border border-amber-200/50">
                <Crown className="h-6 w-6" />
              </div>
            </div>

            <div className="rounded-3xl border border-blue-200/80 bg-gradient-to-br from-blue-50/60 to-white p-5 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600">Rozegrane Sesje</p>
                <h3 className="mt-1 text-xl font-black text-slate-900">{totalMatches} Meczów</h3>
                <p className="mt-0.5 text-[11px] font-medium text-slate-400">Rozliczone w sezonie</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 border border-blue-200/50">
                <Calendar className="h-6 w-6" />
              </div>
            </div>

            <div className="rounded-3xl border border-purple-200/80 bg-gradient-to-br from-purple-50/60 to-white p-5 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-purple-600">Średnia Frekwencja</p>
                <h3 className="mt-1 text-xl font-black text-slate-900">{avgAttendance} / 12</h3>
                <p className="mt-0.5 text-[11px] font-medium text-slate-400">Graczy na mecz</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-purple-600 border border-purple-200/50">
                <Users className="h-6 w-6" />
              </div>
            </div>

            <div className="rounded-3xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/60 to-white p-5 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600">Wpłacalność Składek</p>
                <h3 className="mt-1 text-xl font-black text-slate-900">{paymentRate}%</h3>
                <p className="mt-0.5 text-[11px] font-medium text-slate-400">Terminowe uregulowania</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 border border-emerald-200/50">
                <Percent className="h-6 w-6" />
              </div>
            </div>

          </div>

          {/* TABELA LEADERBOARDU */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm">
              <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                Ranking Aktywności i Występów Zawodników
              </h2>

              <div className="relative max-w-xs w-full">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  placeholder="Szukaj gracza w rankingu…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-2 pl-10 pr-4 text-xs font-medium outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/80 bg-white overflow-hidden shadow-sm">
              {isLoading ? (
                <div className="p-12 text-center text-slate-400 text-xs font-bold flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  Ładowanie statystyk z bazy...
                </div>
              ) : filteredPlayerStats.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs font-medium">
                  Brak statystyk do wyświetlenia.
                </div>
              ) : (
                <div className="overflow-x-auto">
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

                        const isCurrentUser =
                          user?.id === p.name ||
                          user?.full_name?.toLowerCase() === p.name.toLowerCase() ||
                          user?.name?.toLowerCase() === p.name.toLowerCase()

                        return (
                          <tr key={p.name} className={cn("transition-colors", isCurrentUser ? "bg-blue-50/80 font-semibold" : "hover:bg-slate-50/80")}>
                            <td className="p-4 font-black">
                              {idx === 0 && <span className="inline-flex items-center gap-1 text-amber-500"><Crown className="h-4 w-4" /> #1</span>}
                              {idx === 1 && <span className="text-slate-400">#2</span>}
                              {idx === 2 && <span className="text-amber-700">#3</span>}
                              {idx > 2 && <span className="text-slate-400">#{idx + 1}</span>}
                            </td>

                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <span className={cn(
                                  "flex h-8 w-8 items-center justify-center rounded-xl font-black text-xs border",
                                  isCurrentUser ? "bg-blue-600 text-white border-blue-600 shadow-sm" : isTop3 ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-slate-100 text-slate-500 border-slate-200/60"
                                )}>
                                  {p.name.charAt(0).toUpperCase()}
                                </span>
                                <span className={cn("font-bold", isCurrentUser ? "text-blue-600 font-extrabold" : "text-slate-900")}>
                                  {p.name} {isCurrentUser && <span className="ml-1 rounded-md bg-blue-100 px-1.5 py-0.5 text-[9px] font-black uppercase text-blue-700">(Ty)</span>}
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
                                    className="bg-blue-600 h-full rounded-full transition-all duration-500"
                                    style={{ width: `${participationRate}%` }}
                                  />
                                </div>
                                <span className="font-bold text-[11px] text-slate-500">{participationRate}%</span>
                              </div>
                            </td>

                            <td className="p-4 text-right font-black text-emerald-600">
                              {p.paidCount} / {p.matches}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

        </main>
      </div>
    </div>
  )
}
