"use client"

import { useState } from "react"
import {
  X,
  MapPin,
  Clock,
  UserX,
  ArrowUpCircle,
  Bell,
  CheckCircle2,
  CircleDollarSign,
  Send,
  Info,
  UserPlus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "./ui-bits"
import {
  type Match,
  type Player,
  mainRoster,
  waitlist,
  paidCount,
  collected,
  expected,
  formatDate,
  formatWeekday,
} from "@/lib/data"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"

type Audience = "all" | "main" | "waitlist"

export function MatchDetail({
  match,
  onChange,
  onClose,
}: {
  match: Match
  onChange: (m: Match) => void
  onClose: () => void
}) {
  const [audience, setAudience] = useState<Audience>("all")
  const [message, setMessage] = useState("")
  const [sent, setSent] = useState(false)

  // Nowe stany do dodawania gracza
  const [newPlayerName, setNewPlayerName] = useState("")
  const [isAdding, setIsAdding] = useState(false)

  const roster = mainRoster(match)
  const reserves = waitlist(match)

  function updatePlayers(players: Player[]) {
    onChange({ ...match, players })
  }

  // --- AKCJE Z BAZĄ DANYCH ---

  async function addPlayer(e: React.FormEvent) {
    e.preventDefault()
    if (!newPlayerName.trim()) return
    setIsAdding(true)

    // 1. Dodajemy gracza do tabeli "players"
    const { data: player, error: playerError } = await supabase
      .from('players')
      .insert([{ full_name: newPlayerName.trim() }])
      .select()
      .single()

    if (player && !playerError) {
      // 2. Przypisujemy gracza do tego meczu
      await supabase
        .from('match_registrations')
        .insert([{ match_id: match.id, player_id: player.id, is_paid: false }])

      // 3. Odświeżamy widok
      const newP: Player = {
        id: player.id,
        name: player.full_name,
        registeredAt: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
        paid: false,
        fee: match.fee
      }
      updatePlayers([...match.players, newP])
      setNewPlayerName("")
    }
    setIsAdding(false)
  }

  async function togglePaid(id: string) {
    const player = match.players.find((p) => p.id === id)
    if (!player) return
    const newPaidStatus = !player.paid

    // Aktualizacja UI
    updatePlayers(match.players.map((p) => (p.id === id ? { ...p, paid: newPaidStatus } : p)))

    // Aktualizacja bazy
    await supabase
      .from('match_registrations')
      .update({ is_paid: newPaidStatus })
      .match({ match_id: match.id, player_id: id })
  }

  async function kick(id: string) {
    // Aktualizacja UI
    updatePlayers(match.players.filter((p) => p.id !== id))

    // Usunięcie z bazy (tylko z meczu, gracz zostaje w bazie globalnej)
    await supabase
      .from('match_registrations')
      .delete()
      .match({ match_id: match.id, player_id: id })
  }

  async function promote(id: string) {
    const player = match.players.find((p) => p.id === id)
    if (!player) return
    const rest = match.players.filter((p) => p.id !== id)
    const cut = match.capacity - 1

    // Przesunięcie w UI
    updatePlayers([...rest.slice(0, cut), player, ...rest.slice(cut)])

    // W bazie oszukujemy "czas rejestracji", żeby gracz przeskoczył kolejkę
    const fakeOldDate = new Date(Date.now() - 86400000).toISOString() // Cofamy o dobę
    await supabase
      .from('match_registrations')
      .update({ created_at: fakeOldDate })
      .match({ match_id: match.id, player_id: id })
  }

  async function markAllPaid() {
    // Aktualizacja UI
    updatePlayers(
      match.players.map((p, i) =>
        i < match.capacity ? { ...p, paid: true } : p,
      ),
    )

    // Aktualizacja bazy dla całego głównego składu
    const mainRosterIds = roster.map(p => p.id)
    if (mainRosterIds.length > 0) {
      await supabase
        .from('match_registrations')
        .update({ is_paid: true })
        .in('player_id', mainRosterIds)
        .eq('match_id', match.id)
    }
  }

  function send() {
    if (!message.trim()) return
    setSent(true)
    setMessage("")
    setTimeout(() => setSent(false), 2500)
  }

  const paid = paidCount(match)
  const audiences: { key: Audience; label: string }[] = [
    { key: "all", label: "Wszyscy zapisani" },
    { key: "main", label: "Główny skład" },
    { key: "waitlist", label: "Rezerwa" },
  ]

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-foreground/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Szczegóły meczu z ${formatDate(match.date)}`}
        className="relative flex h-full w-full max-w-2xl flex-col bg-background shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border bg-card px-6 py-5">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-foreground">
                Mecz: {formatWeekday(match.date)}
              </h2>
              {match.status === "past" && <Badge tone="neutral">Zakończony</Badge>}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {formatDate(match.date)} · {match.startTime}–{match.endTime}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {match.location}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Zamknij panel"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">

          {/* Finanse i opłaty */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/12 text-success">
                <CircleDollarSign className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm text-muted-foreground">Zebrano</p>
                <p className="text-lg font-bold text-foreground">
                  {collected(match)}{" "}
                  <span className="text-sm font-medium text-muted-foreground">
                    / {expected(match)} PLN
                  </span>
                </p>
              </div>
            </div>
            <Button onClick={markAllPaid} className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Opłać wszystkich
            </Button>
          </div>

          {/* Dodawanie zawodnika */}
          <form onSubmit={addPlayer} className="flex gap-2 rounded-xl border border-border bg-card p-4">
            <input
              type="text"
              placeholder="Wpisz imię i nazwisko gracza..."
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              disabled={isAdding}
              className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
            <Button type="submit" disabled={!newPlayerName.trim() || isAdding} className="gap-2">
              <UserPlus className="h-4 w-4" />
              {isAdding ? "Dodawanie..." : "Dodaj"}
            </Button>
          </form>

          {/* Główny Skład */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                Główny Skład
                <Badge tone="info">
                  {roster.length}/{match.capacity}
                </Badge>
              </h3>
              <span className="text-xs text-muted-foreground">
                {paid} opłacono · {roster.length - paid} brakuje
              </span>
            </div>
            <ul className="space-y-2">
              {roster.map((player, i) => (
                <li
                  key={player.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-muted-foreground">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {player.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Zapisano {player.registeredAt}
                    </p>
                  </div>
                  <button
                    onClick={() => togglePaid(player.id)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                      player.paid
                        ? "bg-success/12 text-success hover:bg-success/20"
                        : "bg-destructive/12 text-destructive hover:bg-destructive/20",
                    )}
                  >
                    {player.paid ? `${player.fee} PLN · Zgłoszone` : "Nieopłacony"}
                  </button>
                  <button
                    onClick={() => kick(player.id)}
                    className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Usuń ${player.name}`}
                  >
                    <UserX className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {/* Rezerwa */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                Rezerwa / Oczekujący
                <Badge tone="warning">{reserves.length}</Badge>
              </h3>
            </div>
            <p className="mb-3 flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs text-accent-foreground">
              <Info className="h-3.5 w-3.5 shrink-0" />
              Automatycznie wchodzą do składu, gdy zwolni się miejsce.
            </p>
            {reserves.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                Brak zawodników na liście rezerwowej.
              </p>
            ) : (
              <ul className="space-y-2">
                {reserves.map((player, i) => (
                  <li
                    key={player.id}
                    className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-secondary/40 p-3"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-warning/20 text-xs font-semibold text-warning-foreground">
                      {match.capacity + i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {player.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Zapisano {player.registeredAt}
                      </p>
                    </div>
                    <button
                      onClick={() => promote(player.id)}
                      className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
                    >
                      <ArrowUpCircle className="h-3.5 w-3.5" />
                      Awansuj
                    </button>
                    <button
                      onClick={() => kick(player.id)}
                      className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive ml-2"
                      aria-label={`Usuń ${player.name}`}
                    >
                      <UserX className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Powiadomienia */}
          <section className="rounded-xl border border-border bg-card p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Bell className="h-4 w-4 text-primary" />
              Powiadomienia Push
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {audiences.map((a) => (
                <button
                  key={a.key}
                  onClick={() => setAudience(a.key)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                    audience === a.key
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground",
                  )}
                >
                  {a.label}
                </button>
              ))}
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Wpisz treść wiadomości dla graczy..."
              className="mt-3 w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
            <div className="mt-3 flex items-center justify-between">
              {sent ? (
                <span className="flex items-center gap-1.5 text-xs font-medium text-success">
                  <CheckCircle2 className="h-4 w-4" />
                  Wysłano!
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Natychmiastowe dostarczenie do wybranej grupy.
                </span>
              )}
              <Button
                onClick={send}
                disabled={!message.trim()}
                className="gap-2"
              >
                <Send className="h-4 w-4" />
                Wyślij
              </Button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
