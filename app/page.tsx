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
  X,
  CheckCircle2,
  UserCheck,
  Crown,
  Trophy,
  Trash2,
  Check,
  Ban,
  Timer,
  Repeat,
  Sparkles,
  ArrowRight,
  Palmtree,
  CalendarCheck,
  CalendarX,
  Coffee,
  Heart,
  CheckSquare,
  Square
} from "lucide-react"
import { Sidebar } from "@/components/dashboard/sidebar"
import { MatchDetail } from "@/components/dashboard/match-detail"
import { NotificationsBell, type NotificationItem } from "@/components/dashboard/notifications-bell"
import { Button } from "@/components/ui/button"
import { type Match, mainRoster, waitlist } from "@/lib/data"
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

  // Masowe usuwanie meczów (Admin)
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedBatchMatchIds, setSelectedBatchMatchIds] = useState<string[]>([])
  const [isBatchDeleting, setIsBatchDeleting] = useState(false)

  // Modal wsparcia
  const [showSupportModal, setShowSupportModal] = useState(false)

  // Zarządzanie obecnością / urlopem
  const [showAbsenceModal, setShowAbsenceModal] = useState(false)
  const [absencePreset, setAbsencePreset] = useState<"1week" | "2weeks" | "1month" | "custom">("2weeks")
  const [absenceStartDate, setAbsenceStartDate] = useState(new Date().toISOString().split("T")[0])
  const [absenceEndDate, setAbsenceEndDate] = useState("")
  const [selectedMatchesToLeave, setSelectedMatchesToLeave] = useState<string[]>([])
  const [isSavingAbsence, setIsSavingAbsence] = useState(false)

  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "upcoming" | "past" | "cancelled">("all")

  const [user, setUser] = useState<any>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [readMatchIds, setReadMatchIds] = useState<string[]>([])
  const [selectedMatchRosterPreview, setSelectedMatchRosterPreview] = useState<Match | null>(null)

  const isAdmin = user?.role === "admin" || user?.is_admin || user?.role_id === 1

  // Tworzenie meczu
  const [newDate, setNewDate] = useState("")
  const [newLocation, setNewLocation] = useState("Hala Sportowa ESCO Jaworze")
  const [newPrice, setNewPrice] = useState("25")
  const [newCapacity, setNewCapacity] = useState("12")
  const [newTitle, setNewTitle] = useState("")
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([])
  const [autoFillDefaultRoster, setAutoFillDefaultRoster] = useState(true)

  const [repeatFrequency, setRepeatFrequency] = useState<"none" | "1week" | "2weeks" | "1month">("none")
  const [durationMode, setDurationMode] = useState<"preset" | "custom_date">("preset")
  const [presetDurationMonths, setPresetDurationMonths] = useState<number>(2)
  const [repeatUntilDate, setRepeatUntilDate] = useState<string>("")

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

  useEffect(() => {
    if (showCreateModal && autoFillDefaultRoster && availablePlayers.length > 0) {
      const corePlayerIds = availablePlayers.filter((p) => p.is_core_roster).map((p) => p.id)
      const nonCorePlayerIds = availablePlayers.filter((p) => !p.is_core_roster).map((p) => p.id)
      const cap = Number(newCapacity) || 12

      if (corePlayerIds.length >= cap) {
        setSelectedPlayerIds(corePlayerIds)
      } else {
        const needed = cap - corePlayerIds.length
        setSelectedPlayerIds([...corePlayerIds, ...nonCorePlayerIds.slice(0, needed)])
      }
    }
  }, [showCreateModal, autoFillDefaultRoster, availablePlayers, newCapacity])

  useEffect(() => {
    if (!absenceStartDate) return
    const start = new Date(absenceStartDate)
    const end = new Date(start)

    if (absencePreset === "1week") {
      end.setDate(start.getDate() + 7)
      setAbsenceEndDate(end.toISOString().split("T")[0])
    } else if (absencePreset === "2weeks") {
      end.setDate(start.getDate() + 14)
      setAbsenceEndDate(end.toISOString().split("T")[0])
    } else if (absencePreset === "1month") {
      end.setMonth(start.getMonth() + 1)
      setAbsenceEndDate(end.toISOString().split("T")[0])
    }
  }, [absencePreset, absenceStartDate])

  useEffect(() => {
    if (!user || !absenceStartDate || !absenceEndDate) return
    const matchesInRange = matches
      .filter((m: any) => {
        const inRange = m.date >= absenceStartDate && m.date <= absenceEndDate
        const isSignedUp = m.players?.some((p: any) => p.id === user.id)
        return inRange && isSignedUp
      })
      .map((m) => m.id)

    setSelectedMatchesToLeave(matchesInRange)
  }, [absenceStartDate, absenceEndDate, matches, user])

  function notify(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function loadData() {
    setIsLoading(true)

    const { data: rawPlayers } = await supabase.from("players").select("*")
    let sortedActivePlayers: any[] = []

    if (rawPlayers) {
      const activeOnly = rawPlayers.filter(
        (p: any) => p.player_status_id === 1 || !p.player_status_id
      )

      const coreSquad = activeOnly
        .filter((p: any) => p.is_core_roster)
        .sort((a: any, b: any) => {
          if (a.core_order != null && b.core_order != null) return a.core_order - b.core_order
          if (a.core_order != null) return -1
          if (b.core_order != null) return 1
          return (a.core_added_at || "").localeCompare(b.core_added_at || "")
        })

      const nonCoreSquad = activeOnly
        .filter((p: any) => !p.is_core_roster)
        .sort((a: any, b: any) => (a.full_name || "").localeCompare(b.full_name || ""))

      sortedActivePlayers = [...coreSquad, ...nonCoreSquad]
      setAvailablePlayers(sortedActivePlayers)
    }

    let fetchedMatches: Match[] = []
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

      const matchPlayers = matchRegs.map((reg: any) => {
        const playerInfo = rawPlayers?.find((p: any) => p.id === reg.player_id)
        return {
          id: reg.player_id,
          name: playerInfo?.full_name || playerInfo?.name || "Zawodnik",
          full_name: playerInfo?.full_name || playerInfo?.name || "Zawodnik",
          email: playerInfo?.email || "",
          paid: reg.is_paid,
          is_paid: reg.is_paid,
          is_core_roster: playerInfo?.is_core_roster,
          core_order: playerInfo?.core_order,
          core_added_at: playerInfo?.core_added_at
        }
      })

      return { ...match, players: matchPlayers }
    })

    setMatches(processedMatches)
    setIsLoading(false)
  }

  function handleSelectMatch(match: Match) {
    if (isSelectionMode) {
      toggleSelectBatchMatch(match.id)
      return
    }

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

  async function handleCancelMatch(matchId: string, matchDate: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm(`Odwołać mecz z dnia ${matchDate}?`)) return

    const { data: statusList } = await supabase.from("matches_status").select("*")

    let cancelledStatusId = statusList?.find((s: any) =>
      s.name?.toLowerCase().includes("odwoł") ||
      s.name?.toLowerCase().includes("cancel")
    )?.id

    if (!cancelledStatusId && statusList && statusList.length > 0) {
      cancelledStatusId = statusList[statusList.length - 1].id
    }
    if (!cancelledStatusId) cancelledStatusId = 4

    const { error: matchError } = await supabase
      .from("matches")
      .update({ status_id: cancelledStatusId })
      .eq("id", matchId)

    if (matchError) {
      notify(`Błąd aktualizacji: ${matchError.message}`)
      return
    }

    notify("Mecz odwołany!")
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

  function toggleSelectBatchMatch(id: string) {
    setSelectedBatchMatchIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  function toggleSelectAllVisible() {
    const visibleIds = sortedMatches.map((m) => m.id)
    if (selectedBatchMatchIds.length === visibleIds.length) {
      setSelectedBatchMatchIds([])
    } else {
      setSelectedBatchMatchIds(visibleIds)
    }
  }

  async function handleBatchDelete() {
    if (selectedBatchMatchIds.length === 0) return
    if (!confirm(`Czy na pewno chcesz trwale usunąć zaznaczone mecze (${selectedBatchMatchIds.length})?`)) return

    setIsBatchDeleting(true)
    try {
      await supabase.from("match_registrations").delete().in("match_id", selectedBatchMatchIds)
      await supabase.from("announcements").delete().in("match_id", selectedBatchMatchIds)
      const { error } = await supabase.from("matches").delete().in("id", selectedBatchMatchIds)

      if (error) {
        notify(`Błąd usuwania: ${error.message}`)
      } else {
        notify(`Pomyślnie usunięto ${selectedBatchMatchIds.length} meczów.`)
        setSelectedBatchMatchIds([])
        setIsSelectionMode(false)
        await loadData()
      }
    } catch (err: any) {
      notify(`Błąd: ${err?.message}`)
    } finally {
      setIsBatchDeleting(false)
    }
  }

  async function handleSaveAbsence() {
    if (!user || selectedMatchesToLeave.length === 0) return

    setIsSavingAbsence(true)
    try {
      const { error } = await supabase
        .from("match_registrations")
        .delete()
        .eq("player_id", user.id)
        .in("match_id", selectedMatchesToLeave)

      if (error) {
        notify(`Błąd: ${error.message}`)
      } else {
        notify(`Wypisano Cię z ${selectedMatchesToLeave.length} wybranych meczów.`)
        setShowAbsenceModal(false)
        await loadData()
      }
    } catch (err: any) {
      notify(`Wystąpił błąd: ${err?.message}`)
    } finally {
      setIsSavingAbsence(false)
    }
  }

  function toggleMatchToLeave(matchId: string) {
    setSelectedMatchesToLeave((prev) =>
      prev.includes(matchId) ? prev.filter((id) => id !== matchId) : [...prev, matchId]
    )
  }

  function togglePlayerSelection(playerId: string) {
    setSelectedPlayerIds((prev) =>
      prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId]
    )
  }

  function calculateGeneratedDates(): string[] {
    if (!newDate) return []
    if (repeatFrequency === "none") return [newDate]

    const startDate = new Date(newDate)
    let endDate = new Date(newDate)

    if (durationMode === "preset") {
      endDate.setMonth(endDate.getMonth() + presetDurationMonths)
    } else if (durationMode === "custom_date" && repeatUntilDate) {
      endDate = new Date(repeatUntilDate)
    }

    const generatedDates: string[] = []
    const currentDate = new Date(startDate)

    while (currentDate <= endDate) {
      generatedDates.push(currentDate.toISOString().split("T")[0])

      if (repeatFrequency === "1week") {
        currentDate.setDate(currentDate.getDate() + 7)
      } else if (repeatFrequency === "2weeks") {
        currentDate.setDate(currentDate.getDate() + 14)
      } else if (repeatFrequency === "1month") {
        currentDate.setMonth(currentDate.getMonth() + 1)
      }
    }

    return generatedDates
  }

  async function handleCreateMatch(e: React.FormEvent) {
    e.preventDefault()
    if (!newDate) return

    setIsCreating(true)
    const todayStr = new Date().toISOString().split("T")[0]
    const datesToCreate = calculateGeneratedDates()

    const matchesToInsert = datesToCreate.map((matchDateStr) => {
      const initialStatusId = matchDateStr < todayStr ? 3 : 1
      const matchTitle = newTitle.trim() ? newTitle.trim() : matchDateStr

      return {
        title: matchTitle,
        date: matchDateStr,
        time_start: "19:00:00",
        time_end: "21:00:00",
        location: newLocation,
        price_per_player: Number(newPrice) || 25,
        capacity: Number(newCapacity) || 12,
        max_players: Number(newCapacity) || 12,
        status_id: initialStatusId,
        is_settled: false
      }
    })

    const { data: insertedMatches, error } = await supabase
      .from("matches")
      .insert(matchesToInsert)
      .select()

    if (error || !insertedMatches) {
      notify(`Błąd zapisu: ${error?.message || "Nieznany błąd"}`)
    } else {
      if (selectedPlayerIds.length > 0) {
        const allRegistrations: any[] = []
        insertedMatches.forEach((m: any) => {
          selectedPlayerIds.forEach((pid) => {
            allRegistrations.push({
              match_id: m.id,
              player_id: pid,
              is_paid: true
            })
          })
        })
        await supabase.from("match_registrations").insert(allRegistrations)
      }

      notify(datesToCreate.length > 1 ? `Utworzono ${datesToCreate.length} meczów!` : "Pomyślnie utworzono nowy mecz!")
      setShowCreateModal(false)
      setNewDate("")
      setNewTitle("")
      setSelectedPlayerIds([])
      setRepeatFrequency("none")
      setPresetDurationMonths(2)
      setRepeatUntilDate("")
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

  const activeMatches = matches.filter((m: any) => !m.matches_status?.name?.toLowerCase().includes("odwoł") && m.status_id !== 4)
  const upcomingMatches = activeMatches.filter((m: any) => m.date >= todayStr && !m.is_settled)
  const nearestMatch = upcomingMatches[0] || activeMatches[0]

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

  // Statystyki sezonu
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
  const nearestCapacity = Number(nearestMatch?.capacity || nearestMatch?.max_players || 12)
  const nearestPrice = Number(nearestMatch?.price_per_player || 25)
  const nearestSpotsLeft = Math.max(0, nearestCapacity - nearestRoster.length)
  const calculatedDatesCount = calculateGeneratedDates().length
  const modalCapacityNum = Number(newCapacity) || 12

  const userMatchesInAbsenceRange = matches.filter((m: any) => {
    const inRange = m.date >= absenceStartDate && m.date <= absenceEndDate
    const isSignedUp = m.players?.some((p: any) => p.id === user?.id)
    return inRange && isSignedUp
  })

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#EDF2F7] text-slate-900 selection:bg-blue-600 selection:text-white">

      {/* SIDEBAR NA STAŁE */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} user={user} onLogout={handleLogout} />

      {/* PRAWA SEKCJA Z PŁYNNYM SCROLLEM */}
      <div className="flex min-w-0 flex-1 flex-col h-screen overflow-y-auto">

        {/* HEADER */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/90 bg-white/95 px-6 py-3.5 backdrop-blur-md shadow-xs shrink-0">
          <div className="flex-1 flex items-center gap-3 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-slate-950 shadow-sm animate-pulse">
              <Coffee className="h-4 w-4 stroke-[2.5]" />
            </div>

            <p className="text-xs font-semibold text-slate-700 truncate">
              Podoba Ci się nasza inicjatywa? <strong className="text-slate-900 font-bold">Postaw kawę organizatorom lub wesprzyj rozwój projektu! ☕</strong>
            </p>

            <button
              onClick={() => setShowSupportModal(true)}
              className="ml-auto hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs px-3.5 py-1.5 shadow-sm transition-all cursor-pointer hover:scale-105 shrink-0 border border-amber-400"
            >
              <Heart className="h-3.5 w-3.5 fill-slate-950 text-slate-950" />
              Postaw kawę
            </button>
          </div>

          <div className="flex items-center gap-3 shrink-0 ml-4">
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

        {/* GŁÓWNA ZAWARTOŚĆ */}
        <main className="mx-auto w-full max-w-7xl flex-1 space-y-7 px-6 py-8 pb-36">

          {/* 1. SPOTLIGHT HERO CARD */}
          {nearestMatch && (
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-[#0B1528] to-blue-950 p-6 sm:p-8 text-white shadow-xl border border-blue-900/40 group">
              <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-blue-500/15 blur-3xl pointer-events-none group-hover:scale-110 transition-transform duration-700" />
              <div className="absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />

              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-blue-300">
                      <Sparkles className="h-3 w-3 text-blue-400 animate-pulse" />
                      Najbliższe spotkanie
                    </span>
                    {nearestMatch.title && nearestMatch.title !== nearestMatch.date && (
                      <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold text-slate-300">
                        {nearestMatch.title}
                      </span>
                    )}
                  </div>

                  <div>
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
                      {nearestMatch.date}
                    </h2>
                    <div className="flex items-center gap-4 text-xs font-semibold text-slate-300 mt-2 flex-wrap">
                      <span className="flex items-center gap-1.5 text-white">
                        <Timer className="h-4 w-4 text-blue-400" />
                        {nearestMatch.time_start?.slice(0, 5) || "19:00"} - {nearestMatch.time_end?.slice(0, 5) || "21:00"}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1.5 text-slate-300">
                        <MapPin className="h-4 w-4 text-blue-400" />
                        {nearestMatch.location}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                        <Wallet className="h-4 w-4" />
                        {nearestPrice} PLN / os.
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 lg:gap-6 border-t lg:border-t-0 border-white/10 pt-4 lg:pt-0">
                  <div className="rounded-2xl bg-white/5 border border-white/10 p-3.5 min-w-[170px] space-y-1.5">
                    <div className="flex justify-between text-[11px] font-bold">
                      <span className="text-slate-400">Skład główny:</span>
                      <span className="text-white font-extrabold">{nearestRoster.length} / {nearestCapacity}</span>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-500"
                        style={{ width: `${Math.min(100, (nearestRoster.length / nearestCapacity) * 100)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium">
                      {nearestSpotsLeft > 0 ? `Pozostało ${nearestSpotsLeft} wolnych miejsc` : "Komplet w składzie głównym"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
                    <Button
                      onClick={() => handleSelectMatch(nearestMatch)}
                      className="flex-1 sm:flex-initial rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs gap-2 px-6 py-3.5 shadow-lg shadow-blue-600/30 cursor-pointer transition-all hover:scale-[1.02]"
                    >
                      Szczegóły & Skład
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. STATYSTYKI SEZONU */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
                Statystyki Całego Sezonu
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-300 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Rozegrane Mecze</p>
                  <h3 className="text-xl font-black text-slate-900 mt-1">{totalSeasonMatches} Sesji</h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">W tym sezonie</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 shadow-xs">
                  <Trophy className="h-6 w-6 text-blue-600" />
                </div>
              </div>

              <div className="rounded-3xl border border-amber-200/70 bg-white p-5 shadow-xs hover:shadow-md hover:border-amber-300 transition-all duration-300 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Król Frekwencji</p>
                  <h3 className="text-xl font-black text-slate-900 mt-1 truncate max-w-[140px]">{attendanceKing.name}</h3>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">{attendanceKing.count} meczów</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100/70 text-amber-600 border border-amber-200/60 shadow-xs">
                  <Crown className="h-6 w-6 text-amber-500" />
                </div>
              </div>

              <div className="rounded-3xl border border-purple-200/70 bg-white p-5 shadow-xs hover:shadow-md hover:border-purple-300 transition-all duration-300 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-purple-500">Śr. Frekwencja</p>
                  <h3 className="text-xl font-black text-slate-900 mt-1">{avgAttendance} / 12</h3>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">Graczy na mecz</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100/70 text-purple-600 border border-purple-200/60 shadow-xs">
                  <Users className="h-6 w-6" />
                </div>
              </div>

              <div className="rounded-3xl border border-emerald-200/70 bg-white p-5 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all duration-300 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Budżet Sezonu</p>
                  <h3 className="text-xl font-black text-slate-900 mt-1">{totalSeasonCollected} PLN</h3>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">Suma składek</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100/70 text-emerald-600 border border-emerald-200/60 shadow-xs">
                  <Wallet className="h-6 w-6" />
                </div>
              </div>
            </div>
          </div>

          {/* 3. HARMONOGRAM MECZÓW I PRZYCISKI AKCJI (IDALNIE RÓWNA WYSOKOŚĆ I WYMIARY) */}
          <div className="pt-4 border-t border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-blue-600 border border-slate-200 shadow-xs">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">Harmonogram Meczów</h1>
                  <p className="text-xs text-slate-500 font-medium">Kliknij w mecz, aby zobaczyć szczegóły lub skład.</p>
                </div>
              </div>

              {/* RÓWNE I SPÓJNE PRZYCISKI (h-11, rounded-2xl, text-xs) */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  onClick={() => setShowAbsenceModal(true)}
                  className="h-11 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 font-black text-xs flex items-center gap-2 px-5 py-2.5 text-white shadow-md shadow-teal-600/20 transition-all cursor-pointer hover:scale-[1.02]"
                >
                  <Palmtree className="h-4 w-4 stroke-[2.5]" />
                  <span>Zgłoś urlop / nieobecność</span>
                </button>

                {isAdmin && (
                  <>
                    <button
                      onClick={() => {
                        setIsSelectionMode(!isSelectionMode)
                        setSelectedBatchMatchIds([])
                      }}
                      className={cn(
                        "h-11 rounded-2xl font-bold text-xs flex items-center gap-2 px-4 py-2.5 cursor-pointer shadow-xs transition-all border",
                        isSelectionMode
                          ? "bg-slate-900 text-white border-slate-900 shadow-md hover:bg-slate-800"
                          : "border-slate-300 bg-white hover:bg-slate-50 text-slate-800"
                      )}
                    >
                      <CheckSquare className={cn("h-4 w-4 stroke-[2.5]", isSelectionMode ? "text-blue-400" : "text-slate-600")} />
                      <span>{isSelectionMode ? "Anuluj zaznaczanie" : "Zarządzaj / Zaznacz"}</span>
                    </button>

                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="h-11 rounded-2xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs flex items-center gap-1.5 px-4 py-2.5 cursor-pointer shadow-xs transition-all"
                    >
                      <Plus className="h-4 w-4 stroke-[2.5]" />
                      <span>Nowy mecz</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Szukaj po dacie, hali lub tytule meczu..."
                  className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-xs transition-all"
                />
              </div>

              {isSelectionMode && (
                <button
                  onClick={toggleSelectAllVisible}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <CheckSquare className="h-3.5 w-3.5" />
                  {selectedBatchMatchIds.length === sortedMatches.length
                    ? "Odznacz wszystkie widoczne"
                    : "Zaznacz wszystkie widoczne"}
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1 overflow-x-auto">
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

          {/* 4. LISTA MECZÓW */}
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
                const isSettled = match.is_settled
                const isCancelled = match.status_id === 4 || match.matches_status?.name?.toLowerCase().includes("odwoł")
                const isPast = match.date < todayStr || match.status_id === 3
                const isUnread = !readMatchIds.includes(`match-${match.id}`)

                const hasSubtitle = match.title && match.title !== match.date
                const isUserRegistered = match.players?.some((p: any) => p.id === user?.id)
                const isSelectedForBatch = selectedBatchMatchIds.includes(match.id)

                return (
                  <div
                    key={`${match.id}-${idx}`}
                    onClick={() => handleSelectMatch(match)}
                    className={cn(
                      "group relative flex flex-col sm:flex-row sm:items-center justify-between rounded-3xl border border-l-4 p-4 sm:p-5 shadow-xs transition-all duration-300 cursor-pointer gap-4 select-none",
                      isSelectedForBatch
                        ? "border-l-blue-600 border-blue-400 bg-blue-50/80 shadow-md ring-2 ring-blue-400/30"
                        : isCancelled
                        ? "border-l-rose-500 border-slate-200/80 bg-slate-50/60 opacity-60 hover:opacity-100"
                        : isUserRegistered
                        ? "border-l-emerald-500 border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5"
                        : isPast || isSettled
                        ? "border-l-slate-400 border-slate-200/70 bg-slate-50/50"
                        : "border-l-blue-500 border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      {/* Checkbox w trybie masowego zaznaczania */}
                      {isSelectionMode ? (
                        <div
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleSelectBatchMatch(match.id)
                          }}
                          className={cn(
                            "flex h-12 w-12 items-center justify-center rounded-2xl border shrink-0 cursor-pointer transition-all",
                            isSelectedForBatch
                              ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/30 scale-105"
                              : "bg-white text-slate-400 border-slate-300 hover:border-blue-400"
                          )}
                        >
                          {isSelectedForBatch ? (
                            <CheckSquare className="h-6 w-6 stroke-[2.5]" />
                          ) : (
                            <Square className="h-6 w-6 stroke-[1.5]" />
                          )}
                        </div>
                      ) : (
                        <div className={cn(
                          "flex h-12 w-12 items-center justify-center rounded-2xl border shrink-0 relative transition-transform group-hover:scale-105",
                          isCancelled ? "bg-slate-100 text-slate-400 border-slate-200"
                          : isPast || isSettled ? "bg-slate-100 text-slate-400 border-slate-200" : "bg-blue-50 text-blue-600 border-blue-100"
                        )}>
                          {isCancelled ? <Ban className="h-6 w-6 text-slate-400" /> : <Calendar className="h-6 w-6" />}
                          {isUnread && (
                            <span className="absolute -top-1 -right-1 flex h-3 w-3 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
                          )}
                        </div>
                      )}

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className={cn("text-base font-extrabold transition-colors", isCancelled ? "text-slate-500 line-through" : "text-slate-900 group-hover:text-blue-600")}>
                            {match.date}
                          </h3>
                          {hasSubtitle && (
                            <span className={cn("text-xs font-bold px-2 py-0.5 rounded-lg border", isCancelled ? "text-slate-400 bg-slate-100 border-slate-200 line-through" : "text-blue-600 bg-blue-50 border-blue-100")}>
                              {match.title}
                            </span>
                          )}
                          <span className={cn(
                            "rounded-md px-2 py-0.5 text-[10px] font-bold uppercase border",
                            isCancelled ? "bg-rose-50 text-rose-700 border-rose-200 font-black"
                            : isSettled ? "bg-slate-100 text-slate-500 border-slate-200"
                            : isPast ? "bg-slate-100 text-slate-500 border-slate-200" : "bg-blue-50 text-blue-600 border-blue-200"
                          )}>
                            {isCancelled ? "Odwołany" : isSettled ? "Rozliczony" : isPast ? "Zakończony" : "Nadchodzący"}
                          </span>

                          {isUserRegistered && !isCancelled && (
                            <span className="rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-[10px] font-black">
                              Jesteś w składzie
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs font-medium text-slate-400 flex-wrap">
                          <span className={cn("flex items-center gap-1 font-bold px-2 py-0.5 rounded-lg border", isCancelled ? "text-slate-400 bg-slate-100 border-slate-200" : "text-slate-700 bg-slate-100 border-slate-200")}>
                            <Timer className={cn("h-3 w-3", isCancelled ? "text-slate-400" : "text-blue-600")} />
                            {match.time_start?.slice(0, 5) || "19:00"} - {match.time_end?.slice(0, 5) || "21:00"}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-slate-400" />
                            <span>{match.location}</span>
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

                    <div className="flex items-center justify-between sm:justify-end gap-2 border-t sm:border-t-0 border-slate-100 pt-3 sm:pt-0">
                      {!isCancelled && !isSelectionMode && (
                        <button onClick={(e) => handleOpenRosterPreview(match, e)} className="flex items-center gap-2 rounded-xl bg-blue-50/80 hover:bg-blue-100 px-3 py-1.5 border border-blue-200/80 text-xs font-bold text-blue-900 transition-all shadow-xs cursor-pointer">
                          <Users className="h-4 w-4 text-blue-600" />
                          <span>Skład: <strong>{roster.length}/{match.capacity || match.max_players || 12}</strong></span>
                        </button>
                      )}

                      {/* Akcje Admina w hoverze */}
                      {isAdmin && !isSelectionMode && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1">
                          {!isCancelled && (
                            <button onClick={(e) => handleCancelMatch(match.id, match.date, e)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 transition-all border border-rose-100 cursor-pointer" title="Odwołaj ten mecz">
                              <Ban className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button onClick={(e) => handleDeleteMatch(match.id, match.date, e)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-400 hover:bg-slate-200 transition-all border border-slate-200 cursor-pointer" title="Usuń z bazy">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}

                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all ml-1 shadow-xs">
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

      {/* PŁYWAJĄCY PASEK AKCJI DLA ZAZNACZONYCH MECZÓW */}
      {isSelectionMode && selectedBatchMatchIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-3xl bg-slate-900/95 backdrop-blur-md px-6 py-3.5 text-white shadow-2xl border border-slate-800 animate-in fade-in slide-in-from-bottom-5">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-600 text-xs font-black">
              {selectedBatchMatchIds.length}
            </span>
            <span className="text-xs font-bold text-slate-300">zaznaczonych spotkań</span>
          </div>

          <div className="h-4 w-px bg-slate-800" />

          <Button
            onClick={handleBatchDelete}
            disabled={isBatchDeleting}
            className="rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs px-5 py-2.5 gap-1.5 cursor-pointer shadow-md shadow-rose-600/30"
          >
            <Trash2 className="h-4 w-4" />
            {isBatchDeleting ? "Usuwanie..." : `Usuń zaznaczone (${selectedBatchMatchIds.length})`}
          </Button>

          <button
            onClick={() => {
              setIsSelectionMode(false)
              setSelectedBatchMatchIds([])
            }}
            className="text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer px-2"
          >
            Anuluj
          </button>
        </div>
      )}

      {/* MODAL WSPARCIA */}
      {showSupportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-2xl space-y-4 my-8 text-slate-900 text-center animate-in fade-in zoom-in-95">
            <div className="flex justify-end">
              <button onClick={() => setShowSupportModal(false)} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-col items-center space-y-2">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-100 text-amber-600 shadow-md shadow-amber-500/10">
                <Coffee className="h-8 w-8 animate-pulse" />
              </div>
              <h2 className="text-xl font-black text-slate-900">Postaw kawę drużynie! ☕</h2>
              <p className="text-xs text-slate-500 font-medium max-w-xs">
                Każda dobrowolna wpłata pomaga nam utrzymać serwery, kupować nowe piłki i sprzęt na treningi.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-1.5">
                <span className="text-[10px] font-black uppercase text-slate-400">Numer telefonu BLIK</span>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-extrabold text-slate-900">+48 500 000 000</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/60 text-left text-xs font-semibold text-amber-900">
                💛 Dziękujemy za każdą cegiełkę – to dzięki Wam ta grupa gra w siatkówkę co tydzień!
              </div>
            </div>

            <div className="pt-2">
              <Button
                onClick={() => setShowSupportModal(false)}
                className="w-full rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-3 cursor-pointer"
              >
                Zamknij okno
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL URLOPU */}
      {showAbsenceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-100 text-teal-700 border border-teal-200">
                  <Palmtree className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">Zgłoś urlop / nieobecność</h2>
                  <p className="text-xs text-slate-500 font-medium">Wybierz okres, a my wypiszemy Cię z meczów</p>
                </div>
              </div>
              <button onClick={() => setShowAbsenceModal(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">1. Na jak długo wyjeżdżasz / nie będzie Cię?</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "1week", label: "1 tydzień" },
                    { id: "2weeks", label: "2 tygodnie" },
                    { id: "1month", label: "1 miesiąc" },
                    { id: "custom", label: "Własne daty" }
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setAbsencePreset(opt.id as any)}
                      className={cn(
                        "py-3 px-2 rounded-2xl font-black text-xs border transition-all cursor-pointer text-center",
                        absencePreset === opt.id
                          ? "bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-600/20 scale-[1.02]"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Początek nieobecności:</label>
                  <input
                    type="date"
                    value={absenceStartDate}
                    onChange={(e) => setAbsenceStartDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Koniec nieobecności:</label>
                  <input
                    type="date"
                    value={absenceEndDate}
                    min={absenceStartDate}
                    onChange={(e) => {
                      setAbsenceEndDate(e.target.value)
                      setAbsencePreset("custom")
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    2. Twoje mecze w tym okresie ({userMatchesInAbsenceRange.length}):
                  </label>
                  <span className="text-[11px] font-bold text-teal-700">Kliknij mecz, aby go zachować</span>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {userMatchesInAbsenceRange.length === 0 ? (
                    <div className="p-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center text-xs font-semibold text-slate-400">
                      W tym przedziale czasowym nie jesteś zapisany na żaden mecz.
                    </div>
                  ) : (
                    userMatchesInAbsenceRange.map((m: any) => {
                      const isMarkedToLeave = selectedMatchesToLeave.includes(m.id)
                      return (
                        <div
                          key={m.id}
                          onClick={() => toggleMatchToLeave(m.id)}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer",
                            isMarkedToLeave
                              ? "bg-rose-50 border-rose-200 text-rose-950"
                              : "bg-emerald-50/60 border-emerald-200 text-emerald-950"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "flex h-8 w-8 items-center justify-center rounded-xl font-bold",
                              isMarkedToLeave ? "bg-rose-200 text-rose-700" : "bg-emerald-200 text-emerald-700"
                            )}>
                              {isMarkedToLeave ? <CalendarX className="h-4 w-4" /> : <CalendarCheck className="h-4 w-4" />}
                            </div>
                            <div>
                              <p className="font-bold text-xs">{m.date}</p>
                              <p className="text-[11px] opacity-70">{m.location}</p>
                            </div>
                          </div>

                          <span className={cn(
                            "px-2.5 py-1 rounded-xl text-[10px] font-black uppercase border",
                            isMarkedToLeave ? "bg-rose-100 text-rose-700 border-rose-300" : "bg-emerald-100 text-emerald-700 border-emerald-300"
                          )}>
                            {isMarkedToLeave ? "Wypisz mnie" : "Zostaję na meczu"}
                          </span>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowAbsenceModal(false)}
                className="rounded-xl text-xs font-bold cursor-pointer"
              >
                Anuluj
              </Button>

              <Button
                onClick={handleSaveAbsence}
                disabled={isSavingAbsence || selectedMatchesToLeave.length === 0}
                className="rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs px-6 py-3 shadow-lg shadow-rose-600/30 cursor-pointer disabled:opacity-50"
              >
                {isSavingAbsence
                  ? "Zapisywanie..."
                  : `Zatwierdź nieobecność (${selectedMatchesToLeave.length} meczów)`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {selectedMatchRosterPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in zoom-in-95">
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
                  Rozliczono: {mainRoster(selectedMatchRosterPreview).length * Number(selectedMatchRosterPreview.price_per_player || 25)} PLN
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

                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black border bg-emerald-50 text-emerald-600 border-emerald-200">
                          <Check className="h-3 w-3" /> Opłacono
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

      {/* MODAL TWORZENIA MECZU */}
      {showCreateModal && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-black text-slate-900">Utwórz Nowy Mecz</h2>
              <button onClick={() => setShowCreateModal(false)} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMatch} className="space-y-3.5 text-xs">
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
                <label className="block font-bold text-slate-700 mb-1">Data pierwszego meczu</label>
                <input
                  type="date"
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 font-medium outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-blue-950 flex items-center gap-1.5">
                    <Repeat className="h-4 w-4 text-blue-600" />
                    Częstotliwość spotkań
                  </label>
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: "none", label: "Pojedynczy" },
                    { id: "1week", label: "Co tydzień" },
                    { id: "2weeks", label: "Co 2 tyg." },
                    { id: "1month", label: "Co miesiąc" }
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setRepeatFrequency(opt.id as any)}
                      className={cn(
                        "py-2 px-1 rounded-xl font-bold text-[11px] border transition-all cursor-pointer text-center",
                        repeatFrequency === opt.id
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {repeatFrequency !== "none" && (
                  <div className="pt-2 border-t border-blue-100 space-y-2.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-700">Jak długo powielać?</span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setDurationMode("preset")}
                          className={cn(
                            "px-2 py-0.5 rounded-lg font-bold text-[10px] cursor-pointer",
                            durationMode === "preset" ? "bg-blue-600 text-white" : "bg-slate-200/70 text-slate-600"
                          )}
                        >
                          Okres (mies.)
                        </button>
                        <button
                          type="button"
                          onClick={() => setDurationMode("custom_date")}
                          className={cn(
                            "px-2 py-0.5 rounded-lg font-bold text-[10px] cursor-pointer",
                            durationMode === "custom_date" ? "bg-blue-600 text-white" : "bg-slate-200/70 text-slate-600"
                          )}
                        >
                          Data końcowa
                        </button>
                      </div>
                    </div>

                    {durationMode === "preset" ? (
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { months: 1, label: "1 miesiąc" },
                          { months: 2, label: "2 miesiące" },
                          { months: 3, label: "3 miesiące" },
                          { months: 6, label: "Pół roku" }
                        ].map((p) => (
                          <button
                            key={p.months}
                            type="button"
                            onClick={() => setPresetDurationMonths(p.months)}
                            className={cn(
                              "py-1.5 rounded-xl font-bold text-[10px] border transition-all cursor-pointer",
                              presetDurationMonths === p.months
                                ? "bg-blue-100 text-blue-800 border-blue-300 font-black"
                                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                            )}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div>
                        <input
                          type="date"
                          value={repeatUntilDate}
                          min={newDate}
                          onChange={(e) => setRepeatUntilDate(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-bold text-slate-800 outline-none focus:border-blue-500"
                        />
                      </div>
                    )}

                    {newDate && (
                      <div className="bg-white/80 rounded-xl p-2 border border-blue-200/60 text-[11px] font-bold text-blue-900 flex items-center justify-between">
                        <span>Zostanie wygenerowanych:</span>
                        <span className="bg-blue-600 text-white px-2 py-0.5 rounded-lg text-xs font-black">
                          {calculatedDatesCount} meczów
                        </span>
                      </div>
                    )}
                  </div>
                )}
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

              {/* SEKCJA POWOŁAŃ ZE STAŁEGO SKŁADU */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 flex items-center gap-1.5">
                    <UserCheck className="h-4 w-4 text-blue-600" />
                    Powołani Zawodnicy ({selectedPlayerIds.length})
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedPlayerIds.length > 0) {
                        setSelectedPlayerIds([])
                        setAutoFillDefaultRoster(false)
                      } else {
                        const coreIds = availablePlayers.filter((p) => p.is_core_roster).map((p) => p.id)
                        const nonCoreIds = availablePlayers.filter((p) => !p.is_core_roster).map((p) => p.id)
                        if (coreIds.length >= modalCapacityNum) {
                          setSelectedPlayerIds(coreIds)
                        } else {
                          const needed = modalCapacityNum - coreIds.length
                          setSelectedPlayerIds([...coreIds, ...nonCoreIds.slice(0, needed)])
                        }
                        setAutoFillDefaultRoster(true)
                      }
                    }}
                    className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    {selectedPlayerIds.length > 0 ? "Wyczyść wszystkich" : "Zastosuj stały skład"}
                  </button>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1.5 border border-slate-200 rounded-2xl p-2 bg-slate-50/50">
                  {availablePlayers.length === 0 ? (
                    <p className="text-[11px] text-slate-400 text-center py-2">Brak aktywnych zawodników w bazie.</p>
                  ) : (
                    availablePlayers.map((player) => {
                      const isSelected = selectedPlayerIds.includes(player.id)
                      const playerName = player.name || player.full_name

                      const selectedIndex = selectedPlayerIds.indexOf(player.id)
                      const isMainSquad = isSelected && selectedIndex < modalCapacityNum
                      const isReserve = isSelected && selectedIndex >= modalCapacityNum
                      const reserveNumber = selectedIndex - modalCapacityNum + 1

                      return (
                        <div
                          key={player.id}
                          onClick={() => togglePlayerSelection(player.id)}
                          className={cn(
                            "flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold cursor-pointer border transition-all",
                            isMainSquad
                              ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                              : isReserve
                              ? "bg-purple-50 border-purple-200 text-purple-950"
                              : "bg-white border-slate-100 text-slate-400 hover:bg-slate-100/70"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 pointer-events-none"
                            />
                            <span className={cn(!isSelected && "line-through opacity-60")}>{playerName}</span>
                          </div>

                          {isMainSquad && (
                            <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md uppercase">
                              Skład ({selectedIndex + 1})
                            </span>
                          )}

                          {isReserve && (
                            <span className="text-[9px] font-black text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md uppercase">
                              Rezerwa #{reserveNumber}
                            </span>
                          )}

                          {!isSelected && (
                            <span className="text-[9px] font-bold text-slate-400 uppercase">
                              Nieobecny
                            </span>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <Button type="button" variant="ghost" onClick={() => setShowCreateModal(false)} className="rounded-xl text-xs font-bold cursor-pointer">
                  Anuluj
                </Button>
                <Button type="submit" disabled={isCreating} className="rounded-xl bg-blue-600 hover:bg-blue-700 font-bold text-white text-xs cursor-pointer shadow-md shadow-blue-500/20">
                  {isCreating ? "Tworzenie..." : repeatFrequency === "none" ? "Zapisz mecz" : `Wygeneruj ${calculatedDatesCount} meczów`}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedMatch && (
        <MatchDetail match={selectedMatch} currentUser={user} onClose={() => setSelectedMatch(null)} onChange={handleMatchChange} />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full bg-slate-900/90 backdrop-blur-md px-4 py-2.5 text-xs font-bold text-white shadow-xl animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          {toast}
        </div>
      )}
    </div>
  )
}
