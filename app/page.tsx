"use client"

import { useMemo, useState, useEffect } from "react"
import { Menu, Plus, Search, Bell, CheckCircle2, ShieldAlert, UserCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sidebar } from "@/components/dashboard/sidebar"
import { StatCards } from "@/components/dashboard/stat-cards"
import { MatchList } from "@/components/dashboard/match-list"
import { MatchDetail } from "@/components/dashboard/match-detail"
import { CreateMatch } from "@/components/dashboard/create-match"
import { LoginForm } from "@/components/auth/login-form"
import { SponsorsMarquee } from "@/components/dashboard/sponsors-marquee"
import {
  type Match,
  collected as matchCollected,
  mainRoster,
  waitlist,
  getMatches,
} from "@/lib/data"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"

type Filter = "all" | "upcoming" | "past"

export default function DashboardPage() {
  const [session, setSession] = useState<any>(null)
  const [userRole, setUserRole] = useState<string>("user")
  const [isAuthLoading, setIsAuthLoading] = useState(true)

  const [matches, setMatches] = useState<Match[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [filter, setFilter] = useState<Filter>("all")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // Stan symulacji widoku gracza dla Admina
  const [simulateAsPlayer, setSimulateAsPlayer] = useState(false)

  // Stan przełącznika kafelków (najbliższy mecz vs cały sezon)
  const [statsMode, setStatsMode] = useState<"match" | "season">("match")

  // Sprawdzanie sesji i pobieranie roli użytkownika
  useEffect(() => {
    async function checkUserAndRole() {
      setIsAuthLoading(true)

      const localUser = localStorage.getItem("volley_user")
      if (localUser) {
        const parsedUser = JSON.parse(localUser)
        setSession({ user: parsedUser })
        setUserRole(parsedUser.role || (parsedUser.email === "admin@admin.pl" ? "admin" : "user"))
        setIsAuthLoading(false)
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)

      if (session?.user?.email) {
        const { data: playerData } = await supabase
          .from('players')
          .select('role')
          .eq('email', session.user.email)
          .single()

        if (playerData?.role) {
          setUserRole(playerData.role)
        } else {
          setUserRole(session.user.email === "admin@admin.pl" ? "admin" : "user")
        }
      }
      setIsAuthLoading(false)
    }

    checkUserAndRole()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const localUser = localStorage.getItem("volley_user")
      if (localUser) return

      setSession(session)
      if (session?.user?.email) {
        const { data: playerData } = await supabase
          .from('players')
          .select('role')
          .eq('email', session.user.email)
          .single()

        setUserRole(playerData?.role || (session.user.email === "admin@admin.pl" ? "admin" : "user"))
      } else {
        setUserRole("user")
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Pobieranie meczów po zalogowaniu
  useEffect(() => {
    if (!session) return

    async function fetchMatches() {
      setIsLoading(true)
      const data = await getMatches()
      setMatches(data)
      setIsLoading(false)
    }
    fetchMatches()
  }, [session])

  // Wyznaczenie faktycznej roli oraz opcji symulacji
  const isRealAdmin = userRole === "admin" || session?.user?.email === "admin@admin.pl"
  const isAdmin = isRealAdmin && !simulateAsPlayer

  const selected = matches.find((m) => m.id === selectedId) ?? null

  function notify(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const filtered = useMemo(
    () => matches.filter((m) => (filter === "all" ? true : m.status === filter)),
    [matches, filter],
  )

  const stats = useMemo(() => {
    const played = matches.filter((m) => m.status === "past")
    const upcoming = matches.filter((m) => m.status === "upcoming")
    const monthCollected = matches.reduce((sum, m) => sum + matchCollected(m), 0)
    const conversions = matches.reduce(
      (sum, m) => sum + Math.max(0, mainRoster(m).length - m.capacity + 3),
      0,
    )
    return {
      played: played.length,
      upcoming: upcoming.length,
      collected: monthCollected,
      conversions: Math.min(conversions, 9),
    }
  }, [matches])

  // Dane dla kafelków w trybie najbliższego meczu
  const upcomingMatches = matches.filter((m) => m.status === "upcoming")
  const nextMatch = upcomingMatches.length > 0 ? upcomingMatches[0] : null

  const matchCardData = nextMatch ? {
    date: nextMatch.date,
    location: nextMatch.location,
    rosterCount: mainRoster(nextMatch).length,
    capacity: nextMatch.capacity,
    waitlistCount: waitlist(nextMatch).length,
    collected: matchCollected(nextMatch),
    fee: Number(nextMatch.price_per_player || 0),
  } : null

  const seasonCardData = {
    totalPlayed: stats.played,
    upcoming: stats.upcoming,
    collected: stats.collected,
    overpaid: "0 PLN",
  }

  function updateMatch(updated: Match) {
    setMatches((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
  }

  async function deleteMatch(match: Match) {
    if (!isAdmin) return
    setMatches((prev) => prev.filter((m) => m.id !== match.id))

    const { error } = await supabase
      .from('matches')
      .delete()
      .eq('id', match.id)

    if (error) {
      console.error("Błąd usuwania:", error)
      notify("Błąd: Nie udało się usunąć meczu z bazy")
    } else {
      notify("Mecz usunięty")
    }
  }

  function createMatch(match: Match) {
    setMatches((prev) => [match, ...prev])
    setCreating(false)
    notify("Mecz utworzony")
  }

  async function handleLogout() {
    localStorage.removeItem("volley_user")
    await supabase.auth.signOut()
    window.location.reload()
  }

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: "Wszystkie" },
    { key: "upcoming", label: "Nadchodzące" },
    { key: "past", label: "Zakończone" },
  ]

  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground animate-pulse">Ładowanie aplikacji...</p>
      </div>
    )
  }

  if (!session) {
    return <LoginForm onLoginSuccess={() => window.location.reload()} />
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={session?.user}
        onLogout={handleLogout}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Pasek przełącznika trybu Admin / Gracz (Widoczny dla Admina) */}
        {isRealAdmin && (
          <div className="bg-[#131d35] border-b border-border px-4 py-2 flex items-center justify-between text-xs lg:px-8">
            <span className="text-slate-400 flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
              Tryb: <strong className="text-white">{isAdmin ? "Administrator" : "Symulacja Gracza"}</strong>
            </span>
            <button
              onClick={() => setSimulateAsPlayer(!simulateAsPlayer)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
            >
              <UserCheck className="h-3.5 w-3.5 text-primary" />
              {simulateAsPlayer ? "Włącz tryb Admina" : "Podgląd jako Gracz"}
            </button>
          </div>
        )}

        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur lg:px-8">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-muted-foreground hover:bg-secondary lg:hidden"
            aria-label="Otwórz nawigację"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="relative hidden flex-1 max-w-sm md:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Szukaj meczów, graczy…"
              className="w-full rounded-lg border border-input bg-card py-2 pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          </div>

          <div className="ml-auto flex items-center gap-3">
            <button
              className="relative rounded-lg p-2 text-muted-foreground hover:bg-secondary"
              aria-label="Powiadomienia"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Zarządzanie meczami
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {isAdmin ? "Śledź składy, listę rezerwową i wpłaty z każdej sesji." : "Przeglądaj nadchodzące mecze i sprawdź swój status w składzie."}
              </p>
            </div>
            {isAdmin && (
              <Button size="lg" className="gap-2 rounded-xl" onClick={() => setCreating(true)}>
                <Plus className="h-4 w-4" />
                Utwórz nowy mecz
              </Button>
            )}
          </div>

          <StatCards
            mode={statsMode}
            onToggleMode={() => setStatsMode(statsMode === "match" ? "season" : "match")}
            matchData={matchCardData}
            seasonData={seasonCardData}
          />

          {/* Sekcja Sponsorów i Partnerów */}
          <SponsorsMarquee />

          <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1 w-fit">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "rounded-lg px-4 py-1.5 text-sm font-medium transition-colors",
                  filter === f.key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
              <p className="text-sm text-muted-foreground animate-pulse">
                Ładowanie danych z bazy...
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
              <p className="text-sm text-muted-foreground">
                Brak meczów w tym widoku.
              </p>
            </div>
          ) : (
            <MatchList
              matches={filtered}
              onSelect={(m) => setSelectedId(m.id)}
              onNotify={(m) =>
                notify(`Wysłano powiadomienie do ${mainRoster(m).length} zapisanych graczy`)
              }
              onDelete={isAdmin ? deleteMatch : undefined}
            />
          )}
        </main>
      </div>

      {/* Przekazanie obiektu użytkownika do szczegółów meczu */}
      {selected && (
        <MatchDetail
          match={selected}
          onChange={updateMatch}
          onClose={() => setSelectedId(null)}
          currentUser={{
            ...session?.user,
            role: isAdmin ? "admin" : "user"
          }}
        />
      )}

      {creating && isAdmin && (
        <CreateMatch onCreate={createMatch} onClose={() => setCreating(false)} />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-medium text-background shadow-lg">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          {toast}
        </div>
      )}
    </div>
  )
}
