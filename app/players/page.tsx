"use client"

import { useState, useEffect } from "react"
import { Users, Search, Trash2, Calendar, Plus, X, Mail, CheckCircle, Clock } from "lucide-react"
import { Sidebar } from "@/components/dashboard/sidebar"
import { supabase } from "@/lib/supabase"
import { Badge } from "@/components/dashboard/ui-bits"
import { Button } from "@/components/ui/button"

type GlobalPlayer = {
  id: string
  full_name: string
  email?: string
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

  // Pobieranie zawodników oraz ich statystyk z Supabase
  async function fetchPlayers() {
    setIsLoading(true)

    // 1. Pobranie graczy
    const { data: dbPlayers, error: dbError } = await supabase
      .from('players')
      .select('*')
      .order('full_name', { ascending: true })

    if (dbError) {
      console.error("Błąd pobierania graczy z Supabase:", dbError.message)
    }

    // 2. Pobranie meczów i rejestracji/składów
    const { data: regData } = await supabase.from('match_registrations').select('*')
    const { data: matchesData } = await supabase.from('matches').select('*')

    const priceMap: Record<string, number> = {}
    matchesData?.forEach((m: any) => {
      priceMap[m.id] = Number(m.price_per_player || 25)
    })

    const counts: Record<string, number> = {}
    const paidSums: Record<string, number> = {}

    // A. Zliczanie z tabeli match_registrations (jeśli używana)
    regData?.forEach((reg: any) => {
      const pid = reg.player_id || reg.player || reg.player_name || reg.name
      if (!pid) return

      const key = String(pid).toLowerCase().trim()
      counts[key] = (counts[key] || 0) + 1

      if (reg.paid || reg.is_paid) {
        paidSums[key] = (paidSums[key] || 0) + (priceMap[reg.match_id || reg.match] || 25)
      }
    })

    // B. Zliczanie z tablicy `players` zapisanej bezpośrednio w meczach w tabeli `matches`
    matchesData?.forEach((m: any) => {
      if (Array.isArray(m.players)) {
        m.players.forEach((p: any) => {
          const pid = p.id || p.name || p.full_name
          if (!pid) return

          const key = String(pid).toLowerCase().trim()
          // Zliczamy obecności w meczach (jeśli nie były już liczone z rejestracji)
          if (!regData || regData.length === 0) {
            counts[key] = (counts[key] || 0) + 1
            if (p.paid) {
              paidSums[key] = (paidSums[key] || 0) + Number(m.price_per_player || 25)
            }
          }
        })
      }
    })

    if (dbPlayers && dbPlayers.length > 0) {
      const formatted: GlobalPlayer[] = dbPlayers
        .filter((p) => {
          const name = p.full_name || p.name || ""
          return !name.toLowerCase().includes("główny admin") && !name.toLowerCase().includes("glowny admin")
        })
        .map((p) => {
          const fullName = p.full_name || p.name || ""
          const idKey = String(p.id).toLowerCase().trim()
          const nameKey = String(fullName).toLowerCase().trim()

          const matchesCount = counts[idKey] || counts[nameKey] || 0
          const totalPaid = paidSums[idKey] || paidSums[nameKey] || 0

          return {
            id: p.id,
            full_name: fullName,
            email: p.email || "Brak e-maila",
            created_at: p.created_at,
            matches_count: matchesCount,
            total_paid: totalPaid,
          }
        })
      setPlayers(formatted)
    } else {
      setPlayers([])
    }

    setIsLoading(false)
  }

  // Zapis do Supabase
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
          role: 'player'
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

  // Usuwanie z bazy Supabase
  async function deletePlayer(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm("Czy na pewno chcesz usunąć tego zawodnika z bazy?")) return

    const { error } = await supabase.from('players').delete().eq('id', id)

    if (error) {
      console.error("Błąd usuwania z bazy:", error.message)
      alert(`Błąd podczas usuwania z bazy: ${error.message}`)
    } else {
      fetchPlayers()
    }
  }

  async function openPlayerHistory(player: GlobalPlayer) {
    setSelectedPlayer(player)
    setIsLoadingHistory(true)

    const { data: regData } = await supabase.from('match_registrations').select('*')
    const { data: matchesData } = await supabase.from('matches').select('*')

    if (!matchesData) {
      setPlayerHistory([])
      setIsLoadingHistory(false)
      return
    }

    const history: PlayerHistory[] = []
    const pId = String(player.id).toLowerCase().trim()
    const pName = String(player.full_name).toLowerCase().trim()

    // Szukanie w meczach
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
            paid: !!found.paid,
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
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
        onLogout={handleLogout}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur lg:px-8">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Szukaj zawodnika lub e-mail..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-input bg-card py-2 pl-9 pr-3 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Users className="h-6 w-6 text-primary" />
                Baza Zawodników
              </h1>
              <p className="mt-1 text-xs text-muted-foreground">
                Zarządzaj składem, sprawdzaj historię obecności i wpłat zawodników z bazy.
              </p>
            </div>

            {isAdmin && (
              <Button size="sm" className="gap-2 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setIsAdding(true)}>
                <Plus className="h-4 w-4" />
                Dodaj zawodnika do bazy
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
              <p className="text-xs text-primary font-bold animate-pulse">
                Ładowanie zawodników z bazy Supabase...
              </p>
            </div>
          ) : filteredPlayers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
              <p className="text-xs text-muted-foreground">
                Brak zawodników w bazie danych. Kliknij przycisk powyżej, aby dodać pierwszego gracza!
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
                  {filteredPlayers.map((player) => (
                    <tr
                      key={player.id}
                      onClick={() => openPlayerHistory(player)}
                      className="group transition-all hover:bg-secondary/30 cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-black text-xs border border-primary/20">
                            {player.full_name?.charAt(0).toUpperCase()}
                          </span>
                          <div>
                            <p className="font-bold text-foreground group-hover:text-primary transition-colors">{player.full_name}</p>
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
                            className="rounded-xl p-2 text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive"
                            aria-label="Usuń zawodnika"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>

      {/* MODAL: Dodawanie zawodnika */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/50 backdrop-blur-sm">
          <form onSubmit={handleAddPlayer} className="relative w-full max-w-md rounded-3xl bg-card p-6 shadow-2xl border border-border space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-base font-bold text-foreground">Dodaj nowego zawodnika do bazy</h2>
              <button type="button" onClick={() => setIsAdding(false)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary">
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
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAdding(false)} className="rounded-xl">Anuluj</Button>
              <Button type="submit" size="sm" disabled={isSubmitting} className="rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white">{isSubmitting ? "Zapisywanie w bazie..." : "Zapisz w bazie"}</Button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Historia obecności */}
      {selectedPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/50 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-3xl bg-card p-6 shadow-2xl max-h-[85vh] flex flex-col border border-border">
            <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-base font-bold text-foreground">{selectedPlayer.full_name}</h2>
                <p className="text-xs text-muted-foreground">{selectedPlayer.email}</p>
              </div>
              <button onClick={() => setSelectedPlayer(null)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary">
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
              <Button variant="outline" size="sm" onClick={() => setSelectedPlayer(null)} className="rounded-xl">Zamknij</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
