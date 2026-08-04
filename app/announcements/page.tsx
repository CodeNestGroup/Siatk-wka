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
  category: "important" | "general" | "equipment"
  is_pinned: boolean
  author: string
  created_at: string
}

export default function AnnouncementsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [user, setUser] = useState<any>(null)
  const [toast, setToast] = useState<string | null>(null)

  // Sprawdzanie uprawnień admina
  const isAdmin = user?.role === "admin" || user?.is_admin || user?.email === "admin@admin.pl" || user?.name === "Mateusz Podzorski" || user?.full_name === "Mateusz Podzorski"

  // Formularz ogłoszenia
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newContent, setNewContent] = useState("")
  const [newCategory, setNewCategory] = useState<"important" | "general" | "equipment">("general")
  const [newIsPinned, setNewIsPinned] = useState(false)
  const [sendPushNotification, setSendPushNotification] = useState(true)

  // 1. Pobieranie użytkownika z localStorage i ogłoszeń z Supabase
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

  // Obsługa wylogowania
  async function handleLogout() {
    localStorage.removeItem("volley_user")
    localStorage.clear()
    sessionStorage.clear()
    await supabase.auth.signOut()
    setUser(null)
    window.location.href = "/login"
  }

  // 2. Trwałe zapisywanie nowego ogłoszenia w Supabase
  async function handleCreateAnnouncement(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim() || !newContent.trim()) return

    const authorName = user?.name || user?.full_name || "Mateusz Podzorski"

    const newAnnouncement = {
      title: newTitle,
      content: newContent,
      category: newCategory,
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
    setNewCategory("general")
    setNewIsPinned(false)
  }

  // 3. Usuwanie z bazy Supabase
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

  // 4. Przypinanie w bazie Supabase
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
    const matchesCat = selectedCategory === "all" || a.category === selectedCategory
    return matchesSearch && matchesCat
  })

  const sorted = [...filtered].sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned))

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
        onLogout={handleLogout}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-card/80 px-4 py-3 backdrop-blur lg:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 text-muted-foreground hover:bg-secondary lg:hidden"
            >
              <Megaphone className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              Tablica Ogłoszeń
            </h1>
          </div>

          {isAdmin && (
            <Button size="sm" onClick={() => setIsModalOpen(true)} className="gap-1.5 rounded-xl font-bold">
              <Plus className="h-4 w-4" />
              Dodaj ogłoszenie
            </Button>
          )}
        </header>

        {/* Treść */}
        <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-6 lg:px-8">

          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Szukaj w ogłoszeniach…"
                className="w-full rounded-xl border border-input bg-card py-2 pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1 w-full sm:w-auto overflow-x-auto">
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
                    "rounded-lg px-3 py-1 text-xs font-semibold transition-colors shrink-0",
                    selectedCategory === f.key
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
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
              <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
                <p className="text-xs text-primary font-bold animate-pulse">Ładowanie ogłoszeń z bazy...</p>
              </div>
            ) : sorted.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
                <p className="text-xs text-muted-foreground">Brak ogłoszeń na tablicy.</p>
              </div>
            ) : (
              sorted.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "rounded-2xl border bg-card p-5 space-y-3 transition-all relative overflow-hidden shadow-sm",
                    item.is_pinned ? "border-amber-500/40 bg-amber-500/[0.02]" : "border-border"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {item.is_pinned && (
                          <span className="flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-500 border border-amber-500/20">
                            <Pin className="h-3 w-3 fill-amber-500" />
                            Przypięte
                          </span>
                        )}

                        <span
                          className={cn(
                            "rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border",
                            item.category === "important" && "bg-rose-500/15 text-rose-400 border-rose-500/20",
                            item.category === "general" && "bg-blue-500/15 text-blue-400 border-blue-500/20",
                            item.category === "equipment" && "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
                          )}
                        >
                          {item.category === "important" && "🚨 Ważne"}
                          {item.category === "general" && "📢 Ogólne"}
                          {item.category === "equipment" && "🏐 Sprzęt"}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-foreground leading-snug">{item.title}</h3>
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => togglePin(item.id, item.is_pinned)}
                          className={cn(
                            "p-1.5 rounded-lg transition-colors",
                            item.is_pinned ? "text-amber-400 hover:bg-amber-500/10" : "text-muted-foreground hover:bg-secondary"
                          )}
                          title={item.is_pinned ? "Odepnij" : "Przypnij"}
                        >
                          <Pin className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Usuń ogłoszenie"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                    {item.content}
                  </p>

                  <div className="flex items-center justify-between border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1.5 font-medium">
                      <User className="h-3.5 w-3.5 text-primary" />
                      {item.author}
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground/80">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(item.created_at).toLocaleDateString("pl-PL")}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </main>
      </div>

      {/* Modal Nowego Ogłoszenia */}
      {isModalOpen && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-foreground">Nowe Ogłoszenie</h2>

            <form onSubmit={handleCreateAnnouncement} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Tytuł ogłoszenia</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="np. Zmiana godziny piątkowego treningu"
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Kategoria</label>
                <select
                  value={newCategory}
                  onChange={(e: any) => setNewCategory(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="general">📢 Ogólne</option>
                  <option value="important">🚨 Ważne / Pilne</option>
                  <option value="equipment">🏐 Sprzęt / Sala</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Treść ogłoszenia</label>
                <textarea
                  required
                  rows={4}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Wpisz szczegóły ogłoszenia..."
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>

              <div className="space-y-2 pt-1 border-t border-border/60">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="pinCheck"
                    checked={newIsPinned}
                    onChange={(e) => setNewIsPinned(e.target.checked)}
                    className="rounded border-input text-primary"
                  />
                  <label htmlFor="pinCheck" className="text-xs font-medium text-muted-foreground cursor-pointer">
                    Przypnij na samej górze tablicy
                  </label>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-primary/10 border border-primary/20 p-3">
                  <div className="flex items-center gap-2">
                    <BellRing className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs font-bold text-foreground">Powiadomienie Push w aplikacji</p>
                      <p className="text-[10px] text-muted-foreground">Wyślij powiadomienie do apki mobilnej zawodników</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={sendPushNotification}
                    onChange={(e) => setSendPushNotification(e.target.checked)}
                    className="h-4 w-4 rounded border-input text-primary"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)} className="rounded-xl">
                  Anuluj
                </Button>
                <Button type="submit" size="sm" className="rounded-xl font-bold gap-1.5">
                  <Send className="h-3.5 w-3.5" />
                  Opublikuj ogłoszenie
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-xs font-semibold text-background shadow-lg">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          {toast}
        </div>
      )}
    </div>
  )
}
