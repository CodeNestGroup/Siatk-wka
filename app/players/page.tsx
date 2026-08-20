"use client"

import { useState, useEffect } from "react"
import { Users, Search, Trash2, Calendar, Plus, X, Mail, CheckCircle, Clock, CheckCircle2 } from "lucide-react"
import { Sidebar } from "@/components/dashboard/sidebar"
import { NotificationsBell, type NotificationItem } from "@/components/dashboard/notifications-bell"
import { supabase } from "@/lib/supabase"
import { Badge } from "@/components/dashboard/ui-bits"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const sponsors = [
  { code: "BSC", name: "Beskid Sport Center", desc: "Partner Sprzętowy", color: "bg-emerald-100 text-emerald-700" },
  { code: "SKO", name: "Skoczów Park", desc: "Oficjalny Partner", color: "bg-amber-100 text-amber-700" },
  { code: "VOLLEY", name: "VolleyStore", desc: "Sklep Siatkarski", color: "bg-purple-100 text-purple-700" },
  { code: "AZ", name: "AZ-Cloud Solutions", desc: "Infrastruktura IT", color: "bg-blue-100 text-blue-700" },
  { code: "ESCO", name: "ESCO Jaworze", desc: "Sponsor Tytularny", color: "bg-indigo-100 text-indigo-700" },
]

