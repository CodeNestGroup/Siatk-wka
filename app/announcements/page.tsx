"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Space_Grotesk, Oswald } from "next/font/google"
import {
  Megaphone,
  Pin,
  Plus,
  Search,
  Trash2,
  CheckCircle2,
  Send,
  AlertTriangle,
  Ban,
  CalendarCheck,
  Calendar,
  X,
  Coffee,
  ChevronDown,
  MessageCircle,
  ShieldCheck
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sidebar } from "@/components/dashboard/sidebar"
import { NotificationsBell, type NotificationItem } from "@/components/dashboard/notifications-bell"
import { SupportModal } from "@/components/dashboard/support-modal"
import { Modal } from "@/components/ui/modal"
import { ConfirmDialog, type ConfirmDialogState } from "@/components/ui/confirm-dialog"
import { cn, formatDatePL, normalizeSearchText, fuzzySearchMatch } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { notifyPush } from "@/lib/push"

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

const netPattern: React.CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 16px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 16px)"
}

type AuthorInfo = {
  full_name: string | null
  role_id?: number | null
  email?: string | null
}

type Announcement = {
  id: string
  title: string
  content: string
  category_id: number
  is_pinned: boolean
  created_at: string
  match_id?: string
  author_id?: string
  players?: AuthorInfo | null
  matches?: {
    date: string
    location: string
    time_start: string | null
  } | null
}

type Category = {
  id: number
  name: string
}

type AnnouncementComment = {
  id: string
  announcement_id: string
  author_id: string
  content: string
  created_at: string
  players?: AuthorInfo | null
}

// Ten sam zestaw warunkow co `isAdmin` dla zalogowanego uzytkownika, ale liczony
// dla AUTORA konkretnego wpisu (ogloszenia albo komentarza) — zeby dalo sie
// wizualnie odroznic tresc od administracji od tresci od zwyklego gracza.
function isAuthorAdmin(author: AuthorInfo | null | undefined): boolean {
  if (!author) return false
  return author.role_id === 1 || author.email === "admin@admin.pl" || author.full_name === "Mateusz Podzorski"
}

// Mecze mają teraz ustawialną godzinę (wcześniej sztywne 19:00-21:00) — samo "Mecz: 16.10.2026"
// bez godziny przestało wystarczać, gdy admin faktycznie ustawi inną porę niż domyślna.
function matchDateTimeLabel(date: string, timeStart?: string | null): string {
  return timeStart ? `${formatDatePL(date)} • ${timeStart.slice(0, 5)}` : formatDatePL(date)
}

