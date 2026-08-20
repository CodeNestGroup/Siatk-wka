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
  Send
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

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-900">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
        onLogout={handleLogout}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/80 bg-white/80 px-6 py-3.5 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 shadow-sm">
              <Megaphone className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900">Tablica Ogłoszeń</h1>
              <p className="text-xs font-medium text-slate-500">Ważne komunikaty i informacje dla całego zespołu.</p>
            </div>
          </div>

          {isAdmin && (
            <Button size="sm" onClick={() => setIsModalOpen(true)} className="gap-2 rounded-2xl font-bold bg-blue-600 hover:bg-blue-700 text-white text-xs shadow-md shadow-blue-500/20">
              <Plus className="h-4 w-4" />
              Dodaj ogłoszenie
            </Button>
          )}
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-8">
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

            <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1 w-full sm:w-auto overflow-x-auto shadow-sm">
              <button
                onClick={() => setSelectedCategory("all")}
                className={cn(
                  "rounded-xl px-3.5 py-1.5 text-xs font-bold transition-colors shrink-0",
                  selectedCategory === "all"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                )}
              >
                Wszystkie
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id.toString())}
                  className={cn(
                    "rounded-xl px-3.5 py-1.5 text-xs font-bold transition-colors shrink-0",
                    selectedCategory === cat.id.toString()
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {isLoading ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
                <p className="text-xs text-blue-600 font-bold animate-pulse">Ładowanie ogłoszeń z bazy...</p>
              </div>
            ) : sorted.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
                <p className="text-xs text-slate-400">Brak ogłoszeń na tablicy.</p>
              </div>
            ) : (
              sorted.map((item) => {
                const isMatchAlert = item.match_id || item.title.toLowerCase().includes("odwołany")
                const authorName = item.players?.full_name
                const currentCategory = categories.find((c) => c.id === item.category_id)

                return (
                  <div
                    key={item.id}
                    onClick={() => { if (isMatchAlert) window.location.href = "/" }}
                    className={cn(
                      "rounded-3xl border bg-white p-5 space-y-3 transition-all relative overflow-hidden shadow-sm",
                      isMatchAlert ? "border-rose-300 bg-rose-50/40 hover:border-rose-400 cursor-pointer" : item.is_pinned ? "border-amber-400 bg-amber-50/20" : "border-slate-200/90 hover:border-slate-300"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {item.is_pinned && (
                            <span className="flex items-center gap-1 rounded-lg bg-amber-100 px-2.5 py-0.5 text-[10px] font-black text-amber-700 border border-amber-200">
                              <Pin className="h-3 w-3 fill-amber-700" />
                              Przypięte
                            </span>
                          )}
                          <span className="rounded-lg px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider border bg-blue-100 text-blue-700 border-blue-200">
                            {currentCategory ? currentCategory.name : "Ogólne"}
                          </span>
                        </div>
                        <h3 className="text-base font-extrabold text-slate-900 leading-snug">{item.title}</h3>
                      </div>

                      {isAdmin && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); togglePin(item.id, item.is_pinned); }}
                            className={cn("p-2 rounded-xl transition-colors", item.is_pinned ? "text-amber-600 bg-amber-50" : "text-slate-400")}
                          >
                            <Pin className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 font-medium leading-relaxed whitespace-pre-line">{item.content}</p>
                    <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-400 font-medium">
                      <span>{authorName}</span>
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
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <h2 className="text-base font-black">Nowe Ogłoszenie</h2>
            <form onSubmit={handleCreateAnnouncement} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tytuł</label>
                <input type="text" required value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Kategoria</label>
                <select value={newCategoryId} onChange={(e) => setNewCategoryId(Number(e.target.value))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
                  {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Treść</label>
                <textarea required rows={4} value={newContent} onChange={(e) => setNewContent(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5" />
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <input type="checkbox" id="pinCheck" checked={newIsPinned} onChange={(e) => setNewIsPinned(e.target.checked)} className="h-4 w-4" />
                <label htmlFor="pinCheck" className="font-bold text-slate-700 cursor-pointer">Przypnij ogłoszenie</label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Anuluj</Button>
                <Button type="submit" className="bg-blue-600 text-white gap-1.5"><Send className="h-3.5 w-3.5" /> Opublikuj</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}