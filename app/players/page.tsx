"use client"

import { useState, useEffect } from "react"
import {
  Users,
  Search,
  Trash2,
  Calendar,
  Plus,
  X,
  Mail,
  CheckCircle,
  Clock,
  CheckCircle2,
  UserCheck,
  UserX,
  Power,
  ShieldCheck,
  UserPlus,
  ArrowUp,
  ArrowDown,
  Coffee,
  Heart,
  Copy,
  Check,
  Sparkles
} from "lucide-react"
import { Sidebar } from "@/components/dashboard/sidebar"
import { NotificationsBell, type NotificationItem } from "@/components/dashboard/notifications-bell"
import { supabase } from "@/lib/supabase"
import { Badge } from "@/components/dashboard/ui-bits"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type GlobalPlayer = {
  id: string
  full_name: string
  email?: string
  player_status_id?: number
  role_id?: number
  created_at?: string
  matches_count?: number
  total_paid?: number
  is_core_roster?: boolean
  core_order?: number | null
  core_added_at?: string | null
}

type PlayerHistory = {
  match_date: string
  location: string
  status: string
  paid: boolean
  fee: number
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<GlobalPlayer[]>([])
  const [pendingPlayers, setPendingPlayers] = useState<GlobalPlayer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [statusFilter, setStatusFilter] = useState<"core" | "active" | "inactive" | "all">("core")

  // Modal wsparcia / zrzutki
  const [showSupportModal, setShowSupportModal] = useState(false)
  const [copiedBlik, setCopiedBlik] = useState(false)

  const [isAdding, setIsAdding] = useState(false)
  const [newFullName, setNewFullName] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [newIsCore, setNewIsCore] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [selectedPlayer, setSelectedPlayer] = useState<GlobalPlayer | null>(null)
  const [playerHistory, setPlayerHistory] = useState<PlayerHistory[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  const isAdmin =
    user?.role === "admin" ||
    user?.is_admin ||
    user?.role_id === 1 ||
    user?.email === "admin@admin.pl"

  useEffect(() => {
    const localUser = localStorage.getItem("volley_user")
    if (localUser) {
      setUser(JSON.parse(localUser))
    } else {
      setUser(null)
    }

    fetchPlayers()
  }, [])

  async function handleLogout() {
    localStorage.removeItem("volley_user")
    localStorage.clear()
    sessionStorage.clear()
    await supabase.auth.signOut()
    setUser(null)
    window.location.href = "/login"
  }

  async function fetchPlayers() {
    setIsLoading(true)

    const { data: dbPlayers, error: dbError } = await supabase
      .from("players")
      .select("*")
      .order("full_name", { ascending: true })

    if (dbError) {
      console.error("Błąd pobierania graczy z Supabase:", dbError.message)
    }

    const { data: regData } = await supabase.from("match_registrations").select("*")
    const { data: matchesData } = await supabase.from("matches").select("*")

    const priceMap: Record<string, number> = {}
    matchesData?.forEach((m: any) => {
      priceMap[m.id] = Number(m.price_per_player || 25)
    })

    const counts: Record<string, number> = {}
    const paidSums: Record<string, number> = {}

    regData?.forEach((reg: any) => {
      const pid = reg.player_id || reg.player || reg.player_name || reg.name
      if (!pid) return

      const key = String(pid).toLowerCase().trim()
      counts[key] = (counts[key] || 0) + 1

      if (reg.paid || reg.is_paid) {
        paidSums[key] = (paidSums[key] || 0) + (priceMap[reg.match_id || reg.match] || 25)
      }
    })

    if (dbPlayers && dbPlayers.length > 0) {
      const allPlayerList: GlobalPlayer[] = []
      const pendingList: GlobalPlayer[] = []

      dbPlayers.forEach((p) => {
        const fullName = p.full_name || p.name || ""
        const idKey = String(p.id).toLowerCase().trim()
        const nameKey = String(fullName).toLowerCase().trim()

        if (fullName.toLowerCase().includes("główny admin") || fullName.toLowerCase().includes("glowny admin")) {
          return
        }

        const matchesCount = counts[idKey] || counts[nameKey] || 0
        const totalPaid = paidSums[idKey] || paidSums[nameKey] || 0

        const playerObj: GlobalPlayer = {
          id: p.id,
          full_name: fullName,
          email: p.email || "Brak e-maila",
          player_status_id: p.player_status_id ?? 1,
          role_id: p.role_id,
          created_at: p.created_at,
          matches_count: matchesCount,
          total_paid: totalPaid,
          is_core_roster: !!p.is_core_roster,
          core_order: p.core_order ?? null,
          core_added_at: p.core_added_at ?? p.created_at
        }

        if (p.player_status_id === 3 || p.role_id === 3 || p.role === "pending") {
          pendingList.push(playerObj)
        } else {
          allPlayerList.push(playerObj)
        }
      })

      setPlayers(allPlayerList)
      setPendingPlayers(pendingList)
    } else {
      setPlayers([])
      setPendingPlayers([])
    }

    setIsLoading(false)
  }

  // Dodawanie/usuwanie ze stałego składu z zachowaniem kolejności
  async function toggleCoreRoster(player: GlobalPlayer, e?: React.MouseEvent) {
    if (e) e.stopPropagation()
    const nextState = !player.is_core_roster

    let nextOrder: number | null = null
    let nextAddedAt: string | null = null

    if (nextState) {
      const currentMaxOrder = players
        .filter((p) => p.is_core_roster && typeof p.core_order === "number")
        .reduce((max, p) => Math.max(max, p.core_order || 0), 0)

      nextOrder = currentMaxOrder + 1
      nextAddedAt = new Date().toISOString()
    }

    const { error } = await supabase
      .from("players")
      .update({
        is_core_roster: nextState,
        core_order: nextOrder,
        core_added_at: nextAddedAt
      })
      .eq("id", player.id)

    if (error) {
      alert(`Błąd aktualizacji: ${error.message}`)
    } else {
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === player.id
            ? { ...p, is_core_roster: nextState, core_order: nextOrder, core_added_at: nextAddedAt }
            : p
        )
      )
    }
  }

  // Zmiana kolejności powołań (↑ / ↓)
  async function moveCoreOrder(index: number, direction: "up" | "down", e: React.MouseEvent) {
    e.stopPropagation()
    const targetIndex = direction === "up" ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= allCorePlayersSorted.length) return

    const currentItem = allCorePlayersSorted[index]
    const swapItem = allCorePlayersSorted[targetIndex]

    const newCurrentOrder = swapItem.core_order ?? targetIndex + 1
    const newSwapOrder = currentItem.core_order ?? index + 1

    await supabase.from("players").update({ core_order: newCurrentOrder }).eq("id", currentItem.id)
    await supabase.from("players").update({ core_order: newSwapOrder }).eq("id", swapItem.id)

    setPlayers((prev) =>
      prev.map((p) => {
        if (p.id === currentItem.id) return { ...p, core_order: newCurrentOrder }
        if (p.id === swapItem.id) return { ...p, core_order: newSwapOrder }
        return p
      })
    )
  }

  async function togglePlayerStatus(player: GlobalPlayer, e: React.MouseEvent) {
    e.stopPropagation()

    const { data: statusList } = await supabase
      .from("player_status")
      .select("*")
      .order("id", { ascending: true })

    const activeStatusId =
      statusList?.find(
        (s: any) => s.name?.toLowerCase().includes("aktyw") && !s.name?.toLowerCase().includes("nie")
      )?.id || 1
    const inactiveStatusId =
      statusList?.find(
        (s: any) =>
          s.name?.toLowerCase().includes("nieaktyw") ||
          s.name?.toLowerCase().includes("zablok") ||
          s.name?.toLowerCase().includes("zawies")
      )?.id || (statusList && statusList.length > 1 ? statusList[1].id : 2)

    const isCurrentlyActive = player.player_status_id === activeStatusId || !player.player_status_id
    const targetStatusId = isCurrentlyActive ? inactiveStatusId : activeStatusId

    const actionText = isCurrentlyActive ? "dezaktywować (wyłączyć konto z powołań)" : "aktywować"
    if (!confirm(`Czy na pewno chcesz ${actionText} zawodnika "${player.full_name}"?`)) return

    const { error } = await supabase
      .from("players")
      .update({ player_status_id: targetStatusId })
      .eq("id", player.id)

    if (error) {
      alert(`Błąd aktualizacji statusu: ${error.message}`)
    } else {
      await fetchPlayers()
    }
  }

  async function approvePlayer(id: string) {
    const { data: statusList } = await supabase.from("player_status").select("*")
    const activeId =
      statusList?.find(
        (s: any) => s.name?.toLowerCase().includes("aktyw") && !s.name?.toLowerCase().includes("nie")
      )?.id || 1

    const { error } = await supabase
      .from("players")
      .update({ role_id: 2, player_status_id: activeId })
      .eq("id", id)

    if (error) {
      alert(`Błąd zatwierdzania: ${error.message}`)
    } else {
      fetchPlayers()
    }
  }

  async function rejectPlayer(id: string) {
    if (!confirm("Czy na pewno chcesz odrzucić i usunąć to zgłoszenie?")) return

    const { error } = await supabase.from("players").delete().eq("id", id)

    if (error) {
      alert(`Błąd odrzucania: ${error.message}`)
    } else {
      fetchPlayers()
    }
  }

  async function handleAddPlayer(e: React.FormEvent) {
    e.preventDefault()
    if (!newFullName.trim()) return

    setIsSubmitting(true)

    const emailToUse =
      newEmail.trim() || `${newFullName.trim().toLowerCase().replace(/\s+/g, ".")}@volley.local`

    const { data: statusList } = await supabase.from("player_status").select("*")
    const activeId =
      statusList?.find(
        (s: any) => s.name?.toLowerCase().includes("aktyw") && !s.name?.toLowerCase().includes("nie")
      )?.id || 1

    let coreOrderVal = null
    if (newIsCore) {
      const currentMax = players
        .filter((p) => p.is_core_roster && typeof p.core_order === "number")
        .reduce((max, p) => Math.max(max, p.core_order || 0), 0)
      coreOrderVal = currentMax + 1
    }

    const { error } = await supabase.from("players").insert([
      {
        full_name: newFullName.trim(),
        email: emailToUse,
        player_status_id: activeId,
        role_id: 2,
        is_core_roster: newIsCore,
        core_order: coreOrderVal,
        core_added_at: newIsCore ? new Date().toISOString() : null
      },
    ])

    if (error) {
      console.error("Błąd zapisu w Supabase:", error.message)
      alert(`Błąd zapisu w bazie danych: ${error.message}`)
    } else {
      setNewFullName("")
      setNewEmail("")
      setNewIsCore(false)
      setIsAdding(false)
      await fetchPlayers()
    }

    setIsSubmitting(false)
  }

  async function deletePlayer(id: string, e: React.MouseEvent) {
    e.stopPropagation()

    const playerToDelete = players.find((p) => p.id === id)
    if (!playerToDelete) return

    if (
      !confirm(
        `Czy na pewno chcesz trwale usunąć zawodnika "${playerToDelete.full_name}" z bazy? Zniknie on również ze statystyk.`
      )
    )
      return

    const { error } = await supabase.from("players").delete().eq("id", id)

    if (error) {
      console.error("Błąd podczas usuwania gracza:", error.message)
      alert(`Błąd podczas usuwania z bazy: ${error.message}`)
    } else {
      fetchPlayers()
    }
  }

  async function openPlayerHistory(player: GlobalPlayer) {
    setSelectedPlayer(player)
    setIsLoadingHistory(true)

    const { data: matchesData } = await supabase.from("matches").select("*")

    if (!matchesData) {
      setPlayerHistory([])
      setIsLoadingHistory(false)
      return
    }

    const history: PlayerHistory[] = []
    const pId = String(player.id).toLowerCase().trim()
    const pName = String(player.full_name).toLowerCase().trim()

    matchesData.forEach((m: any) => {
      if (Array.isArray(m.players)) {
        const found = m.players.find((p: any) => {
          const matchPid = String(p.id || "").toLowerCase().trim()
          const matchPName = String(p.name || p.full_name || "").toLowerCase().trim()
          return (matchPid && matchPid === pId) || (matchPName && matchPName === pName)
        })

        if (found) {
          history.push({
            match_date: m.date || "Brak daty",
            location: m.location || "Nieznana hala",
            status: found.role === "waitlist" ? "Rezerwa" : "Główny skład",
            paid: !!found.paid || !!found.is_paid,
            fee: Number(m.price_per_player || 25),
          })
        }
      }
    })

    setPlayerHistory(history)
    setIsLoadingHistory(false)
  }

  const activePlayers = players.filter((p) => p.player_status_id === 1 || !p.player_status_id)

  // Dokładne sortowanie stałego składu wg kolejności dodania / ręcznego ustawienia
  const allCorePlayersSorted = activePlayers
    .filter((p) => p.is_core_roster)
    .sort((a, b) => {
      if (a.core_order != null && b.core_order != null) return a.core_order - b.core_order
      if (a.core_order != null) return -1
      if (b.core_order != null) return 1
      return (a.core_added_at || "").localeCompare(b.core_added_at || "")
    })

  // Podział na Główny Skład (1-12) oraz Rezerwę (13+)
  const primaryCorePlayers = allCorePlayersSorted.slice(0, 12)
  const reserveCorePlayers = allCorePlayersSorted.slice(12)
  const nonCoreActivePlayers = activePlayers
    .filter((p) => !p.is_core_roster)
    .sort((a, b) => a.full_name.localeCompare(b.full_name))

  const filteredPlayers = players.filter((p) => {
    const matchesSearch =
      p.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.email && p.email.toLowerCase().includes(searchQuery.toLowerCase()))

    const isActive = p.player_status_id === 1 || !p.player_status_id

    if (statusFilter === "active") return matchesSearch && isActive
    if (statusFilter === "inactive") return matchesSearch && !isActive
    return matchesSearch
  })

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-900">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
        onLogout={handleLogout}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* NAGŁÓWEK ZE WSPARCIEM */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-amber-200/50 bg-gradient-to-r from-amber-50/90 via-white/95 to-amber-50/90 px-6 py-3.5 backdrop-blur-md shadow-sm">
          <div className="flex-1 flex items-center gap-3 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-slate-950 shadow-sm animate-pulse">
              <Coffee className="h-4 w-4 stroke-[2.5]" />
            </div>

            <p className="text-xs font-semibold text-slate-700 truncate">
              Podoba Ci się nasza inicjatywa?{" "}
              <strong className="text-slate-900 font-bold">
                Postaw kawę organizatorom lub wesprzyj rozwój projektu! ☕
              </strong>
            </p>

            <button
              onClick={() => setShowSupportModal(true)}
              className="ml-auto hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs px-4 py-2 shadow-sm transition-all cursor-pointer hover:scale-105 shrink-0 border border-amber-400"
            >
              <Heart className="h-3.5 w-3.5 fill-slate-950 text-slate-950" />
              Postaw kawę
            </button>
          </div>

          <div className="flex items-center gap-3 shrink-0 ml-4">
            <button
              onClick={() => setShowSupportModal(true)}
              className="sm:hidden flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-slate-950 shadow-sm"
              title="Postaw kawę"
            >
              <Coffee className="h-4 w-4" />
            </button>

            <NotificationsBell onNotificationClick={(notif: NotificationItem) => {}} />
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-8 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 shadow-sm">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight text-slate-900">Baza Zawodników</h1>
                <p className="text-xs text-slate-500 font-medium">
                  Zarządzaj kolejnością powołań, stałym składem i rezerwą meczową.
                </p>
              </div>
            </div>

            {isAdmin && (
              <Button
                size="sm"
                className="gap-2 rounded-2xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white cursor-pointer shadow-md shadow-blue-500/20 px-5 py-2.5 text-xs"
                onClick={() => setIsAdding(true)}
              >
                <Plus className="h-4 w-4" />
                Dodaj zawodnika do bazy
              </Button>
            )}
          </div>

          {/* WYSZUKIWARKA I ZAKŁADKI */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                placeholder="Szukaj zawodnika po imieniu lub e-mailu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs font-medium outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-sm transition-all"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80">
              {[
                { id: "core", label: `Stały skład (${allCorePlayersSorted.length})` },
                { id: "active", label: "Aktywni" },
                { id: "inactive", label: "Nieaktywni" },
                { id: "all", label: "Wszyscy w bazie" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id as any)}
                  className={cn(
                    "rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
                    statusFilter === tab.id
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/20 font-black"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* KAFEL ZGŁOSZEŃ OCZEKUJĄCYCH */}
          {isAdmin && pendingPlayers.length > 0 && (
            <div className="rounded-3xl border border-amber-300 bg-amber-50/80 p-5 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black uppercase tracking-wider text-amber-900 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-600" />
                  Konta oczekujące na zatwierdzenie ({pendingPlayers.length})
                </h2>
              </div>

              <div className="space-y-2">
                {pendingPlayers.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-amber-200 shadow-sm text-xs font-bold"
                  >
                    <div>
                      <p className="text-slate-900 font-extrabold">{p.full_name}</p>
                      <p className="text-[11px] text-slate-500 font-normal">{p.email}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => approvePlayer(p.id)}
                        className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] gap-1.5 h-8 px-3 cursor-pointer shadow-sm"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Zatwierdź
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => rejectPlayer(p.id)}
                        className="rounded-xl hover:bg-rose-50 text-rose-600 font-bold text-[11px] h-8 px-3 cursor-pointer"
                      >
                        Odrzuć
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PIONOWY, KOLOROWY I PRZEJRZYSTY WIDOK STAŁEGO SKŁADU */}
          {statusFilter === "core" ? (
            <div className="space-y-7">
              {/* Podsumowanie z gradientem */}
              <div className="rounded-3xl border border-blue-200/80 bg-gradient-to-br from-blue-50/90 via-indigo-50/40 to-white p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-blue-600" />
                    Kolejność Powołań i Stała Rezerwa
                  </h2>
                  <p className="text-xs text-slate-600 font-medium">
                    Gracze wchodzą na mecze ściśle według pozycji od #1 do #12. Jeśli ktoś wypadnie ze składu, automatycznie wchodzi gracz R1.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 text-xs font-black shrink-0">
                  <span className="px-3.5 py-2 rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-600/20">
                    Skład główny: {primaryCorePlayers.length}/12
                  </span>
                  {reserveCorePlayers.length > 0 && (
                    <span className="px-3.5 py-2 rounded-2xl bg-purple-600 text-white shadow-md shadow-purple-600/20">
                      Rezerwa: +{reserveCorePlayers.length}
                    </span>
                  )}
                </div>
              </div>

              {/* 1. PIONOWY SKŁAD GŁÓWNY (1-12) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-black uppercase tracking-wider text-blue-900 flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-blue-600 animate-pulse" />
                    Skład Główny ({primaryCorePlayers.length}/12)
                  </h3>
                  <span className="text-[11px] font-bold text-slate-400">Pozycje powołane z automatu</span>
                </div>

                {primaryCorePlayers.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs text-slate-400 font-medium">
                    Brak zawodników w składzie głównym. Wybierz graczy z listy poniżej.
                  </div>
                ) : (
                  <div className="flex flex-col space-y-2.5">
                    {primaryCorePlayers.map((player, idx) => (
                      <div
                        key={player.id}
                        onClick={() => openPlayerHistory(player)}
                        className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-blue-50/70 via-white to-white border border-blue-200/90 shadow-sm hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-600 text-white font-black text-xs shrink-0 shadow-md shadow-blue-600/20 group-hover:scale-105 transition-transform">
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="font-extrabold text-sm text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                              {player.full_name}
                            </p>
                            <p className="text-xs text-slate-400 truncate">{player.email}</p>
                          </div>
                        </div>

                        {isAdmin && (
                          <div className="flex items-center gap-2 shrink-0 ml-3">
                            {/* Bardzo wyraźne, klikalne przyciski góra/dół */}
                            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                              <button
                                disabled={idx === 0}
                                onClick={(e) => moveCoreOrder(idx, "up", e)}
                                className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-600 hover:text-white transition-all disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-blue-600 cursor-pointer"
                                title="Przesuń wyżej"
                              >
                                <ArrowUp className="h-4 w-4 stroke-[2.5]" />
                              </button>
                              <button
                                disabled={idx === allCorePlayersSorted.length - 1}
                                onClick={(e) => moveCoreOrder(idx, "down", e)}
                                className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-600 hover:text-white transition-all disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-blue-600 cursor-pointer"
                                title="Przesuń niżej"
                              >
                                <ArrowDown className="h-4 w-4 stroke-[2.5]" />
                              </button>
                            </div>

                            <button
                              onClick={(e) => toggleCoreRoster(player, e)}
                              className="text-xs font-black text-rose-700 bg-rose-50 hover:bg-rose-600 hover:text-white border border-rose-200 px-3 py-2 rounded-xl transition-all cursor-pointer shadow-sm hover:scale-105"
                              title="Usuń ze stałego składu"
                            >
                              Usuń
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. PIONOWA LISTA REZERWOWA (13+) */}
              {reserveCorePlayers.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-xs font-black uppercase tracking-wider text-purple-900 flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-purple-600" />
                      Stała Lista Rezerwowa ({reserveCorePlayers.length})
                    </h3>
                    <span className="text-[11px] font-bold text-purple-600">Wchodzą w tej kolejności w razie nieobecności</span>
                  </div>

                  <div className="flex flex-col space-y-2.5">
                    {reserveCorePlayers.map((player, rIdx) => {
                      const actualIdx = 12 + rIdx
                      return (
                        <div
                          key={player.id}
                          onClick={() => openPlayerHistory(player)}
                          className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-purple-50/80 via-white to-white border border-purple-200 shadow-sm hover:border-purple-400 hover:shadow-md transition-all cursor-pointer group"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-purple-600 text-white font-black text-xs shrink-0 shadow-md shadow-purple-600/20 group-hover:scale-105 transition-transform">
                              R{rIdx + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="font-extrabold text-sm text-slate-900 group-hover:text-purple-600 transition-colors truncate">
                                {player.full_name}
                              </p>
                              <p className="text-xs text-purple-400 truncate">{player.email}</p>
                            </div>
                          </div>

                          {isAdmin && (
                            <div className="flex items-center gap-2 shrink-0 ml-3">
                              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-purple-200 shadow-sm">
                                <button
                                  onClick={(e) => moveCoreOrder(actualIdx, "up", e)}
                                  className="p-1.5 rounded-lg text-purple-600 hover:bg-purple-600 hover:text-white transition-all cursor-pointer"
                                  title="Przesuń wyżej"
                                >
                                  <ArrowUp className="h-4 w-4 stroke-[2.5]" />
                                </button>
                                <button
                                  disabled={actualIdx === allCorePlayersSorted.length - 1}
                                  onClick={(e) => moveCoreOrder(actualIdx, "down", e)}
                                  className="p-1.5 rounded-lg text-purple-600 hover:bg-purple-600 hover:text-white transition-all disabled:opacity-20 cursor-pointer"
                                  title="Przesuń niżej"
                                >
                                  <ArrowDown className="h-4 w-4 stroke-[2.5]" />
                                </button>
                              </div>

                              <button
                                onClick={(e) => toggleCoreRoster(player, e)}
                                className="text-xs font-black text-rose-700 bg-rose-50 hover:bg-rose-600 hover:text-white border border-rose-200 px-3 py-2 rounded-xl transition-all cursor-pointer shadow-sm hover:scale-105"
                                title="Usuń z rezerwy"
                              >
                                Usuń
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* 3. POZOSTALI AKTYWNI GRACZE DO DODANIA (PIONOWA LISTA) */}
              {isAdmin && nonCoreActivePlayers.length > 0 && (
                <div className="space-y-3 pt-5 border-t border-slate-200">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                      <UserPlus className="h-4 w-4 text-blue-600" />
                      Pozostali aktywni gracze ({nonCoreActivePlayers.length})
                    </h3>
                    <span className="text-[11px] font-bold text-slate-400">Kliknij dodaj, aby dołączyć na koniec kolejki</span>
                  </div>

                  <div className="flex flex-col space-y-2">
                    {nonCoreActivePlayers.map((player) => (
                      <div
                        key={player.id}
                        className="flex items-center justify-between p-3 sm:p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:border-blue-300 transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-600 font-black text-xs shrink-0 border border-slate-200">
                            {player.full_name?.charAt(0).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-slate-800 truncate">{player.full_name}</p>
                            <p className="text-[11px] text-slate-400 truncate">{player.email}</p>
                          </div>
                        </div>

                        <button
                          onClick={(e) => toggleCoreRoster(player, e)}
                          className="flex items-center gap-1.5 text-xs font-black text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-md shadow-blue-500/20 hover:scale-105 shrink-0 ml-2"
                        >
                          <Plus className="h-4 w-4 stroke-[2.5]" /> Dodaj
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* STANDARDOWA TABELA */
            isLoading ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
                <p className="text-xs text-blue-600 font-bold animate-pulse">
                  Ładowanie bazy zawodników...
                </p>
              </div>
            ) : filteredPlayers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
                <p className="text-xs text-slate-400 font-medium">
                  Brak zawodników w tej kategorii.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-400 bg-slate-50/50">
                      <th className="px-6 py-4 font-bold">Zawodnik</th>
                      <th className="px-6 py-4 font-bold">Stały skład</th>
                      <th className="px-6 py-4 font-bold">Status konta</th>
                      <th className="px-6 py-4 font-bold">Rozegrane mecze</th>
                      <th className="px-6 py-4 font-bold">Suma wpłat</th>
                      {isAdmin && <th className="px-6 py-4 text-right font-bold">Akcje</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPlayers.map((player) => {
                      const isCurrentUser =
                        user?.id === player.id ||
                        user?.email?.toLowerCase() === player.email?.toLowerCase() ||
                        user?.full_name?.toLowerCase() === player.full_name?.toLowerCase() ||
                        user?.name?.toLowerCase() === player.full_name?.toLowerCase()

                      const isActive = player.player_status_id === 1 || !player.player_status_id

                      return (
                        <tr
                          key={player.id}
                          onClick={() => openPlayerHistory(player)}
                          className={cn(
                            "group transition-all cursor-pointer",
                            !isActive && "opacity-60 bg-slate-50/50",
                            isCurrentUser
                              ? "bg-blue-50/80 hover:bg-blue-100/80 font-semibold"
                              : "hover:bg-slate-50"
                          )}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <span
                                className={cn(
                                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-black text-xs border",
                                  !isActive
                                    ? "bg-slate-100 text-slate-400 border-slate-200"
                                    : isCurrentUser
                                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                    : "bg-blue-50 text-blue-600 border-blue-100"
                                )}
                              >
                                {player.full_name?.charAt(0).toUpperCase()}
                              </span>
                              <div>
                                <p
                                  className={cn(
                                    "font-bold transition-colors flex items-center gap-1.5",
                                    isCurrentUser
                                      ? "text-blue-600 font-extrabold"
                                      : "text-slate-900 group-hover:text-blue-600"
                                  )}
                                >
                                  <span>{player.full_name}</span>
                                  {isCurrentUser && (
                                    <span className="rounded-md bg-blue-100 px-1.5 py-0.5 text-[9px] font-black uppercase text-blue-700">
                                      (Ty)
                                    </span>
                                  )}
                                </p>
                                <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                                  <Mail className="h-3 w-3 text-slate-400" />
                                  {player.email}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            {isAdmin ? (
                              <button
                                onClick={(e) => toggleCoreRoster(player, e)}
                                className={cn(
                                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer",
                                  player.is_core_roster
                                    ? "bg-blue-50 text-blue-700 border-blue-200 shadow-sm hover:bg-blue-100"
                                    : "bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100 hover:text-slate-600"
                                )}
                              >
                                <ShieldCheck
                                  className={cn(
                                    "h-3.5 w-3.5",
                                    player.is_core_roster
                                      ? "text-blue-600"
                                      : "text-slate-300"
                                  )}
                                />
                                {player.is_core_roster ? "Stały skład" : "Zwykły"}
                              </button>
                            ) : (
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold border",
                                  player.is_core_roster
                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                    : "bg-slate-50 text-slate-400 border-slate-200"
                                )}
                              >
                                {player.is_core_roster ? "Stały skład" : "Standardowy"}
                              </span>
                            )}
                          </td>

                          <td className="px-6 py-4">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-extrabold border",
                                isActive
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                                  : "bg-slate-100 text-slate-500 border-slate-200"
                              )}
                            >
                              {isActive ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
                              {isActive ? "Aktywny" : "Wyłączony"}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <Badge
                              tone={
                                player.matches_count && player.matches_count > 0
                                  ? "success"
                                  : "neutral"
                              }
                            >
                              {player.matches_count || 0}{" "}
                              {player.matches_count === 1 ? "mecz" : "meczy"}
                            </Badge>
                          </td>

                          <td className="px-6 py-4 font-bold text-slate-900">
                            <span className="text-emerald-600">{player.total_paid || 0} PLN</span>
                          </td>

                          {isAdmin && (
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={(e) => togglePlayerStatus(player, e)}
                                  className={cn(
                                    "rounded-xl p-2 transition-all cursor-pointer border",
                                    isActive
                                      ? "bg-slate-50 text-slate-400 hover:bg-amber-50 hover:text-amber-600 border-slate-200"
                                      : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-emerald-200"
                                  )}
                                  title={
                                    isActive
                                      ? "Wyłącz konto (ukryj z powołań)"
                                      : "Włącz konto ponownie"
                                  }
                                >
                                  <Power className="h-4 w-4" />
                                </button>

                                <button
                                  onClick={(e) => deletePlayer(player.id, e)}
                                  className="rounded-xl p-2 text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-600 border border-slate-200 cursor-pointer"
                                  title="Usuń trwale z bazy"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}
        </main>
      </div>

      {/* MODAL WSPARCIA PROJEKTU */}
      {showSupportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-2xl space-y-4 my-8 text-slate-900 text-center">
            <div className="flex justify-end">
              <button
                onClick={() => setShowSupportModal(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
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
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText("500000000")
                      setCopiedBlik(true)
                      setTimeout(() => setCopiedBlik(false), 2000)
                    }}
                    className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {copiedBlik ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedBlik ? "Skopiowano!" : "Kopiuj"}
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/60 text-left text-xs font-semibold text-amber-900">
                💛 Dziękujemy za każdą cegiełkę – to dzięki Wam ta grupa żyje i gra w siatkówkę co tydzień!
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

      {/* MODAL DODAWANIA GRACZA */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <form
            onSubmit={handleAddPlayer}
            className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">Dodaj nowego zawodnika do bazy</h2>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="mb-1 block font-semibold text-slate-700">Imię i nazwisko</label>
                <input
                  type="text"
                  required
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="np. Jan Kowalski"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="mb-1 block font-semibold text-slate-700">
                  Adres e-mail (opcjonalnie)
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="np. jan@example.com"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div
                className="flex items-center gap-2 p-3 rounded-xl bg-blue-50 border border-blue-200 cursor-pointer"
                onClick={() => setNewIsCore(!newIsCore)}
              >
                <input
                  type="checkbox"
                  checked={newIsCore}
                  onChange={() => {}}
                  className="rounded border-blue-300 text-blue-600 focus:ring-blue-500 h-4 w-4 pointer-events-none"
                />
                <span className="font-bold text-blue-900 text-xs">
                  Dodaj od razu na koniec kolejki Stałego Składu
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAdding(false)}
                className="rounded-xl cursor-pointer"
              >
                Anuluj
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-md shadow-blue-500/20"
              >
                {isSubmitting ? "Zapisywanie..." : "Zapisz w bazie"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL HISTORII GRACZA */}
      {selectedPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl max-h-[85vh] flex flex-col border border-slate-200">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">{selectedPlayer.full_name}</h2>
                <p className="text-xs text-slate-400">{selectedPlayer.email}</p>
              </div>
              <button
                onClick={() => setSelectedPlayer(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Historia meczów i płatności
              </h3>
              {isLoadingHistory ? (
                <p className="text-xs text-slate-400 text-center py-8 animate-pulse">
                  Ładowanie historii...
                </p>
              ) : playerHistory.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">
                  Ten zawodnik nie brał jeszcze udziału w żadnym meczu.
                </p>
              ) : (
                playerHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 p-3 text-xs font-semibold"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">
                          {item.match_date} ({item.location})
                        </p>
                        <p className="text-[10px] text-slate-400">Status: {item.status}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-extrabold ${
                          item.paid
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                            : "bg-amber-50 text-amber-600 border border-amber-200"
                        }`}
                      >
                        {item.paid ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                        {item.paid ? `Opłacono (${item.fee} PLN)` : `Nieopłacone (${item.fee} PLN)`}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedPlayer(null)}
                className="rounded-xl cursor-pointer"
              >
                Zamknij
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
