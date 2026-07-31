"use client"

import { useState, useEffect } from "react"
import {
  Calendar,
  MapPin,
  Users,
  Search,
  Clock,
  Wallet,
  Plus,
  ChevronRight,
  Lock,
  Bell,
  Sparkles,
  RefreshCw,
  X,
  CheckCircle2,
  UserCheck
} from "lucide-react"
import { Sidebar } from "@/components/dashboard/sidebar"
import { MatchDetail } from "@/components/dashboard/match-detail"
import { Button } from "@/components/ui/button"
import { type Match, mainRoster, waitlist, getMatches } from "@/lib/data"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [matches, setMatches] = useState<Match[]>([])
  const [availablePlayers, setAvailablePlayers] = useState<any[]>([])
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "upcoming" | "past">("all")
  const [user, setUser] = useState<any>(null)
  const [toast, setToast] = useState<string | null>(null)

  // Formularz nowego meczu
  const [newDate, setNewDate] = useState("")
  const [newLocation, setNewLocation] = useState("Hala Sportowa ESCO Jaworze")
  const [newPrice, setNewPrice] = useState("25")
  const [newCapacity, setNewCapacity] = useState("12")
  const [newTitle, setNewTitle] = useState("Trening Siatkówki")
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([])

  useEffect(() => {
    const localUser = localStorage.getItem("volley_user")
    if (localUser) {
      setUser(JSON.parse(localUser))
    }

    loadData()
  }, [])

  function notify(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  // Pobieranie danych i automatyczne ustalanie statusów na podstawie daty
  async function loadData() {
    setIsLoading(true)

    const todayStr = new Date().toISOString().split("T")[0]

    let fetchedMatches: Match[] = []
    const { data: matchesData, error: matchesErr } = await supabase
      .from("matches")
      .select("*")

    if (matchesErr || !matchesData || matchesData.length === 0) {
      fetchedMatches = await getMatches()
    } else {
      fetchedMatches = matchesData
    }

    // Dynamiczna aktualizacja statusu na podstawie daty
    const processedMatches = fetchedMatches.map((match) => {
      const matchDateStr = match.date ? match.date.trim() : ""
      let computedStatus = match.status || "upcoming"

      if (matchDateStr && matchDateStr < todayStr) {
        computedStatus = "past"
      }

      return {
        ...match,
        status: computedStatus
      }
    })

    setMatches(processedMatches)

    // Pobieranie listy zawodników
    const { data: playersData } = await supabase.from("players").select("*")

    if (playersData && playersData.length > 0) {
      setAvailablePlayers(playersData)
    } else {
      const extractedPlayers: any[] = []
      const seenIds = new Set()

      processedMatches.forEach((m) => {
        if (Array.isArray(m.players)) {
          m.players.forEach((p: any) => {
            if (p.id && !seenIds.has(p.id)) {
              seenIds.add(p.id)
              extractedPlayers.push({ id: p.id, name: p.name || p.full_name })
            }
          })
        }
      })

      if (extractedPlayers.length === 0) {
        setAvailablePlayers([
          { id: "p1", name: "Mateusz Podzorski" },
          { id: "p2", name: "Główny Admin" },
          { id: "p3", name: "maciek" },
          { id: "p4", name: "brudas" }
        ])
      } else {
        setAvailablePlayers(extractedPlayers)
      }
    }

    setIsLoading(false)
  }

  function togglePlayerSelection(playerId: string) {
    setSelectedPlayerIds((prev) =>
      prev.includes(playerId)
        ? prev.filter((id) => id !== playerId)
        : [...prev, playerId]
    )
  }

  function toggleAllPlayers() {
    if (selectedPlayerIds.length === availablePlayers.length) {
      setSelectedPlayerIds([])
    } else {
      setSelectedPlayerIds(availablePlayers.map((p) => p.id))
    }
  }

  // Tworzenie nowego meczu
  async function handleCreateMatch(e: React.FormEvent) {
    e.preventDefault()
    if (!newDate) return

    setIsCreating(true)

    const initialMatchPlayers = selectedPlayerIds.map((id) => {
      const p = availablePlayers.find((player) => player.id === id)
      return {
        id: p.id,
        name: p.name || p.full_name,
        role: "main",
        paid: false
      }
    })

    const todayStr = new Date().toISOString().split("T")[0]
    const initialStatus = newDate < todayStr ? "past" : "upcoming"

    const newMatchObj = {
      title: newTitle || "Trening Siatkówki",
      date: newDate,
      time_start: "19:00",
      time_end: "21:00",
      location: newLocation,
      price_per_player: Number(newPrice) || 25,
      capacity: Number(newCapacity) || 12,
      status: initialStatus,
      is_settled: false,
      players: initialMatchPlayers
    }

    const { error } = await supabase.from("matches").insert([newMatchObj])

    if (error) {
      console.error("Błąd tworzenia meczu:", error.message)
      notify(`Błąd zapisu: ${error.message}`)
    } else {
      notify("Pomyślnie utworzono nowy mecz!")
      setShowCreateModal(false)
      setNewDate("")
      setSelectedPlayerIds([])
      loadData()
    }

    setIsCreating(false)
  }

  function handleMatchChange(updatedMatch: Match) {
    setMatches((prev) =>
      prev.map((m) => (m.id === updatedMatch.id ? updatedMatch : m))
    )
    if (selectedMatch?.id === updatedMatch.id) {
      setSelectedMatch(updatedMatch)
    }
    loadData()
  }

  // LOGIKA BEZPIECZNEGO SORTOWANIA (ROZŁĄCZNE WARUNKI)
  const upcomingMatches = matches
    .filter((m) => m.status === "upcoming" && !(m as any).is_settled)
    .sort((a, b) => a.date.localeCompare(b.date))

  const pastOrSettledMatches = matches
    .filter((m) => m.status === "past" || (m as any).is_settled)
    .sort((a, b) => b.date.localeCompare(a.date))

  const nearestMatch = upcomingMatches[0] || matches[0]

  const nearestRoster = nearestMatch ? mainRoster(nearestMatch) : []
  const nearestWaitlist = nearestMatch ? waitlist(nearestMatch) : []
  const nearestPrice = Number(nearestMatch?.price_per_player || 25)

  const sortedAllMatches = [...upcomingMatches, ...pastOrSettledMatches]

  const filteredMatches = sortedAllMatches.filter((m) => {
    const matchesSearch =
      m.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.date?.toLowerCase().includes(searchTerm.toLowerCase())

    if (statusFilter === "upcoming") return matchesSearch && m.status === "upcoming" && !(m as any).is_settled
    if (statusFilter === "past") return matchesSearch && (m.status === "past" || (m as any).is_settled)
    return matchesSearch
  })

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-900">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
        onLogout={() => {
          localStorage.removeItem("volley_user")
          window.location.reload()
        }}
      />

      <div className="flex min-w-0 flex-1 flex-col">

        {/* Górny Pasek Wyszukiwania */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/80 bg-white/80 px-6 py-4 backdrop-blur-md">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Szukaj meczów, graczy..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-2 pl-10 pr-4 text-xs font-medium outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>

          <div className="flex items-center gap-3">
            <button className="relative rounded-2xl border border-slate-200 p-2.5 text-slate-500 hover:bg-slate-50 transition-colors">
              <Bell className="h-4 w-4" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500" />
            </button>
          </div>
        </header>

        {/* Główna zawartość */}
        <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-6 py-8">

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Zarządzanie meczami
              </h1>
              <p className="mt-1 text-xs text-slate-500 font-medium">
                Śledź składy, listę rezerwową i wpłaty z każdej sesji.
              </p>
            </div>

            <Button
              onClick={() => setShowCreateModal(true)}
              className="rounded-2xl bg-blue-600 hover:bg-blue-700 font-bold text-xs gap-2 px-5 py-2.5 shadow-md shadow-blue-500/20"
            >
              <Plus className="h-4 w-4" />
              Utwórz nowy mecz
            </Button>
          </div>

          {/* Podgląd Najbliższego Meczu */}
          {nearestMatch && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
                  Podgląd: Najbliższy mecz
                </span>

                <button className="text-xs font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1">
                  <RefreshCw className="h-3 w-3" /> Przełącz na Cały sezon
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

                <div
                  onClick={() => setSelectedMatch(nearestMatch)}
                  className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm hover:border-blue-300 transition-all cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Najbliższy Mecz</p>
                    <h3 className="text-xl font-black text-slate-900 mt-1">{nearestMatch.date}</h3>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5 truncate max-w-[130px]">{nearestMatch.location}</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
                    <Calendar className="h-6 w-6" />
                  </div>
                </div>

                <div className="rounded-3xl border border-purple-100 bg-gradient-to-br from-purple-50/40 to-white p-5 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-purple-400">Skład Główny</p>
                    <h3 className="text-xl font-black text-slate-900 mt-1">{nearestRoster.length} / {nearestMatch.capacity || 12}</h3>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">Wolne miejsca</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100/60 text-purple-600 border border-purple-200/50">
                    <Users className="h-6 w-6" />
                  </div>
                </div>

                <div className="rounded-3xl border border-amber-100 bg-gradient-to-br from-amber-50/40 to-white p-5 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Lista Rezerwowa</p>
                    <h3 className="text-xl font-black text-slate-900 mt-1">+{nearestWaitlist.length}</h3>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">Graczy na rezerwie</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100/60 text-amber-600 border border-amber-200/50">
                    <Clock className="h-6 w-6" />
                  </div>
                </div>

                <div className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50/40 to-white p-5 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Budżet Meczowy</p>
                    <h3 className="text-xl font-black text-slate-900 mt-1">{nearestRoster.filter(p => p.paid).length * nearestPrice} PLN</h3>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">Koszt: {nearestPrice} PLN / os.</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100/60 text-emerald-600 border border-emerald-200/50">
                    <Wallet className="h-6 w-6" />
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Sponsorzy */}
          <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-3">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              Sponsorzy i Partnerzy Zespołu
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 font-black text-xs text-emerald-700">BSC</div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">Beskid Sport Center</p>
                  <p className="text-[10px] text-slate-400 truncate">Partner Sprzętowy</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 font-black text-xs text-amber-700">SKO</div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">Skoczów Park</p>
                  <p className="text-[10px] text-slate-400 truncate">Oficjalny Partner</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 font-black text-xs text-purple-700">VOLLEY</div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">VolleyStore</p>
                  <p className="text-[10px] text-slate-400 truncate">Sklep Siatkarski</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 font-black text-xs text-blue-700">AZ</div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">AZ-Cloud Solutions</p>
                  <p className="text-[10px] text-slate-400 truncate">Infrastruktura IT</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 font-black text-xs text-indigo-700">ESCO</div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">ESCO Jaworze</p>
                  <p className="text-[10px] text-slate-400 truncate">Sponsor Tytularny</p>
                </div>
              </div>
            </div>
          </div>

          {/* Zakładki / Filtry */}
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={() => setStatusFilter("all")}
              className={cn(
                "rounded-xl px-4 py-2 text-xs font-bold transition-all",
                statusFilter === "all" ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              )}
            >
              Wszystkie
            </button>
            <button
              onClick={() => setStatusFilter("upcoming")}
              className={cn(
                "rounded-xl px-4 py-2 text-xs font-bold transition-all",
                statusFilter === "upcoming" ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              )}
            >
              Nadchodzące
            </button>
            <button
              onClick={() => setStatusFilter("past")}
              className={cn(
                "rounded-xl px-4 py-2 text-xs font-bold transition-all",
                statusFilter === "past" ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              )}
            >
              Zakończone
            </button>
          </div>

          {/* Lista Meczów */}
          <div className="space-y-3">
            {isLoading ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-xs text-blue-600 font-bold animate-pulse">
                Ładowanie harmonogramu...
              </div>
            ) : filteredMatches.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-xs text-slate-400">
                Brak meczów w tej kategorii.
              </div>
            ) : (
              filteredMatches.map((match, idx) => {
                const roster = mainRoster(match)
                const price = Number(match.price_per_player || 25)
                const paidPlayersCount = roster.filter((p) => p.paid).length
                const totalCollected = paidPlayersCount * price
                const isSettled = (match as any).is_settled
                const isPast = match.status === "past"

                return (
                  <div
                    key={`${match.id}-${idx}`}
                    onClick={() => setSelectedMatch(match)}
                    className={cn(
                      "group relative flex flex-col sm:flex-row sm:items-center justify-between rounded-3xl border bg-white p-4 sm:p-5 shadow-sm hover:border-blue-400 hover:shadow-md transition-all cursor-pointer gap-4",
                      isPast || isSettled ? "border-slate-200/70 bg-slate-50/50" : "border-slate-200/90"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-2xl border shrink-0",
                        isPast || isSettled
                          ? "bg-slate-100 text-slate-400 border-slate-200"
                          : "bg-amber-50 text-amber-500 border-amber-100"
                      )}>
                        <Calendar className="h-6 w-6" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {match.date}
                          </h3>
                          <span
                            className={cn(
                              "rounded-md px-2 py-0.5 text-[10px] font-bold uppercase border",
                              isSettled
                                ? "bg-slate-100 text-slate-500 border-slate-200"
                                : isPast
                                ? "bg-slate-100 text-slate-500 border-slate-200"
                                : "bg-amber-50 text-amber-600 border-amber-200"
                            )}
                          >
                            {isSettled ? "Rozliczony" : isPast ? "Zakończony" : "Nadchodzący"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                          <MapPin className="h-3.5 w-3.5 text-blue-500" />
                          <span>{match.location}</span>
                          <span>•</span>
                          <span className="font-bold text-slate-600">{price} PLN / os.</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 border-slate-100 pt-3 sm:pt-0">
                      <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-1.5 border border-slate-100 text-xs font-semibold text-slate-600">
                        <Users className="h-4 w-4 text-blue-600" />
                        <span>Skład: <strong>{roster.length}/{match.capacity || 12}</strong></span>
                      </div>

                      <div className="text-right">
                        <p className="text-[10px] uppercase font-bold text-slate-400">Wpłaty</p>
                        <p className={cn(
                          "text-xs font-extrabold",
                          totalCollected > 0 ? "text-emerald-600" : "text-slate-400"
                        )}>
                          {totalCollected} PLN
                        </p>
                      </div>

                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                        <ChevronRight className="h-5 w-5" />
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

        </main>
      </div>

      {/* MODAL TWORZENIA NOWEGO MECZU */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-black text-slate-900">Utwórz Nowy Mecz</h2>
              <button onClick={() => setShowCreateModal(false)} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMatch} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nazwa / Tytuł wydarzenia</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 font-medium outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Data meczu</label>
                <input
                  type="date"
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 font-medium outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Lokalizacja / Hala</label>
                <input
                  type="text"
                  required
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 font-medium outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Składka (PLN)</label>
                  <input
                    type="number"
                    required
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 font-bold outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Limit miejsc</label>
                  <input
                    type="number"
                    required
                    value={newCapacity}
                    onChange={(e) => setNewCapacity(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 font-bold outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 flex items-center gap-1.5">
                    <UserCheck className="h-4 w-4 text-blue-600" />
                    Powołany Skład ({selectedPlayerIds.length})
                  </label>
                  <button
                    type="button"
                    onClick={toggleAllPlayers}
                    className="text-[11px] font-bold text-blue-600 hover:underline"
                  >
                    {selectedPlayerIds.length === availablePlayers.length ? "Odznacz wszystkich" : "Zaznacz wszystkich"}
                  </button>
                </div>

                <div className="max-h-40 overflow-y-auto space-y-1.5 border border-slate-200 rounded-2xl p-2 bg-slate-50/50">
                  {availablePlayers.length === 0 ? (
                    <p className="text-[11px] text-slate-400 text-center py-2">Brak zawodników w bazie.</p>
                  ) : (
                    availablePlayers.map((player) => {
                      const isSelected = selectedPlayerIds.includes(player.id)
                      const playerName = player.name || player.full_name
                      return (
                        <div
                          key={player.id}
                          onClick={() => togglePlayerSelection(player.id)}
                          className={cn(
                            "flex items-center justify-between p-2 rounded-xl text-xs font-semibold cursor-pointer border transition-all",
                            isSelected
                              ? "bg-blue-50 border-blue-200 text-blue-900"
                              : "bg-white border-slate-100 text-slate-600 hover:bg-slate-100/70"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                            />
                            <span>{playerName}</span>
                          </div>

                          {isSelected && <span className="text-[10px] font-extrabold text-blue-600 uppercase">Powołany</span>}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <Button type="button" variant="ghost" onClick={() => setShowCreateModal(false)} className="rounded-xl">
                  Anuluj
                </Button>
                <Button type="submit" disabled={isCreating} className="rounded-xl bg-blue-600 hover:bg-blue-700 font-bold text-white">
                  {isCreating ? "Tworzenie..." : "Zapisz mecz"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal szczegółów meczu */}
      {selectedMatch && (
        <MatchDetail
          match={selectedMatch}
          currentUser={user}
          onClose={() => setSelectedMatch(null)}
          onChange={handleMatchChange}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-lg">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          {toast}
        </div>
      )}
    </div>
  )
}
