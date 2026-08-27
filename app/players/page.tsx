"use client"

import { useState, useEffect, useRef, useLayoutEffect } from "react"
import { Space_Grotesk, Oswald } from "next/font/google"
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
  Download,
  CheckSquare,
  Square,
  ChevronDown
} from "lucide-react"
import { Sidebar } from "@/components/dashboard/sidebar"
import { NotificationsBell, type NotificationItem } from "@/components/dashboard/notifications-bell"
import { SupportModal } from "@/components/dashboard/support-modal"
import { Modal } from "@/components/ui/modal"
import { ConfirmDialog, type ConfirmDialogState } from "@/components/ui/confirm-dialog"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { cn, formatDatePL, normalizeSearchText, fuzzySearchMatch } from "@/lib/utils"

// ────────────────────────────────────────────────────────────────
// Te same tokeny co reszta dashboardu ("Under the Lights")
// ────────────────────────────────────────────────────────────────
const display = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"] })
const score = Oswald({ subsets: ["latin"], weight: ["500", "600", "700"] })

const INK = "#0B1120"
const INK_SOFT = "#121B33"
const COBALT = "#2C4BFF"
const YELLOW = "#FFD23F"
const CORAL = "#FF5A5F"
const MINT = "#00C48C"
const VIOLET = "#7A5CFF"

const netPattern: React.CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 16px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 16px)"
}

