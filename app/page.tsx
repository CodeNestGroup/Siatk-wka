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
  RefreshCw,
  X,
  CheckCircle2,
  UserCheck,
  Crown,
  Trophy,
  Share2,
  Shuffle,
  Trash2,
  Check,
  Ban,
  Timer
} from "lucide-react"
import { Sidebar } from "@/components/dashboard/sidebar"
import { MatchDetail } from "@/components/dashboard/match-detail"
import { TeamBalancerModal } from "@/components/dashboard/team-balancer-modal"
import { NotificationsBell, type NotificationItem } from "@/components/dashboard/notifications-bell"
import { Button } from "@/components/ui/button"
import { type Match, mainRoster, waitlist } from "@/lib/data"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"

const sponsors = [
  { code: "BSC", name: "Beskid Sport Center", desc: "Partner Sprzętowy", color: "bg-emerald-100 text-emerald-700" },
  { code: "SKO", name: "Skoczów Park", desc: "Oficjalny Partner", color: "bg-amber-100 text-amber-700" },
  { code: "VOLLEY", name: "VolleyStore", desc: "Sklep Siatkarski", color: "bg-purple-100 text-purple-700" },
  { code: "AZ", name: "AZ-Cloud Solutions", desc: "Infrastruktura IT", color: "bg-blue-100 text-blue-700" },
  { code: "ESCO", name: "ESCO Jaworze", desc: "Sponsor Tytularny", color: "bg-indigo-100 text-indigo-700" },
]

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [matches, setMatches] = useState<Match[]>([])
  const [availablePlayers, setAvailablePlayers] = useState<any[]>([])
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)

  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "upcoming" | "past" | "cancelled">("all")

  const [user, setUser] = useState<any>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [readMatchIds, setReadMatchIds] = useState<string[]>([])

  const [selectedMatchForTeams, setSelectedMatchForTeams] = useState<Match | null>(null)
  const [selectedMatchRosterPreview, setSelectedMatchRosterPreview] = useState<Match | null>(null)
  const [viewMode, setViewMode] = useState<"nearest" | "season">("nearest")

  const isAdmin = user?.role === "admin" || user?.is_admin || user?.role_id === 1

  const [newDate, setNewDate] = useState("")
  const [newLocation, setNewLocation] = useState("Hala Sportowa ESCO Jaworze")
  const [newPrice, setNewPrice] = useState("25")
  const [newCapacity, setNewCapacity] = useState("12")
  const [newTitle, setNewTitle] = useState("")
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([])

  useEffect(() => {
    const localUser = localStorage.getItem("volley_user")
    if (!localUser) {
      window.location.href = "/login"
      return
    }

    try {
      setUser(JSON.parse(localUser))
    } catch (e) {
      localStorage.removeItem("volley_user")
      window.location.href = "/login"
      return
    }

    const savedRead = localStorage.getItem("volley_read_notifications")
    if (savedRead) {
      setReadMatchIds(JSON.parse(savedRead))
    }

    loadData()
  }, [])

  function notify(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function loadData() {
    setIsLoading(true)

    let fetchedMatches: Match[] = []
    // Poprawna nazwa tabeli relacji ze schematu: matches_status
    const { data: matchesData, error } = await supabase
      .from("matches")
      .select("*, matches_status(id, name)")
      .order("date", { ascending: true })

    if (error) {
      console.error("Błąd pobierania meczów:", error.message)
    }

    if (matchesData) fetchedMatches = matchesData

    const { data: registrationsData } = await supabase.from("match_registrations").select("*")

    const processedMatches = fetchedMatches.map((match: any) => {
      const matchRegs = registrationsData?.filter((r: any) => r.match_id === match.id) || []
      const matchPlayers = matchRegs.map((reg: any) => ({
        id: reg.player_id,
        paid: reg.is_paid
      }))

      return { ...match, players: matchPlayers }
    })

    setMatches(processedMatches)

    const { data: playersData } = await supabase.from("players").select("*")
    if (playersData) {
      setAvailablePlayers(playersData)
    }

    setIsLoading(false)
  }

  function handleSelectMatch(match: Match) {
    setSelectedMatch(match)
    const matchNotifId = `match-${match.id}`
    if (!readMatchIds.includes(matchNotifId)) {
      const updated = [...readMatchIds, matchNotifId]
      setReadMatchIds(updated)
      localStorage.setItem("volley_read_notifications", JSON.stringify(updated))
    }
  }

  function handleOpenRosterPreview(match: Match, e: React.MouseEvent) {
    e.stopPropagation()
    setSelectedMatchRosterPreview(match)
  }

  // NAPRAWIONE ODWOŁYWANIE MECZU WG DOPASOWANEGO SCHEMATU ERD
  async function handleCancelMatch(matchId: string, matchDate: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm(`Odwołać mecz z dnia ${matchDate}?`)) return

    // 1. Pobieramy rekordy z tabeli matches_status
    const { data: statusList } = await supabase.from("matches_status").select("*")

    // Szukamy ID dla statusu "Odwołany"
    let cancelledStatusId = statusList?.find((s: any) =>
      s.name?.toLowerCase().includes("odwoł") ||
      s.name?.toLowerCase().includes("cancel")
    )?.id

    // Fallback: jeśli słownie nie znaleziono, wybieramy OSTATNIE id z tabeli matches_status lub 4
    if (!cancelledStatusId && statusList && statusList.length > 0) {
      cancelledStatusId = statusList[statusList.length - 1].id
    }
    if (!cancelledStatusId) cancelledStatusId = 4

    // 2. Aktualizujemy status_id w tabeli matches
    const { error: matchError } = await supabase
      .from("matches")
      .update({ status_id: cancelledStatusId })
      .eq("id", matchId)

    if (matchError) {
      notify(`Błąd aktualizacji meczu: ${matchError.message}`)
      return
    }

    // 3. Tworzymy ogłoszenie z poprawnym powiązaniem match_id (uuid)
    try {
      await supabase.from("announcements").insert([
        {
          title: `⚠️ MECZ ODWOŁANY (${matchDate})`,
          content: `Informujemy, że mecz zaplanowany na dzień ${matchDate} został odwołany przez Administratora.`,
          author: user?.full_name || user?.name || "Administrator",
          match_id: matchId,
          is_pinned: true
        }
      ])
    } catch (announcementErr) {
      console.warn("Błąd wysyłania ogłoszenia:", announcementErr)
    }

    notify("Mecz odwołany! Ogłoszenie zostało opublikowane.")
    await loadData()
  }

  async function handleDeleteMatch(matchId: string, matchDate: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm(`Usunąć mecz z dnia ${matchDate}?`)) return

    await supabase.from("match_registrations").delete().eq("match_id", matchId)
    await supabase.from("announcements").delete().eq("match_id", matchId)
    await supabase.from("matches").delete().eq("id", matchId)
    notify("Mecz usunięty z bazy.")
    loadData()
  }

  function copyMatchToClipboard(match: Match, e: React.MouseEvent) {
    e.stopPropagation()
    const roster = mainRoster(match)
    const subtitle = match.title && match.title !== match.date ? ` - ${match.title}` : ""
    const text = `🏐 *Trening ESCO (${match.date}${subtitle})*\n📍 ${match.location}\n⏰ ${match.time_start || '19:00'} - ${match.time_end || '21:00'}\n👥 Skład: ${roster.length}/${match.capacity || 12}\n💰 Składka: ${match.price_per_player || 25} PLN`
    navigator.clipboard.writeText(text)
    notify("Skopiowano do schowka!")
  }

  function handleOpenBalancer(match: Match, e: React.MouseEvent) {
    e.stopPropagation()
    setSelectedMatchForTeams(match)
  }

  function togglePlayerSelection(playerId: string) {
    setSelectedPlayerIds((prev) =>
      prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId]
    )
  }

  function toggleAllPlayers() {
    if (selectedPlayerIds.length === availablePlayers.length) {
      setSelectedPlayerIds([])
    } else {
      setSelectedPlayerIds(availablePlayers.map((p) => p.id))
    }
  }

  async function handleCreateMatch(e: React.FormEvent) {
    e.preventDefault()
    if (!newDate) return

    setIsCreating(true)
    const todayStr = new Date().toISOString().split("T")[0]
    const initialStatusId = newDate < todayStr ? 3 : 1

    const matchTitle = newTitle.trim() ? newTitle.trim() : newDate

    const newMatchObj = {
      title: matchTitle,
      date: newDate,
      time_start: "19:00:00",
      time_end: "21:00:00",
      location: newLocation,
      price_per_player: Number(newPrice) || 25,
      capacity: Number(newCapacity) || 12,
      max_players: Number(newCapacity) || 12,
      status_id: initialStatusId,
      is_settled: false
    }

    const { data: insertedMatch, error } = await supabase.from("matches").insert([newMatchObj]).select().single()

    if (error || !insertedMatch) {
      notify(`Błąd zapisu: ${error?.message || "Nieznany błąd"}`)
    } else {
      if (selectedPlayerIds.length > 0) {
        const registrations = selectedPlayerIds.map(pid => ({
          match_id: insertedMatch.id,
          player_id: pid,
          is_paid: false
        }))
        await supabase.from("match_registrations").insert(registrations)
      }

      notify("Pomyślnie utworzono nowy mecz!")
      setShowCreateModal(false)
      setNewDate("")
      setNewTitle("")
      setSelectedPlayerIds([])
      loadData()
    }

    setIsCreating(false)
  }

  function handleMatchChange(updatedMatch: Match) {
    setMatches((prev) => prev.map((m) => (m.id === updatedMatch.id ? updatedMatch : m)))
    if (selectedMatch?.id === updatedMatch.id) {
      setSelectedMatch(updatedMatch)
    }
    loadData()
  }

  async function handleLogout() {
    localStorage.removeItem("volley_user")
    sessionStorage.clear()
    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  if (!user) return null

  const todayStr = new Date().toISOString().split("T")[0]

  const filteredMatches = matches.filter((m: any) => {
    const searchString = `${m.title || ''} ${m.location || ''} ${m.date || ''}`.toLowerCase()
    const matchFound = searchString.includes(searchTerm.toLowerCase())

    const isCancelled = m.status_id === 4 || m.matches_status?.name?.toLowerCase().includes("odwoł")
    const isPast = (m.date < todayStr || m.status_id === 3 || m.is_settled) && !isCancelled
    const isUpcoming = m.date >= todayStr && !isCancelled && !m.is_settled

    if (statusFilter === "upcoming") return matchFound && isUpcoming
    if (statusFilter === "past") return matchFound && isPast
    if (statusFilter === "cancelled") return matchFound && isCancelled
    return matchFound
  })

  const sortedMatches = [...filteredMatches].sort((a: any, b: any) => a.date.localeCompare(b.date))

  const activeMatches = matches.filter((m: any) => !m.matches_status?.name?.toLowerCase().includes("odwoł") && m.status_id !== 4)
  const upcomingMatches = activeMatches.filter((m: any) => m.date >= todayStr)
  const nearestMatch = upcomingMatches[0] || activeMatches[0]

  const totalSeasonMatches = activeMatches.length

  const playerMatchCounts: Record<string, { name: string; count: number }> = {}
  activeMatches.forEach((m) => {
    const roster = mainRoster(m)
    roster.forEach((p: any) => {
      const pName = p.name || p.full_name || "Zawodnik"
      if (!playerMatchCounts[pName]) {
        playerMatchCounts[pName] = { name: pName, count: 0 }
      }
      playerMatchCounts[pName].count += 1
    })
  })

  let attendanceKing = { name: "Brak danych", count: 0 }
  Object.values(playerMatchCounts).forEach((p) => {
    if (p.count > attendanceKing.count) {
      attendanceKing = p
    }
  })

  const totalRosterEntries = activeMatches.reduce((acc, m) => acc + mainRoster(m).length, 0)
  const avgAttendance = totalSeasonMatches > 0 ? (totalRosterEntries / totalSeasonMatches).toFixed(1) : "0"

  const totalSeasonCollected = activeMatches.reduce((acc, m) => {
    const price = Number(m.price_per_player || 25)
    const paid = mainRoster(m).filter((p: any) => p.paid || p.is_paid).length
    return acc + (paid * price)
  }, 0)

  const nearestRoster = nearestMatch ? mainRoster(nearestMatch) : []
  const nearestWaitlist = nearestMatch ? waitlist(nearestMatch) : []
  const nearestPrice = Number(nearestMatch?.price_per_player || 25)
  const nearestCollected = nearestRoster.filter((p: any) => p.paid || p.is_paid).length * nearestPrice

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-900">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} user={user} onLogout={handleLogout} />

      <div className="flex min-w-0 flex-1 flex-col">
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
                if (notif.type === "match") {
                  const matchId = notif.id.replace("match-", "")
                  const target = matches.find((m) => m.id === matchId)
                  if (target) handleSelectMatch(target)
                }
              }}
            />
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-6 py-8">

          {nearestMatch && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
                  {viewMode === "nearest" ? "Podgląd: Najbliższy mecz" : "Podgląd: Cały Sezon / Rok"}
                </span>

                <button
                  onClick={() => setViewMode(viewMode === "nearest" ? "season" : "nearest")}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100 transition-colors cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  {viewMode === "nearest" ? "Przełącz na Cały sezon" : "Przełącz na Najbliższy mecz"}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div
                  onClick={() => handleSelectMatch(nearestMatch)}
                  className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm hover:border-blue-300 transition-all cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {viewMode === "nearest" ? "Najbliższy Mecz" : "Rozegrane Mecze"}
                    </p>
                    <h3 className="text-xl font-black text-slate-900 mt-1">
                      {viewMode === "nearest" ? nearestMatch.date : `${totalSeasonMatches} Sesji`}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5 truncate max-w-[130px]">
                      {viewMode === "nearest" ? nearestMatch.location : "W tym sezonie"}
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
                    {viewMode === "nearest" ? <Calendar className="h-6 w-6" /> : <Trophy className="h-6 w-6 text-blue-600" />}
                  </div>
                </div>

                <div className="rounded-3xl border border-amber-100 bg-gradient-to-br from-amber-50/40 to-white p-5 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500">
                      {viewMode === "nearest" ? "Skład Główny" : "Król Frekwencji"}
                    </p>
                    <h3 className="text-xl font-black text-slate-900 mt-1 truncate max-w-[140px]">
                      {viewMode === "nearest"
                        ? `${nearestRoster.length} / ${nearestMatch.capacity || nearestMatch.max_players || 12}`
                        : attendanceKing.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                      {viewMode === "nearest" ? "Wolne miejsca" : `${attendanceKing.count} zagranych meczów`}
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100/60 text-amber-600 border border-amber-200/50">
                    {viewMode === "nearest" ? <Users className="h-6 w-6" /> : <Crown className="h-6 w-6 text-amber-500" />}
                  </div>
                </div>

                <div className="rounded-3xl border border-purple-100 bg-gradient-to-br from-purple-50/40 to-white p-5 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                      {viewMode === "nearest" ? "Lista Rezerwowa" : "Śr. Frekwencja"}
                    </p>
                    <h3 className="text-xl font-black text-slate-900 mt-1">
                      {viewMode === "nearest" ? `+${nearestWaitlist.length}` : `${avgAttendance} / 12`}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                      {viewMode === "nearest" ? "Graczy na rezerwie" : "Graczy na mecz"}
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100/60 text-purple-600 border border-purple-200/50">
                    {viewMode === "nearest" ? <Clock className="h-6 w-6" /> : <Users className="h-6 w-6" />}
                  </div>
                </div>

                <div className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50/40 to-white p-5 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">
                      {viewMode === "nearest" ? "Budżet Meczowy" : "Budżet Sezonu"}
                    </p>
                    <h3 className="text-xl font-black text-slate-900 mt-1">
                      {viewMode === "nearest" ? nearestCollected : totalSeasonCollected} PLN
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                      {viewMode === "nearest" ? `Koszt: ${nearestPrice} PLN / os.` : "Suma zebranych wpłat"}
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100/60 text-emerald-600 border border-emerald-200/50">
                    <Wallet className="h-6 w-6" />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-slate-200/80 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 shadow-sm">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">Harmonogram Meczów</h1>
                  <p className="text-xs text-slate-500 font-medium">Zarządzaj terminami, składem i frekwencją zespołu.</p>
                </div>
              </div>

              {isAdmin && (
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="rounded-2xl bg-blue-600 hover:bg-blue-700 font-bold text-xs gap-2 px-5 py-2.5 shadow-md shadow-blue-500/20 text-white cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Utwórz nowy mecz
                </Button>
              )}
            </div>

            <div className="relative w-full max-w-md">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Szukaj po dacie, hali lub tytule meczu..."
                className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-sm transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 overflow-x-auto">
            {[
              { id: "all", label: "Wszystkie" },
              { id: "upcoming", label: "Nadchodzące" },
              { id: "past", label: "Zakończone" },
              { id: "cancelled", label: "Odwołane" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={cn(
                  "rounded-xl px-4 py-2 text-xs font-bold transition-all shrink-0 cursor-pointer",
                  statusFilter === tab.id
                    ? tab.id === "cancelled" ? "bg-rose-600 text-white shadow-md shadow-rose-500/20" : "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-xs text-blue-600 font-bold animate-pulse">
                Ładowanie harmonogramu...
              </div>
            ) : sortedMatches.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-xs text-slate-400">
                Brak meczów w tej kategorii.
              </div>
            ) : (
              sortedMatches.map((match: any, idx) => {
                const roster = mainRoster(match)
                const price = Number(match.price_per_player || 25)
                const paidPlayersCount = roster.filter((p: any) => p.paid || p.is_paid).length
                const totalCollected = paidPlayersCount * price
                const isSettled = match.is_settled
                const isCancelled = match.status_id === 4 || match.matches_status?.name?.toLowerCase().includes("odwoł")
                const isPast = match.date < todayStr || match.status_id === 3
                const isUnread = !readMatchIds.includes(`match-${match.id}`)

                const isAbsoluteNearest = match.id === nearestMatch?.id
                const hasSubtitle = match.title && match.title !== match.date

                return (
                  <div
                    key={`${match.id}-${idx}`}
                    onClick={() => handleSelectMatch(match)}
                    className={cn(
                      "group relative flex flex-col sm:flex-row sm:items-center justify-between rounded-3xl border p-4 sm:p-5 shadow-sm transition-all cursor-pointer gap-4",
                      isCancelled
                        ? "border-rose-300 bg-rose-100/60 hover:border-rose-400 text-rose-900"
                        : isAbsoluteNearest
                        ? "border-blue-400 bg-gradient-to-r from-blue-50/70 to-white ring-2 ring-blue-400/30 shadow-md shadow-blue-500/10"
                        : isPast || isSettled ? "border-slate-200/70 bg-slate-50/50" : "bg-white border-slate-200/90 hover:border-blue-400 hover:shadow-md"
                    )}
                  >
                    {isAbsoluteNearest && !isCancelled && (
                      <span className="absolute -top-2.5 left-6 bg-blue-600 text-white font-black text-[9px] uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-sm">
                        Najbliższy Mecz
                      </span>
                    )}

                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-2xl border shrink-0 relative",
                        isCancelled ? "bg-rose-200 text-rose-600 border-rose-300"
                        : isAbsoluteNearest ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20"
                        : isPast || isSettled ? "bg-slate-100 text-slate-400 border-slate-200" : "bg-amber-50 text-amber-500 border-amber-100"
                      )}>
                        {isCancelled ? <Ban className="h-6 w-6 text-rose-600" /> : <Calendar className="h-6 w-6" />}
                        {isUnread && (
                          <span className="absolute -top-1 -right-1 flex h-3 w-3 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className={cn("text-base font-extrabold transition-colors", isCancelled ? "text-rose-900 line-through" : "text-slate-900 group-hover:text-blue-600")}>
                            {match.date}
                          </h3>
                          {hasSubtitle && (
                            <span className={cn("text-xs font-bold px-2 py-0.5 rounded-lg border", isCancelled ? "text-rose-800 bg-rose-200/60 border-rose-300 line-through" : "text-blue-600 bg-blue-50 border-blue-100")}>
                              {match.title}
                            </span>
                          )}
                          <span className={cn(
                            "rounded-md px-2 py-0.5 text-[10px] font-bold uppercase border",
                            isCancelled ? "bg-rose-200 text-rose-800 border-rose-300 font-black"
                            : isSettled ? "bg-slate-100 text-slate-500 border-slate-200"
                            : isPast ? "bg-slate-100 text-slate-500 border-slate-200" : "bg-amber-50 text-amber-600 border-amber-200"
                          )}>
                            {isCancelled ? "Odwołany" : isSettled ? "Rozliczony" : isPast ? "Zakończony" : "Nadchodzący"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs font-medium text-slate-400 flex-wrap">
                          <span className={cn("flex items-center gap-1 font-bold px-2 py-0.5 rounded-lg border", isCancelled ? "text-rose-800 bg-rose-200/50 border-rose-300 line-through" : "text-slate-700 bg-slate-100 border-slate-200")}>
                            <Timer className={cn("h-3 w-3", isCancelled ? "text-rose-600" : "text-blue-600")} />
                            {match.time_start?.slice(0, 5) || "19:00"} - {match.time_end?.slice(0, 5) || "21:00"}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <MapPin className={cn("h-3.5 w-3.5", isCancelled ? "text-rose-500" : "text-slate-400")} />
                            <span className={isCancelled ? "text-rose-800 line-through" : ""}>{match.location}</span>
                          </span>
                          {!isCancelled && (
                            <>
                              <span>•</span>
                              <span className="font-bold text-slate-600">{price} PLN / os.</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 border-t sm:border-t-0 border-slate-100 pt-3 sm:pt-0">
                      {!isCancelled && (
                        <>
                          <Button size="sm" variant="outline" onClick={(e) => copyMatchToClipboard(match, e)} className="rounded-xl text-[11px] font-bold gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer">
                            <Share2 className="h-3.5 w-3.5 text-blue-600" /> Udostępnij
                          </Button>

                          <Button size="sm" variant="outline" onClick={(e) => handleOpenBalancer(match, e)} className="rounded-xl text-[11px] font-bold gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer">
                            <Shuffle className="h-3.5 w-3.5 text-purple-600" /> Losuj A vs B
                          </Button>

                          <button onClick={(e) => handleOpenRosterPreview(match, e)} className="flex items-center gap-2 rounded-xl bg-blue-50/80 hover:bg-blue-100 px-3 py-1.5 border border-blue-200/80 text-xs font-bold text-blue-900 transition-all shadow-sm cursor-pointer">
                            <Users className="h-4 w-4 text-blue-600" />
                            <span>Skład: <strong>{roster.length}/{match.capacity || match.max_players || 12}</strong></span>
                          </button>

                          <div className="text-right min-w-[60px] mr-2">
                            <p className="text-[10px] uppercase font-bold text-slate-400">Wpłaty</p>
                            <p className={cn("text-xs font-extrabold", totalCollected > 0 ? "text-emerald-600" : "text-slate-400")}>{totalCollected} PLN</p>
                          </div>
                        </>
                      )}

                      {isAdmin && !isCancelled && (
                        <button onClick={(e) => handleCancelMatch(match.id, match.date, e)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 transition-all border border-rose-100 cursor-pointer" title="Odwołaj ten mecz">
                          <Ban className="h-4 w-4" />
                        </button>
                      )}

                      {isAdmin && (
                        <button onClick={(e) => handleDeleteMatch(match.id, match.date, e)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-200 transition-all border border-slate-200 cursor-pointer" title="Usuń z bazy">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}

                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all ml-1">
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

      {selectedMatchRosterPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4 text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Skład na mecz ({selectedMatchRosterPreview.date})
                </h2>
                <p className="text-[11px] font-semibold text-slate-400 mt-0.5">{selectedMatchRosterPreview.location}</p>
              </div>
              <button onClick={() => setSelectedMatchRosterPreview(null)} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span>Powołani gracze ({mainRoster(selectedMatchRosterPreview).length}/{selectedMatchRosterPreview.capacity || selectedMatchRosterPreview.max_players || 12})</span>
                <span className="text-emerald-600">
                  Wpłacono: {mainRoster(selectedMatchRosterPreview).filter((p: any) => p.paid || p.is_paid).length * Number(selectedMatchRosterPreview.price_per_player || 25)} PLN
                </span>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                {mainRoster(selectedMatchRosterPreview).length === 0 ? (
                  <p className="py-6 text-center text-xs font-semibold text-slate-400">Brak zapisanych graczy w głównym składzie.</p>
                ) : (
                  mainRoster(selectedMatchRosterPreview).map((p: any, i: number) => {
                    const isCurrentUser = user?.id === p.id || user?.email === p.email || user?.name === p.full_name || user?.full_name === p.name

                    return (
                      <div key={i} className={cn("flex items-center justify-between p-2.5 rounded-2xl border text-xs font-bold", isCurrentUser ? "bg-blue-50 border-blue-200 text-blue-900" : "bg-slate-50 border-slate-100")}>
                        <div className="flex items-center gap-2.5">
                          <span className={cn("flex h-7 w-7 items-center justify-center rounded-xl font-extrabold text-[11px]", isCurrentUser ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-700")}>
                            {i + 1}
                          </span>
                          <span>{p.name || p.full_name} {isCurrentUser && <span className="ml-1 text-[10px] uppercase text-blue-600 font-extrabold">(Ty)</span>}</span>
                        </div>

                        <span className={cn(
                          "inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black border",
                          (p.paid || p.is_paid) ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-slate-100 text-slate-400 border-slate-200"
                        )}>
                          {(p.paid || p.is_paid) ? <Check className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                          {(p.paid || p.is_paid) ? "Opłacono" : "Nieopłacone"}
                        </span>
                      </div>
                    )
                  })
                )}
              </div>

              {waitlist(selectedMatchRosterPreview).length > 0 && (
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <p className="text-xs font-bold text-purple-600">Lista rezerwowa ({waitlist(selectedMatchRosterPreview).length})</p>
                  <div className="space-y-1">
                    {waitlist(selectedMatchRosterPreview).map((p: any, i: number) => {
                      const isCurrentUser = user?.id === p.id || user?.email === p.email || user?.name === p.full_name || user?.full_name === p.name
                      return (
                        <div key={i} className={cn("p-2 rounded-xl border text-xs font-bold flex justify-between", isCurrentUser ? "bg-purple-100 border-purple-300 text-purple-900" : "bg-purple-50/50 border-purple-100 text-purple-900")}>
                          <span>{p.name || p.full_name} {isCurrentUser && <span className="ml-1 text-[10px] uppercase text-purple-600 font-extrabold">(Ty)</span>}</span>
                          <span className="text-[10px] uppercase text-purple-600 font-extrabold">Rezerwa #{i + 1}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <Button size="sm" onClick={() => setSelectedMatchRosterPreview(null)} className="rounded-xl text-xs font-bold bg-slate-900 text-white cursor-pointer">Zamknij</Button>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-black text-slate-900">Utwórz Nowy Mecz</h2>
              <button onClick={() => setShowCreateModal(false)} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMatch} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tytuł / Podtytuł (opcjonalnie)</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="np. Mecz o złote majtki (zostaw puste = tylko data)"
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
                    className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
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
                <Button type="button" variant="ghost" onClick={() => setShowCreateModal(false)} className="rounded-xl text-xs font-bold cursor-pointer">
                  Anuluj
                </Button>
                <Button type="submit" disabled={isCreating} className="rounded-xl bg-blue-600 hover:bg-blue-700 font-bold text-white text-xs cursor-pointer">
                  {isCreating ? "Tworzenie..." : "Zapisz mecz"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedMatchForTeams && (
        <TeamBalancerModal match={selectedMatchForTeams} onClose={() => setSelectedMatchForTeams(null)} />
      )}

      {selectedMatch && (
        <MatchDetail match={selectedMatch} currentUser={user} onClose={() => setSelectedMatch(null)} onChange={handleMatchChange} />
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
