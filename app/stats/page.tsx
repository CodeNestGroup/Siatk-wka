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
  ArrowLeft,
  Loader2
} from "lucide-react"
import { Sidebar } from "@/components/dashboard/sidebar"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"

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

  async function loadStatsData() {
    setIsLoading(true)

    const [{ data: matchesData }, { data: playersData }] = await Promise.all([
      supabase.from("matches").select("*"),
      supabase.from("players").select("*")
    ])

    setMatches(matchesData || [])
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

  // === PRZELICZANIE STATYSTYK ===
  const totalMatches = matches.length

  const playerStats = useMemo(() => {
    const statsMap: Record<string, { name: string; matches: number; paidCount: number; unpaidCount: number }> = {}

    players.forEach((p) => {
      const pName = p.full_name || p.name
      if (pName && !pName.toLowerCase().includes("główny admin")) {
        statsMap[pName] = { name: pName, matches: 0, paidCount: 0, unpaidCount: 0 }
      }
    })

    matches.forEach((m) => {
      if (Array.isArray(m.players)) {
        m.players.forEach((p: any) => {
          const pName = p.name || p.full_name
          if (!pName || pName.toLowerCase().includes("główny admin")) return

          if (!statsMap[pName]) {
            statsMap[pName] = { name: pName, matches: 0, paidCount: 0, unpaidCount: 0 }
          }

          statsMap[pName].matches += 1
          if (p.paid) {
            statsMap[pName].paidCount += 1
          } else {
            statsMap[pName].unpaidCount += 1
          }
        })
      }
    })

    return Object.values(statsMap).sort((a, b) => b.matches - a.matches)
  }, [matches, players])

  const topPlayer = playerStats[0] || { name: "Brak danych", matches: 0 }

  const totalRosterEntries = matches.reduce((acc, m) => acc + (Array.isArray(m.players) ? m.players.length : 0), 0)
  const avgAttendance = totalMatches > 0 ? (totalRosterEntries / totalMatches).toFixed(1) : "0"

  const totalPaidEntries = matches.reduce((acc, m) => {
    if (Array.isArray(m.players)) {
      return acc + m.players.filter((p: any) => p.paid).length
    }
    return acc
  }, 0)
  const paymentRate = totalRosterEntries > 0 ? Math.round((totalPaidEntries / totalRosterEntries) * 100) : 0

  const filteredPlayerStats = playerStats.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-900">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
        onLogout={handleLogout}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto w-full max-w-7xl flex-1 space-y-8 px-6 py-8">

          <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Powrót do pulpitu
          </Link>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
                <BarChart3 className="h-7 w-7 text-blue-600" />
                Statystyki Zespołu
              </h1>
              <p className="mt-1 text-xs font-medium text-slate-500">
                Podsumowanie występów, frekwencji i terminowości wpłat w obecnym sezonie.
              </p>
            </div>
          </div>

          {/* NOWE, CZYSTE KAFELKI PODSUMOWANIA (KPI) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

            {/* Lider Frekwencji - Złoty / Amber */}
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

            {/* Rozegrane Sesje - Niebieski */}
            <div className="rounded-3xl border border-blue-200/80 bg-gradient-to-br from-blue-50/60 to-white p-5 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600">Rozegrane Sesje</p>
                <h3 className="mt-1 text-xl font-black text-slate-900">{totalMatches} Meczów</h3>
                <p className="mt-0.5 text-[11px] font-medium text-slate-400">Łącznie w sezonie</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 border border-blue-200/50">
                <Calendar className="h-6 w-6" />
              </div>
            </div>

            {/* Średnia Frekwencja - Fioletowy */}
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

            {/* Wpłacalność Składek - Zielony / Emerald */}
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

                        return (
                          <tr key={p.name} className="hover:bg-slate-50/80 transition-colors">
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
                                  isTop3 ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-slate-100 text-slate-500 border-slate-200/60"
                                )}>
                                  {p.name.charAt(0).toUpperCase()}
                                </span>
                                <span className="font-bold text-slate-900">{p.name}</span>
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
