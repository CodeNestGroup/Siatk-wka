"use client"

import { useState } from "react"
import {
  X,
  Calendar,
  MapPin,
  Users,
  Wallet,
  CheckCircle2,
  Lock,
  Receipt,
  UserPlus,
  UserMinus,
  Trash2,
  Copy,
  Check,
  Clock
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
  const isAdmin =
    currentUser?.role === "admin" ||
    currentUser?.is_admin ||
    currentUser?.role_id === 1 ||
    currentUser?.email === "admin@admin.pl"

  const rawRoster = mainRoster(match)
  const rawReserves = waitlist(match)
  const capacity = Number(match.capacity || match.max_players || 12)
  const price = Number(match.price_per_player || 25)

  // Sortowanie: Zalogowany użytkownik (Ty) ZAWSZE na pierwszym miejscu
  const sortedRoster = [...rawRoster].sort((a: any, b: any) => {
    const isUserA = a.id === currentUser?.id || a.email === currentUser?.email
    const isUserB = b.id === currentUser?.id || b.email === currentUser?.email
    if (isUserA) return -1
    if (isUserB) return 1
    return 0
  })

  const sortedReserves = [...rawReserves].sort((a: any, b: any) => {
    const isUserA = a.id === currentUser?.id || a.email === currentUser?.email
    const isUserB = b.id === currentUser?.id || b.email === currentUser?.email
    if (isUserA) return -1
    if (isUserB) return 1
    return 0
  })

  const totalCollected = rawRoster.length * price
  const isSettled = !!match.is_settled

  const [toast, setToast] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  const isUserInMatch = match.players?.some(
    (p: any) => p.id === currentUser?.id || p.email === currentUser?.email
  )

  function notify(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  function handleCopyRoster() {
    const listText = rawRoster
      .map((p: any, idx: number) => `${idx + 1}. ${p.full_name || p.name}`)
      .join("\n")

    let fullMessage = `🏐 *Skład na mecz (${match.date} - ${match.location})*\n\n${listText}\n\n💰 Razem: ${totalCollected} PLN`

    if (rawReserves.length > 0) {
      const reservesText = rawReserves
        .map((p: any, idx: number) => `R${idx + 1}. ${p.full_name || p.name}`)
        .join("\n")
      fullMessage += `\n\n⏳ *Lista rezerwowa:*\n${reservesText}`
    }

    navigator.clipboard.writeText(fullMessage)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleSettleAndSave() {
    if (isSettled || rawRoster.length === 0) return
    setIsSaving(true)

    const updatedPlayers = (match.players || []).map((p: any) => ({
      ...p,
      paid: true,
      is_paid: true
    }))

    const updatedMatch: Match & { is_settled?: boolean } = {
      ...match,
      players: updatedPlayers,
      is_settled: true,
    }

    const { error: matchErr } = await supabase
      .from("matches")
      .update({ is_settled: true })
      .eq("id", match.id)

    if (matchErr) {
      notify(`Błąd zapisu: ${matchErr.message}`)
      setIsSaving(false)
      return
    }

    await supabase
      .from("match_registrations")
      .update({ is_paid: true })
      .eq("match_id", match.id)

    const collectorName = currentUser?.full_name || currentUser?.name || "Organizator"
    const matchTitle = match.title || `Zbiórka na hali (${match.date})`

    const newTx = {
      date: new Date().toISOString().split("T")[0],
      title: `Zbiórka z meczu: ${matchTitle}`,
      type: "income",
      amount: totalCollected,
      collected_by: collectorName,
      category: "mecz",
    }

    const { error: txErr } = await supabase.from("transactions").insert([newTx])

    if (txErr) {
      notify("Mecz zablokowany, ale wpis do księgi zgłosił błąd.")
    } else {
      notify(`Pomyślnie rozliczono! +${totalCollected} PLN w Finansach.`)
    }

    onChange(updatedMatch)
    setIsSaving(false)
  }

  async function handleRemovePlayer(playerId: string) {
    if (isSettled) return
    if (!confirm("Czy na pewno chcesz wypisać tego zawodnika z meczu?")) return

    const { error } = await supabase
      .from("match_registrations")
      .delete()
      .eq("match_id", match.id)
      .eq("player_id", playerId)

    if (!error) {
      const updatedPlayers = (match.players || []).filter((p: any) => p.id !== playerId)
      onChange({ ...match, players: updatedPlayers })
      notify("Wypisano zawodnika ze składu.")
    }
  }

  async function handleJoinMatch() {
    if (!currentUser || isSettled) return

    const { error } = await supabase.from("match_registrations").insert([
      {
        match_id: match.id,
        player_id: currentUser.id,
        is_paid: true
      }
    ])

    if (!error) {
      const newPlayerObj = {
        id: currentUser.id,
        name: currentUser.full_name || currentUser.name || "Zawodnik",
        full_name: currentUser.full_name || currentUser.name || "Zawodnik",
        email: currentUser.email || "",
        paid: true,
        is_paid: true
      }
      onChange({ ...match, players: [...(match.players || []), newPlayerObj] })
      notify("Dołączyłeś do listy na ten mecz!")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-2xl space-y-5 relative animate-in fade-in zoom-in-95 my-8 text-slate-900">

        {/* Przycisk Zamknięcia */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-xl p-2 text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Nagłówek */}
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={cn(
              "rounded-md px-2 py-0.5 text-[10px] font-black uppercase border",
              isSettled
                ? "bg-slate-100 text-slate-500 border-slate-200"
                : match.status_id === 4
                ? "bg-rose-100 text-rose-700 border-rose-200"
                : "bg-blue-50 text-blue-700 border-blue-100"
            )}>
              {isSettled ? "Mecz Rozliczony" : match.status_id === 4 ? "Odwołany" : "Skład Meczowy"}
            </span>
            <span className="text-xs text-slate-400 font-semibold">• Składka: {price} PLN / os.</span>
          </div>

          <h2 className="text-2xl font-black text-slate-900">{match.title || match.date}</h2>

          <div className="flex items-center gap-4 text-xs text-slate-500 mt-2 flex-wrap">
            <span className="flex items-center gap-1.5 font-bold text-slate-800">
              <Calendar className="h-4 w-4 text-blue-600" /> {match.date}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5 font-medium">
              <MapPin className="h-4 w-4 text-slate-400" /> {match.location}
            </span>
          </div>
        </div>

        {/* Podsumowanie */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 text-center">
            <p className="text-[10px] font-extrabold uppercase text-slate-400">Skład główny</p>
            <p className="text-xl font-black text-slate-900 mt-0.5">
              {rawRoster.length} <span className="text-xs text-slate-400 font-bold">/ {capacity}</span>
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3.5 text-center">
            <p className="text-[10px] font-extrabold uppercase text-emerald-600">Zebrana Kasa</p>
            <p className="text-xl font-black text-emerald-600 mt-0.5">
              {totalCollected} <span className="text-xs font-bold">PLN</span>
            </p>
          </div>
        </div>

        {/* Przycisk rozliczenia dla Admina */}
        {isAdmin && !isSettled && match.status_id !== 4 && (
          <Button
            onClick={handleSettleAndSave}
            disabled={isSaving || rawRoster.length === 0}
            className="w-full rounded-2xl py-3 font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 cursor-pointer text-xs"
          >
            <Receipt className="h-4 w-4" />
            {isSaving ? "Księgowanie w finansach..." : `Zatwierdź i rozlicz w Finansach (+${totalCollected} PLN)`}
          </Button>
        )}

        {isSettled && (
          <div className="w-full rounded-2xl py-3 font-bold flex items-center justify-center gap-2 bg-slate-100 text-slate-500 border border-slate-200 text-xs">
            <Lock className="h-4 w-4 text-emerald-600" />
            Mecz został już rozliczony i zaksięgowany w finansach
          </div>
        )}

        {/* Lista Zawodników */}
        <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
          {/* SKŁAD GŁÓWNY */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Powołani Zawodnicy ({rawRoster.length}/{capacity}):</span>
              <button
                onClick={handleCopyRoster}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Skopiowano listę!" : "Kopiuj skład"}
              </button>
            </div>

            {rawRoster.length === 0 ? (
              <div className="py-6 text-center text-xs font-semibold text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                Brak zapisanych graczy w składzie.
              </div>
            ) : (
              sortedRoster.map((player: any, idx: number) => {
                const isCurrent = player.id === currentUser?.id || player.email === currentUser?.email

                return (
                  <div
                    key={player.id || idx}
                    className={cn(
                      "flex items-center justify-between rounded-2xl border p-3 text-xs transition-all",
                      isCurrent ? "bg-blue-50/90 border-blue-200 text-blue-950 shadow-sm ring-1 ring-blue-300/40" : "bg-slate-50/70 border-slate-100"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-xl text-xs font-black",
                        isCurrent ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-700"
                      )}>
                        {idx + 1}
                      </span>
                      <span className="font-bold flex items-center gap-1.5">
                        {player.full_name || player.name}
                        {isCurrent && (
                          <span className="text-[9px] font-black uppercase text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-md">
                            Ty
                          </span>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        {price} PLN
                      </span>

                      {(isAdmin || isCurrent) && !isSettled && (
                        <button
                          onClick={() => handleRemovePlayer(player.id)}
                          className="rounded-xl p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Wypisz ze składu"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* LISTA REZERWOWA */}
          {sortedReserves.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs font-bold text-purple-700">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Lista Rezerwowa ({sortedReserves.length}):
                </span>
              </div>

              <div className="space-y-1.5">
                {sortedReserves.map((player: any, idx: number) => {
                  const isCurrent = player.id === currentUser?.id || player.email === currentUser?.email

                  return (
                    <div
                      key={player.id || idx}
                      className={cn(
                        "flex items-center justify-between rounded-2xl border p-2.5 text-xs",
                        isCurrent ? "bg-purple-50 border-purple-200 text-purple-950 font-bold" : "bg-slate-50/50 border-slate-100 text-slate-700"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-[10px] font-black text-purple-600 uppercase bg-purple-100 px-2 py-0.5 rounded-lg">
                          R{idx + 1}
                        </span>
                        <span>{player.full_name || player.name}</span>
                        {isCurrent && (
                          <span className="text-[9px] font-black uppercase text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded-md">
                            Ty
                          </span>
                        )}
                      </div>

                      {(isAdmin || isCurrent) && !isSettled && (
                        <button
                          onClick={() => handleRemovePlayer(player.id)}
                          className="rounded-xl p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                          title="Wypisz z rezerwy"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Dolne przyciski */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
          {!isSettled && (
            isUserInMatch ? (
              <Button
                variant="outline"
                onClick={() => handleRemovePlayer(currentUser.id)}
                className="rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold gap-1.5 cursor-pointer"
              >
                <UserMinus className="h-4 w-4" />
                Wypisz mnie
              </Button>
            ) : (
              <Button
                onClick={handleJoinMatch}
                className={cn(
                  "rounded-xl text-white text-xs font-bold gap-1.5 cursor-pointer shadow-md",
                  rawRoster.length >= capacity
                    ? "bg-purple-600 hover:bg-purple-700 shadow-purple-500/20"
                    : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20"
                )}
              >
                <UserPlus className="h-4 w-4" />
                {rawRoster.length >= capacity ? "Dołącz do listy rezerwowej" : "Dołącz do meczu"}
              </Button>
            )
          )}

          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="rounded-xl text-xs font-bold cursor-pointer ml-auto"
          >
            Zamknij
          </Button>
        </div>

        {toast && (
          <div className="fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-lg">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            {toast}
          </div>
        )}
      </div>
    </div>
  )
}