export default function AnnouncementsPage() {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [showAllAnnouncements, setShowAllAnnouncements] = useState(false)
  useEffect(() => {
    setShowAllAnnouncements(false)
  }, [selectedCategory, search])
  const [user, setUser] = useState<any>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [showSupportModal, setShowSupportModal] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>(null)

  const isAdmin = user?.role === "admin" || user?.is_admin || user?.email === "admin@admin.pl" || user?.name === "Mateusz Podzorski" || user?.full_name === "Mateusz Podzorski"

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newContent, setNewContent] = useState("")
  const [newCategoryId, setNewCategoryId] = useState<number>(2)
  const [newIsPinned, setNewIsPinned] = useState(false)
  const [newMatchId, setNewMatchId] = useState<string>("")
  const [matchOptions, setMatchOptions] = useState<{ id: string; date: string; location: string | null; time_start: string | null }[]>([])

  const [commentsByAnnouncement, setCommentsByAnnouncement] = useState<Record<string, AnnouncementComment[]>>({})
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set())
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({})
  const [postingCommentId, setPostingCommentId] = useState<string | null>(null)

  useEffect(() => {
    const localUser = localStorage.getItem("volley_user")
    if (localUser) {
      setUser(JSON.parse(localUser))
    } else {
      setUser(null)
    }

    fetchAnnouncements()
    fetchCategories()
    fetchMatchOptions()
    fetchComments()
  }, [])

  // Lista meczów do opcjonalnego powiązania — pole `match_id` istniało w typie i już
  // wyświetlało datę meczu na odznace ogłoszenia, ale formularz nigdy go nie ustawiał,
  // więc realnie dało się je wpisać tylko ręcznie w bazie danych.
  async function fetchMatchOptions() {
    const { data, error } = await supabase
      .from('matches')
      .select('id, date, location, time_start')
      .order('date', { ascending: false })

    if (error) {
      console.error("Błąd pobierania meczów:", error.message)
    } else if (data) {
      setMatchOptions(data)
    }
  }

  async function fetchAnnouncements() {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('announcements')
      .select(`
        *,
        players:author_id (
          full_name,
          role_id,
          email
        ),
        matches:match_id (
          date,
          location,
          time_start
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error("Błąd pobierania ogłoszeń:", error.message)
    } else if (data) {
      setAnnouncements(data)
    }
    setIsLoading(false)
  }

  // Wszystkie komentarze pod wszystkimi ogłoszeniami w jednym zapytaniu, pogrupowane
  // lokalnie po `announcement_id` — tablica ogłoszeń jest mała (klub, nie portal),
  // więc nie ma sensu dociągać komentarzy osobno dla każdego wpisu przy rozwinięciu.
  async function fetchComments() {
    const { data, error } = await supabase
      .from('announcement_comments')
      .select(`
        *,
        players:author_id (
          full_name,
          role_id,
          email
        )
      `)
      .order('created_at', { ascending: true })

    if (error) {
      console.error("Błąd pobierania komentarzy:", error.message)
      return
    }

    const grouped: Record<string, AnnouncementComment[]> = {}
    ;(data || []).forEach((c: AnnouncementComment) => {
      if (!grouped[c.announcement_id]) grouped[c.announcement_id] = []
      grouped[c.announcement_id].push(c)
    })
    setCommentsByAnnouncement(grouped)
  }

  async function fetchCategories() {
    const { data, error } = await supabase
      .from('announcements_category')
      .select('id, name')
      .order('id', { ascending: true })

    if (error) {
      console.error("Błąd pobierania kategorii:", error.message)
    } else if (data) {
      setCategories(data)
    }
  }

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

  async function handleCreateAnnouncement(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim() || !newContent.trim()) return

    const authorId = user?.id || "be8a8e80-0601-4ce9-a944-5cd750b842db"

    const newAnnouncementPayload = {
      title: newTitle,
      content: newContent,
      category_id: Number(newCategoryId),
      is_pinned: newIsPinned,
      author_id: authorId,
      match_id: newMatchId || null,
    }

    const { data, error } = await supabase
      .from('announcements')
      .insert([newAnnouncementPayload])
      .select(`
        *,
        players:author_id (
          full_name,
          role_id,
          email
        ),
        matches:match_id (
          date,
          location,
          time_start
        )
      `)
      .single()

    if (error) {
      notify("Błąd: Nie udało się zapisać w bazie")
      console.error(error)
      return
    }

    if (data) {
      setAnnouncements((prev) => [data, ...prev])
      notifyPush({
        title: "Nowe ogłoszenie",
        body: newTitle,
        url: "/announcements",
        excludePlayerId: user?.id
      })
      notify("Ogłoszenie zostało pomyślnie opublikowane")
    }

    setIsModalOpen(false)
    setNewTitle("")
    setNewContent("")
    setNewCategoryId(categories.length > 0 ? categories[0].id : 2)
    setNewIsPinned(false)
    setNewMatchId("")
  }

  function handleDelete(id: string, title: string) {
    setConfirmDialog({
      title: "Usunąć ogłoszenie?",
      message: `"${title}" zniknie z tablicy dla wszystkich — tej operacji nie da się cofnąć.`,
      confirmLabel: "Usuń trwale",
      danger: true,
      onConfirm: () => performDelete(id)
    })
  }

  async function performDelete(id: string) {
    setConfirmDialog(null)
    setAnnouncements((prev) => prev.filter((a) => a.id !== id))
    const { error } = await supabase.from('announcements').delete().eq('id', id)

    if (error) {
      notify("Błąd podczas usuwania")
      fetchAnnouncements()
    } else {
      notify("Ogłoszenie usunięte z bazy")
    }
  }

  async function togglePin(id: string, currentPinned: boolean) {
    setAnnouncements((prev) =>
      prev.map((a) => (a.id === id ? { ...a, is_pinned: !currentPinned } : a))
    )

    await supabase
      .from('announcements')
      .update({ is_pinned: !currentPinned })
      .eq('id', id)
  }

  function toggleComments(announcementId: string) {
    setExpandedComments((prev) => {
      const next = new Set(prev)
      if (next.has(announcementId)) next.delete(announcementId)
      else next.add(announcementId)
      return next
    })
  }

  async function handleAddComment(announcementId: string) {
    const content = (commentDrafts[announcementId] || "").trim()
    if (!content) return

    const authorId = user?.id || "be8a8e80-0601-4ce9-a944-5cd750b842db"
    setPostingCommentId(announcementId)

    const { data, error } = await supabase
      .from('announcement_comments')
      .insert([{ announcement_id: announcementId, author_id: authorId, content }])
      .select(`
        *,
        players:author_id (
          full_name,
          role_id,
          email
        )
      `)
      .single()

    if (error) {
      notify("Błąd: nie udało się dodać komentarza")
      console.error(error)
    } else if (data) {
      setCommentsByAnnouncement((prev) => ({
        ...prev,
        [announcementId]: [...(prev[announcementId] || []), data]
      }))
      setCommentDrafts((prev) => ({ ...prev, [announcementId]: "" }))
    }

    setPostingCommentId(null)
  }

  function buildAnnouncementTokens(a: Announcement): string[] {
    return normalizeSearchText(`${a.title || ""} ${a.content || ""}`).split(/[^a-z0-9]+/).filter(Boolean)
  }

  const filtered = announcements.filter((a) => {
    const matchesSearch = fuzzySearchMatch(buildAnnouncementTokens(a), search)

    let matchesCat = true
    if (selectedCategory !== "all") {
      matchesCat = a.category_id === Number(selectedCategory)
    }

    return matchesSearch && matchesCat
  })

  const sorted = [...filtered].sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned))

  // Skrócona tablica ogłoszeń — przypięte zawsze widoczne (są na górze dzięki sortowaniu
  // wyżej), reszta ucięta do kilku najnowszych + przycisk rozwinięcia. Bez limitu tablica
  // rośnie w nieskończoność i nigdy się nie kończy przy przewijaniu na telefonie.
  const ANNOUNCEMENT_PREVIEW_LIMIT = 5
  const isAnnouncementListTruncated = !search && sorted.length > ANNOUNCEMENT_PREVIEW_LIMIT
  const visibleAnnouncements = isAnnouncementListTruncated && !showAllAnnouncements ? sorted.slice(0, ANNOUNCEMENT_PREVIEW_LIMIT) : sorted

  // Wspólna sekcja komentarzy pod ogłoszeniem — jedna implementacja dla ciemnej karty
  // (przypięte) i jasnej karty (reszta), żeby nie duplikować tej samej logiki dwa razy.
  function renderCommentSection(item: Announcement, isDark: boolean) {
    const items = commentsByAnnouncement[item.id] || []
    const isExpanded = expandedComments.has(item.id)
    const draft = commentDrafts[item.id] || ""

    return (
      <div className="relative z-10 space-y-2.5">
        <button
          onClick={(e) => { e.stopPropagation(); toggleComments(item.id) }}
          className={cn(
            "flex items-center gap-1.5 text-[11px] font-bold transition-colors cursor-pointer",
            isDark ? "text-slate-300 hover:text-white" : "text-slate-500 hover:text-slate-800"
          )}
        >
          <MessageCircle className="h-3.5 w-3.5" />
          {items.length > 0 ? `Komentarze (${items.length})` : "Skomentuj"}
          <ChevronDown className={cn("h-3 w-3 transition-transform", isExpanded && "rotate-180")} />
        </button>

        {isExpanded && (
          <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
            {items.map((c) => {
              const commentIsAdmin = isAuthorAdmin(c.players)
              return (
                <div key={c.id} className={cn("rounded-xl p-2.5 text-xs", isDark ? "bg-white/5" : "bg-slate-50")}>
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    <span className={cn("font-bold", isDark ? "text-white" : "text-slate-800")}>
                      {c.players?.full_name || "Zawodnik"}
                    </span>
                    {commentIsAdmin && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-[#2C4BFF]/15 px-1.5 py-0.5 text-[9px] font-black uppercase text-[#2C4BFF]">
                        <ShieldCheck className="h-2.5 w-2.5" /> Administracja
                      </span>
                    )}
                    <span className={cn("text-[10px] ml-auto", isDark ? "text-slate-500" : "text-slate-400")}>
                      {formatDatePL(c.created_at?.split("T")[0])}
                    </span>
                  </div>
                  <p className={cn("leading-relaxed whitespace-pre-line", isDark ? "text-slate-300" : "text-slate-600")}>
                    {c.content}
                  </p>
                </div>
              )
            })}

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={draft}
                onChange={(e) => setCommentDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddComment(item.id) }}
                placeholder="Napisz komentarz…"
                className={cn(
                  "flex-1 min-w-0 rounded-xl px-3 py-2 text-xs outline-none transition-all",
                  isDark
                    ? "bg-white/10 border border-white/15 text-white placeholder:text-slate-500 focus:border-white/30"
                    : "bg-slate-50 border border-slate-200 focus:border-[#2C4BFF] focus:bg-white"
                )}
              />
              <button
                onClick={() => handleAddComment(item.id)}
                disabled={postingCommentId === item.id || !draft.trim()}
                className="shrink-0 flex h-8 w-8 items-center justify-center rounded-xl bg-[#2C4BFF] hover:bg-[#1D3AE8] text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-90 transition-all"
                title="Wyślij komentarz"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Kolor akcentu w zależności od kategorii — te same tokeny marki co reszta appki
  function getCategoryAccent(catName: string): { color: string; bg: string; border: string; text: string } {
    const name = catName.toLowerCase()
    if (name.includes("odwołan")) return { color: CORAL, bg: "bg-[#FF5A5F]/10", border: "border-[#FF5A5F]/25", text: "text-[#E0454A]" }
    if (name.includes("ważn")) return { color: YELLOW, bg: "bg-[#FFD23F]/10", border: "border-[#FFD23F]/30", text: "text-[#946E00]" }
    if (name.includes("zapro")) return { color: COBALT, bg: "bg-[#2C4BFF]/10", border: "border-[#2C4BFF]/25", text: "text-[#1D3AE8]" }
    return { color: "#94A3B8", bg: "bg-slate-100", border: "border-slate-200", text: "text-slate-600" }
  }

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

        {/* Header — ta strona wcześniej w ogóle go nie miała (brak dzwonka, brak wsparcia) */}
        <header className="sticky top-0 z-30 flex items-center justify-end border-b border-slate-200 bg-white/90 pl-16 pr-6 py-3 lg:px-6 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSupportModal(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFD23F]/90 text-[#0B1120] shadow-sm cursor-pointer active:scale-90 transition-transform"
              title="Postaw kawę"
            >
              <Coffee className="h-4 w-4" />
            </button>
            <NotificationsBell playerId={user?.id} onNotificationClick={(notif: NotificationItem) => {}} />
          </div>
        </header>

        <main className="relative z-10 mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-8 pb-24 lg:pb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#2C4BFF] border border-slate-200 shadow-xs">
                <Megaphone className="h-5 w-5" />
              </div>
              <div>
                <h1 className={cn(display.className, "text-xl font-bold text-slate-900 tracking-tight")}>Tablica Ogłoszeń</h1>
                <p className="text-xs font-medium text-slate-500">Ważne komunikaty i informacje dla całego zespołu.</p>
              </div>
            </div>

            {user && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="h-10 rounded-2xl font-bold text-xs flex items-center gap-2 px-4 text-white cursor-pointer active:scale-[0.97] shadow-md transition-all shrink-0"
                style={{ background: COBALT, boxShadow: `0 4px 14px -4px ${COBALT}80` }}
              >
                <Plus className="h-4 w-4 stroke-[2.5]" />
                Dodaj ogłoszenie
              </button>
            )}
          </div>

          {/* WYSZUKIWARKA I ZAKŁADKI KATEGORII */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Szukaj w ogłoszeniach…"
                className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-9 text-xs outline-none focus:border-[#2C4BFF] focus:ring-2 focus:ring-[#2C4BFF]/20 shadow-xs transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Fade na prawej krawędzi — sygnalizuje że jest więcej zakładek do przewinięcia
                (wcześniej ostatnia po prostu ucinała się na krawędzi bez żadnej wskazówki) */}
            <div
              className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 border border-slate-200/80 w-full sm:w-auto overflow-x-auto"
              style={{
                WebkitMaskImage: "linear-gradient(to right, black calc(100% - 28px), transparent 100%)",
                maskImage: "linear-gradient(to right, black calc(100% - 28px), transparent 100%)"
              }}
            >
              <button
                onClick={() => setSelectedCategory("all")}
                className={cn(
                  "rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all shrink-0 border cursor-pointer active:scale-95",
                  selectedCategory === "all"
                    ? "bg-[#0B1120] text-white shadow-md shadow-[#0B1120]/20 border-[#0B1120]"
                    : "text-slate-600 bg-white border-transparent hover:bg-slate-50"
                )}
              >
                Wszystkie
              </button>

              {categories.map((cat) => {
                const isSelected = selectedCategory === cat.id.toString()
                const accent = getCategoryAccent(cat.name)

                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id.toString())}
                    style={isSelected ? { background: accent.color, boxShadow: `0 4px 10px -3px ${accent.color}99` } : undefined}
                    className={cn(
                      "rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all shrink-0 border cursor-pointer active:scale-95",
                      isSelected ? "text-white border-transparent" : cn(accent.text, accent.bg, accent.border, "hover:opacity-80")
                    )}
                  >
                    {cat.name}
                  </button>
                )
              })}
            </div>
          </div>

          {/* LISTA OGŁOSZEŃ */}
          <div className="space-y-3.5">
            {isLoading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="rounded-[24px] border border-slate-200/90 bg-white p-5 space-y-3 animate-pulse" style={{ animationDelay: `${i * 100}ms` }}>
                    <div className="h-4 w-24 rounded-md bg-slate-100" />
                    <div className="h-4 w-2/3 rounded-md bg-slate-100" />
                    <div className="h-3 w-full rounded-md bg-slate-100" />
                  </div>
                ))}
              </div>
            ) : sorted.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-[28px] border border-dashed border-slate-300 bg-white p-12 text-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <Search className="h-5 w-5" />
                </div>
                <p className="text-xs font-semibold text-slate-500">
                  {search ? `Brak wyników dla „${search}”.` : "Brak ogłoszeń na tablicy."}
                </p>
              </div>
            ) : (
              visibleAnnouncements.map((item, idx) => {
                const currentCategory = categories.find((c) => c.id === item.category_id)
                const catName = currentCategory?.name?.toLowerCase() || ""

                // Odznaka wynika wyłącznie z realnie wybranej kategorii (nie z treści tytułu) —
                // wcześniej dopasowanie fragmentu słowa w tytule ("zapro", "ważn"...) potrafiło
                // nadać złą odznakę niezależnie od kategorii faktycznie ustawionej przez admina.
                const isMatchCancelled = !!item.match_id || catName.includes("odwołan")
                const isImportant = catName.includes("ważn")
                const isInvitation = catName.includes("zapro")

                const accent = isMatchCancelled
                  ? { color: CORAL, bg: "bg-[#FF5A5F]/10", border: "border-[#FF5A5F]/25", text: "text-[#E0454A]" }
                  : isImportant
                  ? { color: YELLOW, bg: "bg-[#FFD23F]/10", border: "border-[#FFD23F]/30", text: "text-[#946E00]" }
                  : isInvitation
                  ? { color: COBALT, bg: "bg-[#2C4BFF]/10", border: "border-[#2C4BFF]/25", text: "text-[#1D3AE8]" }
                  : { color: "#94A3B8", bg: "bg-slate-100", border: "border-slate-200", text: "text-slate-600" }

                const authorName = item.players?.full_name
                const authorIsAdmin = isAuthorAdmin(item.players)

                const badgeContent = isMatchCancelled ? (
                  <><Ban className="h-3 w-3" /> Spotkanie odwołane</>
                ) : isImportant ? (
                  <><AlertTriangle className="h-3 w-3" /> Ważne ogłoszenie</>
                ) : isInvitation ? (
                  <><CalendarCheck className="h-3 w-3" /> {currentCategory ? currentCategory.name : "Zaproszenie"}</>
                ) : (
                  <>{currentCategory ? currentCategory.name : "Ogólne"}</>
                )

                // Przypięte ogłoszenia dostają "hero" (ciemna karta) — zawsze najważniejsze na tablicy
                if (item.is_pinned) {
                  return (
                    <div
                      key={item.id}
                      onClick={() => { if (isMatchCancelled) router.push("/") }}
                      style={{
                        background: `linear-gradient(135deg, ${INK} 0%, ${INK_SOFT} 55%, #16204a 100%)`,
                        animationDelay: `${Math.min(idx, 6) * 40}ms`
                      }}
                      className={cn(
                        "relative overflow-hidden rounded-[24px] p-4 sm:p-6 space-y-3 text-white shadow-lg border border-white/10 animate-in fade-in slide-in-from-bottom-2 fill-mode-both",
                        isMatchCancelled && "cursor-pointer"
                      )}
                    >
                      <div className="absolute inset-0 pointer-events-none opacity-70" style={netPattern} />
                      <div className="relative z-10 flex items-start justify-between gap-3">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="flex items-center gap-1 rounded-lg bg-[#FFD23F]/20 border border-[#FFD23F]/40 text-[#FFD23F] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider">
                              <Pin className="h-3 w-3 fill-[#FFD23F]" />
                              Przypięte
                            </span>
                            <span
                              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider border"
                              style={{ background: `${accent.color}25`, borderColor: `${accent.color}55`, color: accent.color }}
                            >
                              {badgeContent}
                            </span>
                          </div>
                          <h3 className={cn(display.className, "text-lg font-bold text-white leading-snug")}>{item.title}</h3>
                          {item.matches?.date && (
                            <p className={cn(score.className, "flex items-center gap-1.5 text-[11px] font-semibold text-slate-400")}>
                              <Calendar className="h-3 w-3 text-[#FFD23F]" /> Mecz: {matchDateTimeLabel(item.matches.date, item.matches.time_start)}
                            </p>
                          )}
                        </div>

                        {isAdmin && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={(e) => { e.stopPropagation(); togglePin(item.id, item.is_pinned) }}
                              className="p-2 rounded-xl text-[#FFD23F] bg-[#FFD23F]/10 hover:bg-[#FFD23F]/20 transition-colors cursor-pointer active:scale-90"
                              title="Odepnij ogłoszenie"
                            >
                              <Pin className="h-4 w-4" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(item.id, item.title) }}
                              className="p-2 rounded-xl text-slate-300 hover:text-[#FF9296] hover:bg-[#FF5A5F]/10 transition-colors cursor-pointer active:scale-90"
                              title="Usuń ogłoszenie"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>

                      <p className="relative z-10 text-xs font-medium leading-relaxed whitespace-pre-line text-slate-300">
                        {item.content}
                      </p>

                      <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-3 text-[11px] text-slate-400 font-medium flex-wrap gap-1.5">
                        <span className="flex items-center gap-1.5">
                          {authorIsAdmin && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-[#2C4BFF]/20 border border-[#2C4BFF]/40 px-1.5 py-0.5 text-[9px] font-black uppercase text-[#7FA0FF]">
                              <ShieldCheck className="h-2.5 w-2.5" /> Administracja
                            </span>
                          )}
                          {authorName || "Organizator"}
                        </span>
                        <span>{formatDatePL(item.created_at?.split("T")[0]) || new Date(item.created_at).toLocaleDateString("pl-PL")}</span>
                      </div>

                      {renderCommentSection(item, true)}
                    </div>
                  )
                }

                const canDelete = isAdmin || item.author_id === user?.id

                // Ogłoszenie administracji dostaje kobaltowe obramowanie + lekki tint tła
                // zamiast koloru kategorii — kolor kategorii i tak w pełni żyje w odznace
                // wyżej, więc obramowanie mogło wziąć na siebie ZUPEŁNIE inny wymiar
                // informacji (kto pisze), zamiast dublować to co już mówi odznaka.
                return (
                  <div
                    key={item.id}
                    onClick={() => { if (isMatchCancelled) router.push("/") }}
                    style={{
                      borderLeftColor: authorIsAdmin ? COBALT : "#CBD5E1",
                      animationDelay: `${Math.min(idx, 6) * 40}ms`
                    }}
                    className={cn(
                      "rounded-[24px] border border-l-4 p-4 sm:p-6 space-y-3 transition-all shadow-xs hover:shadow-md hover:-translate-y-0.5 animate-in fade-in slide-in-from-bottom-2 fill-mode-both",
                      authorIsAdmin ? "bg-[#2C4BFF]/[0.025]" : "bg-white",
                      isMatchCancelled ? "cursor-pointer" : ""
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5">
                        <span
                          className={cn("inline-flex items-center gap-1 rounded-lg px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider border", accent.bg, accent.border, accent.text)}
                        >
                          {badgeContent}
                        </span>
                        <h3 className="text-base font-bold leading-snug text-slate-900">{item.title}</h3>
                        {item.matches?.date && (
                          <p className={cn(score.className, "flex items-center gap-1.5 text-[11px] font-semibold text-slate-500")}>
                            <Calendar className="h-3 w-3 text-[#2C4BFF]" /> Mecz: {matchDateTimeLabel(item.matches.date, item.matches.time_start)}
                          </p>
                        )}
                      </div>

                      {(isAdmin || canDelete) && (
                        <div className="flex items-center gap-1 shrink-0">
                          {isAdmin && (
                            <button
                              onClick={(e) => { e.stopPropagation(); togglePin(item.id, item.is_pinned) }}
                              className="p-2 rounded-xl text-slate-400 hover:bg-[#FFD23F]/15 hover:text-[#946E00] transition-colors cursor-pointer active:scale-90"
                              title="Przypnij na górze"
                            >
                              <Pin className="h-4 w-4" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(item.id, item.title) }}
                              className="p-2 rounded-xl text-slate-400 hover:text-[#FF5A5F] hover:bg-[#FF5A5F]/10 transition-colors cursor-pointer active:scale-90"
                              title="Usuń ogłoszenie"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <p className="text-xs font-medium leading-relaxed whitespace-pre-line text-slate-600">
                      {item.content}
                    </p>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-400 font-medium flex-wrap gap-1.5">
                      <span className="flex items-center gap-1.5">
                        {authorIsAdmin && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-[#2C4BFF]/10 px-1.5 py-0.5 text-[9px] font-black uppercase text-[#2C4BFF]">
                            <ShieldCheck className="h-2.5 w-2.5" /> Administracja
                          </span>
                        )}
                        {authorName || "Organizator"}
                      </span>
                      <span>{formatDatePL(item.created_at?.split("T")[0]) || new Date(item.created_at).toLocaleDateString("pl-PL")}</span>
                    </div>

                    {renderCommentSection(item, false)}
                  </div>
                )
              })
            )}

            {isAnnouncementListTruncated && !showAllAnnouncements && (
              <button
                onClick={() => setShowAllAnnouncements(true)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white py-3.5 text-xs font-bold text-slate-500 transition-all hover:border-[#2C4BFF]/40 hover:text-[#1D3AE8] hover:bg-[#2C4BFF]/[0.03] cursor-pointer active:scale-[0.99]"
              >
                Pokaż wszystkie ({sorted.length})
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </main>
      </div>

      <SupportModal open={showSupportModal} onClose={() => setShowSupportModal(false)} />

      {/* MODAL NOWEGO OGŁOSZENIA */}
      <Modal
        open={isModalOpen && !!user}
        onClose={() => setIsModalOpen(false)}
        overlayClassName="bg-[#0B1120]/70 backdrop-blur-sm"
        cardClassName="w-full max-w-lg rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl space-y-4 text-slate-900"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className={cn(display.className, "text-base font-bold text-slate-900")}>Nowe Ogłoszenie</h2>
          <button onClick={() => setIsModalOpen(false)} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 cursor-pointer active:scale-90 transition-transform">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleCreateAnnouncement} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Tytuł</label>
            <input type="text" required value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 outline-none focus:border-[#2C4BFF] focus:bg-white font-semibold" />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Kategoria</label>
            <select value={newCategoryId} onChange={(e) => setNewCategoryId(Number(e.target.value))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 outline-none focus:border-[#2C4BFF] font-semibold">
              {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Treść</label>
            <textarea required rows={4} value={newContent} onChange={(e) => setNewContent(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 outline-none focus:border-[#2C4BFF] focus:bg-white font-medium" />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Powiąż z meczem (opcjonalnie)</label>
            <select value={newMatchId} onChange={(e) => setNewMatchId(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 outline-none focus:border-[#2C4BFF] font-semibold">
              <option value="">— Brak —</option>
              {matchOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {matchDateTimeLabel(m.date, m.time_start)}{m.location ? ` — ${m.location}` : ""}
                </option>
              ))}
            </select>
          </div>
          {/* Przypinanie zostaje wyłącznie dla admina — to narzędzie moderacji (co jest
              najważniejsze dla całego zespołu), nie coś co powinien móc zrobić sobie
              każdy autor własnego wpisu. */}
          {isAdmin && (
            <div
              className="flex items-center gap-2 p-3 rounded-xl bg-[#FFD23F]/10 border border-[#FFD23F]/25 cursor-pointer"
              onClick={() => setNewIsPinned(!newIsPinned)}
            >
              <input type="checkbox" checked={newIsPinned} onChange={() => {}} className="h-4 w-4 rounded border-[#FFD23F]/50 text-[#946E00] pointer-events-none" />
              <label className="font-bold text-[#7A5C00] cursor-pointer">Przypnij ogłoszenie na samej górze</label>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="rounded-xl cursor-pointer">Anuluj</Button>
            <Button type="submit" className="bg-[#2C4BFF] hover:bg-[#1D3AE8] text-white rounded-xl gap-1.5 font-bold cursor-pointer shadow-md shadow-[#2C4BFF]/20"><Send className="h-3.5 w-3.5" /> Opublikuj</Button>
          </div>
        </form>
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
