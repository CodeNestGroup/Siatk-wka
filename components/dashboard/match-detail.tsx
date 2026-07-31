"use client"

import { useState, useEffect } from "react"
import {
  X,
  Calendar,
  MapPin,
  Users,
  Wallet,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  Banknote,
  ShieldCheck,
  Receipt,
  Lock
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { type Match, mainRoster, waitlist } from "@/lib/data"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"

type MatchDetailProps = {
  match: Match & { is_settled?: boolean }
  onChange: (updated: Match) => void
  onClose: () => void
  currentUser: any
}

export function MatchDetail({ match, onChange, onClose, currentUser }: MatchDetailProps) {
  const isAdmin = currentUser?.role === "admin" || currentUser?.email === "admin@admin.pl"

  const roster = mainRoster(match)
  const waitlistPlayers = waitlist(match)
  const price = Number(match.price_per_player || 25)

  // Czy mecz jest rozliczony w bazie
  const [isSettled, setIsSettled] = useState<boolean>(!!match.is_settled)

  // Stan trybu zbierania gotówki
  const [isCollectingMode, setIsCollectingMode] = useState(false)
  const [paidStatusMap, setPaidStatusMap] = useState<Record<string, boolean>>({})

  // Wczytanie aktualnego stanu po otwarciu okna meczu
  useEffect(() => {
    const initial: Record<string, boolean> = {}
    roster.forEach((p) => {
      initial[p.id] = p.paid || false
    })
    setPaidStatusMap(initial)
    setIsSettled(!!match.is_settled)
  }, [match])

  const [toast, setToast] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  function notify(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  function togglePlayerPaid(playerId: string) {
    if (isSettled) return
    setPaidStatusMap((prev) => ({
      ...prev,
      [playerId]: !prev[playerId],
    }))
  }

  function checkAll() {
    if (isSettled) return
    const updated: Record<string, boolean> = {}
    roster.forEach((p) => (updated[p.id] = true))
    setPaidStatusMap(updated)
  }

  const paidCount = Object.values(paidStatusMap).filter(Boolean).length
  const totalCollectedNow = paidCount * price

  // Finalizacja rozliczenia i trwały zapis w Supabase
  async function handleSettleAndSave() {
    if (isSettled) return
    setIsSaving(true)

    // 1. Zbudowanie zaktualizowanej listy zawodników ze statusami paid
    const updatedPlayers = match.players.map((p) => {
      if (paidStatusMap[p.id] !== undefined) {
        return { ...p, paid: paidStatusMap[p.id] }
      }
      return p
    })

    const updatedMatch: Match & { is_settled?: boolean } = {
      ...match,
      players: updatedPlayers,
      is_settled: true,
    }

    // 2. Aktualizacja lokalnego stanu React
    onChange(updatedMatch)
    setIsSettled(true)

    // 3. Zapis statusu rozliczenia w tabeli matches (czysty payload dla Supabase)
    const { error: matchErr } = await supabase
      .from("matches")
      .update({
        players: updatedPlayers,
        is_settled: true
      })
      .eq("id", match.id)

    if (matchErr) {
      console.error("Błąd zapisu meczu w Supabase:", matchErr.message, matchErr.details)
      notify(`Błąd zapisu: ${matchErr.message}`)
      setIsSaving(false)
      return
    }

    // 4. Automatyczne dodanie wpisu przychodu do tabeli transactions (Księga Rozliczeń)
    const collectorName = currentUser?.full_name || currentUser?.email?.split("@")[0] || "Mateusz Podzorski"
    const matchTitle = match.title || `Zbiórka na hali (${match.date})`

    const newTx = {
      date: new Date().toISOString().split("T")[0],
      title: `Zbiórka z meczu: ${matchTitle}`,
      type: "income",
      amount: totalCollectedNow,
      collected_by: collectorName,
      category: "mecz",
    }

    const { error: txErr } = await supabase.from("transactions").insert([newTx])

    if (txErr) {
      console.error("Błąd zapisu w finansach:", txErr.message)
      notify("Uwaga: Mecz zablokowany, ale wpis do księgi zgłosił błąd.")
    } else {
      notify(`Pomyślnie rozliczono! +${totalCollectedNow} PLN w Finansach.`)
    }

    setIsSaving(false)
    setIsCollectingMode(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-6 relative animate-in fade-in zoom-in-95 my-8">

        {/* Zamknięcie */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-xl p-2 text-muted-foreground hover:bg-secondary transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Nagłówek */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={cn(
              "rounded-md px-2 py-0.5 text-[10px] font-bold uppercase border",
              isSettled
                ? "bg-slate-500/10 text-slate-400 border-slate-500/20"
                : "bg-primary/10 text-primary border-primary/20"
            )}>
              {isSettled ? "Mecz Rozliczony" : match.status === "upcoming" ? "Nadchodzący Mecz" : "Zakończony"}
            </span>
            <span className="text-xs text-muted-foreground font-semibold">• Składka: {price} PLN / os. (Gotówka)</span>
          </div>
          <h2 className="text-xl font-extrabold text-foreground">{match.title || "Trening Siatkówki"}</h2>
          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
            <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5 text-primary" /> {match.date}</span>
            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-primary" /> {match.location}</span>
          </div>
        </div>

        {!isCollectingMode ? (
          <>
            {/* Statystyki podsumowujące */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-border bg-secondary/30 p-3 text-center">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Skład główny</p>
                <p className="text-lg font-black text-foreground">{roster.length} / {match.capacity || 12}</p>
              </div>

              <div className="rounded-2xl border border-border bg-secondary/30 p-3 text-center">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Opłacone (Gotówka)</p>
                <p className="text-lg font-black text-emerald-400">{paidCount} z {roster.length}</p>
              </div>

              <div className="rounded-2xl border border-border bg-secondary/30 p-3 text-center">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Zebrana Kasa</p>
                <p className="text-lg font-black text-emerald-400">{totalCollectedNow} PLN</p>
              </div>
            </div>

            {/* PRZYCISK ZBIERANIA KASY LUB BLOKADA ROZLICZENIA */}
            {isAdmin && (
              isSettled ? (
                <div className="w-full rounded-2xl py-3 font-bold flex items-center justify-center gap-2 bg-secondary text-muted-foreground border border-border/80 cursor-not-allowed">
                  <Lock className="h-4 w-4 text-emerald-400" />
                  Mecz został już rozliczony w finansach
                </div>
              ) : (
                <Button
                  onClick={() => setIsCollectingMode(true)}
                  className="w-full rounded-2xl py-3 font-bold gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20"
                >
                  <Banknote className="h-5 w-5" />
                  Zbierz gotówkę na hali
                </Button>
              )
            )}

            {/* Lista Zawodników */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>Lista Zawodników</span>
                <span className="text-[10px] font-normal text-muted-foreground">
                  {isSettled ? "(Rozliczenie zamknięte)" : "(Statusy ustawia organizator przy odbiorze kasy)"}
                </span>
              </h3>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {roster.map((player, idx) => {
                  const isPaid = paidStatusMap[player.id]
                  return (
                    <div
                      key={player.id}
                      className="flex items-center justify-between rounded-xl border border-border/80 bg-card p-3 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-muted-foreground w-4">{idx + 1}.</span>
                        <span className="font-bold text-foreground">{player.name}</span>
                      </div>

                      <span
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-extrabold text-[10px] uppercase border",
                          isPaid
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        )}
                      >
                        {isPaid ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5" /> Opłacono
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3.5 w-3.5" /> Nieopłacono
                          </>
                        )}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        ) : (
          /* PANEL ZBIERANIA GOTÓWKI W HALI */
          <div className="space-y-4 rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/[0.03] p-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-emerald-400" />
                  Tryb Odbioru Gotówki
                </h3>
                <p className="text-[11px] text-muted-foreground">Odznaczaj zawodników, od których odbierasz pieniądze do ręki.</p>
              </div>

              <Button size="sm" variant="outline" onClick={checkAll} className="text-[10px] rounded-xl font-bold">
                Zaznacz wszystkich
              </Button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {roster.map((player) => {
                const isPaid = !!paidStatusMap[player.id]
                return (
                  <div
                    key={player.id}
                    onClick={() => togglePlayerPaid(player.id)}
                    className={cn(
                      "flex items-center justify-between rounded-xl p-3 text-xs cursor-pointer border transition-all",
                      isPaid
                        ? "border-emerald-500/50 bg-emerald-500/10 text-foreground"
                        : "border-border bg-card text-muted-foreground hover:bg-secondary"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex h-5 w-5 items-center justify-center rounded-md border font-bold text-xs",
                          isPaid ? "bg-emerald-500 border-emerald-400 text-white" : "border-border bg-background"
                        )}
                      >
                        {isPaid && "✓"}
                      </div>
                      <span className="font-bold">{player.name}</span>
                    </div>

                    <span className="font-extrabold text-xs">
                      {isPaid ? `${price} PLN` : "0 PLN"}
                    </span>
                  </div>
                )
              })}
            </div>

            <div className="flex items-center justify-between rounded-xl bg-card border border-border p-3">
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Zbierający gotówkę</p>
                <p className="text-xs font-bold text-foreground flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  {currentUser?.full_name || "Mateusz Podzorski"}
                </p>
              </div>

              <div className="text-right">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Suma Zebrana</p>
                <p className="text-base font-black text-emerald-400">{totalCollectedNow} PLN</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsCollectingMode(false)} className="rounded-xl">
                Anuluj
              </Button>
              <Button
                size="sm"
                onClick={handleSettleAndSave}
                disabled={isSaving}
                className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5"
              >
                <Receipt className="h-4 w-4" />
                {isSaving ? "Księgowanie..." : "Zatwierdź i rozlicz w Finansach"}
              </Button>
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
    </div>
  )
}
