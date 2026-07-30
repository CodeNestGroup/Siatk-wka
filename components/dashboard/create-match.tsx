"use client"

import { useState, useEffect } from "react"
import { X, Calendar, MapPin, Users, DollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { type Match } from "@/lib/data"

type PlayerOption = {
  id: string
  full_name: string
}

export function CreateMatch({
  onCreate,
  onCloseModal,
}: {
  onCreate: (match: Match) => void
  onCloseModal: () => void
}) {
  const [date, setDate] = useState("")
  const [time, setTime] = useState("19:00")
  const [location, setLocation] = useState("Hala Sportowa ESCO Jaworze")
  const [capacity, setCapacity] = useState(12)
  const [pricePerPlayer, setPricePerPlayer] = useState(25)
  const [status, setStatus] = useState<"upcoming" | "past">("upcoming")

  const [availablePlayers, setAvailablePlayers] = useState<PlayerOption[]>([])
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([])
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    async function fetchPlayers() {
      setIsLoadingPlayers(true)
      const { data, error } = await supabase
        .from('players')
        .select('id, full_name')
        .order('full_name', { ascending: true })

      if (error) {
        console.error("Błąd pobierania graczy do formularza:", error)
      } else {
        setAvailablePlayers(data || [])
      }
      setIsLoadingPlayers(false)
    }
    fetchPlayers()
  }, [])

  function togglePlayerSelection(id: string) {
    setSelectedPlayerIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!date) return

    setIsSubmitting(true)

    const [hours, minutes] = time.split(':')
    const endHour = String(Number(hours) + 2).padStart(2, '0')
    const timeEnd = `${endHour}:${minutes}`

    const { data: matchData, error: matchError } = await supabase
      .from('matches')
      .insert([
        {
          date,
          time_start: time,
          time_end: timeEnd,
          location,
          max_players: capacity,
          price_per_player: pricePerPlayer,
        },
      ])
      .select()
      .single()

    if (matchError || !matchData) {
      console.error("Błąd bazy:", matchError)
      alert(`Błąd bazy: ${matchError?.message}`)
      setIsSubmitting(false)
      return
    }

    const newMatchId = matchData.id

    if (selectedPlayerIds.length > 0) {
      for (let i = 0; i < selectedPlayerIds.length; i++) {
        const playerId = selectedPlayerIds[i]
        await supabase.from('match_registrations').insert([
          {
            match_id: newMatchId,
            player_id: playerId,
            is_paid: false,
          }
        ])
      }
    }

    // Tworzymy obiekt meczu zgodny z typem Match w lib/data.ts (w tym pole 'players' z imionami i ceną)
    const mappedNewPlayers = selectedPlayerIds.map((playerId) => {
      const foundPlayer = availablePlayers.find((p) => p.id === playerId)
      return {
        id: playerId,
        name: foundPlayer?.full_name || "Nieznany Gracz",
        registeredAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        paid: false,
        fee: pricePerPlayer,
      }
    })

    const createdMatch: Match = {
      id: newMatchId,
      date,
      startTime: time,
      endTime: timeEnd,
      location,
      capacity,
      fee: pricePerPlayer,
      status: date >= new Date().toISOString().split('T')[0] ? "upcoming" : "past",
      rating: 0,
      players: mappedNewPlayers,
    }

    onCreate(createdMatch)
    setIsSubmitting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/50 backdrop-blur-sm" onClick={onCloseModal} />

      <form
        onSubmit={handleSubmit}
        className="relative flex flex-col w-full max-w-xl max-h-[90vh] rounded-2xl bg-card p-6 shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
          <h2 className="text-lg font-bold text-foreground">Utwórz nowy mecz</h2>
          <button type="button" onClick={onCloseModal} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> Data meczu
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Godzina</label>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> Lokalizacja
            </label>
            <input
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Limit miejsc</label>
              <input
                type="number"
                min={1}
                required
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5" /> Cena / os. (PLN)
              </label>
              <input
                type="number"
                min={0}
                required
                value={pricePerPlayer}
                onChange={(e) => setPricePerPlayer(Number(e.target.value))}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "upcoming" | "past")}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/30"
              >
                <option value="upcoming">Nadchodzący</option>
                <option value="past">Zakończony</option>
              </select>
            </div>
          </div>

          <div className="pt-2 border-t border-border">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Users className="h-4 w-4 text-primary" /> Wstępny skład (Wybierz z bazy zawodników)
            </label>
            {isLoadingPlayers ? (
              <p className="text-xs text-muted-foreground py-4 text-center animate-pulse">Ładowanie listy zawodników...</p>
            ) : availablePlayers.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">Brak zawodników w bazie. Najpierw dodaj kogoś w zakładce "Zawodnicy / Skład".</p>
            ) : (
              <div className="max-h-48 overflow-y-auto rounded-xl border border-border p-2 space-y-1 bg-secondary/10">
                {availablePlayers.map((player) => {
                  const isSelected = selectedPlayerIds.includes(player.id)
                  return (
                    <div
                      key={player.id}
                      onClick={() => togglePlayerSelection(player.id)}
                      className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors ${
                        isSelected ? "bg-primary/10 text-primary font-medium" : "hover:bg-secondary/50 text-foreground"
                      }`}
                    >
                      <span>{player.full_name}</span>
                      <span className="text-xs">{isSelected ? "Zaznaczony ✓" : "Wybierz"}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-border flex justify-end gap-2 shrink-0">
          <Button type="button" variant="outline" onClick={onCloseModal} disabled={isSubmitting}>Anuluj</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Tworzenie..." : "Utwórz mecz"}
          </Button>
        </div>
      </form>
    </div>
  )
}
