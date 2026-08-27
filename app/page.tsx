"use client"

import { useState, useEffect, useRef, useLayoutEffect } from "react"
import { Space_Grotesk, Oswald } from "next/font/google"
import {
  Calendar,
  MapPin,
  Users,
  Search,
  Wallet,
  Plus,
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
  Square,
  Megaphone,
  Pin,
  CalendarPlus,
  ChevronDown
} from "lucide-react"
import Link from "next/link"
import { Sidebar } from "@/components/dashboard/sidebar"
import { MatchDetail } from "@/components/dashboard/match-detail"
import { NotificationsBell, type NotificationItem } from "@/components/dashboard/notifications-bell"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"
import { SupportModal } from "@/components/dashboard/support-modal"
import { ConfirmDialog, type ConfirmDialogState } from "@/components/ui/confirm-dialog"
import { type Match, mainRoster, waitlist } from "@/lib/data"
import { cn, formatDatePL, normalizeSearchText, fuzzySearchMatch, addMatchToCalendar } from "@/lib/utils"
import { supabase } from "@/lib/supabase"

// ────────────────────────────────────────────────────────────────
// TOKENY WIZUALNE — "Under the Lights": hala, reflektory, bilet meczowy
// ────────────────────────────────────────────────────────────────
const display = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"] })
const score = Oswald({ subsets: ["latin"], weight: ["500", "600", "700"] })

const INK = "#0B1120"
const INK_SOFT = "#121B33"
const COBALT = "#2C4BFF"
const YELLOW = "#FFD23F"
const CORAL = "#FF5A5F"
const MINT = "#00C48C"
const CHALK = "#F7F8FB"

// Delikatna siatka przypominająca strukturę siatki siatkarskiej — użyta jako tekstura tła w ciemnych sekcjach
const netPattern: React.CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 16px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 16px)"
}

// Linia perforacji ("oderwij bilet") — sygnatura projektu, powtórzona w hero i wierszach listy
function perforation(color: string): React.CSSProperties {
  return { backgroundImage: `repeating-linear-gradient(to bottom, ${color} 0 5px, transparent 5px 12px)` }
}

// Pozioma wersja perforacji — łączy bilet meczowy z tablicą wyników w jedną spójną kartę
function perforationHorizontal(color: string): React.CSSProperties {
  return { backgroundImage: `repeating-linear-gradient(to right, ${color} 0 5px, transparent 5px 12px)` }
}

const MONTHS_PL = ["STY", "LUT", "MAR", "KWI", "MAJ", "CZE", "LIP", "SIE", "WRZ", "PAŹ", "LIS", "GRU"]
const DAYS_PL = ["Niedziela", "Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota"]

function dateStub(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number)
  return { day: d, month: MONTHS_PL[(m || 1) - 1] || "", year: y }
}

