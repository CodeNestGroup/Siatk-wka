"use client"

import { useState, useEffect } from "react"
import {
  Megaphone,
  Pin,
  Plus,
  Search,
  Trash2,
  Calendar,
  User,
  CheckCircle2,
  Send,
  AlertTriangle,
  Flame,
  Sparkles,
  Ban,
  CalendarCheck
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sidebar } from "@/components/dashboard/sidebar"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"

type Announcement = {
  id: string
  title: string
  content: string
  category_id: number
  is_pinned: boolean
  created_at: string
  match_id?: string
  author_id?: string
  players?: {
    full_name: string | null
  } | null
}

type Category = {
  id: number
  name: string
}

export default function AnnouncementsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [user, setUser] = useState<any>(null)
  const [toast, setToast] = useState<string | null>(null)

  const isAdmin = user?.role === "admin" || user?.is_admin || user?.email === "admin@admin.pl" || user?.name === "Mateusz Podzorski" || user?.full_name === "Mateusz Podzorski"

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newContent, setNewContent] = useState("")
  const [newCategoryId, setNewCategoryId] = useState<number>(2)
  const [newIsPinned, setNewIsPinned] = useState(false)

  useEffect(() => {
    const localUser = localStorage.getItem("volley_user")
    if (localUser) {
      setUser(JSON.parse(localUser))
    } else {
      setUser(null)
    }

    fetchAnnouncements()
    fetchCategories()
  }, [])

  async function fetchAnnouncements() {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('announcements')
      .select(`
        *,
        players:author_id (
          full_name
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
    localStorage.clear()
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
    }

    const { data, error } = await supabase
      .from('announcements')
      .insert([newAnnouncementPayload])
      .select(`
        *,
        players:author_id (
          full_name
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
      notify("Ogłoszenie zostało pomyślnie opublikowane")
    }

    setIsModalOpen(false)
    setNewTitle("")
    setNewContent("")
    setNewCategoryId(categories.length > 0 ? categories[0].id : 2)
    setNewIsPinned(false)
  }

  async function handleDelete(id: string) {
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

  const filtered = announcements.filter((a) => {
    const matchesSearch =
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.content.toLowerCase().includes(search.toLowerCase())

    let matchesCat = true
    if (selectedCategory !== "all") {
      matchesCat = a.category_id === Number(selectedCategory)
    }

    return matchesSearch && matchesCat
  })

  const sorted = [...filtered].sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned))

  // Pomocnik do wyznaczania koloru przycisku w zależności od nazwy kategorii
  function getCategoryButtonClass(catName: string, isSelected: boolean) {
    const name = catName.toLowerCase()

    if (name.includes("odwołan")) {
      return isSelected
        ? "bg-rose-600 text-white shadow-md shadow-rose-600/20 font-black border-rose-600"
        : "text-rose-700 bg-rose-50/70 border-rose-200 hover:bg-rose-100"
    }
    if (name.includes("ważn")) {
      return isSelected
        ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black border-amber-500"
        : "text-amber-800 bg-amber-50/80 border-amber-200 hover:bg-amber-100"
    }
    if (name.includes("zapro")) {
      return isSelected
        ? "bg-blue-600 text-white shadow-md shadow-blue-600/20 font-black border-blue-600"
        : "text-blue-700 bg-blue-50/70 border-blue-200 hover:bg-blue-100"
    }
    // Domyślne / Ogólne
    return isSelected
      ? "bg-slate-800 text-white shadow-md shadow-slate-800/20 font-black border-slate-800"
      : "text-slate-600 bg-slate-50 border-slate-200 hover:bg-slate-100"
  }

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-900">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
        onLogout={handleLogout}
      />

      <div className="flex min-w-0 flex-1 flex-col">

        <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 shadow-sm">
                <Megaphone className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight text-slate-900">Tablica Ogłoszeń</h1>
                <p className="text-xs font-medium text-slate-500">Ważne komunikaty i informacje dla całego zespołu.</p>
              </div>
            </div>

            {isAdmin && (
              <Button
                size="sm"
                onClick={() => setIsModalOpen(true)}
                className="gap-2 rounded-2xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs shadow-md shadow-blue-500/20 px-4 py-2.5 cursor-pointer"
              >
                <Plus className="h-4 w-4 stroke-[2.5]" />
                Dodaj ogłoszenie
              </Button>
            )}
          </div>

          {/* WYSZUKIWARKA I KOLOROWE ZAKŁADKI KATEGORII */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Szukaj w ogłoszeniach…"
                className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-sm transition-all"
              />
            </div>

            {/* Pasek kategorii z dopasowanymi kolorami */}
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 border border-slate-200/80 w-full sm:w-auto overflow-x-auto">
              <button
                onClick={() => setSelectedCategory("all")}
                className={cn(
                  "rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all shrink-0 border cursor-pointer",
                  selectedCategory === "all"
                    ? "bg-slate-900 text-white shadow-md shadow-slate-900/20 font-black border-slate-900"
                    : "text-slate-600 bg-white border-transparent hover:bg-slate-50"
                )}
              >
                Wszystkie
              </button>

              {categories.map((cat) => {
                const isSelected = selectedCategory === cat.id.toString()
                const catClass = getCategoryButtonClass(cat.name, isSelected)

                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id.toString())}
                    className={cn(
                      "rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all shrink-0 border cursor-pointer",
                      catClass
                    )}
                  >
                    {cat.name}
                  </button>
                )
              })}
            </div>
          </div>

          {/* LISTA OGŁOSZEŃ */}
          <div className="space-y-4">
            {isLoading ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
                <p className="text-xs text-blue-600 font-bold animate-pulse">Ładowanie ogłoszeń z bazy...</p>
              </div>
            ) : sorted.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
                <p className="text-xs text-slate-400 font-medium">Brak ogłoszeń na tablicy.</p>
              </div>
            ) : (
              sorted.map((item) => {
                const currentCategory = categories.find((c) => c.id === item.category_id)
                const catName = currentCategory?.name?.toLowerCase() || ""

                const isMatchCancelled = item.match_id || item.title.toLowerCase().includes("odwołan") || catName.includes("odwołan")
                const isImportant = catName.includes("ważn") || item.title.toLowerCase().includes("ważn")
                const isInvitation = catName.includes("zapro") || item.title.toLowerCase().includes("zapro")

                const authorName = item.players?.full_name

                return (
                  <div
                    key={item.id}
                    onClick={() => { if (isMatchCancelled) window.location.href = "/" }}
                    className={cn(
                      "rounded-3xl border p-5 sm:p-6 space-y-3 transition-all relative overflow-hidden shadow-sm",
                      isMatchCancelled
                        ? "border-rose-300 bg-gradient-to-r from-rose-50/90 via-rose-50/50 to-white hover:border-rose-400 cursor-pointer shadow-rose-500/5"
                        : isImportant
                        ? "border-amber-300 bg-gradient-to-r from-amber-50/90 via-amber-50/40 to-white hover:border-amber-400 shadow-amber-500/5"
                        : isInvitation
                        ? "border-blue-200 bg-gradient-to-r from-blue-50/70 via-indigo-50/30 to-white hover:border-blue-300 shadow-blue-500/5"
                        : item.is_pinned
                        ? "border-slate-300 bg-gradient-to-r from-slate-50 via-white to-white"
                        : "border-slate-200/90 bg-white hover:border-slate-300"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {item.is_pinned && (
                            <span className="flex items-center gap-1 rounded-lg bg-amber-500 text-slate-950 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-sm">
                              <Pin className="h-3 w-3 fill-slate-950" />
                              Przypięte
                            </span>
                          )}

                          {/* Wyraziste badge z dopasowanym stylem */}
                          {isMatchCancelled ? (
                            <span className="inline-flex items-center gap-1 rounded-lg px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider border bg-rose-100 text-rose-800 border-rose-300">
                              <Ban className="h-3 w-3 text-rose-600" />
                              Spotkanie odwołane
                            </span>
                          ) : isImportant ? (
                            <span className="inline-flex items-center gap-1 rounded-lg px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider border bg-amber-100 text-amber-900 border-amber-300 shadow-sm">
                              <AlertTriangle className="h-3 w-3 text-amber-600 animate-pulse" />
                              Ważne ogłoszenie
                            </span>
                          ) : isInvitation ? (
                            <span className="inline-flex items-center gap-1 rounded-lg px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider border bg-blue-100 text-blue-800 border-blue-200">
                              <CalendarCheck className="h-3 w-3 text-blue-600" />
                              {currentCategory ? currentCategory.name : "Zaproszenie"}
                            </span>
                          ) : (
                            <span className="rounded-lg px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider border bg-slate-100 text-slate-700 border-slate-200">
                              {currentCategory ? currentCategory.name : "Ogólne"}
                            </span>
                          )}
                        </div>

                        <h3 className={cn(
                          "text-base font-black leading-snug",
                          isMatchCancelled ? "text-rose-950" : isImportant ? "text-amber-950" : "text-slate-900"
                        )}>
                          {item.title}
                        </h3>
                      </div>

                      {isAdmin && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); togglePin(item.id, item.is_pinned); }}
                            className={cn("p-2 rounded-xl transition-colors cursor-pointer", item.is_pinned ? "text-amber-600 bg-amber-100/80" : "text-slate-400 hover:bg-slate-100")}
                            title={item.is_pinned ? "Odepnij ogłoszenie" : "Przypnij na górze"}
                          >
                            <Pin className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Usuń ogłoszenie"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    <p className={cn(
                      "text-xs font-medium leading-relaxed whitespace-pre-line",
                      isMatchCancelled ? "text-rose-900/80" : isImportant ? "text-amber-950/80 font-semibold" : "text-slate-600"
                    )}>
                      {item.content}
                    </p>

                    <div className="flex items-center justify-between border-t border-slate-200/50 pt-3 text-[11px] text-slate-400 font-medium">
                      <span>{authorName || "Organizator"}</span>
                      <span>{new Date(item.created_at).toLocaleDateString("pl-PL")}</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </main>
      </div>

      {isModalOpen && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 text-slate-900">
            <h2 className="text-base font-black">Nowe Ogłoszenie</h2>
            <form onSubmit={handleCreateAnnouncement} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tytuł</label>
                <input type="text" required value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 outline-none focus:border-blue-500 focus:bg-white font-semibold" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Kategoria</label>
                <select value={newCategoryId} onChange={(e) => setNewCategoryId(Number(e.target.value))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 outline-none focus:border-blue-500 font-semibold">
                  {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Treść</label>
                <textarea required rows={4} value={newContent} onChange={(e) => setNewContent(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 outline-none focus:border-blue-500 focus:bg-white font-medium" />
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <input type="checkbox" id="pinCheck" checked={newIsPinned} onChange={(e) => setNewIsPinned(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                <label htmlFor="pinCheck" className="font-bold text-slate-700 cursor-pointer">Przypnij ogłoszenie na samej górze</label>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="rounded-xl cursor-pointer">Anuluj</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl gap-1.5 font-bold cursor-pointer"><Send className="h-3.5 w-3.5" /> Opublikuj</Button>
              </div>
            </form>
          </div>
        </div>
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