// Płynne podliczanie liczb — ten sam komponent co na stronie głównej
function CountUp({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const [displayValue, setDisplayValue] = useState(value)
  const prevValue = useRef(value)

  useEffect(() => {
    const from = prevValue.current
    const to = value
    if (from === to) return

    const duration = 600
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

function buildPlayerSearchTokens(p: GlobalPlayer): string[] {
  return normalizeSearchText(`${p.full_name || ""} ${p.email || ""}`).split(/[^a-z0-9]+/).filter(Boolean)
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<GlobalPlayer[]>([])
  const [pendingPlayers, setPendingPlayers] = useState<GlobalPlayer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [statusFilter, setStatusFilter] = useState<"core" | "active" | "inactive" | "all">("core")
  const [toast, setToast] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>(null)

  // Skrócone listy graczy na mobile (patrz LIST_PREVIEW_LIMIT niżej) — wracają do skrótu
  // przy każdej zmianie zakładki/wyszukiwania, żeby nie zostać przypadkiem "rozwinięte" po cichu.
  const [showAllPlayers, setShowAllPlayers] = useState(false)
  const [showAllNonCore, setShowAllNonCore] = useState(false)
  useEffect(() => {
    setShowAllPlayers(false)
    setShowAllNonCore(false)
  }, [statusFilter, searchQuery])

  // Suwak pod aktywną zakładką filtra — ten sam mechanizm co na stronie głównej
  const [pillStyle, setPillStyle] = useState({ left: 0, width: 0, top: 0, height: 0 })
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  // Masowe akcje admina w widoku tabeli
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedBulkIds, setSelectedBulkIds] = useState<string[]>([])
  const [isBulkProcessing, setIsBulkProcessing] = useState(false)

  // Modal wsparcia / zrzutki
  const [showSupportModal, setShowSupportModal] = useState(false)

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

  useLayoutEffect(() => {
    const el = tabRefs.current[statusFilter]
    if (el) {
      setPillStyle({ left: el.offsetLeft, width: el.offsetWidth, top: el.offsetTop, height: el.offsetHeight })
    }
  }, [statusFilter, isLoading])

  function notify(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function handleLogout() {
    localStorage.removeItem("volley_user")
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
      notify(`Błąd aktualizacji: ${error.message}`)
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

  function togglePlayerStatus(player: GlobalPlayer, e: React.MouseEvent) {
    e.stopPropagation()
    performStatusToggleConfirm([player])
  }

  async function performStatusToggleConfirm(targetPlayers: GlobalPlayer[]) {
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

    if (targetPlayers.length === 1) {
      const player = targetPlayers[0]
      const isCurrentlyActive = player.player_status_id === activeStatusId || !player.player_status_id
      const targetStatusId = isCurrentlyActive ? inactiveStatusId : activeStatusId

      setConfirmDialog({
        title: isCurrentlyActive ? "Dezaktywować zawodnika?" : "Aktywować zawodnika?",
        message: isCurrentlyActive
          ? `"${player.full_name}" zniknie z listy powołań, dopóki nie aktywujesz konta ponownie.`
          : `"${player.full_name}" wróci do puli aktywnych zawodników.`,
        confirmLabel: isCurrentlyActive ? "Dezaktywuj" : "Aktywuj",
        danger: isCurrentlyActive,
        onConfirm: () => applyStatusChange([player.id], targetStatusId)
      })
    }
  }

  async function applyStatusChange(ids: string[], targetStatusId: number) {
    setConfirmDialog(null)
    const { error } = await supabase.from("players").update({ player_status_id: targetStatusId }).in("id", ids)

    if (error) {
      notify(`Błąd aktualizacji statusu: ${error.message}`)
    } else {
      notify(ids.length > 1 ? `Zaktualizowano status ${ids.length} zawodników.` : "Zaktualizowano status zawodnika.")
      await fetchPlayers()
    }
  }

  function handleBulkSetStatus(active: boolean) {
    if (selectedBulkIds.length === 0) return
    setConfirmDialog({
      title: active ? "Aktywować zaznaczonych?" : "Dezaktywować zaznaczonych?",
      message: `Zmiana obejmie ${selectedBulkIds.length} zaznaczonych zawodników.`,
      confirmLabel: active ? "Aktywuj" : "Dezaktywuj",
      danger: !active,
      onConfirm: () => performBulkStatus(active)
    })
  }

  async function performBulkStatus(active: boolean) {
    setIsBulkProcessing(true)
    const { data: statusList } = await supabase.from("player_status").select("*").order("id", { ascending: true })
    const activeStatusId =
      statusList?.find((s: any) => s.name?.toLowerCase().includes("aktyw") && !s.name?.toLowerCase().includes("nie"))?.id || 1
    const inactiveStatusId =
      statusList?.find(
        (s: any) =>
          s.name?.toLowerCase().includes("nieaktyw") ||
          s.name?.toLowerCase().includes("zablok") ||
          s.name?.toLowerCase().includes("zawies")
      )?.id || (statusList && statusList.length > 1 ? statusList[1].id : 2)

    await applyStatusChange(selectedBulkIds, active ? activeStatusId : inactiveStatusId)
    setSelectedBulkIds([])
    setIsSelectionMode(false)
    setIsBulkProcessing(false)
  }

  function handleBulkDelete() {
    if (selectedBulkIds.length === 0) return
    setConfirmDialog({
      title: "Usunąć zaznaczonych zawodników?",
      message: `Ta operacja jest nieodwracalna. ${selectedBulkIds.length} zawodników zniknie z bazy razem ze statystykami.`,
      confirmLabel: "Usuń trwale",
      danger: true,
      onConfirm: performBulkDelete
    })
  }

  async function performBulkDelete() {
    setConfirmDialog(null)
    setIsBulkProcessing(true)
    const { error } = await supabase.from("players").delete().in("id", selectedBulkIds)

    if (error) {
      notify(`Błąd usuwania: ${error.message}`)
    } else {
      notify(`Usunięto ${selectedBulkIds.length} zawodników z bazy.`)
      setSelectedBulkIds([])
      setIsSelectionMode(false)
      await fetchPlayers()
    }
    setIsBulkProcessing(false)
  }

  function toggleBulkSelect(id: string) {
    setSelectedBulkIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function approvePlayer(id: string) {
    performApprove(id)
  }

  async function performApprove(id: string) {
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
      notify(`Błąd zatwierdzania: ${error.message}`)
    } else {
      notify("Konto zatwierdzone.")
      fetchPlayers()
    }
  }

  function rejectPlayer(id: string, name: string) {
    setConfirmDialog({
      title: "Odrzucić zgłoszenie?",
      message: `Zgłoszenie "${name}" zostanie trwale usunięte z bazy.`,
      confirmLabel: "Odrzuć",
      danger: true,
      onConfirm: () => performReject(id)
    })
  }

  async function performReject(id: string) {
    setConfirmDialog(null)
    const { error } = await supabase.from("players").delete().eq("id", id)

    if (error) {
      notify(`Błąd odrzucania: ${error.message}`)
    } else {
      notify("Zgłoszenie odrzucone.")
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
      notify(`Błąd zapisu w bazie danych: ${error.message}`)
    } else {
      notify(`Dodano "${newFullName.trim()}" do bazy.`)
      setNewFullName("")
      setNewEmail("")
      setNewIsCore(false)
      setIsAdding(false)
      await fetchPlayers()
    }

    setIsSubmitting(false)
  }

  function deletePlayer(player: GlobalPlayer, e: React.MouseEvent) {
    e.stopPropagation()
    setConfirmDialog({
      title: "Usunąć zawodnika z bazy?",
      message: `Ta operacja jest nieodwracalna. "${player.full_name}" zniknie również ze statystyk i historii meczów.`,
      confirmLabel: "Usuń trwale",
      danger: true,
      onConfirm: () => performDeletePlayer(player.id)
    })
  }

  async function performDeletePlayer(id: string) {
    setConfirmDialog(null)
    const { error } = await supabase.from("players").delete().eq("id", id)

    if (error) {
      notify(`Błąd podczas usuwania z bazy: ${error.message}`)
    } else {
      notify("Zawodnik usunięty z bazy.")
      fetchPlayers()
    }
  }

  async function openPlayerHistory(player: GlobalPlayer) {
    if (isSelectionMode) {
      toggleBulkSelect(player.id)
      return
    }

    setSelectedPlayer(player)
    setIsLoadingHistory(true)

    // Historia rejestracji żyje w `match_registrations`, nie w polu `players` na `matches`
    // (którego ta tabela w ogóle nie ma) — stąd poprzednio historia zawsze wychodziła pusta.
    const [{ data: allRegs }, { data: matchesData }] = await Promise.all([
      supabase.from("match_registrations").select("*"),
      supabase.from("matches").select("*")
    ])

    const matchMap: Record<string, any> = {}
    matchesData?.forEach((m: any) => { matchMap[m.id] = m })

    const regsByMatch: Record<string, any[]> = {}
    ;(allRegs || []).forEach((reg: any) => {
      if (!regsByMatch[reg.match_id]) regsByMatch[reg.match_id] = []
      regsByMatch[reg.match_id].push(reg)
    })

    const history: PlayerHistory[] = []

    Object.entries(regsByMatch).forEach(([matchId, regs]) => {
      const m = matchMap[matchId]
      if (!m) return

      // Kolejność zapisu decyduje kto trafia do składu głównego, a kto na rezerwę — ta sama
      // reguła co w lib/data.ts (mainRoster/waitlist)
      const sorted = [...regs].sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime())
      const myIndex = sorted.findIndex((r) => r.player_id === player.id)
      if (myIndex === -1) return

      const capacity = Number(m.capacity || m.max_players || 12)
      const myReg = sorted[myIndex]

      history.push({
        match_date: m.date || "",
        location: m.location || "Nieznana hala",
        status: myIndex < capacity ? "Główny skład" : "Rezerwa",
        paid: !!(myReg.paid || myReg.is_paid),
        fee: Number(m.price_per_player || 25),
      })
    })

    history.sort((a, b) => b.match_date.localeCompare(a.match_date))
    setPlayerHistory(history)
    setIsLoadingHistory(false)
  }

  function exportPlayersCsv() {
    const header = ["Imię i nazwisko", "E-mail", "Status konta", "Stały skład", "Rozegrane mecze", "Suma wpłat (PLN)"]
    const rows = players.map((p) => {
      const isActive = p.player_status_id === 1 || !p.player_status_id
      return [
        p.full_name,
        p.email || "",
        isActive ? "Aktywny" : "Wyłączony",
        p.is_core_roster ? "Tak" : "Nie",
        String(p.matches_count || 0),
        String(p.total_paid || 0)
      ]
    })

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
      .join("\n")

    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `zawodnicy_${new Date().toISOString().split("T")[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
    notify("Wyeksportowano listę zawodników.")
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

  // Filtrowanie wyszukiwarką (fuzzy, tolerancyjna na literówki) — pozycja numeru w składzie
  // głównym/rezerwie liczona jest z ORYGINALNEJ, nieprzefiltrowanej listy, żeby wyszukiwanie
  // nie zaburzało numeracji kolejności powołań
  function matchesSearch(p: GlobalPlayer): boolean {
    return fuzzySearchMatch(buildPlayerSearchTokens(p), searchQuery)
  }

  const primaryCoreWithIdx = primaryCorePlayers.map((player, idx) => ({ player, idx })).filter(({ player }) => matchesSearch(player))
  const reserveCoreWithIdx = reserveCorePlayers.map((player, rIdx) => ({ player, actualIdx: 12 + rIdx })).filter(({ player }) => matchesSearch(player))
  const filteredNonCoreActive = nonCoreActivePlayers.filter(matchesSearch)

  const filteredPlayers = players.filter((p) => {
    if (!matchesSearch(p)) return false
    const isActive = p.player_status_id === 1 || !p.player_status_id

    if (statusFilter === "active") return isActive
    if (statusFilter === "inactive") return !isActive
    return true
  })

  const visibleBulkIds = filteredPlayers.map((p) => p.id)

  // Skrócone widoki list na mobile (karty) — sama tabela desktopowa i tak mieści się bez
  // przewijania grozy, ale karty na telefonie potrafią ciągnąć się przez 20-30 zawodników.
  // Pełna lista zawsze widoczna przy wyszukiwaniu i w trybie zaznaczania — inaczej licznik
  // "zaznaczono N" mógłby pokazywać więcej niż faktycznie widać na ekranie.
  const LIST_PREVIEW_LIMIT = 4
  const isPlayerListTruncated = !isSelectionMode && !searchQuery && filteredPlayers.length > LIST_PREVIEW_LIMIT
  const visiblePlayers = isPlayerListTruncated && !showAllPlayers ? filteredPlayers.slice(0, LIST_PREVIEW_LIMIT) : filteredPlayers
  const isNonCoreListTruncated = !isSelectionMode && !searchQuery && filteredNonCoreActive.length > LIST_PREVIEW_LIMIT
  const visibleNonCoreActive = isNonCoreListTruncated && !showAllNonCore ? filteredNonCoreActive.slice(0, LIST_PREVIEW_LIMIT) : filteredNonCoreActive

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

        {/* NAGŁÓWEK — ten sam wzorzec co reszta appki */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 pl-16 pr-6 py-3 lg:px-6 backdrop-blur-md shrink-0">
          <div className="flex-1 flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#FFD23F]/90 text-[#0B1120]">
              <Coffee className="h-3.5 w-3.5 stroke-[2.5]" />
            </div>

            <p className="text-xs font-medium text-slate-500 truncate">
              Podoba Ci się nasza inicjatywa? <strong className="text-slate-700 font-semibold">Postaw kawę organizatorom lub wesprzyj rozwój projektu!</strong>
            </p>

            <button
              onClick={() => setShowSupportModal(true)}
              className="ml-auto hidden sm:inline-flex items-center gap-1.5 rounded-full bg-[#0B1120] hover:bg-[#1A2340] text-white font-bold text-xs px-4 py-2 shadow-sm transition-all cursor-pointer active:scale-[0.97] shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C4BFF] focus-visible:ring-offset-2"
            >
              <Heart className="h-3.5 w-3.5 fill-[#FFD23F] text-[#FFD23F]" />
              Postaw kawę
            </button>
          </div>

          <div className="flex items-center gap-3 shrink-0 ml-auto pl-4">
            <button
              onClick={() => setShowSupportModal(true)}
              className="sm:hidden flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFD23F]/90 text-[#0B1120] shadow-sm cursor-pointer active:scale-90 transition-transform"
              title="Postaw kawę"
            >
              <Coffee className="h-4 w-4" />
            </button>

            <NotificationsBell onNotificationClick={(notif: NotificationItem) => {}} />
          </div>
        </header>

        <main className="relative z-10 mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-8 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#2C4BFF] border border-slate-200 shadow-xs">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h1 className={cn(display.className, "text-xl font-bold text-slate-900 tracking-tight")}>Baza Zawodników</h1>
                <p className="text-xs text-slate-500 font-medium">
                  Zarządzaj kolejnością powołań, stałym składem i rezerwą meczową.
                </p>
              </div>
            </div>

            {isAdmin && (
              <div className="flex items-center gap-2">
                <button
                  onClick={exportPlayersCsv}
                  className="h-10 rounded-2xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 px-4 cursor-pointer active:scale-[0.97] shadow-xs transition-all"
                >
                  <Download className="h-4 w-4" />
                  Eksport CSV
                </button>
                <button
                  onClick={() => setIsAdding(true)}
                  className="h-10 rounded-2xl font-bold text-xs flex items-center gap-2 px-4 text-white cursor-pointer active:scale-[0.97] shadow-md transition-all"
                  style={{ background: COBALT, boxShadow: `0 4px 14px -4px ${COBALT}80` }}
                >
                  <Plus className="h-4 w-4" />
                  Dodaj zawodnika
                </button>
              </div>
            )}
          </div>

          {/* WYSZUKIWARKA I ZAKŁADKI */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Szukaj zawodnika po imieniu lub e-mailu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-9 text-xs font-medium outline-none placeholder:text-slate-400 focus:border-[#2C4BFF] focus:ring-2 focus:ring-[#2C4BFF]/20 shadow-xs transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  title="Wyczyść wyszukiwanie"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Fade na prawej krawędzi — sygnalizuje że jest więcej zakładek do przewinięcia
                (wcześniej ostatnia po prostu ucinała się na krawędzi bez żadnej wskazówki) */}
            <div
              className="relative flex items-center gap-1.5 overflow-x-auto bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80"
              style={{
                WebkitMaskImage: "linear-gradient(to right, black calc(100% - 28px), transparent 100%)",
                maskImage: "linear-gradient(to right, black calc(100% - 28px), transparent 100%)"
              }}
            >
              <div
                className="absolute rounded-xl bg-[#0B1120] shadow-md transition-all duration-300 ease-out"
                style={{ left: pillStyle.left, width: pillStyle.width, top: pillStyle.top, height: pillStyle.height }}
              />
              {[
                { id: "core", label: `Stały skład (${allCorePlayersSorted.length})` },
                { id: "active", label: "Aktywni" },
                { id: "inactive", label: "Nieaktywni" },
                { id: "all", label: "Wszyscy w bazie" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  ref={(el) => { tabRefs.current[tab.id] = el }}
                  onClick={() => setStatusFilter(tab.id as any)}
                  className={cn(
                    "relative z-10 rounded-xl px-4 py-2 text-xs font-bold transition-colors duration-300 cursor-pointer active:scale-[0.97] whitespace-nowrap",
                    statusFilter === tab.id ? "text-white" : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* KAFEL ZGŁOSZEŃ OCZEKUJĄCYCH */}
          {isAdmin && pendingPlayers.length > 0 && (
            <div className="rounded-[28px] border border-[#FFD23F]/40 bg-[#FFD23F]/[0.08] p-4 sm:p-5 space-y-3 shadow-xs animate-in fade-in slide-in-from-top-2 duration-400">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black uppercase tracking-wider text-[#7A5C00] flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Konta oczekujące na zatwierdzenie ({pendingPlayers.length})
                </h2>
              </div>

              <div className="space-y-2">
                {pendingPlayers.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-[#FFD23F]/30 shadow-xs text-xs font-bold"
                  >
                    <div>
                      <p className="text-slate-900 font-extrabold">{p.full_name}</p>
                      <p className="text-[11px] text-slate-500 font-normal">{p.email}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => approvePlayer(p.id)}
                        className="rounded-xl text-white font-bold text-[11px] gap-1.5 h-8 px-3 cursor-pointer active:scale-[0.96] shadow-xs flex items-center transition-transform"
                        style={{ background: MINT }}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Zatwierdź
                      </button>
                      <button
                        onClick={() => rejectPlayer(p.id, p.full_name)}
                        className="rounded-xl hover:bg-[#FF5A5F]/10 text-[#FF5A5F] font-bold text-[11px] h-8 px-3 cursor-pointer active:scale-[0.96] transition-all"
                      >
                        Odrzuć
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* WIDOK STAŁEGO SKŁADU */}
          {statusFilter === "core" ? (
            <div className="space-y-7">
              {/* Podsumowanie — ciemna karta w stylu hero */}
              <div
                className="relative overflow-hidden rounded-[28px] p-4 sm:p-6 text-white shadow-[0_24px_60px_-24px_rgba(11,17,32,0.55)] border border-white/10 animate-in fade-in slide-in-from-top-3 duration-500 fill-mode-both"
                style={{ background: `linear-gradient(135deg, ${INK} 0%, ${INK_SOFT} 55%, #16204a 100%)` }}
              >
                <div className="absolute inset-0 pointer-events-none opacity-70" style={netPattern} />
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-[#FFD23F]" />
                      Kolejność Powołań i Stała Rezerwa
                    </h2>
                    <p className="text-xs text-slate-300 font-medium max-w-md">
                      Gracze wchodzą na mecze ściśle według pozycji od #1 do #12. Jeśli ktoś wypadnie ze składu, automatycznie wchodzi gracz R1.
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 text-xs font-black shrink-0">
                    <span className="px-3.5 py-2 rounded-2xl text-white shadow-md" style={{ background: COBALT, boxShadow: `0 4px 14px -4px ${COBALT}99` }}>
                      Skład główny: <CountUp value={primaryCorePlayers.length} />/12
                    </span>
                    {reserveCorePlayers.length > 0 && (
                      <span className="px-3.5 py-2 rounded-2xl text-white shadow-md" style={{ background: VIOLET, boxShadow: `0 4px 14px -4px ${VIOLET}99` }}>
                        Rezerwa: +<CountUp value={reserveCorePlayers.length} />
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 1. SKŁAD GŁÓWNY (1-12) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#2C4BFF]" />
                    Skład Główny ({primaryCorePlayers.length}/12)
                  </h3>
                  <span className="text-[11px] font-bold text-slate-400">Pozycje powołane z automatu</span>
                </div>

                {primaryCoreWithIdx.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 rounded-[28px] border border-dashed border-slate-300 bg-white p-8 text-center">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                      <Users className="h-5 w-5" />
                    </div>
                    <p className="text-xs font-semibold text-slate-500">
                      {searchQuery ? "Brak wyników dla podanej frazy." : "Brak zawodników w składzie głównym. Wybierz graczy z listy poniżej."}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col space-y-1.5">
                    {primaryCoreWithIdx.map(({ player, idx }) => (
                      <div
                        key={player.id}
                        onClick={() => openPlayerHistory(player)}
                        style={{ animationDelay: `${Math.min(idx, 10) * 35}ms` }}
                        className="group flex items-center justify-between p-2 sm:p-2.5 rounded-2xl bg-white border border-l-4 border-slate-200/90 border-l-[#2C4BFF] shadow-xs hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer animate-in fade-in slide-in-from-bottom-2 fill-mode-both"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={cn(score.className, "flex h-7 w-7 items-center justify-center rounded-lg text-white font-semibold text-[11px] shrink-0 shadow-md group-hover:scale-105 transition-transform")}
                            style={{ background: COBALT, boxShadow: `0 4px 10px -3px ${COBALT}99` }}
                          >
                            {idx + 1}
                          </span>
                          <div className="min-w-0 flex items-baseline gap-2">
                            <p className="font-bold text-xs text-slate-900 group-hover:text-[#2C4BFF] transition-colors truncate">
                              {player.full_name}
                            </p>
                            <p className="hidden sm:block text-[11px] text-slate-400 truncate">{player.email}</p>
                          </div>
                        </div>

                        {isAdmin && (
                          <div className="flex items-center gap-1.5 shrink-0 ml-3">
                            <div className="flex items-center gap-0.5 bg-slate-50 p-0.5 rounded-lg border border-slate-200">
                              <button
                                disabled={idx === 0}
                                onClick={(e) => moveCoreOrder(idx, "up", e)}
                                className="p-1 rounded-md text-[#2C4BFF] hover:bg-[#2C4BFF] hover:text-white transition-all disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-[#2C4BFF] cursor-pointer active:scale-90"
                                title="Przesuń wyżej"
                              >
                                <ArrowUp className="h-3.5 w-3.5 stroke-[2.5]" />
                              </button>
                              <button
                                disabled={idx === allCorePlayersSorted.length - 1}
                                onClick={(e) => moveCoreOrder(idx, "down", e)}
                                className="p-1 rounded-md text-[#2C4BFF] hover:bg-[#2C4BFF] hover:text-white transition-all disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-[#2C4BFF] cursor-pointer active:scale-90"
                                title="Przesuń niżej"
                              >
                                <ArrowDown className="h-3.5 w-3.5 stroke-[2.5]" />
                              </button>
                            </div>

                            <button
                              onClick={(e) => toggleCoreRoster(player, e)}
                              className="text-[11px] font-bold text-[#FF5A5F] bg-[#FF5A5F]/10 hover:bg-[#FF5A5F] hover:text-white border border-[#FF5A5F]/20 px-2 py-1 rounded-lg transition-all cursor-pointer active:scale-95 shadow-xs"
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

              {/* 2. LISTA REZERWOWA (13+) */}
              {reserveCoreWithIdx.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-[11px] font-black uppercase tracking-wider text-[#4B2FB0] flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#7A5CFF]" />
                      Stała Lista Rezerwowa ({reserveCorePlayers.length})
                    </h3>
                    <span className="text-[11px] font-bold text-[#7A5CFF]">Wchodzą w tej kolejności w razie nieobecności</span>
                  </div>

                  <div className="flex flex-col space-y-1.5">
                    {reserveCoreWithIdx.map(({ player, actualIdx }, rIdx) => (
                      <div
                        key={player.id}
                        onClick={() => openPlayerHistory(player)}
                        style={{ animationDelay: `${Math.min(rIdx, 10) * 35}ms` }}
                        className="group flex items-center justify-between p-2 sm:p-2.5 rounded-2xl bg-white border border-l-4 border-slate-200/90 border-l-[#7A5CFF] shadow-xs hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer animate-in fade-in slide-in-from-bottom-2 fill-mode-both"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={cn(score.className, "flex h-7 w-7 items-center justify-center rounded-lg text-white font-semibold text-[11px] shrink-0 shadow-md group-hover:scale-105 transition-transform")}
                            style={{ background: VIOLET, boxShadow: `0 4px 10px -3px ${VIOLET}99` }}
                          >
                            R{actualIdx - 11}
                          </span>
                          <div className="min-w-0 flex items-baseline gap-2">
                            <p className="font-bold text-xs text-slate-900 group-hover:text-[#7A5CFF] transition-colors truncate">
                              {player.full_name}
                            </p>
                            <p className="hidden sm:block text-[11px] text-[#7A5CFF]/70 truncate">{player.email}</p>
                          </div>
                        </div>

                        {isAdmin && (
                          <div className="flex items-center gap-1.5 shrink-0 ml-3">
                            <div className="flex items-center gap-0.5 bg-slate-50 p-0.5 rounded-lg border border-slate-200">
                              <button
                                onClick={(e) => moveCoreOrder(actualIdx, "up", e)}
                                className="p-1 rounded-md text-[#7A5CFF] hover:bg-[#7A5CFF] hover:text-white transition-all cursor-pointer active:scale-90"
                                title="Przesuń wyżej"
                              >
                                <ArrowUp className="h-3.5 w-3.5 stroke-[2.5]" />
                              </button>
                              <button
                                disabled={actualIdx === allCorePlayersSorted.length - 1}
                                onClick={(e) => moveCoreOrder(actualIdx, "down", e)}
                                className="p-1 rounded-md text-[#7A5CFF] hover:bg-[#7A5CFF] hover:text-white transition-all disabled:opacity-20 cursor-pointer active:scale-90"
                                title="Przesuń niżej"
                              >
                                <ArrowDown className="h-3.5 w-3.5 stroke-[2.5]" />
                              </button>
                            </div>

                            <button
                              onClick={(e) => toggleCoreRoster(player, e)}
                              className="text-[11px] font-bold text-[#FF5A5F] bg-[#FF5A5F]/10 hover:bg-[#FF5A5F] hover:text-white border border-[#FF5A5F]/20 px-2 py-1 rounded-lg transition-all cursor-pointer active:scale-95 shadow-xs"
                              title="Usuń z rezerwy"
                            >
                              Usuń
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. POZOSTALI AKTYWNI GRACZE DO DODANIA */}
              {isAdmin && filteredNonCoreActive.length > 0 && (
                <div className="space-y-3 pt-5 border-t border-slate-200">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                      <UserPlus className="h-4 w-4 text-[#2C4BFF]" />
                      Pozostali aktywni gracze ({filteredNonCoreActive.length})
                    </h3>
                    <span className="text-[11px] font-bold text-slate-400">Kliknij dodaj, aby dołączyć na koniec kolejki</span>
                  </div>

                  <div className="flex flex-col space-y-2">
                    {visibleNonCoreActive.map((player) => (
                      <div
                        key={player.id}
                        className="flex items-center justify-between p-3 sm:p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 font-bold text-xs shrink-0 border border-slate-200">
                            {player.full_name?.charAt(0).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-slate-800 truncate">{player.full_name}</p>
                            <p className="text-[11px] text-slate-400 truncate">{player.email}</p>
                          </div>
                        </div>

                        <button
                          onClick={(e) => toggleCoreRoster(player, e)}
                          className="flex items-center gap-1.5 text-xs font-bold text-white px-3.5 py-2 rounded-xl transition-all cursor-pointer active:scale-95 shadow-xs shrink-0 ml-2"
                          style={{ background: COBALT }}
                        >
                          <Plus className="h-4 w-4 stroke-[2.5]" /> Dodaj
                        </button>
                      </div>
                    ))}

                    {isNonCoreListTruncated && !showAllNonCore && (
                      <button
                        onClick={() => setShowAllNonCore(true)}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white py-3 text-xs font-bold text-slate-500 transition-all hover:border-[#2C4BFF]/40 hover:text-[#1D3AE8] hover:bg-[#2C4BFF]/[0.03] cursor-pointer active:scale-[0.99]"
                      >
                        Pokaż wszystkich ({filteredNonCoreActive.length})
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* STANDARDOWA TABELA */
            <div className="space-y-3">
              {isAdmin && (
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => {
                      setIsSelectionMode(!isSelectionMode)
                      setSelectedBulkIds([])
                    }}
                    className={cn(
                      "h-9 rounded-xl font-bold text-xs flex items-center gap-2 px-3.5 cursor-pointer active:scale-[0.97] shadow-xs transition-all border",
                      isSelectionMode
                        ? "bg-[#0B1120] text-white border-[#0B1120]"
                        : "border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
                    )}
                  >
                    <CheckSquare className={cn("h-3.5 w-3.5", isSelectionMode ? "text-[#FFD23F]" : "text-slate-500")} />
                    {isSelectionMode ? "Anuluj zaznaczanie" : "Zarządzaj / Zaznacz"}
                  </button>
                  {isSelectionMode && (
                    <button
                      onClick={() =>
                        setSelectedBulkIds((prev) => (prev.length === visibleBulkIds.length ? [] : visibleBulkIds))
                      }
                      className="text-xs font-bold text-[#2C4BFF] hover:text-[#1D3AE8] cursor-pointer"
                    >
                      {selectedBulkIds.length === visibleBulkIds.length ? "Odznacz wszystkich" : "Zaznacz wszystkich widocznych"}
                    </button>
                  )}
                </div>
              )}

              {isLoading ? (
                <div className="space-y-2">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4 rounded-2xl border border-slate-200/90 bg-white p-4 animate-pulse" style={{ animationDelay: `${i * 100}ms` }}>
                      <div className="h-9 w-9 shrink-0 rounded-xl bg-slate-100" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3.5 w-40 rounded-md bg-slate-100" />
                        <div className="h-3 w-56 rounded-md bg-slate-100" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredPlayers.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-[28px] border border-dashed border-slate-300 bg-white p-12 text-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                    <Search className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-semibold text-slate-500">
                    {searchQuery ? `Brak wyników dla „${searchQuery}”.` : "Brak zawodników w tej kategorii."}
                  </p>
                </div>
              ) : (
                <>
                <div className="hidden md:block overflow-hidden overflow-x-auto rounded-[28px] border border-slate-200 bg-white shadow-xs animate-in fade-in duration-300">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-400 bg-slate-50/50">
                        {isSelectionMode && <th className="px-4 py-4 w-8" />}
                        <th className="px-6 py-4 font-bold">Zawodnik</th>
                        <th className="px-6 py-4 font-bold">Stały skład</th>
                        <th className="px-6 py-4 font-bold">Status konta</th>
                        <th className="px-6 py-4 font-bold">Rozegrane mecze</th>
                        <th className="px-6 py-4 font-bold">Suma wpłat</th>
                        {isAdmin && !isSelectionMode && <th className="px-6 py-4 text-right font-bold">Akcje</th>}
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
                        const isChecked = selectedBulkIds.includes(player.id)

                        return (
                          <tr
                            key={player.id}
                            onClick={() => openPlayerHistory(player)}
                            className={cn(
                              "group transition-all cursor-pointer",
                              !isActive && "opacity-60 bg-slate-50/50",
                              isChecked && "bg-[#2C4BFF]/[0.05]",
                              isCurrentUser && !isChecked
                                ? "bg-[#2C4BFF]/[0.05] hover:bg-[#2C4BFF]/[0.08] font-semibold"
                                : "hover:bg-slate-50"
                            )}
                          >
                            {isSelectionMode && (
                              <td className="px-4 py-4">
                                <div
                                  onClick={(e) => { e.stopPropagation(); toggleBulkSelect(player.id) }}
                                  className={cn(
                                    "flex h-6 w-6 items-center justify-center rounded-lg border cursor-pointer transition-all",
                                    isChecked ? "bg-[#2C4BFF] border-[#2C4BFF] text-white" : "bg-white border-slate-300 text-transparent hover:border-[#2C4BFF]"
                                  )}
                                >
                                  {isChecked ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                                </div>
                              </td>
                            )}
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <span
                                  className={cn(
                                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold text-xs border",
                                    !isActive
                                      ? "bg-slate-100 text-slate-400 border-slate-200"
                                      : isCurrentUser
                                      ? "bg-[#2C4BFF] text-white border-[#2C4BFF] shadow-xs"
                                      : "bg-[#2C4BFF]/10 text-[#2C4BFF] border-[#2C4BFF]/20"
                                  )}
                                >
                                  {player.full_name?.charAt(0).toUpperCase()}
                                </span>
                                <div>
                                  <p
                                    className={cn(
                                      "font-bold transition-colors flex items-center gap-1.5",
                                      isCurrentUser ? "text-[#2C4BFF] font-extrabold" : "text-slate-900 group-hover:text-[#2C4BFF]"
                                    )}
                                  >
                                    <span>{player.full_name}</span>
                                    {isCurrentUser && (
                                      <span className="rounded-md bg-[#2C4BFF]/10 px-1.5 py-0.5 text-[9px] font-black uppercase text-[#2C4BFF]">
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
                                  onClick={(e) => { e.stopPropagation(); toggleCoreRoster(player, e) }}
                                  className={cn(
                                    "inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer active:scale-95",
                                    player.is_core_roster
                                      ? "bg-[#2C4BFF]/10 text-[#1D3AE8] border-[#2C4BFF]/25 hover:bg-[#2C4BFF]/20"
                                      : "bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100 hover:text-slate-600"
                                  )}
                                >
                                  <ShieldCheck className={cn("h-3.5 w-3.5", player.is_core_roster ? "text-[#2C4BFF]" : "text-slate-300")} />
                                  {player.is_core_roster ? "Stały skład" : "Zwykły"}
                                </button>
                              ) : (
                                <span
                                  className={cn(
                                    "inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold border",
                                    player.is_core_roster ? "bg-[#2C4BFF]/10 text-[#1D3AE8] border-[#2C4BFF]/25" : "bg-slate-50 text-slate-400 border-slate-200"
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
                                  isActive ? "bg-[#00C48C]/10 text-[#00875F] border-[#00C48C]/25" : "bg-slate-100 text-slate-500 border-slate-200"
                                )}
                              >
                                {isActive ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
                                {isActive ? "Aktywny" : "Wyłączony"}
                              </span>
                            </td>

                            <td className="px-6 py-4">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold",
                                  player.matches_count && player.matches_count > 0
                                    ? "bg-[#00C48C]/10 text-[#00875F]"
                                    : "bg-slate-100 text-slate-500"
                                )}
                              >
                                {player.matches_count || 0} {player.matches_count === 1 ? "mecz" : "meczy"}
                              </span>
                            </td>

                            <td className="px-6 py-4 font-bold text-slate-900">
                              <span className="text-[#00875F]">{player.total_paid || 0} PLN</span>
                            </td>

                            {isAdmin && !isSelectionMode && (
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={(e) => togglePlayerStatus(player, e)}
                                    className={cn(
                                      "rounded-xl p-2 transition-all cursor-pointer active:scale-90 border",
                                      isActive
                                        ? "bg-slate-50 text-slate-400 hover:bg-[#FFD23F]/15 hover:text-[#946E00] border-slate-200"
                                        : "bg-[#00C48C]/10 text-[#00875F] hover:bg-[#00C48C]/20 border-[#00C48C]/25"
                                    )}
                                    title={isActive ? "Wyłącz konto (ukryj z powołań)" : "Włącz konto ponownie"}
                                  >
                                    <Power className="h-4 w-4" />
                                  </button>

                                  <button
                                    onClick={(e) => deletePlayer(player, e)}
                                    className="rounded-xl p-2 text-slate-400 transition-all hover:bg-[#FF5A5F]/10 hover:text-[#FF5A5F] border border-slate-200 cursor-pointer active:scale-90"
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

                {/* Wersja kartowa na mobile — tabela z 6 kolumnami nie mieści się na wąskim ekranie
                    bez ukrywania większości danych za poziomym scrollem */}
                <div className="md:hidden space-y-2.5">
                  {visiblePlayers.map((player) => {
                    const isCurrentUser =
                      user?.id === player.id ||
                      user?.email?.toLowerCase() === player.email?.toLowerCase() ||
                      user?.full_name?.toLowerCase() === player.full_name?.toLowerCase() ||
                      user?.name?.toLowerCase() === player.full_name?.toLowerCase()

                    const isActive = player.player_status_id === 1 || !player.player_status_id
                    const isChecked = selectedBulkIds.includes(player.id)

                    return (
                      <div
                        key={player.id}
                        onClick={() => openPlayerHistory(player)}
                        className={cn(
                          "rounded-2xl border p-3.5 shadow-xs transition-all cursor-pointer",
                          !isActive && "opacity-60 bg-slate-50/50",
                          isChecked || isCurrentUser ? "bg-[#2C4BFF]/[0.05] border-[#2C4BFF]/25" : "bg-white border-slate-200/90"
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {isSelectionMode && (
                              <div
                                onClick={(e) => { e.stopPropagation(); toggleBulkSelect(player.id) }}
                                className={cn(
                                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border cursor-pointer transition-all",
                                  isChecked ? "bg-[#2C4BFF] border-[#2C4BFF] text-white" : "bg-white border-slate-300 text-transparent"
                                )}
                              >
                                {isChecked ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                              </div>
                            )}
                            <span
                              className={cn(
                                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold text-xs border",
                                !isActive
                                  ? "bg-slate-100 text-slate-400 border-slate-200"
                                  : isCurrentUser
                                  ? "bg-[#2C4BFF] text-white border-[#2C4BFF]"
                                  : "bg-[#2C4BFF]/10 text-[#2C4BFF] border-[#2C4BFF]/20"
                              )}
                            >
                              {player.full_name?.charAt(0).toUpperCase()}
                            </span>
                            <div className="min-w-0">
                              <p className={cn("font-bold text-xs truncate flex items-center gap-1.5", isCurrentUser ? "text-[#2C4BFF]" : "text-slate-900")}>
                                {player.full_name}
                                {isCurrentUser && (
                                  <span className="rounded-md bg-[#2C4BFF]/10 px-1.5 py-0.5 text-[9px] font-black uppercase text-[#2C4BFF] shrink-0">Ty</span>
                                )}
                              </p>
                              <p className="text-[11px] text-slate-400 truncate">{player.email}</p>
                            </div>
                          </div>

                          {isAdmin && !isSelectionMode && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={(e) => togglePlayerStatus(player, e)}
                                className={cn(
                                  "rounded-lg p-1.5 transition-all cursor-pointer active:scale-90 border",
                                  isActive
                                    ? "bg-slate-50 text-slate-400 border-slate-200"
                                    : "bg-[#00C48C]/10 text-[#00875F] border-[#00C48C]/25"
                                )}
                                title={isActive ? "Wyłącz konto" : "Włącz konto"}
                              >
                                <Power className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={(e) => deletePlayer(player, e)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-[#FF5A5F]/10 hover:text-[#FF5A5F] border border-slate-200 cursor-pointer active:scale-90"
                                title="Usuń trwale"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap mt-3 pl-0.5">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border",
                              player.is_core_roster ? "bg-[#2C4BFF]/10 text-[#1D3AE8] border-[#2C4BFF]/25" : "bg-slate-50 text-slate-400 border-slate-200"
                            )}
                          >
                            <ShieldCheck className="h-3 w-3" />
                            {player.is_core_roster ? "Stały skład" : "Zwykły"}
                          </span>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border",
                              isActive ? "bg-[#00C48C]/10 text-[#00875F] border-[#00C48C]/25" : "bg-slate-100 text-slate-500 border-slate-200"
                            )}
                          >
                            {isActive ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
                            {isActive ? "Aktywny" : "Wyłączony"}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-600">
                            {player.matches_count || 0} {player.matches_count === 1 ? "mecz" : "meczy"}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-[#00C48C]/10 text-[#00875F]">
                            {player.total_paid || 0} PLN
                          </span>
                        </div>
                      </div>
                    )
                  })}

                  {isPlayerListTruncated && !showAllPlayers && (
                    <button
                      onClick={() => setShowAllPlayers(true)}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white py-3.5 text-xs font-bold text-slate-500 transition-all hover:border-[#2C4BFF]/40 hover:text-[#1D3AE8] hover:bg-[#2C4BFF]/[0.03] cursor-pointer active:scale-[0.99]"
                    >
                      Pokaż wszystkich ({filteredPlayers.length})
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                </>
              )}
            </div>
          )}
        </main>
      </div>

      {/* PŁYWAJĄCY PASEK MASOWYCH AKCJI */}
      {isSelectionMode && selectedBulkIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-3xl bg-[#0B1120]/95 backdrop-blur-md px-5 py-3 text-white shadow-2xl border border-white/10 animate-in fade-in slide-in-from-bottom-5 flex-wrap justify-center">
          <div className="flex items-center gap-2">
            <span className={cn(score.className, "flex h-7 w-7 items-center justify-center rounded-xl bg-[#FFD23F] text-[#0B1120] text-xs font-bold tabular-nums")}>
              {selectedBulkIds.length}
            </span>
            <span className="text-xs font-bold text-slate-300">zaznaczonych</span>
          </div>
          <div className="h-4 w-px bg-white/10" />
          <button
            onClick={() => handleBulkSetStatus(true)}
            disabled={isBulkProcessing}
            className="rounded-2xl text-white font-bold text-xs px-4 py-2 gap-1.5 cursor-pointer active:scale-95 flex items-center shadow-md disabled:opacity-50"
            style={{ background: MINT }}
          >
            <UserCheck className="h-3.5 w-3.5" /> Aktywuj
          </button>
          <button
            onClick={() => handleBulkSetStatus(false)}
            disabled={isBulkProcessing}
            className="rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs px-4 py-2 gap-1.5 cursor-pointer active:scale-95 flex items-center disabled:opacity-50"
          >
            <UserX className="h-3.5 w-3.5" /> Dezaktywuj
          </button>
          <button
            onClick={handleBulkDelete}
            disabled={isBulkProcessing}
            className="rounded-2xl text-white font-bold text-xs px-4 py-2 gap-1.5 cursor-pointer active:scale-95 flex items-center shadow-md disabled:opacity-50"
            style={{ background: CORAL }}
          >
            <Trash2 className="h-3.5 w-3.5" /> Usuń
          </button>
        </div>
      )}

      <SupportModal open={showSupportModal} onClose={() => setShowSupportModal(false)} />

      {/* MODAL DODAWANIA GRACZA */}
      <Modal
        open={isAdding}
        onClose={() => setIsAdding(false)}
        overlayClassName="bg-[#0B1120]/70 backdrop-blur-sm"
        cardClassName="relative w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl border border-slate-200 space-y-4"
      >
        <form onSubmit={handleAddPlayer} className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className={cn(display.className, "text-base font-bold text-slate-900")}>Dodaj nowego zawodnika do bazy</h2>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 cursor-pointer active:scale-90 transition-transform"
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
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 outline-none focus:border-[#2C4BFF] focus:bg-white"
              />
            </div>
            <div>
              <label className="mb-1 block font-semibold text-slate-700">Adres e-mail (opcjonalnie)</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="np. jan@example.com"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 outline-none focus:border-[#2C4BFF] focus:bg-white"
              />
            </div>

            <div
              className="flex items-center gap-2 p-3 rounded-xl bg-[#2C4BFF]/[0.05] border border-[#2C4BFF]/20 cursor-pointer"
              onClick={() => setNewIsCore(!newIsCore)}
            >
              <input
                type="checkbox"
                checked={newIsCore}
                onChange={() => {}}
                className="rounded border-[#2C4BFF]/40 text-[#2C4BFF] focus:ring-[#2C4BFF] h-4 w-4 pointer-events-none"
              />
              <span className="font-bold text-[#14204D] text-xs">
                Dodaj od razu na koniec kolejki Stałego Składu
              </span>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAdding(false)} className="rounded-xl cursor-pointer">
              Anuluj
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="rounded-xl font-bold bg-[#2C4BFF] hover:bg-[#1D3AE8] text-white cursor-pointer shadow-md shadow-[#2C4BFF]/20"
            >
              {isSubmitting ? "Zapisywanie..." : "Zapisz w bazie"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL HISTORII GRACZA */}
      <Modal
        open={!!selectedPlayer}
        onClose={() => setSelectedPlayer(null)}
        overlayClassName="bg-[#0B1120]/70 backdrop-blur-sm"
        cardClassName="relative w-full max-w-lg rounded-[28px] bg-white p-6 shadow-2xl max-h-[85vh] flex flex-col border border-slate-200"
      >
        {selectedPlayer && (
          <>
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className={cn(display.className, "text-base font-bold text-slate-900")}>{selectedPlayer.full_name}</h2>
                <p className="text-xs text-slate-400">{selectedPlayer.email}</p>
              </div>
              <button
                onClick={() => setSelectedPlayer(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 cursor-pointer active:scale-90 transition-transform"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Historia meczów i płatności
              </h3>
              {isLoadingHistory ? (
                <p className="text-xs text-slate-400 text-center py-8 animate-pulse">Ładowanie historii...</p>
              ) : playerHistory.length === 0 ? (
                <div className="flex flex-col items-center gap-2.5 py-8 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-semibold text-slate-400">
                    Ten zawodnik nie brał jeszcze udziału w żadnym meczu.
                  </p>
                </div>
              ) : (
                playerHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 p-3 text-xs font-semibold"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#2C4BFF]/10 text-[#2C4BFF]">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">
                          {formatDatePL(item.match_date) || "Brak daty"} ({item.location})
                        </p>
                        <p className="text-[10px] text-slate-400">Status: {item.status}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-extrabold border",
                          item.paid ? "bg-[#00C48C]/10 text-[#00875F] border-[#00C48C]/25" : "bg-[#FFD23F]/10 text-[#946E00] border-[#FFD23F]/30"
                        )}
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
              <Button variant="outline" size="sm" onClick={() => setSelectedPlayer(null)} className="rounded-xl cursor-pointer">
                Zamknij
              </Button>
            </div>
          </>
        )}
      </Modal>

      <ConfirmDialog state={confirmDialog} onCancel={() => setConfirmDialog(null)} />

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#0B1120]/95 backdrop-blur-md px-4 py-2.5 text-xs font-bold text-white shadow-xl animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="h-4 w-4 text-[#00E0A2]" />
          {toast}
        </div>
      )}
    </div>
  )
}