function weekdayPL(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`)
  return DAYS_PL[d.getDay()] || ""
}

// Zbiera wszystko, po czym mecz może zostać znaleziony w wyszukiwarce: tytuł, halę, datę
// (w kilku wariantach — ISO, DD.MM.RRRR, dzień tygodnia, skrót miesiąca) oraz imiona i nazwiska
// zapisanych zawodników — dzięki temu "kamil" albo "pon" trafiają na właściwy mecz.
function buildMatchSearchTokens(match: any): string[] {
  const parts: string[] = []
  if (match.title) parts.push(match.title)
  if (match.location) parts.push(match.location)
  if (match.date) {
    parts.push(match.date, formatDatePL(match.date), weekdayPL(match.date))
    const stub = dateStub(match.date)
    parts.push(String(stub.day), stub.month, String(stub.year))
  }
  ;(match.players || []).forEach((p: any) => {
    const name = p.name || p.full_name
    if (name) parts.push(name)
  })
  return normalizeSearchText(parts.join(" ")).split(/[^a-z0-9]+/).filter(Boolean)
}

// Wspólne reguły statusu meczu — używane zarówno przy filtrowaniu listy, jak i przy liczeniu
// ile meczów kryje się pod każdą zakładką (żeby te dwie rzeczy nigdy sobie nie przeczyły)
function isMatchCancelled(m: any): boolean {
  return m.status_id === 4 || m.matches_status?.name?.toLowerCase().includes("odwoł")
}

function isMatchPast(m: any, todayStr: string): boolean {
  return (m.date < todayStr || m.status_id === 3 || m.is_settled) && !isMatchCancelled(m)
}

function isMatchUpcoming(m: any, todayStr: string): boolean {
  return m.date >= todayStr && !isMatchCancelled(m) && !m.is_settled
}

// Płynne "podliczanie" wartości liczbowych na tablicy wyników — animuje się do nowej wartości za każdym razem, gdy dane się zmienią
function CountUp({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const [display, setDisplay] = useState(value)
  const prevValue = useRef(value)

  useEffect(() => {
    const from = prevValue.current
    const to = value
    if (from === to) return

    // Karta otwarta w tle (np. inna zakładka aktywna) nigdy nie odpala requestAnimationFrame —
    // bez tego licznik zamrażałby się na starej wartości w nieskończoność zamiast pokazać prawdziwą,
    // już załadowaną liczbę.
    if (document.hidden) {
      setDisplay(to)
      prevValue.current = to
      return
    }

    const duration = 700
    const start = performance.now()
    let raf: number

    function tick(now: number) {
      const progress = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(from + (to - from) * eased)
      if (progress < 1) raf = requestAnimationFrame(tick)
      else prevValue.current = to
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])

  return <>{display.toFixed(decimals)}</>
}

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
  const [isBatchCancelling, setIsBatchCancelling] = useState(false)

  // Modal wsparcia
  const [showSupportModal, setShowSupportModal] = useState(false)

  // Zastępuje natywne confirm() własnym, ostylowanym dialogiem
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>(null)

  // Zarządzanie obecnością / urlopem
  const [showAbsenceModal, setShowAbsenceModal] = useState(false)
  const [absencePreset, setAbsencePreset] = useState<"1week" | "2weeks" | "1month" | "custom">("2weeks")
  const [absenceStartDate, setAbsenceStartDate] = useState(new Date().toISOString().split("T")[0])
  const [absenceEndDate, setAbsenceEndDate] = useState("")
  const [selectedMatchesToLeave, setSelectedMatchesToLeave] = useState<string[]>([])
  const [isSavingAbsence, setIsSavingAbsence] = useState(false)

  const [searchTerm, setSearchTerm] = useState("")
  // Domyślnie "upcoming", nie "all" — po wejściu na stronę gracz od razu widzi tylko to,
  // co go interesuje (nadchodzące mecze), a nie całą historię łącznie z rozliczonymi/odwołanymi.
  const [statusFilter, setStatusFilter] = useState<"all" | "upcoming" | "past" | "cancelled">("upcoming")
  // Lista meczów domyślnie skrócona do kilku pozycji — nawet 11 nadchodzących to i tak
  // długie przewijanie na telefonie. Wraca do "false" przy każdej zmianie zakładki/wyszukiwania,
  // żeby np. przełączenie na "Zakończone" znów pokazywało skróconą listę, a nie od razu całość.
  const [showAllMatches, setShowAllMatches] = useState(false)
  useEffect(() => {
    setShowAllMatches(false)
  }, [statusFilter, searchTerm])

  // Animacje: pasek zapełnienia składu w hero wjeżdża od 0% dopiero po załadowaniu danych; suwak pod aktywną zakładką filtra
  const [heroBarReady, setHeroBarReady] = useState(false)
  const [pillStyle, setPillStyle] = useState<{ left: number; width: number; top: number; height: number }>({ left: 0, width: 0, top: 0, height: 0 })
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  const [user, setUser] = useState<any>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [readMatchIds, setReadMatchIds] = useState<string[]>([])
  const [selectedMatchRosterPreview, setSelectedMatchRosterPreview] = useState<Match | null>(null)
  const [pinnedAnnouncement, setPinnedAnnouncement] = useState<any>(null)

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
    loadPinnedAnnouncement()
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

  useEffect(() => {
    if (isLoading) {
      setHeroBarReady(false)
      return
    }
    const t = setTimeout(() => setHeroBarReady(true), 80)
    return () => clearTimeout(t)
  }, [isLoading])

  useLayoutEffect(() => {
    const el = tabRefs.current[statusFilter]
    if (el) {
      setPillStyle({ left: el.offsetLeft, width: el.offsetWidth, top: el.offsetTop, height: el.offsetHeight })
    }
    // Zależność od `user` jest celowa: dopóki dane usera się nie załadują, komponent renderuje `null`
    // (patrz `if (!user) return null` niżej), więc przyciski zakładek jeszcze nie istnieją w DOM przy
    // pierwszym uruchomieniu tego efektu. Bez tej zależności efekt nie odpaliłby się ponownie po
    // faktycznym zamontowaniu treści, bo sama wartość statusFilter się nie zmienia.
    // `searchTerm`/`matches.length` łapią zmianę szerokości przycisku, gdy licznik przy zakładce się
    // zmieni (np. po wyszukiwaniu) — same hooki muszą stać przed `if (!user) return null`, więc nie
    // można tu bezpośrednio odwołać się do wyliczonego niżej `filterCounts`.
  }, [statusFilter, user, searchTerm, matches.length])

  function notify(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  // Liczy wszystko wprost (a nie przez efekty reagujące na zmianę stanu) — bo kliknięcie
  // TEGO SAMEGO presetu drugi raz z rzędu (np. po ręcznym odznaczeniu meczu) nie zmienia
  // wartości `absencePreset`/`absenceStartDate`, więc efekty w ogóle by się nie odpaliły
  // i ręcznie odznaczony mecz zostałby odznaczony na zawsze.
  function applyAbsencePreset(presetId: "1week" | "2weeks" | "1month" | "custom") {
    setAbsencePreset(presetId)
    if (presetId === "custom") return

    const start = new Date(absenceStartDate)
    const end = new Date(start)
    if (presetId === "1week") end.setDate(start.getDate() + 7)
    else if (presetId === "2weeks") end.setDate(start.getDate() + 14)
    else if (presetId === "1month") end.setMonth(start.getMonth() + 1)

    const endStr = end.toISOString().split("T")[0]
    setAbsenceEndDate(endStr)

    const matchesInRange = matches
      .filter((m: any) => {
        const inRange = m.date >= absenceStartDate && m.date <= endStr
        const isSignedUp = m.players?.some((p: any) => p.id === user?.id)
        return inRange && isSignedUp
      })
      .map((m) => m.id)

    setSelectedMatchesToLeave(matchesInRange)
  }

  // Najważniejsze ogłoszenie do baneru na stronie głównej — przypięte ma pierwszeństwo,
  // w braku przypiętego pokazujemy po prostu najnowsze (sortowanie po `is_pinned` desc
  // stawia `true` przed `false` w Postgresie, więc jedno zapytanie załatwia oba przypadki).
  async function loadPinnedAnnouncement() {
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    setPinnedAnnouncement(data)
  }

  async function loadData() {
    setIsLoading(true)

    // Jawna lista kolumn zamiast "*" — celowo pomija `password` (nawet zahashowane, nie ma
    // potrzeby żeby to kiedykolwiek trafiało do przeglądarki). Patrz supabase/harden-anon-access.sql.
    const { data: rawPlayers } = await supabase.from("players").select("id, full_name, email, phone, created_at, notif_announcements, notif_match_reminders, role_id, player_status_id, is_core_roster, core_order, core_added_at")
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
      // Sortowanie po `created_at` decyduje kto trafia do składu głównego, a kto na rezerwę
      // (patrz mainRoster/waitlist w lib/data.ts) — bez tego Postgres nie gwarantuje kolejności
      // wierszy i podział na skład/rezerwę mógł nie odzwierciedlać realnej kolejności zapisów.
      const matchRegs = (registrationsData?.filter((r: any) => r.match_id === match.id) || [])
        .sort((a: any, b: any) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime())

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

  function handleCancelMatch(matchId: string, matchDate: string, e: React.MouseEvent) {
    e.stopPropagation()
    setConfirmDialog({
      title: "Odwołać mecz?",
      message: `Na pewno chcesz odwołać mecz z dnia ${formatDatePL(matchDate)}? Zawodnicy zobaczą go jako odwołany.`,
      confirmLabel: "Odwołaj mecz",
      danger: true,
      onConfirm: () => performCancelMatch(matchId)
    })
  }

  async function resolveCancelledStatusId(): Promise<number> {
    const { data: statusList } = await supabase.from("matches_status").select("*")

    let cancelledStatusId = statusList?.find((s: any) =>
      s.name?.toLowerCase().includes("odwoł") ||
      s.name?.toLowerCase().includes("cancel")
    )?.id

    if (!cancelledStatusId && statusList && statusList.length > 0) {
      cancelledStatusId = statusList[statusList.length - 1].id
    }
    return cancelledStatusId ?? 4
  }

  async function performCancelMatch(matchId: string) {
    setConfirmDialog(null)
    const cancelledStatusId = await resolveCancelledStatusId()

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

  function handleDeleteMatch(matchId: string, matchDate: string, e: React.MouseEvent) {
    e.stopPropagation()
    setConfirmDialog({
      title: "Usunąć mecz z bazy?",
      message: `Ta operacja jest nieodwracalna. Mecz z dnia ${formatDatePL(matchDate)} razem z całym składem zostanie trwale usunięty.`,
      confirmLabel: "Usuń trwale",
      danger: true,
      onConfirm: () => performDeleteMatch(matchId)
    })
  }

  async function performDeleteMatch(matchId: string) {
    setConfirmDialog(null)
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

  function handleBatchCancel() {
    if (selectedBatchMatchIds.length === 0) return
    setConfirmDialog({
      title: "Odwołać zaznaczone mecze?",
      message: `Zaznaczone mecze (${selectedBatchMatchIds.length}) zostaną oznaczone jako odwołane. Zawodnicy zobaczą je jako odwołane, skład zostaje w bazie.`,
      confirmLabel: "Odwołaj mecze",
      danger: true,
      onConfirm: performBatchCancel
    })
  }

  async function performBatchCancel() {
    setConfirmDialog(null)
    setIsBatchCancelling(true)
    try {
      const cancelledStatusId = await resolveCancelledStatusId()
      const { error } = await supabase.from("matches").update({ status_id: cancelledStatusId }).in("id", selectedBatchMatchIds)

      if (error) {
        notify(`Błąd odwoływania: ${error.message}`)
      } else {
        notify(`Odwołano ${selectedBatchMatchIds.length} meczów.`)
        setSelectedBatchMatchIds([])
        setIsSelectionMode(false)
        await loadData()
      }
    } catch (err: any) {
      notify(`Błąd: ${err?.message}`)
    } finally {
      setIsBatchCancelling(false)
    }
  }

  function handleBatchDelete() {
    if (selectedBatchMatchIds.length === 0) return
    setConfirmDialog({
      title: "Usunąć zaznaczone mecze?",
      message: `Ta operacja jest nieodwracalna. Zaznaczone mecze (${selectedBatchMatchIds.length}) zostaną trwale usunięte razem ze składami.`,
      confirmLabel: "Usuń trwale",
      danger: true,
      onConfirm: performBatchDelete
    })
  }

  async function performBatchDelete() {
    setConfirmDialog(null)
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

  const searchMatchedMatches = matches.filter((m: any) => fuzzySearchMatch(buildMatchSearchTokens(m), searchTerm))

  // Liczby przy zakładkach filtra — zawsze respektują aktualne wyszukiwanie, więc np. "Nadchodzące (3)"
  // odzwierciedla to, co faktycznie zobaczysz po kliknięciu tej zakładki
  const filterCounts = {
    all: searchMatchedMatches.length,
    upcoming: searchMatchedMatches.filter((m: any) => isMatchUpcoming(m, todayStr)).length,
    past: searchMatchedMatches.filter((m: any) => isMatchPast(m, todayStr)).length,
    cancelled: searchMatchedMatches.filter((m: any) => isMatchCancelled(m)).length
  }

  const filteredMatches = searchMatchedMatches.filter((m: any) => {
    if (statusFilter === "upcoming") return isMatchUpcoming(m, todayStr)
    if (statusFilter === "past") return isMatchPast(m, todayStr)
    if (statusFilter === "cancelled") return isMatchCancelled(m)
    return true
  })

  // Grupa przed datą: nadchodzące zawsze na górze (najbliższy pierwszy), rozliczone zawsze
  // na dole (ostatni rozegrany pierwszy — bardziej aktualny niż coś sprzed miesięcy),
  // odwołane pośrodku. Sam sort po dacie wsadzał stare, rozegrane mecze na sam czubek listy
  // "Wszystkie", bo rosnąco po dacie = najstarsze pierwsze.
  function matchGroupOrder(m: any): number {
    if (isMatchPast(m, todayStr)) return 2
    if (isMatchCancelled(m)) return 1
    return 0
  }

  const sortedMatches = [...filteredMatches].sort((a: any, b: any) => {
    const groupDiff = matchGroupOrder(a) - matchGroupOrder(b)
    if (groupDiff !== 0) return groupDiff
    return matchGroupOrder(a) === 2 ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)
  })

  // Domyślnie pokazujemy tylko kilka pierwszych meczów — nawet po zawężeniu do "Nadchodzące"
  // 11 kart to sporo przewijania na telefonie. Pełną listę zostawiamy bez ograniczeń podczas
  // wyszukiwania i zaznaczania wsadowego (admin musi widzieć wszystko, żeby zaznaczyć/znaleźć).
  const MATCH_PREVIEW_LIMIT = 4
  const isMatchListTruncated = !isSelectionMode && !searchTerm && !showAllMatches && sortedMatches.length > MATCH_PREVIEW_LIMIT
  const visibleMatches = isMatchListTruncated ? sortedMatches.slice(0, MATCH_PREVIEW_LIMIT) : sortedMatches

  // Statystyki sezonu — "Rozegrane mecze", lider frekwencji i średnia frekwencja mówią o tym,
  // co się FAKTYCZNIE odbyło, więc liczymy je z `playedMatches` (naprawdę przeszłych), a nie z
  // `activeMatches` (wszystkie niezanulowane, łącznie z przyszłymi). Wcześniej te kafelki
  // pokazywały np. "11 rozegranych meczów", mimo że żaden mecz jeszcze się nie odbył — po prostu
  // liczyły wszystko co zaplanowane i nieodwołane.
  const playedMatches = activeMatches.filter((m: any) => isMatchPast(m, todayStr))
  const totalSeasonMatches = playedMatches.length
  const playerMatchCounts: Record<string, { name: string; count: number }> = {}
  playedMatches.forEach((m) => {
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

  const totalRosterEntries = playedMatches.reduce((acc, m) => acc + mainRoster(m).length, 0)
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
  const modalPriceNum = Number(newPrice) || 0
  const modalMaxBudget = modalCapacityNum * modalPriceNum
  const modalReserveCount = Math.max(0, selectedPlayerIds.length - modalCapacityNum)

  const userMatchesInAbsenceRange = matches.filter((m: any) => {
    const inRange = m.date >= absenceStartDate && m.date <= absenceEndDate
    const isSignedUp = m.players?.some((p: any) => p.id === user?.id)
    return inRange && isSignedUp
  })

  // Jeden wiersz zawodnika w modalu tworzenia meczu — reużywany dla grupy "Stały skład" i "Pozostali"
  function renderCreateModalPlayerRow(player: any) {
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
            ? "bg-[#00C48C]/[0.06] border-[#00C48C]/25 text-[#00513A]"
            : isReserve
            ? "bg-[#7A5CFF]/[0.06] border-[#7A5CFF]/25 text-[#4B2FB0]"
            : "bg-white border-slate-100 text-slate-400 hover:bg-slate-100/70"
        )}
      >
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => {}}
            className="rounded border-slate-300 text-[#2C4BFF] focus:ring-[#2C4BFF] h-3.5 w-3.5 pointer-events-none"
          />
          <span className={cn(!isSelected && "line-through opacity-60")}>{playerName}</span>
        </div>

        {isMainSquad && (
          <span className="text-[9px] font-black text-[#00875F] bg-[#00C48C]/15 px-2 py-0.5 rounded-md uppercase">
            Skład ({selectedIndex + 1})
          </span>
        )}

        {isReserve && (
          <span className="text-[9px] font-black text-[#4B2FB0] bg-[#7A5CFF]/15 px-2 py-0.5 rounded-md uppercase">
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
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F5F6FA] text-[#14181F] selection:bg-[#2C4BFF] selection:text-white antialiased">

      {/* SIDEBAR NA STAŁE */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} user={user} onLogout={handleLogout} />

      {/* PRAWA SEKCJA Z PŁYNNYM SCROLLEM */}
      <div className="relative flex min-w-0 flex-1 flex-col h-screen overflow-y-auto">

        {/* Delikatna poświata w tle — daje głębię zamiast płaskiej bieli, nie przewija się razem z treścią */}
        <div
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            background:
              "radial-gradient(640px circle at 10% -8%, rgba(44,75,255,0.07), transparent 60%), radial-gradient(520px circle at 92% 16%, rgba(255,210,63,0.10), transparent 55%), radial-gradient(760px circle at 45% 100%, rgba(0,196,140,0.05), transparent 60%)"
          }}
        />

        {/* HEADER — pasek utylitarny, świadomie wyciszony (bohaterem jest hero poniżej) */}
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
        <main className="relative z-10 mx-auto w-full max-w-7xl flex-1 space-y-8 px-6 py-8 pb-36">

          {/* 1. HERO — BILET NA NAJBLIŻSZY MECZ + TABLICA WYNIKÓW SEZONU (jedna spójna karta, rozdzielona perforacją) */}
          {nearestMatch && (
            <div
              className="relative overflow-hidden rounded-[28px] text-white shadow-[0_24px_60px_-24px_rgba(11,17,32,0.55)] border border-white/10 animate-in fade-in slide-in-from-top-3 duration-500 fill-mode-both"
              style={{ background: `linear-gradient(135deg, ${INK} 0%, ${INK_SOFT} 55%, #16204a 100%)` }}
            >
              <div className="absolute inset-0 pointer-events-none" style={netPattern} />
              <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#2C4BFF]/20 blur-3xl pointer-events-none" />
              <div className="absolute -left-20 -bottom-20 h-72 w-72 rounded-full bg-[#FFD23F]/10 blur-3xl pointer-events-none" />

              <div className="relative z-10 grid gap-7 p-6 sm:p-8 lg:grid-cols-[1fr_auto_auto] lg:items-center">
                {/* Lewa część biletu — informacje o meczu */}
                <div className="space-y-3.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#2C4BFF]/20 border border-[#2C4BFF]/40 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#8FA1FF]">
                      <Sparkles className="h-3 w-3 text-[#FFD23F]" />
                      Najbliższe spotkanie
                    </span>
                    {nearestMatch.title && nearestMatch.title !== nearestMatch.date && (
                      <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold text-slate-300">
                        {nearestMatch.title}
                      </span>
                    )}
                  </div>

                  <div>
                    <p className={cn(score.className, "text-[11px] uppercase tracking-[0.25em] text-slate-400")}>
                      {weekdayPL(nearestMatch.date)}
                    </p>
                    <h2 className={cn(display.className, "text-3xl sm:text-4xl font-bold tracking-tight text-white mt-0.5")}>
                      {formatDatePL(nearestMatch.date)}
                    </h2>
                    <div className="flex items-center gap-4 text-xs font-semibold text-slate-300 mt-3 flex-wrap">
                      <span className="flex items-center gap-1.5 text-white">
                        <Timer className="h-4 w-4 text-[#FFD23F]" />
                        {nearestMatch.time_start?.slice(0, 5) || "19:00"} - {nearestMatch.time_end?.slice(0, 5) || "21:00"}
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="flex items-center gap-1.5 text-slate-300">
                        <MapPin className="h-4 w-4 text-[#FFD23F]" />
                        {nearestMatch.location}
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="flex items-center gap-1.5 text-[#00E0A2] font-bold">
                        <Wallet className="h-4 w-4" />
                        {nearestPrice} PLN / os.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Linia perforacji — "oderwij bilet" (sygnatura projektu) */}
                <div className="hidden lg:block relative w-px self-stretch">
                  <div className="absolute inset-0" style={perforation("rgba(255,255,255,0.28)")} />
                </div>

                {/* Prawa część biletu — kontrolka wejścia */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 lg:gap-6 border-t lg:border-t-0 border-white/10 pt-5 lg:pt-0">
                  <div className="rounded-2xl bg-white/5 border border-white/10 p-3.5 min-w-[180px] space-y-1.5">
                    <div className="flex justify-between items-baseline text-[11px] font-bold">
                      <span className="text-slate-400 uppercase tracking-wide">Skład główny</span>
                      <span className={cn(score.className, "text-white text-base tabular-nums")}>{nearestRoster.length} / {nearestCapacity}</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-[width] duration-700 ease-out"
                        style={{ width: heroBarReady ? `${Math.min(100, (nearestRoster.length / nearestCapacity) * 100)}%` : "0%", background: `linear-gradient(90deg, ${COBALT}, ${YELLOW})` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium">
                      {nearestSpotsLeft > 0 ? `Pozostało ${nearestSpotsLeft} wolnych miejsc` : "Komplet w składzie głównym"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {/* Dodaj do kalendarza — sam wybiera Google Calendar albo .ics (Apple/Outlook)
                        zależnie od urządzenia, jeden klik, żadnego wyboru */}
                    <button
                      onClick={() => addMatchToCalendar({ id: nearestMatch.id, title: (nearestMatch as any).title, date: nearestMatch.date, timeStart: (nearestMatch as any).time_start, timeEnd: (nearestMatch as any).time_end, location: nearestMatch.location, price: nearestPrice })}
                      className="flex shrink-0 items-center gap-1.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 px-3.5 py-3.5 text-xs font-bold text-white transition-all cursor-pointer active:scale-[0.97]"
                    >
                      <CalendarPlus className="h-4 w-4 text-[#FFD23F]" />
                      Kalendarz
                    </button>

                    <Button
                      onClick={() => handleSelectMatch(nearestMatch)}
                      className="flex-1 sm:flex-initial sm:w-auto rounded-2xl bg-[#2C4BFF] hover:bg-[#1D3AE8] text-white font-black text-xs gap-2 px-6 py-3.5 shadow-lg shadow-[#2C4BFF]/30 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#FFD23F] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1120]"
                    >
                      Szczegóły &amp; Skład
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Perforacja pozioma — "oderwij bilet" między meczem a statystykami sezonu */}
              <div className="relative z-10 mx-6 h-px sm:mx-8" style={perforationHorizontal("rgba(255,255,255,0.16)")} />

              <div className="relative z-10 px-6 pt-5 sm:px-8">
                <span className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-200">
                  <span className="h-2 w-2 rounded-full bg-[#FFD23F]" />
                  Tablica wyników sezonu
                </span>
              </div>

              <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-white/[0.08]">

                <button
                  onClick={() => setStatusFilter("past")}
                  title="Pokaż zakończone mecze"
                  className="p-4 sm:p-6 flex items-start justify-between gap-3 text-left cursor-pointer transition-all hover:bg-white/[0.04] active:scale-[0.99] focus-visible:outline-none focus-visible:bg-white/[0.04]"
                >
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Rozegrane mecze</p>
                    <h3 className={cn(score.className, "text-3xl font-semibold text-white mt-1.5 tabular-nums")}><CountUp value={totalSeasonMatches} /></h3>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">W tym sezonie</p>
                  </div>
                  <Trophy className="h-5 w-5 text-[#2C4BFF] shrink-0 mt-0.5" />
                </button>

                <div className="p-4 sm:p-6 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Król frekwencji</p>
                    <h3 className={cn(display.className, "text-lg font-bold text-white mt-1.5 truncate")}>{attendanceKing.name}</h3>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">{attendanceKing.count} meczów</p>
                  </div>
                  <Crown className="h-5 w-5 text-[#FFD23F] shrink-0 mt-0.5" />
                </div>

                <div className="p-4 sm:p-6 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Śr. frekwencja</p>
                    <h3 className={cn(score.className, "text-3xl font-semibold text-white mt-1.5 tabular-nums")}><CountUp value={Number(avgAttendance)} decimals={1} /> <span className="text-sm text-slate-500">/ 12</span></h3>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">Graczy na mecz</p>
                  </div>
                  <Users className="h-5 w-5 text-[#B79CFF] shrink-0 mt-0.5" />
                </div>

                <div className="p-4 sm:p-6 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Budżet sezonu</p>
                    <h3 className={cn(score.className, "text-3xl font-semibold text-white mt-1.5 tabular-nums")}><CountUp value={totalSeasonCollected} /> <span className="text-sm text-slate-500">PLN</span></h3>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">Suma składek</p>
                  </div>
                  <Wallet className="h-5 w-5 text-[#00E0A2] shrink-0 mt-0.5" />
                </div>
              </div>
            </div>
          )}

          {/* 2. NAJWAŻNIEJSZE OGŁOSZENIE — przypięte ma pierwszeństwo, inaczej najnowsze.
              Jedyna informacja z hero, której tam brakowało (reszta: mecz/cena/skład już jest wyżej). */}
          {pinnedAnnouncement && (
            <Link
              href="/announcements"
              className="flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white px-4 sm:px-5 py-3.5 shadow-xs transition-all hover:shadow-sm hover:border-[#FF5A5F]/30 cursor-pointer group animate-in fade-in slide-in-from-top-2 duration-500 fill-mode-both"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FF5A5F]/10 text-[#FF5A5F] border border-[#FF5A5F]/20">
                <Megaphone className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {pinnedAnnouncement.is_pinned && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-[#FFD23F]/15 px-1.5 py-0.5 text-[9px] font-black uppercase text-[#8A6D00] shrink-0">
                      <Pin className="h-2.5 w-2.5" /> Przypięte
                    </span>
                  )}
                  <p className="text-xs font-black text-slate-900 truncate">{pinnedAnnouncement.title}</p>
                </div>
                <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">{pinnedAnnouncement.content}</p>
              </div>
              <span className="hidden sm:inline text-[11px] font-bold text-slate-400 group-hover:text-[#FF5A5F] transition-colors shrink-0">
                Zobacz ogłoszenia
              </span>
              <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-[#FF5A5F] group-hover:translate-x-0.5 transition-all shrink-0" />
            </Link>
          )}

          {/* 3. HARMONOGRAM MECZÓW I PRZYCISKI AKCJI */}
          <div className="pt-2 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#2C4BFF] border border-slate-200 shadow-xs">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h1 className={cn(display.className, "text-xl font-bold text-slate-900 tracking-tight")}>Harmonogram meczów</h1>
                  <p className="text-xs text-slate-500 font-medium">Kliknij w mecz, aby zobaczyć szczegóły lub skład.</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  onClick={() => setShowAbsenceModal(true)}
                  className="h-11 rounded-2xl font-black text-xs flex items-center gap-2 px-5 py-2.5 text-[#0B1120] shadow-md transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C4BFF] focus-visible:ring-offset-2"
                  style={{ background: `linear-gradient(90deg, ${MINT}, #00E0A2)` }}
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
                        "h-11 rounded-2xl font-bold text-xs flex items-center gap-2 px-4 py-2.5 cursor-pointer shadow-xs transition-all active:scale-[0.97] border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C4BFF] focus-visible:ring-offset-2",
                        isSelectionMode
                          ? "bg-[#0B1120] text-white border-[#0B1120] shadow-md hover:bg-[#1A2340]"
                          : "border-slate-300 bg-white hover:bg-slate-50 text-slate-800"
                      )}
                    >
                      <CheckSquare className={cn("h-4 w-4 stroke-[2.5]", isSelectionMode ? "text-[#FFD23F]" : "text-slate-600")} />
                      <span>{isSelectionMode ? "Anuluj zaznaczanie" : "Zarządzaj / Zaznacz"}</span>
                    </button>

                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="h-11 rounded-2xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs flex items-center gap-1.5 px-4 py-2.5 cursor-pointer shadow-xs transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C4BFF] focus-visible:ring-offset-2"
                    >
                      <Plus className="h-4 w-4 stroke-[2.5]" />
                      <span>Nowy mecz</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="w-full max-w-md space-y-1.5">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Szukaj po dacie, hali, tytule lub zawodniku..."
                    className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-9 text-xs font-medium outline-none focus:border-[#2C4BFF] focus:ring-2 focus:ring-[#2C4BFF]/20 shadow-xs transition-all"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      title="Wyczyść wyszukiwanie"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {searchTerm && (
                  <p className="px-1 text-[11px] font-semibold text-slate-400">
                    {filterCounts.all === 0
                      ? "Brak wyników"
                      : filterCounts.all === 1
                      ? "1 wynik"
                      : `${filterCounts.all} wyników`}
                  </p>
                )}
              </div>

              {isSelectionMode && (
                <button
                  onClick={toggleSelectAllVisible}
                  className="text-xs font-bold text-[#2C4BFF] hover:text-[#1D3AE8] flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <CheckSquare className="h-3.5 w-3.5" />
                  {selectedBatchMatchIds.length === sortedMatches.length
                    ? "Odznacz wszystkie widoczne"
                    : "Zaznacz wszystkie widoczne"}
                </button>
              )}
            </div>
          </div>

          <div className="relative flex items-center gap-2 pt-1 overflow-x-auto">
            <div
              className="absolute rounded-xl transition-all duration-300 ease-out"
              style={{
                left: pillStyle.left,
                width: pillStyle.width,
                top: pillStyle.top,
                height: pillStyle.height,
                background: statusFilter === "cancelled" ? CORAL : INK,
                boxShadow: statusFilter === "cancelled" ? `0 6px 16px -6px ${CORAL}66` : `0 6px 16px -6px ${INK}55`
              }}
            />
            {[
              { id: "all", label: "Wszystkie" },
              { id: "upcoming", label: "Nadchodzące" },
              { id: "past", label: "Zakończone" },
              { id: "cancelled", label: "Odwołane" }
            ].map((tab) => (
              <button
                key={tab.id}
                ref={(el) => { tabRefs.current[tab.id] = el }}
                onClick={() => setStatusFilter(tab.id as any)}
                className={cn(
                  "relative z-10 rounded-xl px-4 py-2 text-xs font-bold transition-colors duration-300 shrink-0 cursor-pointer active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C4BFF] focus-visible:ring-offset-2",
                  statusFilter === tab.id
                    ? "text-white"
                    : "text-slate-600 hover:bg-slate-100 border border-slate-200 bg-white"
                )}
              >
                {tab.label}
                <span className={cn("ml-1.5 tabular-nums", statusFilter === tab.id ? "text-white/60" : "text-slate-400")}>
                  {filterCounts[tab.id as keyof typeof filterCounts]}
                </span>
              </button>
            ))}
          </div>

          {/* 4. LISTA MECZÓW — WIERSZE JAK BILETY */}
          <div className="space-y-3">
            {isLoading ? (
              <>
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 rounded-[24px] border border-slate-200/90 bg-white p-4 sm:p-5 animate-pulse"
                    style={{ animationDelay: `${i * 100}ms` }}
                  >
                    <div className="hidden sm:block h-16 w-16 shrink-0 rounded-2xl bg-slate-100" />
                    <div className="flex-1 space-y-2.5">
                      <div className="h-4 w-40 rounded-md bg-slate-100" />
                      <div className="h-3 w-64 rounded-md bg-slate-100" />
                    </div>
                    <div className="hidden sm:block h-9 w-28 rounded-xl bg-slate-100" />
                  </div>
                ))}
              </>
            ) : sortedMatches.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-[28px] border border-dashed border-slate-300 bg-white p-12 text-center">
                {searchTerm ? (
                  <>
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                      <Search className="h-5 w-5" />
                    </div>
                    <p className="text-xs font-semibold text-slate-500">
                      Brak wyników dla „{searchTerm}” — sprawdź pisownię albo spróbuj krótszej frazy.
                    </p>
                  </>
                ) : statusFilter === "cancelled" ? (
                  <>
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#00C48C]/10 text-[#00875F]">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <p className="text-xs font-semibold text-slate-500">Świetnie — żaden mecz nie został odwołany!</p>
                  </>
                ) : statusFilter === "past" ? (
                  <>
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <p className="text-xs font-semibold text-slate-500">Jeszcze żaden mecz z tej listy się nie odbył.</p>
                  </>
                ) : statusFilter === "upcoming" ? (
                  <>
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <p className="text-xs font-semibold text-slate-500">Brak nadchodzących meczów w grafiku.</p>
                  </>
                ) : (
                  <>
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <p className="text-xs font-semibold text-slate-500">Brak meczów w harmonogramie.</p>
                  </>
                )}
              </div>
            ) : (
              visibleMatches.map((match: any, idx) => {
                const roster = mainRoster(match)
                const price = Number(match.price_per_player || 25)
                const isSettled = match.is_settled
                const isCancelled = match.status_id === 4 || match.matches_status?.name?.toLowerCase().includes("odwoł")
                const isPast = match.date < todayStr || match.status_id === 3
                const isUnread = !readMatchIds.includes(`match-${match.id}`)

                const hasSubtitle = match.title && match.title !== match.date
                const isUserRegistered = match.players?.some((p: any) => p.id === user?.id)
                const isSelectedForBatch = selectedBatchMatchIds.includes(match.id)
                const stub = dateStub(match.date)

                const accentBorder = isSelectedForBatch
                  ? "border-l-[#2C4BFF]"
                  : isCancelled
                  ? "border-l-[#FF5A5F]"
                  : isUserRegistered
                  ? "border-l-[#00C48C]"
                  : isPast || isSettled
                  ? "border-l-slate-300"
                  : "border-l-[#FFD23F]"

                return (
                  <div
                    key={`${match.id}-${idx}`}
                    onClick={() => handleSelectMatch(match)}
                    className={cn(
                      "group relative flex flex-col sm:flex-row sm:items-stretch justify-between rounded-[24px] border border-l-4 p-4 sm:p-5 shadow-xs transition-all duration-300 cursor-pointer gap-4 select-none animate-in fade-in slide-in-from-bottom-2 fill-mode-both",
                      accentBorder,
                      isSelectedForBatch
                        ? "border-blue-200 bg-[#2C4BFF]/[0.04] shadow-md ring-2 ring-[#2C4BFF]/20"
                        : isCancelled
                        ? "border-slate-200/80 bg-slate-50/60 opacity-60 hover:opacity-100"
                        : isPast || isSettled
                        ? "border-slate-200/70 bg-slate-50/50"
                        : "border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5"
                    )}
                    style={{ animationDuration: "400ms", animationDelay: `${Math.min(idx, 10) * 40}ms`, animationFillMode: "both" }}
                  >
                    <div className="flex items-center gap-4">
                      {isSelectionMode ? (
                        <div
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleSelectBatchMatch(match.id)
                          }}
                          className={cn(
                            "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border cursor-pointer transition-all",
                            isSelectedForBatch
                              ? "bg-[#2C4BFF] text-white border-[#2C4BFF] shadow-md shadow-[#2C4BFF]/30 scale-105"
                              : "bg-white text-slate-400 border-slate-300 hover:border-[#2C4BFF]"
                          )}
                        >
                          {isSelectedForBatch ? (
                            <CheckSquare className="h-6 w-6 stroke-[2.5]" />
                          ) : (
                            <Square className="h-6 w-6 stroke-[1.5]" />
                          )}
                        </div>
                      ) : (
                        <>
                          {/* Odcinek biletu — data */}
                          <div className={cn(
                            "hidden sm:flex flex-col items-center justify-center w-16 h-16 shrink-0 rounded-2xl border relative",
                            isCancelled ? "bg-slate-100 border-slate-200" : isPast || isSettled ? "bg-slate-100 border-slate-200" : "bg-[#0B1120] border-[#0B1120]"
                          )}>
                            {isCancelled ? (
                              <Ban className="h-6 w-6 text-slate-400" />
                            ) : (
                              <>
                                <span className={cn(score.className, "text-[9px] font-semibold tracking-widest", isPast || isSettled ? "text-slate-400" : "text-[#FFD23F]")}>
                                  {stub.month}
                                </span>
                                <span className={cn(score.className, "text-xl font-semibold leading-none tabular-nums", isPast || isSettled ? "text-slate-600" : "text-white")}>
                                  {stub.day}
                                </span>
                              </>
                            )}
                            {isUnread && (
                              <span className="absolute -top-1.5 -right-1.5 flex h-3 w-3 rounded-full bg-[#FF5A5F] ring-2 ring-white animate-pulse" />
                            )}
                          </div>

                          {/* Perforacja pozioma między odcinkiem a treścią biletu */}
                          <div className="hidden sm:block relative w-px self-stretch">
                            <div className="absolute inset-0" style={perforation("#E4E7EC")} />
                          </div>
                        </>
                      )}

                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className={cn(display.className, "text-base font-bold transition-colors", isCancelled ? "text-slate-500 line-through" : "text-slate-900 group-hover:text-[#2C4BFF]")}>
                            {formatDatePL(match.date)}
                          </h3>
                          {hasSubtitle && (
                            <span className={cn("text-xs font-bold", isCancelled ? "text-slate-400 line-through" : "text-[#2C4BFF]")}>
                              {match.title}
                            </span>
                          )}
                          <span className={cn(
                            "rounded-md px-2 py-0.5 text-[10px] font-bold uppercase border",
                            isCancelled ? "bg-[#FF5A5F]/10 text-[#E0454A] border-[#FF5A5F]/25 font-black"
                            : isSettled ? "bg-slate-100 text-slate-500 border-slate-200"
                            : isPast ? "bg-slate-100 text-slate-500 border-slate-200" : "bg-[#2C4BFF]/[0.08] text-[#2C4BFF] border-[#2C4BFF]/20"
                          )}>
                            {isCancelled ? "Odwołany" : isSettled ? "Rozliczony" : isPast ? "Zakończony" : "Nadchodzący"}
                          </span>

                          {isUserRegistered && !isCancelled && (
                            <span className="rounded-md bg-[#00C48C]/10 text-[#00875F] border border-[#00C48C]/25 px-2 py-0.5 text-[10px] font-black">
                              Jesteś w składzie
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs font-medium text-slate-400 flex-wrap">
                          <span className={cn("flex items-center gap-1 font-bold", isCancelled ? "text-slate-400" : "text-slate-700")}>
                            <Timer className={cn("h-3.5 w-3.5", isCancelled ? "text-slate-400" : "text-[#2C4BFF]")} />
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
                        <button onClick={(e) => handleOpenRosterPreview(match, e)} className="flex items-center gap-2 rounded-xl bg-[#2C4BFF]/[0.06] hover:bg-[#2C4BFF]/[0.12] px-3 py-1.5 border border-[#2C4BFF]/20 text-xs font-bold text-[#1D3AE8] transition-all active:scale-[0.97] shadow-xs cursor-pointer">
                          <Users className="h-4 w-4 text-[#2C4BFF]" />
                          <span>Skład: <strong className="tabular-nums">{roster.length}/{match.capacity || match.max_players || 12}</strong></span>
                        </button>
                      )}

                      {isAdmin && !isSelectionMode && (
                        // Zawsze widoczne na dotykowych/małych ekranach — hover nie istnieje na telefonie,
                        // więc admin bez tego w ogóle nie zobaczyłby tych przycisków na mobile
                        <div className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1">
                          {!isCancelled && (
                            <button onClick={(e) => handleCancelMatch(match.id, match.date, e)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FF5A5F]/10 text-[#FF5A5F] hover:bg-[#FF5A5F]/20 transition-all active:scale-[0.93] border border-[#FF5A5F]/20 cursor-pointer" title="Odwołaj ten mecz">
                              <Ban className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button onClick={(e) => handleDeleteMatch(match.id, match.date, e)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-400 hover:bg-slate-200 transition-all active:scale-[0.93] border border-slate-200 cursor-pointer" title="Usuń z bazy">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}

                    </div>
                  </div>
                )
              })
            )}

            {isMatchListTruncated && (
              <button
                onClick={() => setShowAllMatches(true)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white py-3.5 text-xs font-bold text-slate-500 transition-all hover:border-[#2C4BFF]/40 hover:text-[#1D3AE8] hover:bg-[#2C4BFF]/[0.03] cursor-pointer active:scale-[0.99]"
              >
                Pokaż wszystkie ({sortedMatches.length})
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </main>
      </div>

      {/* PŁYWAJĄCY PASEK AKCJI DLA ZAZNACZONYCH MECZÓW */}
      {isSelectionMode && selectedBatchMatchIds.length > 0 && (
        <div className="fixed bottom-24 lg:bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-3xl bg-[#0B1120]/95 backdrop-blur-md px-6 py-3.5 text-white shadow-2xl border border-white/10 animate-in fade-in slide-in-from-bottom-5">
          <div className="flex items-center gap-2">
            <span className={cn(score.className, "flex h-7 w-7 items-center justify-center rounded-xl bg-[#FFD23F] text-[#0B1120] text-xs font-bold tabular-nums")}>
              {selectedBatchMatchIds.length}
            </span>
            <span className="text-xs font-bold text-slate-300">zaznaczonych spotkań</span>
          </div>

          <div className="h-4 w-px bg-white/10" />

          <Button
            onClick={handleBatchCancel}
            disabled={isBatchCancelling || isBatchDeleting}
            className="rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-black text-xs px-5 py-2.5 gap-1.5 cursor-pointer"
          >
            <Ban className="h-4 w-4" />
            {isBatchCancelling ? "Odwoływanie..." : "Odwołaj zaznaczone"}
          </Button>

          <Button
            onClick={handleBatchDelete}
            disabled={isBatchDeleting || isBatchCancelling}
            className="rounded-2xl bg-[#FF5A5F] hover:bg-[#E0454A] text-white font-black text-xs px-5 py-2.5 gap-1.5 cursor-pointer shadow-md shadow-[#FF5A5F]/30"
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

      <SupportModal open={showSupportModal} onClose={() => setShowSupportModal(false)} />

      {/* MODAL URLOPU */}
      <Modal
        open={showAbsenceModal}
        onClose={() => setShowAbsenceModal(false)}
        overlayClassName="bg-[#0B1120]/70 backdrop-blur-sm overflow-y-auto"
        cardClassName="w-full max-w-lg rounded-[28px] border border-slate-200 bg-white p-6 sm:p-7 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto"
      >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#00C48C]/10 text-[#00875F] border border-[#00C48C]/25">
                  <Palmtree className="h-6 w-6" />
                </div>
                <div>
                  <h2 className={cn(display.className, "text-base font-bold text-slate-900")}>Zgłoś urlop / nieobecność</h2>
                  <p className="text-xs text-slate-500 font-medium">Wybierz okres, a my wypiszemy Cię z meczów</p>
                </div>
              </div>
              <button onClick={() => setShowAbsenceModal(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C4BFF]">
                <X className="h-5 w-5" />
              </button>
            </div>

            {absenceStartDate && absenceEndDate && (
              <div className="rounded-2xl border border-[#00C48C]/25 bg-[#00C48C]/[0.06] px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                <span className="text-xs font-bold text-[#00513A]">
                  Wypiszemy Cię z <span className={cn(score.className, "tabular-nums")}>{selectedMatchesToLeave.length}</span>{" "}
                  {selectedMatchesToLeave.length === 1 ? "meczu" : "meczów"} w okresie {formatDatePL(absenceStartDate)} – {formatDatePL(absenceEndDate)}.
                </span>
              </div>
            )}

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
                      onClick={() => applyAbsencePreset(opt.id as any)}
                      className={cn(
                        "py-3 px-2 rounded-2xl font-black text-xs border transition-all cursor-pointer text-center",
                        absencePreset === opt.id
                          ? "bg-[#00C48C] text-white border-[#00C48C] shadow-md shadow-[#00C48C]/25 scale-[1.02]"
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
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-[#00C48C]"
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
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-[#00C48C]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    2. Twoje mecze w tym okresie ({userMatchesInAbsenceRange.length}):
                  </label>
                  <span className="text-[11px] font-bold text-[#00875F]">Kliknij mecz, aby go zachować</span>
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
                              ? "bg-[#FF5A5F]/[0.06] border-[#FF5A5F]/25 text-[#8A2A2D]"
                              : "bg-[#00C48C]/[0.06] border-[#00C48C]/25 text-[#00513A]"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "flex h-8 w-8 items-center justify-center rounded-xl font-bold",
                              isMarkedToLeave ? "bg-[#FF5A5F]/15 text-[#FF5A5F]" : "bg-[#00C48C]/15 text-[#00875F]"
                            )}>
                              {isMarkedToLeave ? <CalendarX className="h-4 w-4" /> : <CalendarCheck className="h-4 w-4" />}
                            </div>
                            <div>
                              <p className="font-bold text-xs">{formatDatePL(m.date)}</p>
                              <p className="text-[11px] opacity-70">{m.location}</p>
                            </div>
                          </div>

                          <span className={cn(
                            "px-2.5 py-1 rounded-xl text-[10px] font-black uppercase border",
                            isMarkedToLeave ? "bg-[#FF5A5F]/10 text-[#FF5A5F] border-[#FF5A5F]/30" : "bg-[#00C48C]/10 text-[#00875F] border-[#00C48C]/30"
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
                className="rounded-2xl bg-[#FF5A5F] hover:bg-[#E0454A] text-white font-black text-xs px-6 py-3 shadow-lg shadow-[#FF5A5F]/30 cursor-pointer disabled:opacity-50"
              >
                {isSavingAbsence
                  ? "Zapisywanie..."
                  : `Zatwierdź nieobecność (${selectedMatchesToLeave.length} meczów)`}
              </Button>
            </div>
      </Modal>

      <Modal
        open={!!selectedMatchRosterPreview}
        onClose={() => setSelectedMatchRosterPreview(null)}
        overlayClassName="bg-[#0B1120]/70 backdrop-blur-sm"
        cardClassName="relative w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl border border-slate-200 space-y-4 text-slate-900"
      >
        {selectedMatchRosterPreview && (
          <>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className={cn(display.className, "text-sm font-bold text-slate-900 flex items-center gap-2")}>
                  <Users className="h-5 w-5 text-[#2C4BFF]" />
                  Skład na mecz ({formatDatePL(selectedMatchRosterPreview.date)})
                </h2>
                <p className="text-[11px] font-semibold text-slate-400 mt-0.5">{selectedMatchRosterPreview.location}</p>
              </div>
              <button onClick={() => setSelectedMatchRosterPreview(null)} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C4BFF]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-1.5">
                <div className="flex justify-between items-baseline text-[11px] font-bold">
                  <span className="text-slate-500 uppercase tracking-wide">Powołani gracze</span>
                  <span className={cn(score.className, "text-slate-900 text-base tabular-nums")}>
                    {mainRoster(selectedMatchRosterPreview).length} / {selectedMatchRosterPreview.capacity || selectedMatchRosterPreview.max_players || 12}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, (mainRoster(selectedMatchRosterPreview).length / Number(selectedMatchRosterPreview.capacity || selectedMatchRosterPreview.max_players || 12)) * 100)}%`,
                      background: `linear-gradient(90deg, ${COBALT}, ${YELLOW})`
                    }}
                  />
                </div>
                <p className="text-[11px] font-bold text-[#00875F]">
                  Rozliczono: {mainRoster(selectedMatchRosterPreview).length * Number(selectedMatchRosterPreview.price_per_player || 25)} PLN
                </p>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                {mainRoster(selectedMatchRosterPreview).length === 0 ? (
                  <p className="py-6 text-center text-xs font-semibold text-slate-400">Brak zapisanych graczy w głównym składzie.</p>
                ) : (
                  mainRoster(selectedMatchRosterPreview).map((p: any, i: number) => {
                    const isCurrentUser = user?.id === p.id || user?.email === p.email || user?.name === p.full_name || user?.full_name === p.name

                    return (
                      <div key={i} className={cn("flex items-center justify-between p-2.5 rounded-2xl border text-xs font-bold", isCurrentUser ? "bg-[#2C4BFF]/[0.06] border-[#2C4BFF]/25 text-[#1D3AE8]" : "bg-slate-50 border-slate-100")}>
                        <div className="flex items-center gap-2.5">
                          <span className={cn(score.className, "flex h-7 w-7 items-center justify-center rounded-xl font-semibold text-[11px] tabular-nums", isCurrentUser ? "bg-[#2C4BFF] text-white" : "bg-[#2C4BFF]/10 text-[#2C4BFF]")}>
                            {i + 1}
                          </span>
                          <span>{p.name || p.full_name} {isCurrentUser && <span className="ml-1 text-[10px] uppercase text-[#2C4BFF] font-extrabold">(Ty)</span>}</span>
                        </div>

                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black border bg-[#00C48C]/10 text-[#00875F] border-[#00C48C]/25">
                          <Check className="h-3 w-3" /> Opłacono
                        </span>
                      </div>
                    )
                  })
                )}
              </div>

              {waitlist(selectedMatchRosterPreview).length > 0 && (
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <p className="text-xs font-bold text-[#7A5CFF]">Lista rezerwowa ({waitlist(selectedMatchRosterPreview).length})</p>
                  <div className="space-y-1">
                    {waitlist(selectedMatchRosterPreview).map((p: any, i: number) => {
                      const isCurrentUser = user?.id === p.id || user?.email === p.email || user?.name === p.full_name || user?.full_name === p.name
                      return (
                        <div key={i} className={cn("p-2 rounded-xl border text-xs font-bold flex justify-between", isCurrentUser ? "bg-[#7A5CFF]/10 border-[#7A5CFF]/30 text-[#4B2FB0]" : "bg-[#7A5CFF]/[0.04] border-[#7A5CFF]/15 text-[#4B2FB0]")}>
                          <span>{p.name || p.full_name} {isCurrentUser && <span className="ml-1 text-[10px] uppercase text-[#7A5CFF] font-extrabold">(Ty)</span>}</span>
                          <span className="text-[10px] uppercase text-[#7A5CFF] font-extrabold">Rezerwa #{i + 1}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

          </>
        )}
      </Modal>

      {/* MODAL TWORZENIA MECZU */}
      <Modal
        open={showCreateModal && isAdmin}
        onClose={() => setShowCreateModal(false)}
        overlayClassName="bg-[#0B1120]/70 backdrop-blur-sm overflow-y-auto"
        cardClassName="w-full max-w-2xl rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto"
      >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className={cn(display.className, "text-lg font-bold text-slate-900")}>Utwórz nowy mecz</h2>
              <button onClick={() => setShowCreateModal(false)} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C4BFF]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMatch} className="space-y-3.5 text-xs">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">1. Podstawowe informacje</p>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tytuł / Podtytuł (opcjonalnie)</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="np. Mecz o złote majtki (zostaw puste = tylko data)"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 font-medium outline-none focus:border-[#2C4BFF]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Data pierwszego meczu</label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 font-medium outline-none focus:border-[#2C4BFF]"
                  />
                </div>
              </div>

              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 pt-1">2. Częstotliwość</p>
              <div className="rounded-2xl border border-[#2C4BFF]/15 bg-[#2C4BFF]/[0.03] p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-[#14204D] flex items-center gap-1.5">
                    <Repeat className="h-4 w-4 text-[#2C4BFF]" />
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
                          ? "bg-[#2C4BFF] text-white border-[#2C4BFF] shadow-sm shadow-[#2C4BFF]/20"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {repeatFrequency !== "none" && (
                  <div className="pt-2 border-t border-[#2C4BFF]/10 space-y-2.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-700">Jak długo powielać?</span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setDurationMode("preset")}
                          className={cn(
                            "px-2 py-0.5 rounded-lg font-bold text-[10px] cursor-pointer",
                            durationMode === "preset" ? "bg-[#2C4BFF] text-white" : "bg-slate-200/70 text-slate-600"
                          )}
                        >
                          Okres (mies.)
                        </button>
                        <button
                          type="button"
                          onClick={() => setDurationMode("custom_date")}
                          className={cn(
                            "px-2 py-0.5 rounded-lg font-bold text-[10px] cursor-pointer",
                            durationMode === "custom_date" ? "bg-[#2C4BFF] text-white" : "bg-slate-200/70 text-slate-600"
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
                                ? "bg-[#2C4BFF]/10 text-[#1D3AE8] border-[#2C4BFF]/40 font-black"
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
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-bold text-slate-800 outline-none focus:border-[#2C4BFF]"
                        />
                      </div>
                    )}

                    {newDate && (
                      <div className="bg-white/80 rounded-xl p-2 border border-[#2C4BFF]/20 text-[11px] font-bold text-[#14204D] flex items-center justify-between">
                        <span>Zostanie wygenerowanych:</span>
                        <span className={cn(score.className, "bg-[#2C4BFF] text-white px-2 py-0.5 rounded-lg text-xs font-semibold tabular-nums")}>
                          {calculatedDatesCount} meczów
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 pt-1">3. Lokalizacja i cennik</p>
              <div className="rounded-2xl border border-[#00C48C]/20 bg-[#00C48C]/[0.04] p-3.5 space-y-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Lokalizacja / Hala</label>
                  <input
                    type="text"
                    required
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 font-medium outline-none focus:border-[#00C48C]"
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
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 font-bold outline-none focus:border-[#00C48C]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Limit miejsc</label>
                    <div className="flex items-center rounded-xl border border-slate-200 bg-white overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setNewCapacity(String(Math.max(1, modalCapacityNum - 1)))}
                        className="flex h-[34px] w-8 shrink-0 items-center justify-center text-slate-500 hover:bg-slate-100 cursor-pointer active:scale-90 transition-transform font-black"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        required
                        value={newCapacity}
                        onChange={(e) => setNewCapacity(e.target.value)}
                        className="w-full min-w-0 text-center bg-transparent py-2 font-bold outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        type="button"
                        onClick={() => setNewCapacity(String(modalCapacityNum + 1))}
                        className="flex h-[34px] w-8 shrink-0 items-center justify-center text-slate-500 hover:bg-slate-100 cursor-pointer active:scale-90 transition-transform font-black"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-white/70 border border-[#00C48C]/20 px-3 py-2">
                  <span className="font-bold text-[#00513A]">Maks. budżet z meczu:</span>
                  <span className={cn(score.className, "text-[#00875F] font-semibold tabular-nums")}>{modalMaxBudget} PLN</span>
                </div>
              </div>

              {/* SEKCJA POWOŁAŃ ZE STAŁEGO SKŁADU */}
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 pt-1">4. Skład</p>
              <div className="rounded-2xl border border-[#7A5CFF]/20 bg-[#7A5CFF]/[0.04] p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-[#4B2FB0] flex items-center gap-1.5">
                    <UserCheck className="h-4 w-4 text-[#7A5CFF]" />
                    Powołani zawodnicy ({selectedPlayerIds.length})
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
                    className="text-[11px] font-bold text-[#7A5CFF] hover:underline cursor-pointer"
                  >
                    {selectedPlayerIds.length > 0 ? "Wyczyść wszystkich" : "Zastosuj stały skład"}
                  </button>
                </div>

                {modalReserveCount > 0 && (
                  <p className="text-[10px] font-bold text-[#4B2FB0] bg-white/70 border border-[#7A5CFF]/20 rounded-lg px-2.5 py-1.5">
                    {modalReserveCount} {modalReserveCount === 1 ? "osoba trafi" : "osób trafi"} na listę rezerwową — limit miejsc to {modalCapacityNum}.
                  </p>
                )}

                <div className="max-h-48 overflow-y-auto space-y-2 border border-slate-200 rounded-2xl p-2 bg-white/70">
                  {availablePlayers.length === 0 ? (
                    <p className="text-[11px] text-slate-400 text-center py-2">Brak aktywnych zawodników w bazie.</p>
                  ) : (
                    <>
                      {availablePlayers.some((p) => p.is_core_roster) && (
                        <div className="space-y-1.5">
                          <p className="px-1 text-[9px] font-black uppercase tracking-wider text-slate-400">Stały skład</p>
                          {availablePlayers.filter((p) => p.is_core_roster).map(renderCreateModalPlayerRow)}
                        </div>
                      )}
                      {availablePlayers.some((p) => !p.is_core_roster) && (
                        <div className="space-y-1.5">
                          <p className="px-1 text-[9px] font-black uppercase tracking-wider text-slate-400">Pozostali</p>
                          {availablePlayers.filter((p) => !p.is_core_roster).map(renderCreateModalPlayerRow)}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Sticky podsumowanie — kontrola przed zapisem bez scrollowania do góry */}
              <div className="sticky bottom-0 -mx-6 -mb-6 bg-white px-6 pb-6 pt-3 border-t border-slate-100 space-y-2.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 flex-wrap gap-x-3 gap-y-1">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3 text-[#2C4BFF]" /> {newDate ? formatDatePL(newDate) : "—"}</span>
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-[#2C4BFF]" /> {newLocation || "—"}</span>
                  <span className="flex items-center gap-1"><Wallet className="h-3 w-3 text-[#2C4BFF]" /> {modalPriceNum} PLN</span>
                  <span className="flex items-center gap-1"><UserCheck className="h-3 w-3 text-[#2C4BFF]" /> {selectedPlayerIds.length} powołanych</span>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={() => setShowCreateModal(false)} className="rounded-xl text-xs font-bold cursor-pointer">
                    Anuluj
                  </Button>
                  <Button type="submit" disabled={isCreating} className="rounded-xl bg-[#2C4BFF] hover:bg-[#1D3AE8] font-bold text-white text-xs cursor-pointer shadow-md shadow-[#2C4BFF]/20">
                    {isCreating ? "Tworzenie..." : repeatFrequency === "none" ? "Zapisz mecz" : `Wygeneruj ${calculatedDatesCount} meczów`}
                  </Button>
                </div>
              </div>
            </form>
      </Modal>

      <Modal
        open={!!selectedMatch}
        onClose={() => setSelectedMatch(null)}
        overlayClassName="bg-[#0B1120]/70 backdrop-blur-sm p-4 overflow-y-auto"
        cardClassName="w-full max-w-xl"
      >
        {selectedMatch && (
          <MatchDetail match={selectedMatch} currentUser={user} onClose={() => setSelectedMatch(null)} onChange={handleMatchChange} />
        )}
      </Modal>

      <ConfirmDialog state={confirmDialog} onCancel={() => setConfirmDialog(null)} />

      {toast && (
        <div className="fixed bottom-24 lg:bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#0B1120]/95 backdrop-blur-md px-4 py-2.5 text-xs font-bold text-white shadow-xl animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="h-4 w-4 text-[#00E0A2]" />
          {toast}
        </div>
      )}
    </div>
  )
}