type GlobalPlayer = {
  id: string
  full_name: string
  email?: string
  player_status_id?: number
  role_id?: number
  created_at?: string
  matches_count?: number
  total_paid?: number
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

  const [isAdding, setIsAdding] = useState(false)
  const [newFullName, setNewFullName] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [selectedPlayer, setSelectedPlayer] = useState<GlobalPlayer | null>(null)
  const [playerHistory, setPlayerHistory] = useState<PlayerHistory[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  const isAdmin =
    user?.role === "admin" ||
    user?.is_admin ||
    user?.role_id === 1 ||
    user?.email === "admin@admin.pl" ||
    user?.name === "Mateusz Podzorski" ||
    user?.full_name === "Mateusz Podzorski"

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

  // Pobieranie zawodników z uwzględnieniem player_status_id lub role_id jako pending
  async function fetchPlayers() {
    setIsLoading(true)

    const { data: dbPlayers, error: dbError } = await supabase
      .from('players')
      .select('*')
      .order('full_name', { ascending: true })

    if (dbError) {
      console.error("Błąd pobierania graczy z Supabase:", dbError.message)
    }

    const { data: regData } = await supabase.from('match_registrations').select('*')
    const { data: matchesData } = await supabase.from('matches').select('*')

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

    matchesData?.forEach((m: any) => {
      if (Array.isArray(m.players)) {
        m.players.forEach((p: any) => {
          const pid = p.id || p.name || p.full_name
          if (!pid) return

          const key = String(pid).toLowerCase().trim()
          if (!regData || regData.length === 0) {
            counts[key] = (counts[key] || 0) + 1
            if (p.paid || p.is_paid) {
              paidSums[key] = (paidSums[key] || 0) + Number(m.price_per_player || 25)
            }
          }
        })
      }
    })

    if (dbPlayers && dbPlayers.length > 0) {
      const activeList: GlobalPlayer[] = []
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
          player_status_id: p.player_status_id,
          role_id: p.role_id,
          created_at: p.created_at,
          matches_count: matchesCount,
          total_paid: totalPaid,
        }

        // Sprawdzamy status 3, role_id 3 (pending) lub pole tekstowe role
        if (p.player_status_id === 3 || p.role_id === 3 || p.role === "pending") {
          pendingList.push(playerObj)
        } else {
          activeList.push(playerObj)
        }
      })

      setPlayers(activeList)
      setPendingPlayers(pendingList)
    } else {
      setPlayers([])
      setPendingPlayers([])
    }

    setIsLoading(false)
  }

  // Zatwierdzanie konta -> ustawiamy role_id na 2 (zwykły użytkownik) oraz status na 1/2
  async function approvePlayer(id: string) {
    const { error } = await supabase
      .from('players')
      .update({ role_id: 2, player_status_id: 2 })
      .eq('id', id)

    if (error) {
      alert(`Błąd zatwierdzania: ${error.message}`)
    } else {
      fetchPlayers()
    }
  }

  async function rejectPlayer(id: string) {
    if (!confirm("Czy na pewno chcesz odrzucić i usunąć to zgłoszenie?")) return

    const { error } = await supabase.from('players').delete().eq('id', id)

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

    const emailToUse = newEmail.trim() || `${newFullName.trim().toLowerCase().replace(/\s+/g, ".")}@volley.local`

    const { error } = await supabase
      .from('players')
      .insert([
        {
          full_name: newFullName.trim(),
          email: emailToUse,
          player_status_id: 2,
          role_id: 2
        }
      ])

    if (error) {
      console.error("Błąd zapisu w Supabase:", error.message)
      alert(`Błąd zapisu w bazie danych: ${error.message}`)
    } else {
      setNewFullName("")
      setNewEmail("")
      setIsAdding(false)
      await fetchPlayers()
    }

    setIsSubmitting(false)
  }

  async function deletePlayer(id: string, e: React.MouseEvent) {
    e.stopPropagation()

    const playerToDelete = players.find(p => p.id === id)
    if (!playerToDelete) return

    if (!confirm(`Czy na pewno chcesz usunąć zawodnika "${playerToDelete.full_name}" z CAŁEJ bazy? Zniknie on również ze statystyk oraz ze wszystkich meczów.`)) return

    // Usuwamy bezpośrednio zawodnika z tabeli players.
    // Dzięki więzom obcym (FOREIGN KEY z ON DELETE CASCADE) w tabeli match_registrations,
    // wpisy dotyczące zapisów tego gracza na mecze usuną się automatycznie.
    const { error } = await supabase.from('players').delete().eq('id', id)

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

    const { data: matchesData } = await supabase.from('matches').select('*')

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

  const filteredPlayers = players.filter((p) =>
    p.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.email && p.email.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-900">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
        onLogout={handleLogout}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* GÓRNY PASEK ZE SPONSORAMI I DZWONKIEM */}
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
                // opcjonalna obsługa
              }}
            />
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-8 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 shadow-sm">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground">Baza Zawodników</h1>
                <p className="text-xs text-muted-foreground">
                  Zarządzaj składem, sprawdzaj historię obecności i wpłat zawodników z bazy.
                </p>
              </div>
            </div>

            {isAdmin && (
              <Button size="sm" className="gap-2 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer" onClick={() => setIsAdding(true)}>
                <Plus className="h-4 w-4" />
                Dodaj zawodnika do bazy
              </Button>
            )}
          </div>

          <div className="relative w-full max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Szukaj zawodnika po imieniu lub e-mailu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-input bg-card py-2.5 pl-10 pr-4 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/30 shadow-sm transition-all"
            />
          </div>

          {isAdmin && pendingPlayers.length > 0 && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-amber-600 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  Konta oczekujące na zatwierdzenie ({pendingPlayers.length})
                </h2>
              </div>

              <div className="space-y-2">
                {pendingPlayers.map((p) => (
                  <div key={p.id} className="flex items-center justify-between bg-card p-3 rounded-xl border border-border shadow-sm text-xs font-bold">
                    <div>
                      <p className="text-foreground">{p.full_name}</p>
                      <p className="text-[11px] text-muted-foreground font-normal">{p.email}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => approvePlayer(p.id)}
                        className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] gap-1 h-8 cursor-pointer"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Zatwierdź
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => rejectPlayer(p.id)}
                        className="rounded-xl hover:bg-destructive/10 text-destructive font-bold text-[11px] h-8 cursor-pointer"
                      >
                        Odrzuć
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
              <p className="text-xs text-primary font-bold animate-pulse">
                Ładowanie zawodników z bazy Supabase...
              </p>
            </div>
          ) : filteredPlayers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
              <p className="text-xs text-muted-foreground">
                Brak zawodników odpowiadających kryteriom wyszukiwania.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground bg-secondary/30">
                    <th className="px-6 py-4 font-bold">Zawodnik</th>
                    <th className="px-6 py-4 font-bold">Rozegrane mecze</th>
                    <th className="px-6 py-4 font-bold">Suma wpłat</th>
                    {isAdmin && <th className="px-6 py-4 text-right font-bold">Akcje</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredPlayers.map((player) => {
                    const isCurrentUser =
                      user?.id === player.id ||
                      user?.email?.toLowerCase() === player.email?.toLowerCase() ||
                      user?.full_name?.toLowerCase() === player.full_name?.toLowerCase() ||
                      user?.name?.toLowerCase() === player.full_name?.toLowerCase()

                    return (
                      <tr
                        key={player.id}
                        onClick={() => openPlayerHistory(player)}
                        className={cn(
                          "group transition-all cursor-pointer",
                          isCurrentUser
                            ? "bg-blue-50/80 hover:bg-blue-100/80 dark:bg-blue-950/30 font-semibold"
                            : "hover:bg-secondary/30"
                        )}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span className={cn(
                              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-black text-xs border",
                              isCurrentUser
                                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                : "bg-primary/10 text-primary border-primary/20"
                            )}>
                              {player.full_name?.charAt(0).toUpperCase()}
                            </span>
                            <div>
                              <p className={cn(
                                "font-bold transition-colors flex items-center gap-1.5",
                                isCurrentUser ? "text-blue-600 font-extrabold" : "text-foreground group-hover:text-primary"
                              )}>
                                <span>{player.full_name}</span>
                                {isCurrentUser && (
                                  <span className="rounded-md bg-blue-100 px-1.5 py-0.5 text-[9px] font-black uppercase text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                                    (Ty)
                                  </span>
                                )}
                              </p>
                              <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Mail className="h-3 w-3 text-primary/70" />
                                {player.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge tone={player.matches_count && player.matches_count > 0 ? "success" : "neutral"}>
                            {player.matches_count || 0} {player.matches_count === 1 ? "mecz" : "meczy"}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 font-bold text-foreground">
                          <span className="text-emerald-500">{player.total_paid || 0} PLN</span>
                        </td>
                        {isAdmin && (
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={(e) => deletePlayer(player.id, e)}
                              className="rounded-xl p-2 text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                              aria-label="Usuń zawodnika"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/50 backdrop-blur-sm">
          <form onSubmit={handleAddPlayer} className="relative w-full max-w-md rounded-3xl bg-card p-6 shadow-2xl border border-border space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-base font-bold text-foreground">Dodaj nowego zawodnika do bazy</h2>
              <button type="button" onClick={() => setIsAdding(false)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="mb-1 block font-semibold text-muted-foreground">Imię i nazwisko</label>
                <input
                  type="text"
                  required
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="np. Jan Kowalski"
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2 outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="mb-1 block font-semibold text-muted-foreground">Adres e-mail (opcjonalnie)</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="np. jan@example.com"
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2 outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-border">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAdding(false)} className="rounded-xl cursor-pointer">Anuluj</Button>
              <Button type="submit" size="sm" disabled={isSubmitting} className="rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer">{isSubmitting ? "Zapisywanie w bazie..." : "Zapisz w bazie"}</Button>
            </div>
          </form>
        </div>
      )}

      {selectedPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/50 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-3xl bg-card p-6 shadow-2xl max-h-[85vh] flex flex-col border border-border">
            <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-base font-bold text-foreground">{selectedPlayer.full_name}</h2>
                <p className="text-xs text-muted-foreground">{selectedPlayer.email}</p>
              </div>
              <button onClick={() => setSelectedPlayer(null)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Historia meczów i płatności</h3>
              {isLoadingHistory ? (
                <p className="text-xs text-muted-foreground text-center py-8 animate-pulse">Ładowanie historii...</p>
              ) : playerHistory.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">Ten zawodnik nie brał jeszcze udziału w żadnym meczu.</p>
              ) : (
                playerHistory.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-2xl border border-border bg-secondary/20 p-3 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-bold text-foreground">{item.match_date} ({item.location})</p>
                        <p className="text-[10px] text-muted-foreground">Status: {item.status}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-extrabold ${item.paid ? 'bg-emerald-500/15 text-emerald-600' : 'bg-amber-500/15 text-amber-600'}`}>
                        {item.paid ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                        {item.paid ? `Opłacono (${item.fee} PLN)` : `Nieopłacone (${item.fee} PLN)`}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-border flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setSelectedPlayer(null)} className="rounded-xl cursor-pointer">Zamknij</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
