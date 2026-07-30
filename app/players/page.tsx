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
  created_at: string
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
  const [userRole, setUserRole] = useState<string>("user")

  const [isAdding, setIsAdding] = useState(false)
  const [newFullName, setNewFullName] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [selectedPlayer, setSelectedPlayer] = useState<GlobalPlayer | null>(null)
  const [playerHistory, setPlayerHistory] = useState<PlayerHistory[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  useEffect(() => {
    // Sprawdzanie roli użytkownika (lokalny gracz vs admin)
    const localUser = localStorage.getItem("volley_user")
    if (localUser) {
      setUserRole("user")
    } else {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user?.email === "admin@admin.pl") {
          setUserRole("admin")
        }
      })
    }

    fetchPlayers()
  }, [])

  const isAdmin = userRole === "admin"

  async function fetchPlayers() {
    setIsLoading(true)

    const { data: playersData, error: playersError } = await supabase
      .from('players')
      .select('*')
      .order('full_name', { ascending: true })

    if (playersError) {
      console.error("Błąd pobierania graczy:", playersError)
      setIsLoading(false)
      return
    }

    const { data: regData } = await supabase
      .from('match_registrations')
      .select('*')

    const { data: matchesData } = await supabase
      .from('matches')
      .select('*')

    const priceMap: Record<string, number> = {}
    matchesData?.forEach((m: any) => {
      priceMap[m.id] = Number(m.price_per_player || 0)
    })

    const counts: Record<string, number> = {}
    const paidSums: Record<string, number> = {}

    regData?.forEach((reg: any) => {
      const pid = reg.player_id || reg.player
      if (!pid) return
      counts[pid] = (counts[pid] || 0) + 1
      if (reg.paid || reg.is_paid) {
        paidSums[pid] = (paidSums[pid] || 0) + (priceMap[reg.match_id || reg.match] || 0)
      }
    })

    const formatted: GlobalPlayer[] = playersData.map((p) => ({
      id: p.id,
      full_name: p.full_name,
      email: p.email || "Brak e-maila",
      created_at: p.created_at,
      matches_count: counts[p.id] || 0,
      total_paid: paidSums[p.id] || 0,
    }))

    setPlayers(formatted)
    setIsLoading(false)
  }

  async function handleAddPlayer(e: React.FormEvent) {
    e.preventDefault()
    if (!isAdmin) return
    if (!newFullName.trim()) return

    setIsSubmitting(true)

    const emailToUse = newEmail.trim() || `${newFullName.trim().toLowerCase().replace(/\s+/g, ".")}@voleymanager.local`

    const { error: dbError } = await supabase
      .from('players')
      .insert([{
        full_name: newFullName.trim(),
        email: emailToUse,
        role: 'user'
      }])

    if (dbError) {
      console.error("Błąd dodawania zawodnika do bazy:", dbError)
      alert("Nie udało się dodać zawodnika.")
    } else {
      setNewFullName("")
      setNewEmail("")
      setIsAdding(false)
      fetchPlayers()
      alert(`Dodano zawodnika! Może się zalogować używając e-maila/loginu i hasła: haslo123`)
    }

    setIsSubmitting(false)
  }

  async function deletePlayer(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!isAdmin) return
    if (!confirm("Czy na pewno chcesz usunąć tego zawodnika?")) return

    setPlayers((prev) => prev.filter((p) => p.id !== id))

    const { error } = await supabase
      .from('players')
      .delete()
      .eq('id', id)

    if (error) {
      console.error("Błąd usuwania zawodnika:", error)
      alert("Nie udało się usunąć zawodnika.")
    }
  }

  async function openPlayerHistory(player: GlobalPlayer) {
    setSelectedPlayer(player)
    setIsLoadingHistory(true)

    const { data: regData } = await supabase
      .from('match_registrations')
      .select('*')

    const { data: matchesData } = await supabase
      .from('matches')
      .select('*')

    if (!regData || !matchesData) {
      setPlayerHistory([])
      setIsLoadingHistory(false)
      return
    }

    const matchesMap = new Map()
    matchesData.forEach((m: any) => matchesMap.set(m.id, m))

    const userRegs = regData.filter((r: any) => (r.player_id === player.id || r.player === player.id))

    const history: PlayerHistory[] = userRegs.map((reg: any) => {
      const matchId = reg.match_id || reg.match
      const match = matchesMap.get(matchId)
      return {
        match_date: match?.date || "Brak daty",
        location: match?.location || "Nieznana hala",
        status: reg.status || "roster",
        paid: !!reg.paid || !!reg.is_paid,
        fee: Number(match?.price_per_player || 0),
      }
    })

    setPlayerHistory(history)
    setIsLoadingHistory(false)
  }

  const filteredPlayers = players.filter((p) =>
    p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.email && p.email.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur lg:px-8">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Szukaj zawodnika lub e-mail..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-input bg-card py-2 pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
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
              <p className="mt-1 text-sm text-muted-foreground">
                Zarządzaj składem, sprawdzaj historię obecności i wpłat zawodników.
              </p>
            </div>
            {isAdmin && (
              <Button size="lg" className="gap-2" onClick={() => setIsAdding(true)}>
                <Plus className="h-4 w-4" />
                Dodaj zawodnika
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
              <p className="text-sm text-muted-foreground animate-pulse">
                Ładowanie bazy zawodników...
              </p>
            </div>
          ) : filteredPlayers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
              <p className="text-sm text-muted-foreground">
                Brak zawodników pasujących do wyszukiwania.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground bg-secondary/30">
                    <th className="px-6 py-4 font-medium">Zawodnik</th>
                    <th className="px-6 py-4 font-medium">Rozegrane mecze</th>
                    <th className="px-6 py-4 font-medium">Suma wpłat</th>
                    {isAdmin && <th className="px-6 py-4 text-right font-medium">Akcje</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredPlayers.map((player) => (
                    <tr
                      key={player.id}
                      onClick={() => openPlayerHistory(player)}
                      className="group transition-all hover:bg-gradient-to-r hover:from-primary/5 hover:via-transparent hover:to-transparent cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary font-bold text-xs border border-primary/20 shadow-inner group-hover:scale-105 transition-transform">
                            {player.full_name.charAt(0)}
                          </span>
                          <div>
                            <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{player.full_name}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Mail className="h-3 w-3 text-primary/70" />
                              {player.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge tone={player.matches_count && player.matches_count > 0 ? "success" : "neutral"}>
                          {player.matches_count || 0} {player.matches_count === 1 ? "mecz" : "mecze/ów"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 font-semibold text-foreground">
                        <span className="text-emerald-500">{player.total_paid} PLN</span>
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

      {/* MODAL: Dodawanie zawodnika (Tylko dla Admina) */}
      {isAdding && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-foreground/50 backdrop-blur-sm" onClick={() => setIsAdding(false)} />
          <form onSubmit={handleAddPlayer} className="relative w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Dodaj nowego zawodnika</h2>
              <button type="button" onClick={() => setIsAdding(false)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Imię i nazwisko</label>
                <input
                  type="text"
                  required
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="np. Jan Kowalski"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/30"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Adres e-mail (opcjonalnie)</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="np. jan@example.com"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/30"
                />
                <p className="text-[11px] text-muted-foreground mt-1">Zawodnik loguje się tym e-mailem i hasłem: <code className="text-primary font-semibold">haslo123</code></p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsAdding(false)} disabled={isSubmitting}>Anuluj</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Dodawanie..." : "Dodaj zawodnika"}</Button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Historia obecności */}
      {selectedPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-foreground/50 backdrop-blur-sm" onClick={() => setSelectedPlayer(null)} />
          <div className="relative w-full max-w-lg rounded-2xl bg-card p-6 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
              <div>
                <h2 className="text-lg font-bold text-foreground">{selectedPlayer.full_name}</h2>
                <p className="text-xs text-muted-foreground">{selectedPlayer.email}</p>
              </div>
              <button onClick={() => setSelectedPlayer(null)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Historia meczów i płatności</h3>
              {isLoadingHistory ? (
                <p className="text-sm text-muted-foreground text-center py-8 animate-pulse">Ładowanie historii...</p>
              ) : playerHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Ten zawodnik nie brał jeszcze udziału w żadnym meczu.</p>
              ) : (
                playerHistory.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-xl border border-border bg-secondary/20 p-3 text-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{item.match_date} ({item.location})</p>
                        <p className="text-xs text-muted-foreground">Status: {item.status === 'roster' ? 'Główny skład' : 'Rezerwa'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${item.paid ? 'bg-success/10 text-success' : 'bg-warning/20 text-warning-foreground'}`}>
                        {item.paid ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                        {item.paid ? `Opłacono (${item.fee} PLN)` : `Nieopłacone (${item.fee} PLN)`}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-border flex justify-end">
              <Button variant="outline" onClick={() => setSelectedPlayer(null)}>Zamknij</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
