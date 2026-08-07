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
  BellRing
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sidebar } from "@/components/dashboard/sidebar"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"

type Announcement = {
  id: string
  title: string
  content: string
  category_id: number // Zaktualizowane pod nową bazę (klucz obcy do announcements_category)
  is_pinned: boolean
  author: string
  created_at: string
  match_id?: string
}

export default function AnnouncementsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [user, setUser] = useState<any>(null)
  const [toast, setToast] = useState<string | null>(null)

  const isAdmin = user?.role === "admin" || user?.is_admin || user?.email === "admin@admin.pl" || user?.name === "Mateusz Podzorski" || user?.full_name === "Mateusz Podzorski"

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newContent, setNewContent] = useState("")
  const [newCategoryId, setNewCategoryId] = useState<number>(2) // Domyślnie kategoria ogólna (np. ID 2)
  const [newIsPinned, setNewIsPinned] = useState(false)
  const [sendPushNotification, setSendPushNotification] = useState(true)

  useEffect(() => {
    const localUser = localStorage.getItem("volley_user")
    if (localUser) {
      setUser(JSON.parse(localUser))
    } else {
      setUser(null)
    }

    fetchAnnouncements()
  }, [])

  async function fetchAnnouncements() {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error("Błąd pobierania ogłoszeń:", error.message)
    } else if (data) {
      setAnnouncements(data)
    }
    setIsLoading(false)
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

    const authorName = user?.name || user?.full_name || "Mateusz Podzorski"

    const newAnnouncement = {
      title: newTitle,
      content: newContent,
      category_id: Number(newCategoryId), // Zapisujemy category_id zgodnie ze schematem
      is_pinned: newIsPinned,
      author: authorName,
    }

    const { data, error } = await supabase
      .from('announcements')
      .insert([newAnnouncement])
      .select()
      .single()

    if (error) {
      notify("Błąd: Nie udało się zapisać w bazie")
      console.error(error)
      return
    }

    if (data) {
      setAnnouncements((prev) => [data, ...prev])
      if (sendPushNotification) {
        notify("Opublikowano ogłoszenie (Push wyzwolony z bazy)")
      } else {
        notify("Ogłoszenie zostało zapisane w bazie")
      }
    }

    setIsModalOpen(false)
    setNewTitle("")
    setNewContent("")
    setNewCategoryId(2)
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

    // Mapowanie filtrowania po kategorii ID (np. 1 = ważne, 2 = ogólne, 3 = sprzęt)
    let matchesCat = true
    if (selectedCategory === "important") matchesCat = a.category_id === 1
    if (selectedCategory === "general") matchesCat = a.category_id === 2
    if (selectedCategory === "equipment") matchesCat = a.category_id === 3

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
        {/* Top bar */}
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

        {/* Treść */}
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
              {[
                { key: "all", label: "Wszystkie" },
                { key: "important", label: "🚨 Ważne" },
                { key: "general", label: "📢 Ogólne" },
                { key: "equipment", label: "🏐 Sprzęt" },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setSelectedCategory(f.key)}
                  className={cn(
                    "rounded-xl px-3.5 py-1.5 text-xs font-bold transition-colors shrink-0",
                    selectedCategory === f.key
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Lista Ogłoszeń */}
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

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (isMatchAlert) {
                        window.location.href = "/"
                      }
                    }}
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

                          <span
                            className={cn(
                              "rounded-lg px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider border",
                              item.category_id === 1 && "bg-rose-100 text-rose-700 border-rose-200",
                              item.category_id === 2 && "bg-blue-100 text-blue-700 border-blue-200",
                              item.category_id === 3 && "bg-emerald-100 text-emerald-700 border-emerald-200"
                            )}
                          >
                            {item.category_id === 1 && "🚨 Ważne"}
                            {item.category_id === 2 && "📢 Ogólne"}
                            {item.category_id === 3 && "🏐 Sprzęt"}
                          </span>

                          {isMatchAlert && (
                            <span className="rounded-lg bg-rose-600 text-white px-2.5 py-0.5 text-[10px] font-black uppercase">
                              Kliknij, aby zobaczyć harmonogram
                            </span>
                          )}
                        </div>

                        <h3 className="text-base font-extrabold text-slate-900 leading-snug">{item.title}</h3>
                      </div>

                      {isAdmin && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); togglePin(item.id, item.is_pinned); }}
                            className={cn(
                              "p-2 rounded-xl transition-colors",
                              item.is_pinned ? "text-amber-600 bg-amber-50 hover:bg-amber-100" : "text-slate-400 hover:bg-slate-100"
                            )}
                            title={item.is_pinned ? "Odepnij" : "Przypnij"}
                          >
                            <Pin className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                            className="p-2 rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                            title="Usuń ogłoszenie"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 font-medium leading-relaxed whitespace-pre-line">
                      {item.content}
                    </p>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-400 font-medium">
                      <span className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-blue-600" />
                        {item.author}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(item.created_at).toLocaleDateString("pl-PL")}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </main>
      </div>

      {/* Modal Nowego Ogłoszenia */}
      {isModalOpen && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 text-slate-900">
            <h2 className="text-base font-black">Nowe Ogłoszenie</h2>

            <form onSubmit={handleCreateAnnouncement} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tytuł ogłoszenia</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="np. Zmiana godziny piątkowego treningu"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 font-medium outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Kategoria</label>
                <select
                  value={newCategoryId}
                  onChange={(e) => setNewCategoryId(Number(e.target.value))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 font-medium outline-none focus:border-blue-500 focus:bg-white"
                >
                  <option value={2}>📢 Ogólne</option>
                  <option value={1}>🚨 Ważne / Pilne</option>
                  <option value={3}>🏐 Sprzęt / Sala</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Treść ogłoszenia</label>
                <textarea
                  required
                  rows={4}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Wpisz szczegóły ogłoszenia..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 font-medium outline-none focus:border-blue-500 focus:bg-white resize-none"
                />
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="pinCheck"
                    checked={newIsPinned}
                    onChange={(e) => setNewIsPinned(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 h-4 w-4"
                  />
                  <label htmlFor="pinCheck" className="font-bold text-slate-700 cursor-pointer">
                    Przypnij na samej górze tablicy
                  </label>
                </div>

                <div className="flex items-center justify-between rounded-2xl bg-blue-50/70 border border-blue-100 p-3">
                  <div className="flex items-center gap-2">
                    <BellRing className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="font-bold text-slate-900">Powiadomienie Push w aplikacji</p>
                      <p className="text-[10px] text-slate-400">Wyślij powiadomienie do apki mobilnej zawodników</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={sendPushNotification}
                    onChange={(e) => setSendPushNotification(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="rounded-xl text-xs font-bold">
                  Anuluj
                </Button>
                <Button type="submit" className="rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5">
                  <Send className="h-3.5 w-3.5" />
                  Opublikuj ogłoszenie
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-xl">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          {toast}
        </div>
      )}
    </div>
  )
}
